/**
 * Home panel, rendered inside the single Inkswell host view (see
 * src/views/inkswell-view.ts), not as its own tab.
 *
 * Two states, driven by the shared `activeProject`:
 *   - All projects: shelves of book cards — one shelf per series (in book
 *     order), one for standalone books — plus the ideas inbox, then a collapsed
 *     Archived section for archived stories (out of sight). Cards navigate.
 *   - Focused: the hero card (cover / logline / theme / target), a strip of the
 *     series' other covers when the book belongs to one, and THIS book's scene
 *     tree. Scenes can be opened (click), reordered (drag), re-nested (menu).
 *
 * All structural edits go through the index writer, which touches only the
 * index note's frontmatter — never a scene body.
 *
 * Composed from sibling modules: hero-card.ts, book-card.ts, ideas-inbox.ts,
 * reconcile-banner.ts, scene-rows.ts, series-menu.ts.
 */

import { App, TFile, setIcon } from "obsidian";
import { attachRowMenu } from "../../lib/row-menu";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { Project, isMultiScene } from "../../projects/types";
import {
  archivedStoryTitles,
  baseDraftFor,
  groupIntoStories,
  representativeDrafts,
} from "../../projects/stories";
import {
  STANDALONE_SHELF,
  Series,
  Shelf,
  ShelfBook,
  groupIntoSeries,
  orderSeries,
  orderShelves,
  partitionArchived,
  projectSeries,
  renameInOrder,
  shelfMetaText,
} from "../../series/series";
import { ReorderSeriesModal } from "../../series/series-actions";
import { promptNewScene } from "../../outliner/create-scene";
import { sortProjectByChapter } from "../../outliner/sort-actions";
import { BookCardContext, renderBookCard, renderCoverThumb } from "./book-card";
import { HeroCard } from "./hero-card";
import { renderIdeas } from "./ideas-inbox";
import { ReconcileBanner } from "./reconcile-banner";
import { SceneRows } from "./scene-rows";
import { SeriesMenu } from "./series-menu";
import { renderUnreadableNotice } from "./unreadable-notice";
import type InkswellPlugin from "../../../main";

