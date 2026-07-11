/**
 * Codex hub (a top-level destination): a master-detail browser. The left list groups
 * entities by category, searches, and creates new ones. Selecting an entity
 * opens a structured profile editor on the right — a focused form of that
 * category's fields (see `profile-schema`), written straight to the note's
 * frontmatter via `writeProfile` (never the prose body). The note body stays
 * freeform; "Open note" jumps to Obsidian's editor for it.
 */

import { App, Menu, Notice, TFile, normalizePath, setIcon } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { autosizeTextarea } from "../lib/form-fields";
import {
  confirmDelete,
  openScene,
  promptText,
} from "../scenes/scene-actions";
import {
  createEntity,
  getCodexEntities,
  resolveCodexTemplate,
  scenesForEntity,
  writeEntityScope,
} from "./codex-store";
import { firstMentionOffset, linkTarget, toLink } from "./codex";
import { stripFrontmatter } from "../lib/frontmatter";
import type { SceneHighlight } from "../views/write-panel";
import {
  defaultScopeForProject,
  filterToScope,
  projectName,
  scopeContextForEntity,
  scopeContextForProject,
} from "./codex-scope";
import { resolveCodexFolder, sanitizeSegment } from "../settings/folders";
import { tryFileOp } from "../lib/notify";
import { readProfile, writeProfile } from "./codex-profile";
import { Profile, ProfileField, profileFields } from "./profile-schema";
import { CategoryDef, CodexEntity, EntityScope, allCategories, categoryLabel } from "./types";
import { CategoryModal } from "./category-modal";
import { Project } from "../projects/types";
import { groupIntoSeries } from "../series/series";
import type InkswellPlugin from "../../main";

