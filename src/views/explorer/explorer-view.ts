/**
 * Projects panel: lists every project and its scene tree. Rendered inside the
 * single Inkswell host view (see src/views/inkswell-view.ts), not as its own tab.
 *
 * Scenes can be opened (click), reordered (drag), and re-nested (context menu).
 * All structural edits go through the index writer, which touches only the index
 * note's frontmatter — never a scene body.
 */

import { App, Menu, TFile } from "obsidian";
import { updateScenes } from "../../projects/index-writer";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import {
  indentScene,
  moveScene,
  removeScene,
  unindentScene,
} from "../../projects/scene-tree";
import { Project, isMultiScene } from "../../projects/types";
import { deleteScene, editSynopsis, renameScene } from "../../scenes/scene-actions";
import { readSceneMeta, statusLabel } from "../../scenes/scene-meta";
import type InkswellPlugin from "../../../main";

export class ExplorerPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private stats: ProjectStats;

  constructor(
    app: App,
    plugin: InkswellPlugin,
    store: ProjectStore,
    stats: ProjectStats
  ) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.stats = stats;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-explorer");

    this.renderIdeas(container);

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({
        cls: "inkswell-explorer__empty",
        text: "No writing projects found. Add a `longform` key to a note's frontmatter to begin.",
      });
      return;
    }

    for (const project of projects) {
      this.renderProject(container, project);
    }
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
    header.createSpan({ text: project.draft.title });

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

  private renderScene(
    parent: HTMLElement,
    project: Project,
    scene: Project["scenes"][number],
    index: number
  ): void {
    const row = parent.createDiv({ cls: "inkswell-scene" });
    row.style.paddingLeft = `${8 + scene.indent * 16}px`;
    row.draggable = true;

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

    row.onclick = () => {
      if (scene.path) {
        const file = this.app.vault.getAbstractFileByPath(scene.path);
        if (file instanceof TFile) this.openScene(file);
      }
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      this.sceneMenu(project, index).showAtMouseEvent(e);
    };

    this.wireDrag(row, project, index);
  }

  /**
   * Open a scene in a separate editor tab, leaving the Inkswell host tab intact.
   * Reuses an existing markdown editor leaf (never the host, which is type
   * "inkswell") so repeated clicks don't pile up tabs.
   * TODO: in-plugin manuscript editor — edit scenes inside the host tab instead.
   */
  private openScene(file: TFile): void {
    const editors = this.app.workspace.getLeavesOfType("markdown");
    const leaf = editors[0] ?? this.app.workspace.getLeaf("tab");
    leaf.openFile(file);
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
