/**
 * Codex hub (a top-level destination): a master-detail browser. The left list groups
 * entities by category, searches, and creates new ones. Selecting an entity
 * opens a structured profile editor on the right — a focused form of that
 * category's fields (see `profile-schema`), written straight to the note's
 * frontmatter via `writeProfile` (never the prose body). The note body stays
 * freeform; "Open note" jumps to Obsidian's editor for it.
 */

import { App, Menu, Notice, TFile, normalizePath, setIcon } from "obsidian";
import { extensionFor, pickVaultImage, writeImageBinary } from "../lib/images";
import { attachRowMenu } from "../lib/row-menu";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { autosizeTextarea } from "../lib/form-fields";
import {
  confirmDelete,
  openScene,
  promptText,
} from "../scenes/scene-actions";
import {
  BookAppearances,
  appearancesForEntity,
  createEntityForProject,
  getCodexEntities,
  resolveEntityImage,
  updateEntityProjects,
  writeEntityScope,
} from "./codex-store";
import { awaitCacheUpdate } from "./codex-template-io";
import { firstMentionOffset, linkAlias, linkTarget, toLink } from "./codex";
import { stripFrontmatter } from "../lib/frontmatter";
import type { SceneHighlight } from "../views/write-panel";
import {
  bookMatches,
  defaultScopeForProject,
  describeCreateScope,
  filterToScope,
  normKey,
  projectKey,
  scopeContextForEntity,
  scopeContextForProject,
} from "./codex-scope";
import { sanitizeSegment } from "../settings/folders";
import { tryFileOp } from "../lib/notify";
import { readProfile, resolveProfileFields, writeProfile } from "./codex-profile";
import { Profile, ProfileField } from "./profile-schema";
import {
  CategoryDef,
  CodexEntity,
  EntityScope,
  allCategories,
  categoryLabel,
} from "./types";
import { openCategoryEditor } from "./category-actions";
import { Project } from "../projects/types";
import { groupIntoSeries } from "../series/series";
import { baseDraft, baseDraftFor, groupIntoStories } from "../projects/stories";
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
   * The scope just written for an entry, rendered until the metadata cache has
   * caught up (`awaitCacheUpdate`) — otherwise the Scope field flashes the stale
   * pre-write value. See `renderScopeField`.
   */
  private pendingScope: { path: string; scope: EntityScope } | null = null;
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

  /** Built-ins (with the user's renames) + custom types — read fresh from settings per render. */
  private categories(): CategoryDef[] {
    const s = this.plugin.settings;
    return allCategories(s.customCategories, s.categoryOverrides);
  }

  /** Display label for a category id, honoring renames and custom types. */
  private label(id: string): string {
    const s = this.plugin.settings;
    return categoryLabel(id, s.customCategories, s.categoryOverrides);
  }

  /** The active project (the vantage point for scoping), or null. */
  private activeProject(): Project | null {
    const path = this.plugin.activeProject.get();
    return path ? this.plugin.store.getProject(path) ?? null : null;
  }

  /** Set which entry the detail pane shows (the phone shell drives this from its
   *  drill-down state; pass null for the list screen). */
  setSelected(path: string | null): void {
    if (path !== this.selectedPath) this.pendingScope = null;
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
    const projects = this.plugin.store.getProjects();
    const createScope = defaultScopeForProject(active, projects);
    newBtn.setAttribute("aria-label", describeCreateScope(createScope));
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
      // The same pipeline Quick Codex (Write editor) uses — scope, folder
      // (the story's, never a draft copy's), and template resolution live there.
      const file = await tryFileOp(
        () => createEntityForProject(this.app, this.plugin.settings, projects, active, def, name),
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
        : filterToScope(
            getCodexEntities(this.app),
            scopeContextForProject(active, this.plugin.store.getProjects())
          );

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

  /** Open the add-custom-type dialog; on submit rebuild with the new type selected.
   *  (Persistence lives in category-actions, shared with Customize → Codex types.) */
  private openNewTypeModal(): void {
    openCategoryEditor(this.app, this.plugin, null, (def) => {
      this.pendingCategoryId = def.id;
      this.plugin.refreshView();
    });
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

    // The field list comes from the type's template note when it declares
    // `codex-fields`; say so (and link the note) so a "missing" shipped field
    // is traceable to the template rather than looking like a bug.
    const { fields, template } = resolveProfileFields(this.app, this.plugin.settings, entity.category);
    const profile = readProfile(this.app, file, fields);
    const entities = getCodexEntities(this.app);

    const head = host.createDiv({ cls: "inkswell-codex__detail-head" });
    // The `image` field renders as a portrait beside the title, not as a row.
    const imageField = fields.find((f) => f.type === "image");
    if (imageField) this.renderPortrait(head, file, entity, fields, imageField, profile);
    const meta = head.createDiv({ cls: "inkswell-codex__detail-meta" });
    meta.createDiv({ cls: "inkswell-inspector__title", text: entity.name });
    meta.createDiv({
      cls: "inkswell-inspector__project",
      text: this.label(entity.category),
    });
    const openBtn = meta.createEl("button", { text: "Open note" });
    openBtn.onclick = () => openScene(this.app, file);

    this.renderScopeField(host, file, entity);

    for (const field of fields) {
      if (field.type === "image") continue;
      this.renderField(host, file, entity, fields, field, profile, entities);
    }
    // Where the fields come from, and the door to changing them: Customize →
    // Codex types → this type (the discovery path for "can I add a field?").
    const src = host.createDiv({ cls: "inkswell-codex__fields-src inkswell-stats__muted" });
    const customize = () => void this.plugin.openCustomize("codex-types", entity.category);
    if (template) {
      src.appendText("Fields from ");
      const link = src.createEl("a", { text: template.name });
      link.onclick = (e) => {
        e.preventDefault();
        customize();
      };
      src.appendText(" · ");
      const note = src.createEl("a", { text: "open note" });
      note.onclick = (e) => {
        e.preventDefault();
        openScene(this.app, template);
      };
    } else {
      const link = src.createEl("a", { text: "Customize fields…" });
      link.onclick = (e) => {
        e.preventDefault();
        customize();
      };
    }

    // Read-only: scenes that mention this entity (body text) or link it explicitly
    // (characters/location frontmatter). Computed automatically — see scenesForEntity.
    // Async (reads scene bodies), so render a placeholder and fill when it resolves;
    // the token drops the result if the pane re-rendered or another entry was picked.
    const token = ++this.appearsToken;
    this.field(host, "Appears in", (control) => {
      control.createSpan({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });
      void appearancesForEntity(
        this.app,
        this.plugin.store.getProjects(),
        entity,
        this.plugin.activeProject.get()
      ).then((books) => {
        if (token !== this.appearsToken) return;
        control.empty();
        if (books.length === 0) {
          control.createSpan({ cls: "inkswell-stats__muted", text: "No scenes mention this yet." });
          return;
        }
        // Grouped by book (a series character reads per book), scenes in
        // manuscript order. Linked scenes (named in the scene's metadata) are
        // filled chips; text-only mentions are outlined (#44 — a name dropped
        // in dialogue isn't a presence). POV scenes carry a tag.
        const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
        const counts = (b: BookAppearances): string => {
          const mentioned = b.scenes.length - b.linkedCount;
          const parts = [
            b.linkedCount > 0 ? `linked in ${plural(b.linkedCount, "scene")}` : null,
            mentioned > 0 ? `mentioned in ${plural(mentioned, "scene")}` : null,
            b.povCount > 0 ? `POV in ${b.povCount}` : null,
          ];
          return parts.filter((x): x is string => x !== null).join(" · ");
        };
        for (const book of books) {
          const group = control.createDiv({ cls: "inkswell-codex__refbook" });
          const head = group.createDiv({ cls: "inkswell-codex__refhead inkswell-stats__muted" });
          if (books.length > 1) {
            head.createSpan({ cls: "inkswell-codex__refbook-title", text: book.title });
            head.appendText(` — ${counts(book)}`);
          } else {
            head.setText(counts(book));
          }
          const wrap = group.createDiv({ cls: "inkswell-codex__refs" });
          for (const s of book.scenes) {
            const ref = wrap.createSpan({ cls: "inkswell-chip", text: s.file.basename });
            ref.addClass(s.linked ? "is-linked" : "is-mentioned");
            let hint = s.linked
              ? "Linked in the scene's metadata (characters / location / POV)"
              : "Mentioned in the scene's text only";
            if (s.pov) {
              ref.addClass("is-pov");
              hint = `POV scene · ${hint}`;
              ref.prepend(createSpan({ cls: "inkswell-codex__povtag", text: "POV" }));
            }
            ref.setAttribute("aria-label", hint);
            ref.onclick = () => void this.openReferencingScene(s.file, entity);
          }
        }
        if (books.some((b) => b.linkedCount > 0 && b.linkedCount < b.scenes.length)) {
          control.createDiv({
            cls: "inkswell-codex__reflegend inkswell-stats__muted",
            text: "Filled = linked in scene metadata · outlined = mentioned in the text",
          });
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

  /**
   * The entry's portrait (the `image` field): a click-to-change frame. Stored
   * as a plain vault path; `[[…]]` / `![[…]]` forms written by hand resolve too
   * (resolveEntityImage). Inkswell never owns the file — Remove clears the key.
   */
  private renderPortrait(
    head: HTMLElement,
    file: TFile,
    entity: CodexEntity,
    fields: ProfileField[],
    field: ProfileField,
    profile: Profile
  ): void {
    const raw = ((profile[field.key] as string) ?? "").trim();
    const image = resolveEntityImage(this.app, raw, file.path);
    const box = head.createDiv({ cls: "inkswell-codex__portrait" });
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", image ? "Change image" : "Add image");
    if (image) {
      const img = box.createEl("img", { cls: "inkswell-codex__portrait-img" });
      img.src = this.app.vault.getResourcePath(image);
      img.alt = `${entity.name} image`;
    } else {
      box.addClass("is-empty");
      if (raw) {
        box.addClass("is-missing");
        box.setAttribute("title", `Image not found: ${raw}`);
      }
      box.createSpan({
        cls: "inkswell-codex__portrait-placeholder",
        text: raw ? "Image not found" : "+ Add image",
      });
    }

    const save = async (value: string) => {
      this.plugin.selfWrites.mark(file.path);
      await tryFileOp(
        () => writeProfile(this.app, file, fields, { [field.key]: value }),
        "Couldn't save the image."
      );
      this.refreshPanes();
    };
    box.onclick = (e) => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle("Choose from vault…")
          .setIcon("image")
          .onClick(() => {
            void (async () => {
              const picked = await pickVaultImage(this.app, `Choose an image for ${entity.name}…`);
              if (picked) await save(picked.path);
            })();
          })
      );
      menu.addItem((i) =>
        i
          .setTitle("Upload…")
          .setIcon("upload")
          .onClick(() => this.uploadImage(file, save))
      );
      if (raw) {
        menu.addSeparator();
        menu.addItem((i) =>
          i
            .setTitle("Remove image")
            .setIcon("trash")
            .onClick(() => void save(""))
        );
      }
      menu.showAtMouseEvent(e);
    };
  }

  /** OS file picker → write beside the entry per Obsidian's attachment setting → save the path. */
  private uploadImage(file: TFile, save: (path: string) => Promise<void>): void {
    const input = createEl("input", { type: "file" });
    input.accept = "image/*";
    input.onchange = () => {
      const picked = input.files?.[0];
      if (!picked) return;
      void (async () => {
        const dest = await this.app.fileManager.getAvailablePathForAttachment(
          `${file.basename}.${extensionFor(picked)}`,
          file.path
        );
        const written = await tryFileOp(
          () => writeImageBinary(this.app, dest, picked),
          "Couldn't save the image file."
        );
        if (written) await save(written.path);
      })();
    };
    input.click();
  }

  private renderField(
    host: HTMLElement,
    file: TFile,
    entity: CodexEntity,
    fields: ProfileField[],
    field: ProfileField,
    profile: Profile,
    entities: CodexEntity[]
  ): void {
    const save = async (value: Profile[string]) => {
      // Mark the write as our own BEFORE it lands, so the store notify it
      // produces is recognized and softened (no rebuild under the caret).
      this.plugin.selfWrites.mark(file.path);
      await tryFileOp(
        () => writeProfile(this.app, file, fields, { [field.key]: value }),
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
        ta.rows = 4; // prose fields (motivation, arc, voice…) — autosize grows from here
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
      if (field.type === "number") {
        // Saved as a JS number → a bare YAML number, so Bases/Dataview can sort
        // and sum it. A non-numeric stored value shows empty and is only
        // overwritten when the user actually edits the field (onchange).
        const t = control.createEl("input", {
          type: "number",
          attr: { step: "any", inputmode: "decimal" },
        });
        tagField(t, `codex:${field.key}`);
        const v = profile[field.key];
        t.value = typeof v === "number" ? String(v) : "";
        if (field.placeholder) t.placeholder = field.placeholder;
        t.onchange = () => {
          const s = t.value.trim();
          const n = Number(s);
          void save(s !== "" && Number.isFinite(n) ? n : "");
        };
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
      const target = linkTarget(link);
      const chip = chips.createSpan({ cls: "inkswell-chip" });
      chip.createSpan({ cls: "inkswell-codex__linktarget", text: target });
      if (field.labeled) {
        // The label lives in the wikilink alias ([[Anna|sister]]). Edited via a
        // prompt rather than an inline input: the chip is rebuilt on save, and
        // a modal sidesteps both focus-preservation and Android IME Enter quirks.
        const alias = linkAlias(link);
        const lab = chip.createSpan({
          cls: "inkswell-codex__linklabel",
          text: alias ? `· ${alias}` : "+ label",
        });
        if (!alias) lab.addClass("is-empty");
        lab.setAttribute("aria-label", alias ? `Change the “${alias}” label` : "Add a label");
        lab.onclick = () => {
          void (async () => {
            const v = await promptText(this.app, {
              title: `Relationship to ${target}`,
              value: alias ?? "",
              multiline: false,
              cta: "Save",
            });
            if (v === null) return; // cancelled; "" clears the label
            saveAndRefresh(current.map((c) => (c === link ? toLink(target, v) : c)));
          })();
        };
      }
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
      const cat = field.linkCategory ? this.label(field.linkCategory).toLowerCase() : "entity";
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

  /**
   * Scope selector for the open entity — two questions, two controls, no dropdowns:
   *
   * 1. A segmented switcher for the KIND of scope: Global / Series / Books.
   *    Switching kind writes a sensible default at once (the active story's
   *    series or book, else the first) so the entry is never left half-set.
   * 2. Beneath it, toggle pills for the SET: one pill per series (only when the
   *    vault has more than one — a single series is a caption), or one pill per
   *    story (filled = in scope). Tapping a book pill adds/removes it through
   *    `updateEntityProjects` (a delta writer — never a list rebuilt from this
   *    render). The last book can't be toggled off: leaving Books is the
   *    switcher's job, otherwise the entry would silently turn global.
   *
   * Series wins over project (one tag is written). A tag pointing at something no
   * longer in the vault is kept and shown as a flagged pill, still removable.
   *
   * Cache-lag rule (AGENTS.md gotcha 18): the metadata cache re-indexes after the
   * write, so the panel renders from `pendingScope` until `awaitCacheUpdate`
   * resolves, then re-reads the (now current) cache.
   */
  private renderScopeField(host: HTMLElement, file: TFile, entity: CodexEntity): void {
    const projects = this.plugin.store.getProjects();
    const active = this.activeProject();
    const seriesList = groupIntoSeries(projects).series;
    const seriesNames = seriesList.map((s) => s.name);
    // One pill per STORY (not per draft): the label is the story title, the value
    // its base draft's identity key (basename, or the path form when another
    // story's index note shares the basename — #44). A stored value is matched
    // against every draft of the story in either form (`bookMatches`), so legacy
    // values naming a sibling draft still light the right pill and normalize the
    // next time the user toggles.
    const stories = groupIntoStories(projects);
    const books = stories
      .map((s) => ({ label: s.title, base: baseDraft(s), drafts: s.drafts, value: projectKey(baseDraft(s), projects) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    /** Is a stored value one of this story's drafts (either identity form)? */
    const namesStory = (value: string, book: (typeof books)[number]): boolean =>
      book.drafts.some((d) => bookMatches(value, d));
    /** Story title for a stored value, else the value itself. */
    const titleFor = (value: string): string =>
      books.find((b) => namesStory(value, b))?.label ?? value;
    /** Books in a series, counted per story (drafts of one book are one book). */
    const seriesBookCount = (name: string): number => {
      const s = seriesList.find((x) => x.name === name);
      return s ? new Set(s.books.map((b) => b.draft.title)).size : 0;
    };

    const scope =
      this.pendingScope?.path === entity.path ? this.pendingScope.scope : entity.scope ?? {};
    const list = scope.projects ?? [];
    const kind: "global" | "series" | "books" = scope.series
      ? "series"
      : list.length > 0
        ? "books"
        : "global";

    const commit = (write: () => Promise<void>, next: EntityScope): void => {
      void (async () => {
        this.plugin.selfWrites.mark(file.path);
        await write();
        this.pendingScope = { path: file.path, scope: next };
        this.refreshPanes();
        await awaitCacheUpdate(this.app, file);
        if (this.pendingScope?.path === file.path) this.pendingScope = null;
        this.refreshPanes();
      })();
    };
    const setScope = (next: EntityScope): void =>
      commit(() => writeEntityScope(this.app, file, next), next);
    const updateBooks = (fn: (cur: string[]) => string[]): void =>
      commit(
        () => updateEntityProjects(this.app, file, fn),
        { projects: fn(list) } // optimistic preview; the write uses the CURRENT list
      );

    // Defaults when the user switches kind: the active story's series/book wins.
    const activeCtx = scopeContextForProject(active, projects);
    const defaultSeries = activeCtx.seriesName ?? seriesNames[0];
    const defaultBook = active
      ? projectKey(baseDraftFor(projects, active), projects)
      : books[0]?.value;

    this.field(host, "Scope", (control) => {
      const wrap = control.createDiv({ cls: "inkswell-scope" });

      // --- kind switcher ---------------------------------------------------
      const seg = wrap.createDiv({ cls: "inkswell-viewswitch inkswell-scope__kinds" });
      const segBtn = (label: string, id: typeof kind, hint: string, onPick: () => void) => {
        const btn = seg.createEl("button", { cls: "inkswell-viewswitch__btn", text: label });
        btn.toggleClass("is-active", kind === id);
        btn.setAttribute("aria-pressed", String(kind === id));
        btn.setAttribute("aria-label", hint);
        btn.onclick = () => {
          if (kind !== id) onPick();
        };
      };
      segBtn("Global", "global", "Visible from every project", () => setScope({}));
      // Series/Books segments only when there is something to point at — or the
      // entry already does (a stale tag still needs a home so it can be changed).
      if (seriesNames.length > 0 || kind === "series") {
        segBtn("Series", "series", "Shared across every book in a series", () => {
          if (defaultSeries) setScope({ series: defaultSeries });
        });
      }
      if (books.length > 0 || kind === "books") {
        // A vault with one story: the segment IS the book, so name it.
        const single = books.length === 1 && seriesNames.length === 0 ? books[0].label : "Books";
        segBtn(single, "books", "Visible only from the books you pick", () => {
          if (defaultBook) setScope({ projects: [defaultBook] });
        });
      }

      // --- the set ------------------------------------------------------------
      if (kind === "series") {
        const name = scope.series ?? "";
        const known = seriesNames.includes(name);
        if (seriesNames.length > 1) {
          const pills = wrap.createDiv({ cls: "inkswell-scope__pills" });
          for (const s of seriesNames) {
            const pill = this.scopePill(pills, s, s === name, `Share across the “${s}” series`);
            pill.onclick = () => {
              if (s !== name) setScope({ series: s });
            };
          }
          if (!known && name) {
            const pill = this.scopePill(pills, name, true, `No series named “${name}” was found`);
            pill.addClass("is-unknown");
          }
        } else {
          const n = seriesBookCount(name);
          wrap.createDiv({
            cls: "inkswell-stats__muted inkswell-scope__caption",
            text: known
              ? `Shared across the “${name}” series${n ? ` · ${n} book${n === 1 ? "" : "s"}` : ""}`
              : `“${name}” — no series with this name was found`,
          });
        }
        return;
      }

      if (kind !== "books") return;
      const unknown = list.filter((v) => !books.some((k) => namesStory(v, k)));
      // One known story and nothing stale: the segment label already says it all.
      if (books.length <= 1 && unknown.length === 0) return;
      const pills = wrap.createDiv({ cls: "inkswell-scope__pills" });
      /**
       * Turn a book off: drop every stored value naming it. A legacy ambiguous
       * value (`[[Index]]` shared by two books) also named OTHER books that were
       * on — re-pin those with their unambiguous keys so they don't vanish too.
       */
      const without = (cur: string[], target: (typeof books)[number]): string[] => {
        const kept = cur.filter((v) => !namesStory(v, target));
        for (const other of books) {
          if (other === target) continue;
          if (cur.some((v) => namesStory(v, other)) && !kept.some((v) => namesStory(v, other))) {
            kept.push(other.value);
          }
        }
        return kept;
      };
      const apply = (fn: (cur: string[]) => string[]): void => {
        if (fn(list).length === 0) {
          new Notice("Keep at least one book — switch the scope kind above to widen it.");
          return;
        }
        updateBooks(fn);
      };
      for (const b of books) {
        const on = list.some((v) => namesStory(v, b));
        const pill = this.scopePill(
          pills,
          b.label,
          on,
          on ? `Remove “${b.label}” from this entry's books` : `Add “${b.label}” to this entry's books`
        );
        pill.onclick = () => apply((cur) => (on ? without(cur, b) : [...cur, b.value]));
      }
      for (const b of unknown) {
        const pill = this.scopePill(
          pills,
          titleFor(b),
          true,
          `“${b}” — no project with this name was found. Tap to remove.`
        );
        pill.addClass("is-unknown");
        pill.onclick = () => apply((cur) => cur.filter((v) => normKey(v) !== normKey(b)));
      }
    });
  }

  /** One toggle pill of the Scope field: a real button (keyboard + screen reader
   *  friendly) styled as a chip, `aria-pressed` carrying its state. */
  private scopePill(host: HTMLElement, label: string, on: boolean, hint: string): HTMLElement {
    const pill = host.createEl("button", { cls: "inkswell-chip inkswell-chip--toggle", text: label });
    pill.toggleClass("is-active", on);
    pill.setAttribute("aria-pressed", String(on));
    pill.setAttribute("aria-label", hint);
    return pill;
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