export class CodexPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private listEl: HTMLElement | null = null;
  private detailEl: HTMLElement | null = null;
  private search = "";
  private selectedPath: string | null = null;
  /** When false, the list is filtered to the active project's scope (default). */
  private showAll = false;
  /** Bumped per detail render so a slow "Appears in" scan can't fill a stale pane. */
  private appearsToken = 0;
  /** Category to preselect in the rebuilt dropdown after "New type…" adds one. */
  private pendingCategoryId: string | null = null;
  /**
   * Optional intercept for a row tap. When it returns true the tap is considered
   * handled (the phone shell drills into a single-column detail screen) and the
   * panel's own inline master-detail update is skipped. Unset / returns false on
   * desktop, where the two-pane layout updates in place.
   */
  onSelect?: (path: string) => boolean;
  /**
   * Open a scene in Write (never as a raw note), optionally flashing a body hit.
   * Wired by the host to the same cross-panel navigation Search/To-dos use, so an
   * "Appears in" link lands in the manuscript editor rather than Obsidian's file.
   */
  onOpenInWrite?: (path: string, highlight?: SceneHighlight) => void;

  constructor(app: App, plugin: InkswellPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  /** Built-ins + the user's custom types — read fresh from settings per render. */
  private categories(): CategoryDef[] {
    return allCategories(this.plugin.settings.customCategories);
  }

  /** The active project (the vantage point for scoping), or null. */
  private activeProject(): Project | null {
    const path = this.plugin.activeProject.get();
    return path ? this.plugin.store.getProject(path) ?? null : null;
  }

  /** Set which entry the detail pane shows (the phone shell drives this from its
   *  drill-down state; pass null for the list screen). */
  setSelected(path: string | null): void {
    this.selectedPath = path;
  }

  /**
   * The host calls this instead of a full body rebuild when a store notify was
   * caused purely by this panel's own profile writes. Both panes re-read the
   * (now current) metadata cache — the immediate post-save render can be a
   * step behind it (e.g. a just-added alias chip) — but the detail rebuild is
   * focus-preserving, so the user's caret and in-flight text survive.
   */
  softRefresh(): void {
    this.refreshPanes();
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-codex");

    const bar = container.createDiv({ cls: "inkswell-codex__toolbar" });
    const searchInput = bar.createEl("input", {
      type: "search",
      placeholder: "Search codex…",
    });
    tagField(searchInput, "codex:search");
    searchInput.value = this.search;
    searchInput.oninput = () => {
      this.search = searchInput.value;
      this.renderList();
    };

    // Scope filter: by default show only entries in the active project's scope
    // (its own + its series + globals). "All projects" reveals everything. With no
    // active project there is nothing to scope by, so the control is moot.
    const active = this.activeProject();
    const scopeSel = bar.createEl("select", { cls: "dropdown" });
    scopeSel.createEl("option", { text: "In scope", value: "scope" });
    scopeSel.createEl("option", { text: "All projects", value: "all" });
    scopeSel.value = this.showAll || !active ? "all" : "scope";
    scopeSel.disabled = !active;
    scopeSel.onchange = () => {
      this.showAll = scopeSel.value === "all";
      this.renderList();
    };

    const NEW_TYPE = "__new__"; // sentinel — can't collide with slug-shaped ids
    const cats = this.categories();
    const catSel = bar.createEl("select", { cls: "dropdown" });
    for (const c of cats) {
      catSel.createEl("option", { text: c.label, value: c.id });
    }
    catSel.createEl("option", { text: "New type…", value: NEW_TYPE });
    if (this.pendingCategoryId && cats.some((c) => c.id === this.pendingCategoryId)) {
      catSel.value = this.pendingCategoryId;
    }
    this.pendingCategoryId = null;
    // Picking "New type…" opens the add dialog instead of being a selection; the
    // select snaps back so cancel leaves the previous category active.
    let prevCat = catSel.value;
    catSel.onchange = () => {
      if (catSel.value !== NEW_TYPE) {
        prevCat = catSel.value;
        return;
      }
      catSel.value = prevCat;
      this.openNewTypeModal();
    };
    const newBtn = bar.createEl("button", { cls: "mod-cta", text: "New" });
    // New entries inherit the active project's scope: its series if it belongs to
    // one, else the book itself. With no active project they are created global.
    const createScope = defaultScopeForProject(active);
    newBtn.setAttribute("aria-label", this.scopeHint(active, createScope));
    newBtn.onclick = async () => {
      const def = this.categories().find((c) => c.id === catSel.value);
      if (!def) return;
      const name = await promptText(this.app, {
        title: `New ${def.label}`,
        value: "",
        multiline: false,
        cta: "Create",
      });
      if (!name) return;
      const file = await tryFileOp(
        () =>
          createEntity(
            this.app,
            def.id,
            name,
            resolveCodexFolder(this.plugin.settings, createScope, active?.vaultPath),
            createScope,
            resolveCodexTemplate(this.app, this.plugin.settings, def)
          ),
        `Couldn't create the ${def.label}.`
      );
      if (file) {
        this.selectedPath = file.path;
        this.refreshPanes();
      }
    };

    const body = container.createDiv({ cls: "inkswell-codex__body" });
    this.listEl = body.createDiv({ cls: "inkswell-codex__list" });
    this.detailEl = body.createDiv({ cls: "inkswell-codex__detail" });
    this.renderList();
    this.renderDetail();
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();

    const active = this.activeProject();
    const scoped =
      this.showAll || !active
        ? getCodexEntities(this.app)
        : filterToScope(getCodexEntities(this.app), scopeContextForProject(active));

    const q = this.search.trim().toLowerCase();
    const all = scoped.filter((e) =>
      !q
        ? true
        : e.name.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
    );

    if (all.length === 0) {
      const inScope = !this.showAll && !!active;
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: q
          ? "No matching codex entries."
          : inScope
            ? "No codex entries in scope. Create one, or switch to “All projects”."
            : "No codex entries yet. Create one above.",
      });
      return;
    }

    const cats = this.categories();
    for (const cat of cats) {
      const entries = all.filter((e) => e.category === cat.id);
      if (entries.length === 0) continue;
      list.createEl("h4", { text: `${cat.plural} (${entries.length})` });
      for (const e of entries) this.renderRow(list, cat.icon, e);
    }

    // Orphan safety: entries whose category no longer exists (a deleted custom
    // type, or a hand-edited `codex:` value) stay visible and editable here.
    const known = new Set(cats.map((c) => c.id));
    const orphans = all.filter((e) => !known.has(e.category));
    if (orphans.length > 0) {
      list.createEl("h4", { text: `Uncategorized (${orphans.length})` });
      for (const e of orphans) this.renderRow(list, "circle-help", e);
    }
  }

  /** Open the add-custom-type dialog; on submit persist + rebuild with it selected. */
  private openNewTypeModal(): void {
    const merged = this.categories();
    new CategoryModal(this.app, {
      existing: null,
      takenIds: merged.map((c) => c.id),
      takenLabels: merged.map((c) => c.label.toLowerCase()),
      onSubmit: async (def) => {
        this.plugin.settings.customCategories.push(def);
        await this.plugin.saveSettings();
        this.pendingCategoryId = def.id;
        this.plugin.refreshView();
      },
    }).open();
  }

  private renderRow(parent: HTMLElement, icon: string, entity: CodexEntity): void {
    const row = parent.createDiv({ cls: "inkswell-codex__row" });
    if (entity.path === this.selectedPath) row.addClass("is-selected");
    setIcon(row.createSpan({ cls: "inkswell-codex__icon" }), icon);
    row.createSpan({ cls: "inkswell-codex__name", text: entity.name });
    // Show the parent as a muted annotation rather than indenting — the parent
    // (e.g. a World) lives in its own category group, so indenting here would
    // imply a hierarchy the list doesn't actually show.
    if (entity.parent) {
      row.createSpan({ cls: "inkswell-codex__parent", text: `↳ ${entity.parent}` });
    }
    if (entity.aliases.length) {
      row.createSpan({
        cls: "inkswell-codex__aliases",
        text: entity.aliases.join(", "),
      });
    }

    const file = this.app.vault.getAbstractFileByPath(entity.path);
    if (!(file instanceof TFile)) return;

    row.onclick = () => {
      if (this.onSelect?.(entity.path)) return; // phone: drilled into a detail screen
      this.selectedPath = entity.path;
      this.refreshPanes();
    };
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("Open note").setIcon("file-text").onClick(() => openScene(this.app, file))
      );
      menu.addItem((i) =>
        i.setTitle("Rename…").setIcon("pencil").onClick(() => this.rename(file))
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Delete").setIcon("trash").onClick(() => this.remove(file, entity.name))
      );
      return menu;
    });
  }

  /** Render the profile editor for the selected entity (or a placeholder). */
  private renderDetail(): void {
    const host = this.detailEl;
    if (!host) return;
    host.empty();

    const entity = this.selectedPath
      ? getCodexEntities(this.app).find((e) => e.path === this.selectedPath)
      : undefined;
    const file = entity ? this.app.vault.getAbstractFileByPath(entity.path) : null;
    if (!entity || !(file instanceof TFile)) {
      host.createDiv({
        cls: "inkswell-inspector__empty",
        text: "Select a codex entry to edit its profile.",
      });
      return;
    }

    const head = host.createDiv({ cls: "inkswell-codex__detail-head" });
    head.createDiv({ cls: "inkswell-inspector__title", text: entity.name });
    head.createDiv({
      cls: "inkswell-inspector__project",
      text: categoryLabel(entity.category, this.plugin.settings.customCategories),
    });
    const openBtn = head.createEl("button", { text: "Open note" });
    openBtn.onclick = () => openScene(this.app, file);

    this.renderScopeField(host, file, entity);

    const profile = readProfile(this.app, file, entity.category);
    const entities = getCodexEntities(this.app);
    for (const field of profileFields(entity.category)) {
      this.renderField(host, file, entity, field, profile, entities);
    }

    // Read-only: scenes that mention this entity (body text) or link it explicitly
    // (characters/location frontmatter). Computed automatically — see scenesForEntity.
    // Async (reads scene bodies), so render a placeholder and fill when it resolves;
    // the token drops the result if the pane re-rendered or another entry was picked.
    const token = ++this.appearsToken;
    this.field(host, "Appears in", (control) => {
      control.createSpan({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });
      void scenesForEntity(this.app, this.plugin.store.getProjects(), entity).then((scenes) => {
        if (token !== this.appearsToken) return;
        control.empty();
        if (scenes.length === 0) {
          control.createSpan({ cls: "inkswell-stats__muted", text: "No scenes mention this yet." });
          return;
        }
        const wrap = control.createDiv({ cls: "inkswell-codex__refs" });
        for (const s of scenes) {
          const ref = wrap.createSpan({ cls: "inkswell-chip", text: s.basename });
          ref.onclick = () => void this.openReferencingScene(s, entity);
        }
      });
    });
  }

  /**
   * Open an "Appears in" scene in the Write editor (not as a raw note) and flash
   * the entity's first appearance in the prose. The body is read fresh at click
   * time, so the offsets are current; `verify` lets Write re-locate the literal if
   * the file shifted in between. A scene that only links the entity via frontmatter
   * (no name in the prose) opens without a flash. Falls back to opening the note
   * directly if the host wired no navigation callback.
   */
  private async openReferencingScene(file: TFile, entity: CodexEntity): Promise<void> {
    if (!this.onOpenInWrite) {
      openScene(this.app, file);
      return;
    }
    let highlight: SceneHighlight | undefined;
    const body = stripFrontmatter(await this.app.vault.cachedRead(file));
    const hit = firstMentionOffset(body, entity);
    if (hit) highlight = { from: hit.from, to: hit.to, verify: body.slice(hit.from, hit.to) };
    this.onOpenInWrite(file.path, highlight);
  }

  private renderField(
    host: HTMLElement,
    file: TFile,
    entity: CodexEntity,
    field: ProfileField,
    profile: Profile,
    entities: CodexEntity[]
  ): void {
    const save = async (value: Profile[string]) => {
      // Mark the write as our own BEFORE it lands, so the store notify it
      // produces is recognized and softened (no rebuild under the caret).
      this.plugin.selfWrites.mark(file.path);
      await tryFileOp(
        () => writeProfile(this.app, file, entity.category, { [field.key]: value }),
        "Couldn't save the profile field."
      );
    };
    // Re-render the detail after structural edits (chips, alias/parent changes
    // that the list also shows).
    const saveAndRefresh = async (value: Profile[string]) => {
      await save(value);
      this.refreshPanes();
    };

    this.field(host, field.label, (control) => {
      if (field.type === "text") {
        const t = control.createEl("input", { type: "text" });
        tagField(t, `codex:${field.key}`);
        t.value = (profile[field.key] as string) ?? "";
        if (field.placeholder) t.placeholder = field.placeholder;
        t.onchange = () => void save(t.value);
        return;
      }
      if (field.type === "textarea") {
        const ta = control.createEl("textarea", { cls: "inkswell-inspector__textarea" });
        tagField(ta, `codex:${field.key}`);
        ta.rows = 3;
        ta.value = (profile[field.key] as string) ?? "";
        if (field.placeholder) ta.placeholder = field.placeholder;
        ta.onchange = () => void save(ta.value);
        autosizeTextarea(ta);
        return;
      }
      if (field.type === "list") {
        const current = (profile[field.key] as string[]) ?? [];
        const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
        for (const val of current) {
          const chip = chips.createSpan({ cls: "inkswell-chip", text: val });
          const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
          x.onclick = () => void saveAndRefresh(current.filter((c) => c !== val));
        }
        const addRow = control.createDiv({ cls: "inkswell-inspector__addrow" });
        const input = addRow.createEl("input", { type: "text" });
        tagField(input, `codex:${field.key}-add`);
        input.placeholder = field.placeholder ?? "Add…";
        const commit = () => {
          const v = input.value.trim();
          // Clear before the refresh so the focus-preserving rebuild hands
          // back an empty input, ready for the next value.
          input.value = "";
          if (v && !current.includes(v)) void saveAndRefresh([...current, v]);
        };
        input.onkeydown = (e) => {
          if (e.key !== "Enter") return;
          commit();
        };
        // Android IMEs often don't deliver an Enter keydown at all (key
        // "Unidentified"/229 while composing) — the button always works.
        const addBtn = addRow.createEl("button", { text: "Add" });
        addBtn.onclick = commit;
        return;
      }
      // links
      this.renderLinkField(control, field, profile, entities, entity, (value) =>
        void saveAndRefresh(value)
      );
    });
  }

  private renderLinkField(
    control: HTMLElement,
    field: ProfileField,
    profile: Profile,
    entities: CodexEntity[],
    self: CodexEntity,
    saveAndRefresh: (value: Profile[string]) => void
  ): void {
    // Scope the candidates to what THIS entity can see: a series/project-scoped
    // character only links entities in its own scope (+ globals); a global entity
    // is unconstrained. Without this the picker listed every entity vault-wide,
    // ignoring the character's scope.
    const ctx = scopeContextForEntity(self, this.plugin.store.getProjects());
    const inScope = ctx ? filterToScope(entities, ctx) : entities;
    const candidates = inScope.filter(
      (e) =>
        e.path !== self.path &&
        (!field.linkCategory || e.category === field.linkCategory)
    );

    if (field.single) {
      const cur = profile[field.key] ? linkTarget(profile[field.key] as string) : "";
      const sel = control.createEl("select", { cls: "dropdown" });
      tagField(sel, `codex:${field.key}`);
      sel.createEl("option", { text: "— none —", value: "" });
      for (const c of candidates) sel.createEl("option", { text: c.name, value: c.name });
      sel.value = candidates.some((c) => c.name === cur) ? cur : "";
      sel.onchange = () => saveAndRefresh(sel.value ? toLink(sel.value) : "");
      return;
    }

    const current = (profile[field.key] as string[]) ?? [];
    const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
    for (const link of current) {
      const chip = chips.createSpan({ cls: "inkswell-chip", text: linkTarget(link) });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => saveAndRefresh(current.filter((c) => c !== link));
    }
    const remaining = candidates.filter(
      (c) => !current.some((link) => linkTarget(link) === c.name)
    );
    if (remaining.length > 0) {
      const add = control.createEl("select", { cls: "dropdown" });
      tagField(add, `codex:${field.key}-add`);
      add.createEl("option", { text: `+ add ${field.label.toLowerCase()}`, value: "" });
      for (const c of remaining) add.createEl("option", { text: c.name, value: c.name });
      add.value = "";
      add.onchange = () => {
        if (add.value) saveAndRefresh([...current, toLink(add.value)]);
      };
    } else if (candidates.length === 0) {
      const cat = field.linkCategory ? categoryLabel(field.linkCategory).toLowerCase() : "entity";
      control.createSpan({ cls: "inkswell-stats__muted", text: `No ${cat} entries in codex.` });
    }
  }

  private field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
    const f = parent.createDiv({ cls: "inkswell-inspector__field" });
    if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
    build(f.createDiv({ cls: "inkswell-inspector__control" }));
  }

  /** Rebuild both panes, handing focus/caret back to whichever detail field
   *  triggered the refresh (alias Enter, chip removal, link/scope selects). */
  private refreshPanes(): void {
    this.renderList();
    const detail = this.detailEl;
    if (detail) preserveFocus(detail, () => this.renderDetail());
    else this.renderDetail();
  }

  /** Tooltip describing what scope a new entry will inherit. */
  private scopeHint(_active: Project | null, scope: EntityScope): string {
    if (scope.series) return `New entries are tagged for the “${scope.series}” series.`;
    if (scope.project) return `New entries are tagged for “${scope.project}”.`;
    return "New entries are created global — no project selected.";
  }

  /**
   * Scope selector for the open entity: Global, any series, or any single book.
   * Series wins over project (one tag is written); writes go straight to the note's
   * frontmatter. A tag pointing at something no longer in the lists is preserved.
   */
  private renderScopeField(host: HTMLElement, file: TFile, entity: CodexEntity): void {
    const projects = this.plugin.store.getProjects();
    const seriesNames = groupIntoSeries(projects).series.map((s) => s.name);
    const books = projects.map((p) => projectName(p)).sort((a, b) => a.localeCompare(b));

    const scope = entity.scope ?? {};
    const current = scope.series ? `s:${scope.series}` : scope.project ? `p:${scope.project}` : "";

    this.field(host, "Scope", (control) => {
      const sel = control.createEl("select", { cls: "dropdown" });
      tagField(sel, "codex:scope");
      sel.createEl("option", { text: "Global (all projects)", value: "" });
      if (seriesNames.length) {
        const grp = sel.createEl("optgroup");
        grp.label = "Series";
        for (const name of seriesNames) grp.createEl("option", { text: name, value: `s:${name}` });
      }
      if (books.length) {
        const grp = sel.createEl("optgroup");
        grp.label = "Books";
        for (const name of books) grp.createEl("option", { text: name, value: `p:${name}` });
      }
      if (current && !Array.from(sel.options).some((o) => o.value === current)) {
        const label = scope.series ? `${scope.series} (series)` : `${scope.project} (book)`;
        sel.createEl("option", { text: `${label} — current`, value: current });
      }
      sel.value = current;
      sel.onchange = () => {
        const v = sel.value;
        const next: EntityScope = !v
          ? {}
          : v.startsWith("s:")
            ? { series: v.slice(2) }
            : { project: v.slice(2) };
        void (async () => {
          this.plugin.selfWrites.mark(file.path);
          await writeEntityScope(this.app, file, next);
          this.refreshPanes();
        })();
      };
    });
  }

  private async rename(file: TFile): Promise<void> {
    const next = await promptText(this.app, {
      title: "Rename codex entry",
      value: file.basename,
      multiline: false,
      cta: "Rename",
    });
    if (next === null) return;
    const safe = sanitizeSegment(next);
    if (!safe) {
      if (next.trim()) new Notice("That name can't be used as a file name.");
      return;
    }
    if (safe === file.basename) return;
    const folder = file.parent ? file.parent.path : "";
    const path = normalizePath(folder ? `${folder}/${safe}.md` : `${safe}.md`);
    if (this.app.vault.getAbstractFileByPath(path)) return;
    const ok = await tryFileOp(
      () => this.app.fileManager.renameFile(file, path),
      `Couldn't rename "${file.basename}".`
    );
    if (ok === null) return;
    if (this.selectedPath === file.path) this.selectedPath = path;
    this.refreshPanes();
  }

  private async remove(file: TFile, name: string): Promise<void> {
    const ok = await confirmDelete(this.app, `Delete codex entry "${name}"? It will be moved to trash.`);
    if (!ok) return;
    const done = await tryFileOp(() => this.app.fileManager.trashFile(file), `Couldn't delete "${name}".`);
    if (done === null) return;
    if (this.selectedPath === file.path) this.selectedPath = null;
    this.refreshPanes();
  }
}
