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
import {
  confirmDelete,
  openScene,
  openSceneOnModClick,
  promptText,
} from "../scenes/scene-actions";
import {
  BookAppearances,
  appearancesForEntity,
  createEntityForProject,
  createPlaceInside,
  getCodexEntities,
  resolveEntityImage,
  updateEntityPins,
  updateEntityProjects,
  writeEntityScope,
} from "./codex-store";
import { codexSearchMatch, isPinnedIn, pinnedFirst, withPin, withoutPin } from "./codex-list";
import { awaitCacheUpdate } from "./codex-template-io";
import { PLACE_CATEGORY, buildPlaceTree, placeDescendants, placePath, placesInside } from "./places";
import { firstMentionOffset } from "./codex";
import { stripFrontmatter } from "../lib/frontmatter";
import type { SceneHighlight } from "../views/write-panel";
import {
  ScopeContext,
  applyBookPicks,
  defaultScopeForProject,
  describeCreateScope,
  filterToScope,
  isEntityVisible,
  onlyArchivedScope,
  projectKey,
  scopeBooks,
  scopeContextForEntity,
  scopeContextForProject,
  scopeSummary,
} from "./codex-scope";
import { ScopeModal } from "./scope-modal";
import { sanitizeSegment } from "../settings/folders";
import { tryFileOp } from "../lib/notify";
import { codexEntryText } from "../plan/story-bible";
import { renderProfileFieldControl } from "./profile-field-controls";
import { codexEntryData } from "../plan/story-bible-io";
import { readProfile, resolveProfileFields, writeProfile } from "./codex-profile";
import { Profile, ProfileField, isEmptyValue } from "./profile-schema";
import {
  CategoryDef,
  CodexEntity,
  EntityScope,
  allCategories,
  categoryLabel,
} from "./types";
import { openCategoryEditor } from "./category-actions";
import { Project } from "../projects/types";
import { groupIntoSeries, orderSeries } from "../series/series";
import { archivedStoryTitles, baseDraftFor } from "../projects/stories";
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
  /** With `showAll`: also list entries scoped only to archived books (out of sight by default). */
  private includeArchived = false;
  /** Places folded shut in the list's place tree, by path (in-memory view state). */
  private collapsedPlaces = new Set<string>();
  /** Category id the list is narrowed to ("" = all types). Also the type **New** creates. */
  private categoryFilter = "";
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
    // (its own + its series + globals). "All projects" reveals everything except
    // entries scoped only to archived books (out of sight with them); "Include
    // archived" shows those too. With no active project, "In scope" is moot.
    const active = this.activeProject();
    const scopeSel = bar.createEl("select", { cls: "dropdown" });
    const inScope = scopeSel.createEl("option", { text: "In scope", value: "scope" });
    inScope.disabled = !active;
    scopeSel.createEl("option", { text: "All projects", value: "all" });
    scopeSel.createEl("option", { text: "Include archived", value: "archived" });
    scopeSel.value = this.showAll || !active ? (this.includeArchived ? "archived" : "all") : "scope";
    scopeSel.onchange = () => {
      this.showAll = scopeSel.value !== "scope";
      this.includeArchived = scopeSel.value === "archived";
      this.renderList();
    };

    // Type filter (#47): narrows the list to one category, and that category is
    // what **New** creates. "All types" shows everything; New then asks which.
    const NEW_TYPE = "__new__"; // sentinel — can't collide with slug-shaped ids
    const cats = this.categories();
    if (this.pendingCategoryId && cats.some((c) => c.id === this.pendingCategoryId)) {
      this.categoryFilter = this.pendingCategoryId;
    }
    this.pendingCategoryId = null;
    // A filtered type that was since deleted falls back to all types.
    if (this.categoryFilter && !cats.some((c) => c.id === this.categoryFilter)) {
      this.categoryFilter = "";
    }
    const catSel = bar.createEl("select", { cls: "dropdown" });
    catSel.setAttribute("aria-label", "Show one type");
    catSel.createEl("option", { text: "All types", value: "" });
    for (const c of cats) {
      catSel.createEl("option", { text: c.plural, value: c.id });
    }
    catSel.createEl("option", { text: "New type…", value: NEW_TYPE });
    catSel.value = this.categoryFilter;
    // Picking "New type…" opens the add dialog instead of being a selection; the
    // select snaps back so cancel leaves the current filter active.
    catSel.onchange = () => {
      if (catSel.value === NEW_TYPE) {
        catSel.value = this.categoryFilter;
        this.openNewTypeModal();
        return;
      }
      this.categoryFilter = catSel.value;
      this.renderList();
    };
    const newBtn = bar.createEl("button", { cls: "mod-cta", text: "New" });
    // New entries inherit the active project's scope: its series if it belongs to
    // one, else the book itself. With no active project they are created global.
    const projects = this.plugin.store.getProjects();
    const createScope = defaultScopeForProject(active, projects);
    newBtn.setAttribute("aria-label", describeCreateScope(createScope));
    const create = async (def: CategoryDef) => {
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
    newBtn.onclick = (e) => {
      const filtered = this.categories().find((c) => c.id === this.categoryFilter);
      if (filtered) {
        void create(filtered);
        return;
      }
      const menu = new Menu();
      for (const c of this.categories()) {
        menu.addItem((i) => i.setTitle(c.label).setIcon(c.icon).onClick(() => void create(c)));
      }
      menu.showAtMouseEvent(e);
    };

    const body = container.createDiv({ cls: "inkswell-codex__body" });
    this.listEl = body.createDiv({ cls: "inkswell-codex__list" });
    this.detailEl = body.createDiv({ cls: "inkswell-codex__detail" });
    this.renderList();
    this.renderDetail();
  }

  /**
   * The unscoped list ("All projects", or no book open): every entry, minus
   * those scoped ONLY to archived books unless "Include archived" is picked.
   * An entry visible from the open book is never hidden — with an archived
   * book open, its own entries still list.
   */
  private unscopedEntities(active: Project | null): CodexEntity[] {
    const entities = getCodexEntities(this.app);
    if (this.includeArchived) return entities;
    const projects = this.plugin.store.getProjects();
    const archived = archivedStoryTitles(projects);
    if (archived.size === 0) return entities;
    const activeCtx = active ? scopeContextForProject(active, projects) : null;
    return entities.filter(
      (e) =>
        (activeCtx !== null && isEntityVisible(e, activeCtx)) ||
        !onlyArchivedScope(e, projects, (p) => archived.has(p.draft.title))
    );
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();

    const active = this.activeProject();
    // The open book: its scope, and the book pins are read against.
    const bookCtx = active ? scopeContextForProject(active, this.plugin.store.getProjects()) : null;
    const scoped =
      this.showAll || !bookCtx
        ? this.unscopedEntities(active)
        : filterToScope(getCodexEntities(this.app), bookCtx);

    // Search: name and aliases, then Role / Type — a row found only by those
    // shows the value it matched.
    const q = this.search.trim().toLowerCase();
    const matchedBy = new Map<string, string>();
    const all = scoped.filter((e) => {
      const m = codexSearchMatch(e, q);
      if (m && m !== "name") matchedBy.set(e.path, m.classifier);
      return m !== null;
    });

    const cats = this.categories();
    const filterDef = cats.find((c) => c.id === this.categoryFilter);
    const shown = filterDef ? all.filter((e) => e.category === filterDef.id) : all;

    if (shown.length === 0) {
      const inScope = !this.showAll && !!active;
      // Unscoped and nothing shows, but entries exist: they're all scoped to
      // archived books — say so instead of claiming the codex is empty.
      const hiddenByArchive = !inScope && !this.includeArchived && getCodexEntities(this.app).length > scoped.length;
      if (filterDef && !q) {
        list.createDiv({
          cls: "inkswell-stats__muted",
          text: inScope
            ? `No ${filterDef.plural.toLowerCase()} in scope. Create one, or switch to “All projects”.`
            : hiddenByArchive
              ? `No ${filterDef.plural.toLowerCase()} outside archived books. Pick “Include archived” to see theirs.`
              : `No ${filterDef.plural.toLowerCase()} yet. Create one above.`,
        });
        return;
      }
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: q
          ? "No matching codex entries."
          : inScope
            ? "No codex entries in scope. Create one, or switch to “All projects”."
            : hiddenByArchive
              ? "Every codex entry belongs to an archived book. Pick “Include archived” to see them."
              : "No codex entries yet. Create one above.",
      });
      return;
    }

    for (const cat of cats) {
      const entries = shown.filter((e) => e.category === cat.id);
      if (entries.length === 0) continue;
      list.createEl("h4", { text: `${cat.plural} (${entries.length})` });
      // Places nest (#66): an indented, foldable tree — flat while searching,
      // so every match shows whatever it sits inside.
      if (cat.id === PLACE_CATEGORY && !q) this.renderPlaceTree(list, cat.icon, entries, bookCtx);
      else this.renderRows(list, cat.icon, entries, bookCtx, matchedBy);
    }

    // Orphan safety: entries whose category no longer exists (a deleted custom
    // type, or a hand-edited `codex:` value) stay visible and editable here.
    const known = new Set(cats.map((c) => c.id));
    const orphans = shown.filter((e) => !known.has(e.category));
    if (orphans.length > 0) {
      list.createEl("h4", { text: `Uncategorized (${orphans.length})` });
      this.renderRows(list, "circle-help", orphans, bookCtx, matchedBy);
    }
  }

  /** One type's rows: pinned in the open book first (#70), a rule under the last of them. */
  private renderRows(
    list: HTMLElement,
    icon: string,
    entries: CodexEntity[],
    bookCtx: ScopeContext | null,
    matchedBy: ReadonlyMap<string, string>
  ): void {
    const ordered = pinnedFirst(entries, bookCtx);
    ordered.forEach((e, i) => {
      const pinned = isPinnedIn(e, bookCtx);
      const lastPinned = pinned && i < ordered.length - 1 && !isPinnedIn(ordered[i + 1], bookCtx);
      this.renderRow(list, icon, e, { bookCtx, lastPinned, matched: matchedBy.get(e.path) });
    });
  }

  /** Open the add-custom-type dialog; on submit rebuild with the new type selected.
   *  (Persistence lives in category-actions, shared with Customize → Codex types.) */
  private openNewTypeModal(): void {
    openCategoryEditor(this.app, this.plugin, null, (def) => {
      this.pendingCategoryId = def.id;
      this.plugin.refreshView();
    });
  }

  /**
   * The Locations group as a tree (#66): each place under the place it's
   * inside, indented, with a chevron to fold a place's contents. A place whose
   * container isn't listed (a world, out of scope, missing) is top-level.
   */
  private renderPlaceTree(list: HTMLElement, icon: string, places: CodexEntity[], bookCtx: ScopeContext | null): void {
    const tree = buildPlaceTree(places);
    // Pinned places lead among their neighbours; a pin never lifts one out of
    // the place it's inside.
    const walk = (place: CodexEntity, depth: number): void => {
      const kids = pinnedFirst(tree.children.get(place.path) ?? [], bookCtx);
      const collapsed = this.collapsedPlaces.has(place.path);
      this.renderRow(list, icon, place, { bookCtx, place: { depth, childCount: kids.length, collapsed } });
      if (!collapsed) for (const kid of kids) walk(kid, depth + 1);
    };
    for (const root of pinnedFirst(tree.roots, bookCtx)) walk(root, 0);
  }

  /** Select an entry (row click, breadcrumb, "Places inside" chip). */
  private select(path: string): void {
    if (this.onSelect?.(path)) return; // phone: drilled into a detail screen
    this.selectedPath = path;
    this.refreshPanes();
  }

  private renderRow(
    parent: HTMLElement,
    icon: string,
    entity: CodexEntity,
    opts: {
      /** The open book (pins are per book); null with none open. */
      bookCtx: ScopeContext | null;
      /** Set when the row sits in the place tree. */
      place?: { depth: number; childCount: number; collapsed: boolean };
      /** The last pinned row of its group, with unpinned rows below. */
      lastPinned?: boolean;
      /** The Role / Type value the search matched, when it wasn't the name. */
      matched?: string;
    }
  ): void {
    const { bookCtx, place } = opts;
    const pinned = isPinnedIn(entity, bookCtx);
    const row = parent.createDiv({ cls: "inkswell-codex__row" });
    if (entity.path === this.selectedPath) row.addClass("is-selected");
    if (opts.lastPinned) row.addClass("is-last-pinned");
    if (place) {
      row.addClass("is-place");
      row.style.setProperty("--inkswell-place-depth", String(place.depth));
      const chev = row.createSpan({ cls: "inkswell-codex__placechev" });
      if (place.childCount > 0) {
        setIcon(chev, place.collapsed ? "chevron-right" : "chevron-down");
        chev.setAttribute("role", "button");
        chev.setAttribute("aria-label", place.collapsed ? `Show places inside ${entity.name}` : `Hide places inside ${entity.name}`);
        chev.onclick = (e) => {
          e.stopPropagation(); // fold only — don't also select the row
          if (place.collapsed) this.collapsedPlaces.delete(entity.path);
          else this.collapsedPlaces.add(entity.path);
          this.renderList();
        };
      }
    }
    setIcon(row.createSpan({ cls: "inkswell-codex__icon" }), icon);
    row.createSpan({ cls: "inkswell-codex__name", text: entity.name });
    if (pinned) {
      const pin = row.createSpan({ cls: "inkswell-codex__pin", attr: { "aria-label": "Pinned in this book" } });
      setIcon(pin, "pin");
    }
    if (place?.collapsed && place.childCount > 0) {
      row.createSpan({ cls: "inkswell-codex__placecount", text: String(place.childCount) });
    }
    // The parent as a muted annotation (e.g. the World a top-level place is in).
    // A nested place's container is already shown by the indent, so skip it.
    if (entity.parent && !(place && place.depth > 0)) {
      row.createSpan({ cls: "inkswell-codex__parent", text: `↳ ${entity.parent}` });
    }
    if (entity.aliases.length) {
      row.createSpan({
        cls: "inkswell-codex__aliases",
        text: entity.aliases.join(", "),
      });
    }
    if (opts.matched) row.createSpan({ cls: "inkswell-codex__aliases", text: opts.matched });

    const file = this.app.vault.getAbstractFileByPath(entity.path);
    if (!(file instanceof TFile)) return;

    row.onclick = () => this.select(entity.path);
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("Open note").setIcon("file-text").onClick(() => openScene(this.app, file))
      );
      menu.addItem((i) =>
        i.setTitle("Copy as text").setIcon("copy").onClick(() => this.copyAsText(entity))
      );
      menu.addItem((i) =>
        i.setTitle("Rename…").setIcon("pencil").onClick(() => this.rename(file))
      );
      // Pins are per book: offered for entries the open book can see (and to
      // undo a pin on one it no longer can).
      if (bookCtx && (pinned || isEntityVisible(entity, bookCtx))) {
        menu.addItem((i) =>
          i
            .setTitle(pinned ? "Unpin from this book" : "Pin in this book")
            .setIcon(pinned ? "pin-off" : "pin")
            .onClick(() => this.setPinned(file, !pinned))
        );
      }
      if (entity.category === PLACE_CATEGORY || entity.category === "world") {
        menu.addItem((i) =>
          i
            .setTitle("New place inside…")
            .setIcon("map-pin")
            .onClick(() => this.newPlaceInside(entity, file))
        );
      }
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Delete").setIcon("trash").onClick(() => this.remove(file, entity.name))
      );
      return menu;
    });
  }

  /**
   * Pin or unpin an entry in the open book (#70). A delta on the note's current
   * pins, so another book's pin on the same entry is kept. A new pin names the
   * story's base draft, the way new scope does.
   */
  private setPinned(file: TFile, pin: boolean): void {
    const active = this.activeProject();
    if (!active) return;
    const projects = this.plugin.store.getProjects();
    const ctx = scopeContextForProject(active, projects);
    const key = projectKey(baseDraftFor(projects, active), projects);
    void (async () => {
      this.plugin.selfWrites.mark(file.path);
      // Listen before writing, so a fast cache update can't slip past.
      const cached = awaitCacheUpdate(this.app, file);
      const done = await tryFileOp(
        () => updateEntityPins(this.app, file, (cur) => (pin ? withPin(cur, ctx, key) : withoutPin(cur, ctx))),
        pin ? "Couldn't pin it." : "Couldn't unpin it."
      );
      if (done === null) return;
      await cached;
      this.refreshPanes();
    })();
  }

  /** Put the entry's profile on the clipboard as plain readable text (#50) —
   *  for pasting a character profile into a chat or email. */
  private copyAsText(entity: CodexEntity): void {
    const data = codexEntryData(this.plugin, entity);
    if (!data) return;
    void navigator.clipboard.writeText(codexEntryText(data, { title: true })).then(
      () => new Notice(`Copied ${entity.name}`),
      () => new Notice("Couldn't copy to the clipboard.")
    );
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
    // Where this place sits (#66): Westeros › The North, each step clickable.
    if (entity.category === PLACE_CATEGORY) {
      const path = placePath(entity, entities);
      if (path.length > 0) {
        const crumbs = meta.createDiv({ cls: "inkswell-codex__placepath" });
        path.forEach((step, i) => {
          if (i > 0) crumbs.createSpan({ cls: "inkswell-codex__placesep", text: "›" });
          const a = crumbs.createEl("a", { text: step.name });
          a.onclick = (e) => {
            e.preventDefault();
            this.select(step.path);
          };
        });
      }
    }
    const openBtn = meta.createEl("button", { text: "Open note" });
    openBtn.onclick = () => openScene(this.app, file);

    this.renderScopeField(host, file, entity);

    for (const field of fields) {
      if (field.type === "image") continue;
      // A superseded shipped field (Location's loose-text Region) shows only
      // where it already holds something.
      if (field.hideWhenEmpty && isEmptyValue(profile[field.key])) continue;
      this.renderField(host, file, entity, fields, field, profile, entities);
    }
    if (entity.category === PLACE_CATEGORY || entity.category === "world") {
      this.renderPlacesInside(host, file, entity, entities);
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
            openSceneOnModClick(ref, this.app, s.file.path);
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

  /**
   * "Places inside" (#66) on a world or a location: the places whose Inside
   * names it, as clickable chips, plus "New place inside…" — the quick way to
   * build World › Region › City without retyping containers.
   */
  private renderPlacesInside(host: HTMLElement, file: TFile, entity: CodexEntity, entities: CodexEntity[]): void {
    this.field(host, "Places inside", (control) => {
      const inside = placesInside(entity, entities);
      if (inside.length > 0) {
        const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
        for (const place of inside) {
          const chip = chips.createSpan({ cls: "inkswell-chip inkswell-chip--link", text: place.name });
          chip.onclick = () => this.select(place.path);
        }
      }
      const add = control.createEl("button", { text: "New place inside…" });
      add.onclick = () => this.newPlaceInside(entity, file);
    });
  }

  /** Prompt for a name and create a location inside `container` (same folder
   *  and scope; `parent` set), then open it. */
  private newPlaceInside(container: CodexEntity, containerFile: TFile): void {
    void (async () => {
      const name = await promptText(this.app, {
        title: `New place inside ${container.name}`,
        value: "",
        multiline: false,
        cta: "Create",
      });
      if (!name?.trim()) return;
      const created = await tryFileOp(
        () => createPlaceInside(this.app, this.plugin.settings, container, containerFile, name),
        "Couldn't create the place."
      );
      if (created === null) return; // tryFileOp already said why
      if (created === "taken") {
        new Notice(`There's already a note named “${name.trim()}” beside ${container.name}.`);
        return;
      }
      if (created === "invalid") {
        new Notice("That name can't be used as a file name.");
        return;
      }
      // The list and breadcrumb read `parent` from the metadata cache, which
      // re-indexes after the write — render once it has (gotcha 18), or the new
      // place shows top-level until something else redraws the panel. Creating
      // is two writes (note, then parent), so wait for the parent itself, not
      // just the next re-index; bounded so a slow cache can't hang the click.
      const parentIndexed = (): boolean =>
        typeof this.app.metadataCache.getFileCache(created)?.frontmatter?.["parent"] === "string";
      for (let tries = 0; tries < 3 && !parentIndexed(); tries++) await awaitCacheUpdate(this.app, created);
      this.selectedPath = created.path;
      this.refreshPanes();
    })();
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

    this.field(host, field.label, (control) =>
      renderProfileFieldControl(control, {
        app: this.app,
        field,
        value: profile[field.key],
        // Scope the candidates to what THIS entity can see: a series/project-
        // scoped character only links entities in its own scope (+ globals); a
        // global entity is unconstrained. Never itself.
        candidates: () => {
          const ctx = scopeContextForEntity(entity, this.plugin.store.getProjects());
          const inScope = ctx ? filterToScope(entities, ctx) : entities;
          return inScope.filter((e) => e.path !== entity.path);
        },
        // A place can't sit inside anything that's inside it (#66) — the loop guard.
        exclude:
          field.key === "parent" && entity.category === PLACE_CATEGORY
            ? placeDescendants(entity, entities)
            : undefined,
        typeLabel: (id) => this.label(id),
        tagPrefix: "codex",
        // Plain fields save quietly; links re-render the panes (the list shows them).
        saveValue: (value, structural) => void (structural ? saveAndRefresh(value) : save(value)),
        // Lists apply against the rendered value, as the panel always has.
        updateList: (transform) => {
          const cur = profile[field.key];
          void saveAndRefresh(transform(Array.isArray(cur) ? cur : []));
        },
      })
    );
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
   * The open entity's Scope, as ONE summary line ("Books · Ash, Ember +3") and
   * a Change… button (#57). Editing lives in {@link ScopeModal}: with many books
   * an inline pill per book pushed the entry's actual fields off screen.
   *
   * Save makes one write: `writeEntityScope` for a kind/series change, or —
   * books staying books — `updateEntityProjects` with the picks applied to the
   * CURRENT stored list (`applyBookPicks`, a delta — gotcha 10). Series wins over
   * project (one tag is written); a tag pointing at something no longer in the
   * vault is kept and listed as "not found" until unticked.
   *
   * Cache-lag rule (AGENTS.md gotcha 18): the metadata cache re-indexes after the
   * write, so the panel renders from `pendingScope` until `awaitCacheUpdate`
   * resolves, then re-reads the (now current) cache.
   */
  private renderScopeField(host: HTMLElement, file: TFile, entity: CodexEntity): void {
    const projects = this.plugin.store.getProjects();
    const books = scopeBooks(projects);
    const seriesList = orderSeries(groupIntoSeries(projects).series, this.plugin.settings.seriesOrder);
    // Books in a series, counted per story (drafts of one book are one book).
    const series = seriesList.map((s) => ({ name: s.name, books: new Set(s.books.map((b) => b.draft.title)).size }));
    const scope =
      this.pendingScope?.path === entity.path ? this.pendingScope.scope : entity.scope ?? {};

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

    this.field(host, "Scope", (control) => {
      const row = control.createDiv({ cls: "inkswell-scope__summary" });
      row.createSpan({
        cls: "inkswell-scope__text",
        text: scopeSummary(scope, books, (name) => series.find((s) => s.name === name)?.books ?? null),
      });
      const change = row.createEl("button", { text: "Change…" });
      change.setAttribute("aria-label", `Change where “${entity.name}” is visible`);
      change.onclick = () => {
        // Defaults when the user switches kind: the active story's series/book wins.
        const active = this.activeProject();
        new ScopeModal(this.app, {
          entityName: entity.name,
          scope,
          books,
          series,
          defaultSeries: scopeContextForProject(active, projects).seriesName ?? undefined,
          defaultBook: active ? projectKey(baseDraftFor(projects, active), projects) : undefined,
          onSave: (edit) => {
            if (edit.kind === "replace") {
              commit(() => writeEntityScope(this.app, file, edit.scope), edit.scope);
            } else {
              commit(
                () => updateEntityProjects(this.app, file, (cur) => applyBookPicks(cur, books, edit)),
                { projects: edit.preview }
              );
            }
          },
        }).open();
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
