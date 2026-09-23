/**
 * Home panel, rendered inside the single Inkswell host view (see
 * src/views/inkswell-view.ts), not as its own tab.
 *
 * Two states, driven by the shared `activeProject`:
 *   - All projects: shelves of book cards — one shelf per series (in book
 *     order), one for standalone books — plus the ideas inbox. Cards navigate.
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

import { App, TFile } from "obsidian";
import { attachRowMenu } from "../../lib/row-menu";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { Project, isMultiScene } from "../../projects/types";
import { baseDraftFor, groupIntoStories, representativeDrafts } from "../../projects/stories";
import { Series, groupIntoSeries, projectSeries } from "../../series/series";
import { promptNewScene } from "../../outliner/create-scene";
import { BookCardContext, renderBookCard, renderCoverThumb } from "./book-card";
import { HeroCard } from "./hero-card";
import { renderIdeas } from "./ideas-inbox";
import { ReconcileBanner } from "./reconcile-banner";
import { SceneRows } from "./scene-rows";
import { SeriesMenu } from "./series-menu";
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
    this.reconcile = new ReconcileBanner(app, (p) => plugin.selfWrites.mark(p));
    this.seriesMenu = new SeriesMenu(app, store, {
      renameProject: (p) => plugin.renameProject(p),
      newProject: (preset) => plugin.newProject(preset),
      activePath: () => plugin.activeProject.get(),
      markSelfWrite: (p) => plugin.selfWrites.mark(p),
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
    if (projects.length === 0) {
      // No projects yet — this is the global Home, so the idea inbox belongs here.
      renderIdeas(container, this.plugin);
      container.createDiv({
        cls: "inkswell-explorer__empty",
        text: 'No writing projects yet. Click "New project" above to create one (or add a `longform` key to a note\'s frontmatter).',
      });
      return;
    }

    // Collapse drafts: a story (projects sharing a `longform.title`) lists once,
    // represented by the active draft when one is in focus, else its base draft.
    // The `⋯` drafts menu + draft dropdown in the header switch between drafts.
    const activePath = this.plugin.activeProject.get();
    const stories = groupIntoStories(projects);
    this.storyCounts = new Map(stories.map((s) => [s.title, s.drafts.length]));
    const representatives = representativeDrafts(projects, activePath);

    const { series, standalone } = groupIntoSeries(representatives);

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
    // inside a focused project's view).
    if (series.length === 0) {
      this.renderGrid(container, standalone, null);
    } else {
      for (const s of series) this.renderShelf(container, s.name, s.books, s);
      if (standalone.length > 0) this.renderShelf(container, "Standalone", standalone, null);
    }
    renderIdeas(container, this.plugin);
  }

  /** A shelf: header (name, aggregate progress, series menu) + a grid of book cards. */
  private renderShelf(parent: HTMLElement, name: string, books: Project[], series: Series | null): void {
    const sec = parent.createDiv({ cls: "inkswell-shelf" });
    const header = sec.createDiv({ cls: "inkswell-shelf__header" });
    header.createSpan({ cls: "inkswell-shelf__name", text: name });
    const meta = header.createSpan({ cls: "inkswell-shelf__meta" });
    void this.renderShelfMeta(meta, books);
    // Right-click / ⋯ → series menu (new book, add existing, rename, reorder).
    if (series) attachRowMenu(header, header, () => this.seriesMenu.seriesMenu(series));
    this.renderGrid(sec, books, series);
  }

  /** The card grid; a series shelf ends with a "+ Add book" ghost card. */
  private renderGrid(parent: HTMLElement, books: Project[], series: Series | null): void {
    const grid = parent.createDiv({ cls: "inkswell-shelf__grid" });
    const ctx = this.cardContext();
    for (const book of books) renderBookCard(grid, book, ctx);
    if (series) {
      const ghost = grid.createDiv({ cls: "inkswell-card inkswell-card--ghost", text: "+ Add book" });
      ghost.setAttribute("role", "button");
      ghost.tabIndex = 0;
      ghost.setAttribute("aria-label", `Add a book to ${series.name}`);
      ghost.onclick = (e) => this.seriesMenu.seriesMenu(series).showAtMouseEvent(e);
      ghost.onkeydown = (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const r = ghost.getBoundingClientRect();
        this.seriesMenu.seriesMenu(series).showAtPosition({ x: r.left, y: r.bottom });
      };
    }
  }

  private cardContext(): BookCardContext {
    return {
      app: this.app,
      stats: this.stats,
      projects: this.store.getProjects(),
      showWordCounts: this.plugin.settings.showWordCounts,
      draftCount: (title) => this.storyCounts.get(title) ?? 1,
      menu: (p) => this.seriesMenu.projectMenu(p),
      onOpen: (p) => this.plugin.activeProject.set(p.vaultPath),
    };
  }

  /** "N books · X words / target (P%)" for a shelf (targets are story-level → base drafts). */
  private async renderShelfMeta(el: HTMLElement, books: Project[]): Promise<void> {
    const n = books.length;
    let text = `${n} book${n === 1 ? "" : "s"}`;
    el.setText(text);
    if (!this.plugin.settings.showWordCounts) return;
    let words = 0;
    let target = 0;
    const all = this.store.getProjects();
    for (const book of books) {
      words += await this.stats.projectWords(book);
      const t = baseDraftFor(all, book).inkswell?.goals?.target;
      if (typeof t === "number" && t > 0) target += t;
    }
    text += ` · ${words.toLocaleString()} words`;
    if (target > 0) {
      text += ` / ${target.toLocaleString()} (${Math.round((words / target) * 100)}%)`;
    }
    el.setText(text);
  }

  /** Focused view: the series' covers in order; click one to switch books. */
  private renderSeriesStrip(parent: HTMLElement, series: Series, focused: Project): void {
    const strip = parent.createDiv({ cls: "inkswell-seriesstrip" });
    // Label + thumbs scroll sideways on narrow screens; the ⋯ stays put outside.
    const scroll = strip.createDiv({ cls: "inkswell-seriesstrip__scroll" });
    scroll.createSpan({ cls: "inkswell-seriesstrip__label", text: series.name });
    const projects = this.store.getProjects();
    for (const book of series.books) {
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
