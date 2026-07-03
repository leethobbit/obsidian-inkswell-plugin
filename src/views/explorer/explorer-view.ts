/**
 * Projects panel: lists every project and its scene tree. Rendered inside the
 * single Inkswell host view (see src/views/inkswell-view.ts), not as its own tab.
 *
 * Scenes can be opened (click), reordered (drag), and re-nested (context menu).
 * All structural edits go through the index writer, which touches only the index
 * note's frontmatter — never a scene body.
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { attachRowMenu } from "../../lib/row-menu";
import { tryFileOp } from "../../lib/notify";
import { renameSceneInBeats } from "../../outliner/beats";
import { cleanupOwnedCover, pickVaultImage, resolveCoverSrc, setCoverFromUpload } from "../../projects/cover";
import { persistDraft, persistInkswellData, persistOverview, updateScenes, writeSeries } from "../../projects/index-writer";
import { TargetModal } from "../../goals/target-modal";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { reconcileSuggestions } from "../../projects/rename-heal";
import {
  addScene,
  indentScene,
  moveScene,
  removeScene,
  unindentScene,
} from "../../projects/scene-tree";
import { Project, isMultiScene } from "../../projects/types";
import { baseDraftFor, groupIntoStories } from "../../projects/stories";
import { Series, groupIntoSeries, projectSeries } from "../../series/series";
import { deleteScene, editSynopsis, promptText, renameScene } from "../../scenes/scene-actions";
import { promptNewScene } from "../../outliner/create-scene";
import { EditSceneModal } from "../../scenes/edit-scene-modal";
import { readSceneMeta, statusLabel } from "../../scenes/scene-meta";
import type InkswellPlugin from "../../../main";

/** "1 scene" / "2 scenes" — naive count + noun pluralization. */
function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

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
      this.renderIdeas(container);
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
      this.renderProjectHero(container, focused);
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
    this.renderIdeas(container);
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

  /** Story ideas inbox (capture without leaving Home). */
  private renderIdeas(parent: HTMLElement): void {
    const sec = parent.createDiv({ cls: "inkswell-ideas" });
    const input = sec.createEl("input", {
      type: "text",
      cls: "inkswell-ideas__input",
      placeholder: "Capture an idea… (Enter)",
    });
    input.onkeydown = (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        this.plugin.addIdea(input.value);
        input.value = "";
      }
    };

    const ideas = [...this.plugin.ideas].sort(
      (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
    );
    for (const idea of ideas) {
      const row = sec.createDiv({ cls: "inkswell-idea" });
      if (idea.pinned) row.addClass("is-pinned");
      const pin = row.createSpan({ cls: "inkswell-idea__pin", text: idea.pinned ? "★" : "☆" });
      pin.setAttribute("aria-label", idea.pinned ? "Unpin" : "Pin");
      pin.onclick = () => this.plugin.togglePinIdea(idea.id);
      row.createSpan({ cls: "inkswell-idea__text", text: idea.text });
      const del = row.createSpan({ cls: "inkswell-idea__del", text: "×" });
      del.setAttribute("aria-label", "Delete idea");
      del.onclick = () => this.plugin.removeIdea(idea.id);
    }
  }

  /**
   * Focused-view hero card: cover art + at-a-glance logline / theme / target.
   * Only rendered for the single focused project (never in the multi-project
   * list). Fields autosave on `change` (blur) — the host's focus-guard prevents a
   * mid-keystroke rebuild, matching the Plan → Overview convention.
   */
  private renderProjectHero(parent: HTMLElement, focused: Project): void {
    // Story-level metadata (cover, overview, goals) lives on the story's base
    // draft, so every draft shares one cover/logline/theme/target. Word-count
    // progress, though, is the *focused* draft's own (each draft has its scenes).
    const base = baseDraftFor(this.store.getProjects(), focused);
    const hero = parent.createDiv({ cls: "inkswell-hero" });
    const overview = base.inkswell?.overview ?? {};
    const indexFile = this.indexFile(base);
    const saveOverview = (patch: Partial<typeof overview>) => {
      if (indexFile) {
        void tryFileOp(() => persistOverview(this.app, indexFile, patch), "Couldn't save the change.");
      }
    };

    // Cover: image when set, else a dashed placeholder. Both open the same menu.
    const cover = hero.createDiv({ cls: "inkswell-hero__cover" });
    const src = resolveCoverSrc(this.app, overview.cover);
    if (src) {
      const img = cover.createEl("img", { cls: "inkswell-hero__img" });
      img.src = src;
      img.alt = `${focused.draft.title} cover`;
    } else {
      cover.addClass("is-empty");
      cover.createSpan({ cls: "inkswell-hero__placeholder", text: "+ Add cover" });
    }
    cover.setAttribute("aria-label", "Set cover image");
    cover.onclick = (e) => this.coverMenu(base, !!src).showAtMouseEvent(e);

    // Meta column: title, logline, theme, target/progress.
    const meta = hero.createDiv({ cls: "inkswell-hero__meta" });
    meta.createDiv({ cls: "inkswell-hero__title", text: focused.draft.title });

    const field = (label: string, value: string | undefined, placeholder: string, save: (v: string) => void) => {
      const row = meta.createDiv({ cls: "inkswell-hero__field" });
      row.createDiv({ cls: "inkswell-hero__label", text: label });
      const input = row.createEl("input", { type: "text", cls: "inkswell-hero__input" });
      input.value = value ?? "";
      input.placeholder = placeholder;
      input.onchange = () => save(input.value.trim());
    };
    field("Logline", overview.logline, "One sentence: who wants what, against what odds…", (v) =>
      saveOverview({ logline: v })
    );
    field("Theme", overview.theme, "The deeper meaning / life lesson…", (v) => saveOverview({ theme: v }));

    this.renderHeroTarget(meta, focused, base);
  }

  /**
   * Inline word target + progress bar; `⋯` opens the full target modal
   * (deadline/pace). The target is story-level (read/written on `base`); the
   * progress words are the focused draft's own.
   */
  private renderHeroTarget(meta: HTMLElement, focused: Project, base: Project): void {
    const goals = base.inkswell?.goals;
    const target = typeof goals?.target === "number" && goals.target > 0 ? goals.target : 0;
    const indexFile = this.indexFile(base);

    const row = meta.createDiv({ cls: "inkswell-hero__field" });
    row.createDiv({ cls: "inkswell-hero__label", text: "Target" });
    const control = row.createDiv({ cls: "inkswell-hero__targetrow" });
    const input = control.createEl("input", { type: "number", cls: "inkswell-hero__input inkswell-hero__targetinput" });
    input.value = target ? String(target) : "";
    input.placeholder = "e.g. 80000";
    input.min = "0";
    input.onchange = () => {
      if (!indexFile) return;
      const n = Math.floor(Number(input.value));
      const val = Number.isFinite(n) && n > 0 ? n : undefined;
      void tryFileOp(
        () => persistInkswellData(this.app, indexFile, { goals: { ...base.inkswell?.goals, target: val } }),
        "Couldn't save the word target."
      );
    };
    control.createSpan({ cls: "inkswell-hero__unit", text: "words" });
    const more = control.createEl("button", { cls: "inkswell-hero__more", text: "⋯" });
    more.setAttribute("aria-label", "Deadline & pace");
    more.onclick = () => new TargetModal(this.app, base).open();

    if (!this.plugin.settings.showWordCounts) return;
    const bar = meta.createDiv({ cls: "inkswell-progress inkswell-hero__bar" });
    const fill = bar.createDiv({ cls: "inkswell-progress__fill" });
    const stat = meta.createDiv({ cls: "inkswell-hero__stat" });
    void this.stats.projectWords(focused).then((w) => {
      if (target > 0) {
        const pct = Math.min(100, Math.round((w / target) * 100));
        fill.style.width = `${pct}%`;
        stat.setText(`${w.toLocaleString()} / ${target.toLocaleString()} words · ${pct}%`);
      } else {
        bar.hide();
        stat.setText(`${w.toLocaleString()} words`);
      }
    });
  }

  /** Cover action menu: upload, pick from vault, and (when set) remove. */
  private coverMenu(project: Project, hasCover: boolean): Menu {
    const menu = new Menu();
    menu.addItem((i) =>
      i.setTitle("Upload…").setIcon("upload").onClick(() => this.uploadCover(project))
    );
    menu.addItem((i) =>
      i.setTitle("Choose from vault…").setIcon("image").onClick(() => void this.chooseCover(project))
    );
    if (hasCover) {
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Remove cover").setIcon("trash").onClick(() => void this.removeCover(project))
      );
    }
    return menu;
  }

  /** Open an OS file picker, copy the chosen image into the project folder, persist its path. */
  private uploadCover(project: Project): void {
    const input = createEl("input", { type: "file" });
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const indexFile = this.indexFile(project);
      if (!indexFile) return;
      try {
        const path = await setCoverFromUpload(this.app, project, file);
        await persistOverview(this.app, indexFile, { cover: path });
      } catch (e) {
        console.error(e);
        new Notice("Couldn't set the cover image.");
      }
    };
    input.click();
  }

  private async chooseCover(project: Project): Promise<void> {
    const file = await pickVaultImage(this.app);
    if (!file) return;
    const indexFile = this.indexFile(project);
    if (indexFile) {
      await tryFileOp(() => persistOverview(this.app, indexFile, { cover: file.path }), "Couldn't set the cover image.");
    }
  }

  private async removeCover(project: Project): Promise<void> {
    await tryFileOp(async () => {
      await cleanupOwnedCover(this.app, project);
      const indexFile = this.indexFile(project);
      if (indexFile) await persistOverview(this.app, indexFile, { cover: "" });
    }, "Couldn't remove the cover image.");
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
    attachRowMenu(header, right, () => this.projectMenu(project));

    this.renderReconcile(section, project);

    if (isMultiScene(project.draft)) {
      const list = section.createDiv();
      project.scenes.forEach((scene, index) =>
        this.renderScene(list, project, scene, index)
      );
      if (project.scenes.length === 0) {
        list.createDiv({
          cls: "inkswell-explorer__empty",
          text: "No scenes yet.",
        });
      }
    }
  }

  /**
   * Tier 2 recovery: when a project has missing scenes (index title with no
   * file) and/or orphan files (in the folder, not in the index) — usually from a
   * file renamed while the plugin was closed — surface them with one-click relink
   * options. Proposes; never silently guesses. Writes go through the index writer,
   * which triggers a store refresh that re-renders this banner away.
   */
  private renderReconcile(section: HTMLElement, project: Project): void {
    const { missing, orphans, autoMatch } = reconcileSuggestions(project);
    if (missing.length === 0 && orphans.length === 0) return;

    const box = section.createDiv({ cls: "inkswell-reconcile" });
    box.createDiv({ cls: "inkswell-reconcile__head", text: "Scene files out of sync" });
    box.createDiv({
      cls: "inkswell-reconcile__summary",
      text: `${plural(missing.length, "scene")} missing · ${plural(orphans.length, "unindexed file")} in this folder.`,
    });

    // Unambiguous 1:1 — offer the single obvious relink and stop.
    if (autoMatch) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({
        cls: "inkswell-reconcile__label",
        text: `“${autoMatch.oldTitle}” looks renamed to “${autoMatch.newBasename}”.`,
      });
      const btn = row.createEl("button", { cls: "mod-cta", text: "Relink" });
      btn.onclick = () => void this.relink(project, autoMatch.oldTitle, autoMatch.newBasename);
      return;
    }

    for (const title of missing) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({ cls: "inkswell-reconcile__label", text: `Missing: ${title}` });
      if (orphans.length > 0) {
        const sel = row.createEl("select", { cls: "dropdown" });
        for (const o of orphans) sel.createEl("option", { text: o, value: o });
        const relink = row.createEl("button", { text: "Relink to…" });
        relink.onclick = () => void this.relink(project, title, sel.value);
      }
      const rm = row.createEl("button", { text: "Remove from project" });
      rm.onclick = () => void this.removeFromProject(project, title);
    }
    for (const basename of orphans) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({ cls: "inkswell-reconcile__label", text: `Unindexed: ${basename}` });
      const add = row.createEl("button", { text: "Add as scene" });
      add.onclick = () => void this.addAsScene(project, basename);
      const ign = row.createEl("button", { text: "Ignore" });
      ign.onclick = () => void this.ignoreFile(project, basename);
    }
  }

  /** Rewrite a scene's index title to a file's basename (the relink/heal transform). */
  private async relink(project: Project, oldTitle: string, newBasename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    await tryFileOp(async () => {
      await updateScenes(this.app, file, project.draft, (scenes) =>
        scenes.map((s) => (s.title === oldTitle ? { ...s, title: newBasename } : s))
      );
      // Beats link scenes by title; keep them pointing at the relinked scene.
      const beats = renameSceneInBeats(project.inkswell?.beats, oldTitle, newBasename);
      if (beats) await persistInkswellData(this.app, file, { beats });
    }, "Couldn't relink the scene.");
  }

  private async removeFromProject(project: Project, title: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    await tryFileOp(
      () => updateScenes(this.app, file, project.draft, (scenes) => removeScene(scenes, title)),
      "Couldn't remove the scene from the project."
    );
  }

  private async addAsScene(project: Project, basename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    await tryFileOp(
      () => updateScenes(this.app, file, project.draft, (scenes) => addScene(scenes, basename)),
      "Couldn't add the scene."
    );
  }

  /** Add an orphan file to the project's `ignoredFiles` so it stops being flagged. */
  private async ignoreFile(project: Project, basename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file || !isMultiScene(project.draft)) return;
    // Capture the narrowed draft: inside the closure TS would re-widen
    // `project.draft` to the Draft union and lose `ignoredFiles`.
    const draft = project.draft;
    await tryFileOp(
      () => persistDraft(this.app, file, { ...draft, ignoredFiles: [...draft.ignoredFiles, basename] }),
      "Couldn't ignore the file."
    );
  }

  /** Right-click menu on a project header: series membership. */
  private projectMenu(project: Project): Menu {
    const menu = new Menu();
    const file = this.indexFile(project);
    if (!file) return menu;
    const info = projectSeries(project);

    menu.addItem((i) =>
      i
        .setTitle(info ? "Change series…" : "Add to series…")
        .setIcon("library")
        .onClick(() => void this.setSeries(project, file))
    );
    if (info) {
      menu.addItem((i) =>
        i
          .setTitle("Set book number…")
          .setIcon("list-ordered")
          .onClick(() => void this.setBookNumber(project, file))
      );
      menu.addItem((i) =>
        i
          .setTitle("Remove from series")
          .setIcon("link-2-off")
          .onClick(() => void tryFileOp(() => writeSeries(this.app, file, null), "Couldn't remove the book from the series."))
      );
    }
    return menu;
  }

  private async setSeries(project: Project, file: TFile): Promise<void> {
    const cur = projectSeries(project);
    const name = await promptText(this.app, {
      title: "Series name",
      value: cur?.name ?? "",
      multiline: false,
      cta: "Save",
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      await tryFileOp(() => writeSeries(this.app, file, null), "Couldn't update the series.");
      return;
    }
    // A book that's alone in its series is Book 1 by default; joining a series
    // that already has other books keeps any existing number (set via the menu).
    const others = this.store
      .getProjects()
      .filter((p) => p.vaultPath !== project.vaultPath && projectSeries(p)?.name === trimmed);
    const order = others.length === 0 ? 1 : cur?.order;
    await tryFileOp(() => writeSeries(this.app, file, { name: trimmed, order }), "Couldn't update the series.");
  }

  private async setBookNumber(project: Project, file: TFile): Promise<void> {
    const cur = projectSeries(project);
    if (!cur) return;
    const raw = await promptText(this.app, {
      title: "Book number",
      value: cur.order != null ? String(cur.order) : "",
      multiline: false,
      cta: "Save",
    });
    if (raw === null) return;
    const n = Math.floor(Number(raw));
    await tryFileOp(
      () => writeSeries(this.app, file, { name: cur.name, order: Number.isFinite(n) && n > 0 ? n : undefined }),
      "Couldn't set the book number."
    );
  }

  private renderScene(
    parent: HTMLElement,
    project: Project,
    scene: Project["scenes"][number],
    index: number
  ): void {
    const row = parent.createDiv({ cls: "inkswell-scene" });
    row.style.paddingLeft = `${8 + scene.indent * 16}px`;
    row.draggable = true;
    if (scene.path) {
      row.dataset.scenePath = scene.path;
      if (scene.path === this.activeScenePath) row.addClass("is-active");
    }

    const title = row.createSpan({ cls: "inkswell-scene__title", text: scene.title });
    if (!scene.path) {
      title.addClass("inkswell-scene__missing");
      title.setAttribute("aria-label", "Scene file not found");
    }

    // Status badge + color tint from the scene's own frontmatter.
    if (scene.path) {
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) {
        const meta = readSceneMeta(this.app, file);
        if (meta.color) row.style.borderLeft = `3px solid ${meta.color}`;
        if (meta.inactive) row.addClass("is-inactive");
        if (meta.status) {
          row.createSpan({
            cls: `inkswell-status inkswell-status--${meta.status}`,
            text: statusLabel(meta.status),
          });
        }
      }
    }

    if (this.plugin.settings.showWordCounts && scene.path) {
      const wc = row.createSpan({ cls: "inkswell-scene__count" });
      void this.stats.sceneWords(scene.path).then((w) => wc.setText(`${w}`));
    }

    // Click selects the scene (the host shows it in the Inspector). It no longer
    // opens the note — use the Inspector's "Open in tab" button for that.
    row.onclick = () => {
      if (!scene.path) return;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) this.onSelectScene(file);
    };

    // Right-click (desktop) / "⋯" tap (touch) → scene menu. On touch the menu
    // also carries Move up / Move down (drag-drop doesn't fire on touch).
    attachRowMenu(row, row, () => {
      const menu = this.sceneMenu(project, index);
      this.addReorderItems(menu, project, index);
      return menu;
    });

    this.wireDrag(row, project, index);
  }

  private sceneMenu(project: Project, index: number): Menu {
    const menu = new Menu();
    const file = this.indexFile(project);
    if (!file) return menu;

    menu.addItem((i) =>
      i
        .setTitle("Indent (nest)")
        .setIcon("indent")
        .onClick(() =>
          void tryFileOp(
            () => updateScenes(this.app, file, project.draft, (s) => indentScene(s, index)),
            "Couldn't indent the scene."
          )
        )
    );
    menu.addItem((i) =>
      i
        .setTitle("Unindent")
        .setIcon("outdent")
        .onClick(() =>
          void tryFileOp(
            () => updateScenes(this.app, file, project.draft, (s) => unindentScene(s, index)),
            "Couldn't unindent the scene."
          )
        )
    );
    // Scene-content actions (edit synopsis, rename, delete) when the file exists.
    const scene = project.scenes[index];
    const sceneFile = scene?.path
      ? this.app.vault.getAbstractFileByPath(scene.path)
      : null;
    if (scene && sceneFile instanceof TFile) {
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Edit scene…")
          .setIcon("settings-2")
          .onClick(() => new EditSceneModal(this.app, sceneFile, project, this.plugin).open())
      );
      menu.addItem((i) =>
        i
          .setTitle("Edit synopsis…")
          .setIcon("text")
          .onClick(() => void editSynopsis(this.app, sceneFile))
      );
      menu.addItem((i) =>
        i
          .setTitle("Rename…")
          .setIcon("pencil")
          .onClick(() => void renameScene(this.app, project, scene.title, sceneFile))
      );
    }

    menu.addSeparator();
    menu.addItem((i) =>
      i
        .setTitle("Remove from project (keep file)")
        .setIcon("link-2-off")
        .onClick(() => {
          if (scene?.title) {
            void tryFileOp(
              () => updateScenes(this.app, file, project.draft, (s) => removeScene(s, scene.title)),
              "Couldn't remove the scene from the project."
            );
          }
        })
    );
    if (scene && sceneFile instanceof TFile) {
      menu.addItem((i) =>
        i
          .setTitle("Delete scene")
          .setIcon("trash")
          .onClick(() => void deleteScene(this.app, project, scene.title, sceneFile))
      );
    }
    return menu;
  }

  private wireDrag(row: HTMLElement, project: Project, index: number): void {
    row.addEventListener("dragstart", (e) => {
      row.addClass("is-dragging");
      e.dataTransfer?.setData(
        "inkswell/scene",
        JSON.stringify({ project: project.vaultPath, index })
      );
    });
    row.addEventListener("dragend", () => row.removeClass("is-dragging"));
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.addClass("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.removeClass("is-drop-target"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.removeClass("is-drop-target");
      const raw = e.dataTransfer?.getData("inkswell/scene");
      if (!raw) return;
      const payload = JSON.parse(raw) as { project: string; index: number };
      if (payload.project !== project.vaultPath) return; // only within a project
      const file = this.indexFile(project);
      if (!file) return;
      void tryFileOp(
        () => updateScenes(this.app, file, project.draft, (s) => moveScene(s, payload.index, index)),
        "Couldn't reorder the scene."
      );
    });
  }

  /**
   * Touch fallback for drag-reorder (drag events don't fire on touch): Move up /
   * Move down, routed through the same `moveScene`/`updateScenes` write path the
   * drop handler uses, so behavior (and nesting) stays identical.
   */
  private addReorderItems(menu: Menu, project: Project, index: number): void {
    const file = this.indexFile(project);
    if (!file) return;
    const last = project.scenes.length - 1;
    if (index <= 0 && index >= last) return; // nothing to move
    menu.addSeparator();
    if (index > 0) {
      menu.addItem((i) =>
        i
          .setTitle("Move up")
          .setIcon("arrow-up")
          .onClick(() =>
            void tryFileOp(
              () => updateScenes(this.app, file, project.draft, (s) => moveScene(s, index, index - 1)),
              "Couldn't move the scene."
            )
          )
      );
    }
    if (index < last) {
      menu.addItem((i) =>
        i
          .setTitle("Move down")
          .setIcon("arrow-down")
          .onClick(() =>
            void tryFileOp(
              () => updateScenes(this.app, file, project.draft, (s) => moveScene(s, index, index + 1)),
              "Couldn't move the scene."
            )
          )
      );
    }
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
