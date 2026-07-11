/**
 * Projects panel: lists every project and its scene tree. Rendered inside the
 * single Inkswell host view (see src/views/inkswell-view.ts), not as its own tab.
 *
 * Scenes can be opened (click), reordered (drag), and re-nested (context menu).
 * All structural edits go through the index writer, which touches only the index
 * note's frontmatter — never a scene body.
 *
 * Six previously-inlined responsibilities now live in sibling modules this panel
 * composes: the hero card (hero-card.ts), the ideas inbox (ideas-inbox.ts), the
 * reconcile/relink banner (reconcile-banner.ts), scene-row rendering
 * (scene-rows.ts), and series-membership management (series-menu.ts).
 */

import { App, TFile } from "obsidian";
import { attachRowMenu } from "../../lib/row-menu";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { Project, isMultiScene } from "../../projects/types";
import { baseDraftFor, groupIntoStories } from "../../projects/stories";
import { Series, groupIntoSeries, projectSeries } from "../../series/series";
import { promptNewScene } from "../../outliner/create-scene";
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
    this.reconcile = new ReconcileBanner(app);
    this.seriesMenu = new SeriesMenu(app, store);
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
    // represented by the active draft when one is in focus, else its first draft.
    // The `⋯` drafts menu + draft dropdown in the header switch between drafts.
    const activePath = this.plugin.activeProject.get();
    const stories = groupIntoStories(projects);
    this.storyCounts = new Map(stories.map((s) => [s.title, s.drafts.length]));
    const representatives = stories.map(
      (s) => s.drafts.find((d) => d.vaultPath === activePath) ?? s.drafts[0]
    );

    const { series, standalone } = groupIntoSeries(representatives);

    // Project focus: with a project selected (shared activeProject — also the
    // header dropdown), Home narrows to just that project, or its whole series if
    // it belongs to one. With nothing selected, list everything.
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

      const info = projectSeries(focused);
      const owningSeries = info ? series.find((s) => s.name === info.name) : null;
      if (owningSeries) this.renderSeries(container, owningSeries);
      else this.renderProject(container, focused);
      return;
    }

    // Unfocused = the global "all projects" dashboard: the idea inbox (a store of
    // cross-project story seeds) lives here, not inside a focused project's view.
    renderIdeas(container, this.plugin);
    for (const s of series) this.renderSeries(container, s);
    for (const project of standalone) this.renderProject(container, project);
  }

  /** A named series: header with aggregate progress, then its books in order. */
  private renderSeries(parent: HTMLElement, series: Series): void {
    const sec = parent.createDiv({ cls: "inkswell-series" });
    const header = sec.createDiv({ cls: "inkswell-series__header" });
    header.createSpan({ cls: "inkswell-series__name", text: series.name });
    const meta = header.createSpan({ cls: "inkswell-series__meta" });
    const books = series.books.length;
    meta.setText(`${books} book${books === 1 ? "" : "s"}`);
    if (this.plugin.settings.showWordCounts) void this.renderSeriesTotals(meta, series);
    for (const book of series.books) this.renderProject(sec, book);
  }

  /** Sum words (and targets, if any) across a series and write them to `el`. */
  private async renderSeriesTotals(el: HTMLElement, series: Series): Promise<void> {
    let words = 0;
    let target = 0;
    const all = this.store.getProjects();
    for (const book of series.books) {
      words += await this.stats.projectWords(book);
      // Target is story-level — read it off the book's base draft.
      const t = baseDraftFor(all, book).inkswell?.goals?.target;
      if (typeof t === "number" && t > 0) target += t;
    }
    const books = series.books.length;
    let text = `${books} book${books === 1 ? "" : "s"} · ${words.toLocaleString()} words`;
    if (target > 0) {
      text += ` / ${target.toLocaleString()} (${Math.round((words / target) * 100)}%)`;
    }
    el.setText(text);
  }

  private renderProject(parent: HTMLElement, project: Project): void {
    const section = parent.createDiv({ cls: "inkswell-project" });
    const header = section.createDiv({ cls: "inkswell-project__header" });
    const info = projectSeries(project);
    const title = info?.order != null ? `${info.order}. ${project.draft.title}` : project.draft.title;
    // Clicking the title focuses Home on this project (and its series). It's the
    // same selection the header dropdown drives, so the two stay in lockstep.
    const titleEl = header.createSpan({ cls: "inkswell-project__title", text: title });
    titleEl.setAttribute("aria-label", "Focus on this project");
    titleEl.onclick = () => this.plugin.activeProject.set(project.vaultPath);
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
        promptNewScene(this.app, this.store, project, {
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