export class ExplorerPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private stats: ProjectStats;
  /** Called when a scene row is clicked — selects it (the host drives the Inspector). */
  private onSelectScene: (file: TFile) => void;

  private container: HTMLElement | null = null;
  /** Path of the currently selected/active scene, for the row highlight. */
  private activeScenePath: string | null = null;
  /** Draft count per story title (>1 → show a badge); rebuilt each render. */
  private storyCounts = new Map<string, number>();

  private hero: HeroCard;
  private reconcile: ReconcileBanner;
  private seriesMenu: SeriesMenu;
  private sceneRows: SceneRows;

  constructor(
    app: App,
    plugin: InkswellPlugin,
    store: ProjectStore,
    stats: ProjectStats,
    onSelectScene: (file: TFile) => void
  ) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.stats = stats;
    this.onSelectScene = onSelectScene;

    this.hero = new HeroCard(app, plugin, store, stats);
    this.reconcile = new ReconcileBanner(
      app,
      (p) => plugin.selfWrites.mark(p),
      () => this.softRefresh()
    );
    this.seriesMenu = new SeriesMenu(app, store, {
      renameProject: (p) => plugin.renameProject(p),
      sortByChapter: (p) => void sortProjectByChapter(app, plugin, p),
      newProject: (preset) => plugin.newProject(preset),
      activePath: () => plugin.activeProject.get(),
      markSelfWrite: (p) => plugin.selfWrites.mark(p),
      reorderShelves: () => this.reorderShelves(),
      canReorderShelves: () => this.liveShelves().length > 1,
      seriesRenamed: (from, to) => {
        const next = renameInOrder(plugin.settings.seriesOrder, from, to);
        if (!next) return;
        plugin.settings.seriesOrder = next;
        void plugin.saveSettings();
      },
      archiveProject: (p, archived) => void plugin.archiveProject(p, archived),
      archiveSeries: (s, archived) => void plugin.archiveSeries(s, archived),
    });
    this.sceneRows = new SceneRows(app, plugin, stats, onSelectScene);
  }

  /**
   * Highlight the row for `path` (or clear) without a full re-render. Called by
   * the host whenever the active scene changes — on click or external navigation —
   * so the highlight always tracks the Inspector.
   */
  setActiveScene(path: string | null): void {
    this.activeScenePath = path;
    if (!this.container) return;
    this.container.querySelectorAll<HTMLElement>(".inkswell-scene").forEach((el) => {
      el.toggleClass("is-active", el.dataset.scenePath === path && !!path);
    });
  }

  /** Re-render into the last container (scene badges after an inline meta save).
   *  A no-op before the first render or when the container left the DOM (e.g.
   *  a phone drill-down replaced the list with the inspector screen). */
  softRefresh(): void {
    if (this.container?.isConnected) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-explorer");

    const toolbar = container.createDiv({ cls: "inkswell-explorer__toolbar" });
    const newBtn = toolbar.createEl("button", { cls: "mod-cta", text: "New project" });
    newBtn.onclick = () => this.plugin.newProject();

    const projects = this.store.getProjects();
    const unreadable = this.store.getUnreadable();
    if (projects.length === 0) {
      // No projects yet — this is the global Home, so the idea inbox belongs here.
      // A book whose index can't be read is listed instead of "no projects" (#69).
      renderUnreadableNotice(container, this.app, unreadable);
      renderIdeas(container, this.plugin);
      if (unreadable.length === 0) {
        container.createDiv({
          cls: "inkswell-explorer__empty",
          text: 'No writing projects yet. Click "New project" above to create one (or add a `longform` key to a note\'s frontmatter).',
        });
      }
      return;
    }

    // Collapse drafts: a story (projects sharing a `longform.title`) lists once,
    // represented by the active draft when one is in focus, else its base draft.
    // The `⋯` drafts menu + draft dropdown in the header switch between drafts.
    const activePath = this.plugin.activeProject.get();
    const stories = groupIntoStories(projects);
    this.storyCounts = new Map(stories.map((s) => [s.title, s.drafts.length]));
    const representatives = representativeDrafts(projects, activePath);

    const grouped = groupIntoSeries(representatives);
    const series = orderSeries(grouped.series, this.plugin.settings.seriesOrder);
    const standalone = grouped.standalone;

    // Project focus: with a project selected (shared activeProject — also the
    // header dropdown), Home narrows to just that book. With nothing selected,
    // list everything.
    const focused = activePath
      ? representatives.find((p) => p.vaultPath === activePath) ?? null
      : null;

    if (focused) {
      this.hero.render(container, focused);
      const bar = container.createDiv({ cls: "inkswell-explorer__focus" });
      const back = bar.createEl("button", {
        cls: "inkswell-explorer__showall",
        text: "← All projects",
      });
      back.onclick = () => this.plugin.activeProject.set(null);

      // Series membership is story-level — read it off the base draft.
      const info = projectSeries(baseDraftFor(projects, focused));
      const owningSeries = info ? series.find((s) => s.name === info.name) : null;
      if (owningSeries) this.renderSeriesStrip(container, owningSeries, focused);
      this.renderProject(container, focused);
      return;
    }

    // Unfocused = the global "all projects" dashboard: shelves of cards, then
    // the idea inbox (a store of cross-project story seeds — it lives here, not
    // inside a focused project's view), then the collapsed Archived section.
    // Partitioned AFTER grouping: a partially archived series keeps its shelf
    // (archived books dimmed in place); only a fully archived one moves.
    const archived = archivedStoryTitles(projects);
    const shelves = partitionArchived(
      { series, standalone },
      (p) => archived.has(p.draft.title),
      this.plugin.settings.hideArchivedInSeries
    );
    // Shelves render the partition's DISPLAY lists; their menus ("+ Add book"
    // numbering, reorder, rename, archive) act on the FULL series.
    const full = new Map(series.map((s) => [s.name, s] as const));
    const fullOf = (s: Series): Series => full.get(s.name) ?? s;
    // Books whose index can't be read, above the shelves they're missing from.
    renderUnreadableNotice(container, this.app, unreadable);
    if (shelves.series.length === 0 && shelves.standalone.length === 0 && archived.size > 0) {
      container.createDiv({
        cls: "inkswell-explorer__empty",
        text: "Every project is archived. Open Archived below to bring one back.",
      });
    }
    if (shelves.series.length === 0) {
      this.renderGrid(container, shelves.standalone, null);
    } else {
      // The writer's shelf order, Standalone included (#67).
      const ordered = orderShelves(shelves.series, shelves.standalone.length > 0, this.plugin.settings.seriesOrder);
      for (const shelf of ordered) {
        if (shelf.kind === "series") {
          this.renderShelf(container, shelf.series.name, shelf.series.books, fullOf(shelf.series));
        } else {
          this.renderShelf(container, "Standalone", shelves.standalone, null);
        }
      }
    }
    renderIdeas(container, this.plugin);
    this.renderArchived(container, shelves.archivedSeries, shelves.archivedStandalone, fullOf);
  }

  /**
   * Home's Archived section — out of sight, one click away. Collapsed by
   * default (`settings.homeArchivedOpen`); holds archived series shelves (whole
   * series, or a live series' archived books under its name) and archived
   * standalone books, with no "+ Add book" cards. Cards keep their menus, so
   * Unarchive is where you'd look for it.
   */
  private renderArchived(
    parent: HTMLElement,
    series: Series[],
    standalone: Project[],
    fullOf: (s: Series) => Series
  ): void {
    const count = series.reduce((n, s) => n + s.books.length, 0) + standalone.length;
    if (count === 0) return;
    const open = this.plugin.settings.homeArchivedOpen;
    const sec = parent.createDiv({ cls: "inkswell-archived" });
    sec.toggleClass("is-collapsed", !open);
    const head = sec.createDiv({ cls: "inkswell-archived__head" });
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.setAttribute("aria-expanded", String(open));
    setIcon(head.createSpan({ cls: "inkswell-archived__chevron" }), open ? "chevron-down" : "chevron-right");
    head.createSpan({ text: "Archived" });
    head.createSpan({ cls: "inkswell-archived__count", text: String(count) });
    const toggle = () => {
      this.plugin.settings.homeArchivedOpen = !open;
      void this.plugin.persist();
      this.plugin.refreshExplorer();
    };
    head.onclick = toggle;
    head.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };
    if (!open) return;
    for (const s of series) this.renderShelf(sec, s.name, s.books, fullOf(s), false);
    if (standalone.length > 0) {
      if (series.length > 0) this.renderShelf(sec, "Standalone", standalone, null, false);
      else this.renderGrid(sec, standalone, null, false);
    }
  }

  /** A shelf: header (name, aggregate progress, series menu) + a grid of book
   *  cards. `books` is what to show; `series` (the FULL series) drives the menus. */
  private renderShelf(
    parent: HTMLElement,
    name: string,
    books: Project[],
    series: Series | null,
    addGhost = true
  ): void {
    const sec = parent.createDiv({ cls: "inkswell-shelf" });
    const header = sec.createDiv({ cls: "inkswell-shelf__header" });
    header.createSpan({ cls: "inkswell-shelf__name", text: name });
    const meta = header.createSpan({ cls: "inkswell-shelf__meta" });
    void this.renderShelfMeta(meta, books);
    // Right-click / ⋯ → series menu (new book, add existing, rename, reorder).
    // A live Standalone shelf gets its own menu (Reorder shelves…, #67); the
    // Archived section's shelves (addGhost false) aren't reorderable.
    if (series) attachRowMenu(header, header, () => this.seriesMenu.seriesMenu(series));
    else if (addGhost) attachRowMenu(header, header, () => this.seriesMenu.standaloneMenu());
    this.renderGrid(sec, books, series, addGhost);
  }

  /**
   * The card grid, ending with a "+ Add book" ghost card: on a series shelf it
   * offers a new book in the series or an existing project; on Standalone (or
   * the plain grid when there are no series) it opens New project (#57). The
   * Archived section passes `addGhost: false` — you don't start books there.
   */
  private renderGrid(parent: HTMLElement, books: Project[], series: Series | null, addGhost = true): void {
    const grid = parent.createDiv({ cls: "inkswell-shelf__grid" });
    const ctx = this.cardContext();
    for (const book of books) renderBookCard(grid, book, ctx);
    if (!addGhost) return;
    const ghost = grid.createDiv({ cls: "inkswell-card inkswell-card--ghost", text: "+ Add book" });
    ghost.setAttribute("role", "button");
    ghost.tabIndex = 0;
    ghost.setAttribute("aria-label", series ? `Add a book to ${series.name}` : "Start a new book");
    const activate = (at: { x: number; y: number }): void => {
      if (series) this.seriesMenu.addBookMenu(series).showAtPosition(at);
      else this.plugin.newProject();
    };
    ghost.onclick = (e) => activate({ x: e.clientX, y: e.clientY });
    ghost.onkeydown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const r = ghost.getBoundingClientRect();
      activate({ x: r.left, y: r.bottom });
    };
  }

  /** Home's live (non-archived) shelves, in the writer's order — what the
   *  reorder dialog lists and what decides whether it's worth offering. */
  private liveShelves(): Shelf<Series>[] {
    const projects = this.store.getProjects();
    const reps = representativeDrafts(projects, this.plugin.activeProject.get());
    const grouped = groupIntoSeries(reps);
    const archived = archivedStoryTitles(projects);
    const live = partitionArchived(
      { series: orderSeries(grouped.series, this.plugin.settings.seriesOrder), standalone: grouped.standalone },
      (p) => archived.has(p.draft.title),
      this.plugin.settings.hideArchivedInSeries
    );
    if (live.series.length === 0) return live.standalone.length > 0 ? [{ kind: "standalone" }] : [];
    return orderShelves(live.series, live.standalone.length > 0, this.plugin.settings.seriesOrder);
  }

  /**
   * Reorder Home's shelves (#57, #67) — series and Standalone. Saved to
   * settings, which sync. Entries the dialog doesn't list (a fully archived
   * series) keep their slots after the reordered ones, so unarchiving puts a
   * shelf back where it was rather than at the end.
   */
  private reorderShelves(): void {
    const ids = this.liveShelves().map((s) => (s.kind === "series" ? s.series.name : STANDALONE_SHELF));
    new ReorderSeriesModal(this.app, ids, (next) => {
      const listed = new Set(next.map((n) => n.toLowerCase()));
      const kept = this.plugin.settings.seriesOrder.filter((n) => !listed.has(n.toLowerCase()));
      this.plugin.settings.seriesOrder = [...next, ...kept];
      void this.plugin.saveSettings();
      this.plugin.refreshView();
    }).open();
  }

  private cardContext(): BookCardContext {
    const projects = this.store.getProjects();
    const archived = archivedStoryTitles(projects);
    return {
      app: this.app,
      stats: this.stats,
      projects,
      showWordCounts: this.plugin.settings.showWordCounts,
      isArchived: (p) => archived.has(p.draft.title),
      draftCount: (title) => this.storyCounts.get(title) ?? 1,
      menu: (p) => this.seriesMenu.projectMenu(p),
      onOpen: (p) => this.plugin.activeProject.set(p.vaultPath),
    };
  }

  /** Shelf header counts + target progress (targets are story-level → base drafts). */
  private async renderShelfMeta(el: HTMLElement, books: Project[]): Promise<void> {
    el.setText(shelfMetaText(books.map(() => ({ words: 0 })), false));
    if (!this.plugin.settings.showWordCounts) return;
    const all = this.store.getProjects();
    const rows: ShelfBook[] = [];
    for (const book of books) {
      rows.push({
        words: await this.stats.projectWords(book),
        target: baseDraftFor(all, book).inkswell?.goals?.target,
      });
    }
    el.setText(shelfMetaText(rows, true));
  }

  /** Focused view: the series' covers in order; click one to switch books. With
   *  "Hide archived books from their series" on, archived books drop out of the
   *  strip — except the focused one, which always shows where it sits. */
  private renderSeriesStrip(parent: HTMLElement, series: Series, focused: Project): void {
    const strip = parent.createDiv({ cls: "inkswell-seriesstrip" });
    // Label + thumbs scroll sideways on narrow screens; the ⋯ stays put outside.
    const scroll = strip.createDiv({ cls: "inkswell-seriesstrip__scroll" });
    scroll.createSpan({ cls: "inkswell-seriesstrip__label", text: series.name });
    const projects = this.store.getProjects();
    const archived = this.plugin.settings.hideArchivedInSeries ? archivedStoryTitles(projects) : new Set<string>();
    const shown = series.books.filter(
      (b) => !archived.has(b.draft.title) || b.draft.title === focused.draft.title
    );
    for (const book of shown) {
      renderCoverThumb(scroll, this.app, projects, book, book.vaultPath === focused.vaultPath, (b) =>
        this.plugin.activeProject.set(b.vaultPath)
      );
    }
    // The series menu is reachable here too (right-click the strip / ⋯).
    attachRowMenu(strip, strip, () => this.seriesMenu.seriesMenu(series));
  }

  private renderProject(parent: HTMLElement, project: Project): void {
    const section = parent.createDiv({ cls: "inkswell-project" });
    const header = section.createDiv({ cls: "inkswell-project__header" });
    const info = projectSeries(baseDraftFor(this.store.getProjects(), project));
    const title = info?.order != null ? `${info.order}. ${project.draft.title}` : project.draft.title;
    header.createSpan({ cls: "inkswell-project__title", text: title });
    const right = header.createDiv({ cls: "inkswell-project__right" });
    const draftCount = this.storyCounts.get(project.draft.title) ?? 1;
    if (draftCount > 1) {
      const badge = right.createSpan({
        cls: "inkswell-project__drafts",
        text: `${draftCount} drafts`,
      });
      badge.setAttribute("aria-label", "This story has multiple drafts — switch in the header");
    }
    const count = right.createSpan({ cls: "inkswell-project__count" });
    if (this.plugin.settings.showWordCounts) {
      void this.stats.projectWords(project).then((w) => {
        count.setText(`${w.toLocaleString()} words`);
      });
    }
    if (isMultiScene(project.draft)) {
      const add = right.createEl("button", {
        cls: "inkswell-project__addscene",
        text: "+ scene",
      });
      add.setAttribute("aria-label", "Create a new scene in this project");
      add.onclick = (e) => {
        e.stopPropagation();
        promptNewScene(this.app, this.store, this.plugin.settings, project, {
          onCreated: (file) => this.onSelectScene(file),
        });
      };
    }

    // Right-click (desktop) / "⋯" tap (touch) → project menu.
    attachRowMenu(header, right, () => this.seriesMenu.projectMenu(project));

    this.reconcile.render(section, project);

    if (isMultiScene(project.draft)) {
      const list = section.createDiv();
      project.scenes.forEach((scene, index) =>
        this.sceneRows.render(list, project, scene, index, this.activeScenePath)
      );
      if (project.scenes.length === 0) {
        list.createDiv({
          cls: "inkswell-explorer__empty",
          text: "No scenes yet.",
        });
      }
    }
  }
}
