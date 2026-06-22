/**
 * Projects panel: lists every project and its scene tree. Rendered inside the
 * single Inkswell host view (see src/views/inkswell-view.ts), not as its own tab.
 *
 * Scenes can be opened (click), reordered (drag), and re-nested (context menu).
 * All structural edits go through the index writer, which touches only the index
 * note's frontmatter — never a scene body.
 */

import { App, Menu, TFile } from "obsidian";
import { updateScenes, writeSeries } from "../../projects/index-writer";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import {
  indentScene,
  moveScene,
  removeScene,
  unindentScene,
} from "../../projects/scene-tree";
import { Project, isMultiScene } from "../../projects/types";
import { Series, groupIntoSeries, projectSeries } from "../../series/series";
import { deleteScene, editSynopsis, promptText, renameScene } from "../../scenes/scene-actions";
import { EditSceneModal } from "../../scenes/edit-scene-modal";
import { readSceneMeta, statusLabel } from "../../scenes/scene-meta";
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

    this.renderIdeas(container);

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({
        cls: "inkswell-explorer__empty",
        text: 'No writing projects yet. Click "New project" above to create one (or add a `longform` key to a note\'s frontmatter).',
      });
      return;
    }

    const { series, standalone } = groupIntoSeries(projects);
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
    for (const book of series.books) {
      words += await this.stats.projectWords(book);
      const t = book.inkswell?.goals?.target;
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

  private renderProject(parent: HTMLElement, project: Project): void {
    const section = parent.createDiv({ cls: "inkswell-project" });
    const header = section.createDiv({ cls: "inkswell-project__header" });
    const info = projectSeries(project);
    const title = info?.order != null ? `${info.order}. ${project.draft.title}` : project.draft.title;
    header.createSpan({ text: title });
    header.oncontextmenu = (e) => {
      e.preventDefault();
      this.projectMenu(project).showAtMouseEvent(e);
    };

    const right = header.createDiv();
    const count = right.createSpan({ cls: "inkswell-project__count" });
    if (this.plugin.settings.showWordCounts) {
      this.stats.projectWords(project).then((w) => {
        count.setText(`${w.toLocaleString()} words`);
      });
    }

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
          .onClick(() => void writeSeries(this.app, file, null))
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
      await writeSeries(this.app, file, null);
      return;
    }
    // A book that's alone in its series is Book 1 by default; joining a series
    // that already has other books keeps any existing number (set via the menu).
    const others = this.store
      .getProjects()
      .filter((p) => p.vaultPath !== project.vaultPath && projectSeries(p)?.name === trimmed);
    const order = others.length === 0 ? 1 : cur?.order;
    await writeSeries(this.app, file, { name: trimmed, order });
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
    await writeSeries(this.app, file, {
      name: cur.name,
      order: Number.isFinite(n) && n > 0 ? n : undefined,
    });
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
      this.stats.sceneWords(scene.path).then((w) => wc.setText(`${w}`));
    }

    // Click selects the scene (the host shows it in the Inspector). It no longer
    // opens the note — use the Inspector's "Open in tab" button for that.
    row.onclick = () => {
      if (!scene.path) return;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) this.onSelectScene(file);
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      this.sceneMenu(project, index).showAtMouseEvent(e);
    };

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
          updateScenes(this.app, file, project.draft, (s) => indentScene(s, index))
        )
    );
    menu.addItem((i) =>
      i
        .setTitle("Unindent")
        .setIcon("outdent")
        .onClick(() =>
          updateScenes(this.app, file, project.draft, (s) => unindentScene(s, index))
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
          .onClick(() => new EditSceneModal(this.app, sceneFile).open())
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
            updateScenes(this.app, file, project.draft, (s) =>
              removeScene(s, scene.title)
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
      updateScenes(this.app, file, project.draft, (s) =>
        moveScene(s, payload.index, index)
      );
    });
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
