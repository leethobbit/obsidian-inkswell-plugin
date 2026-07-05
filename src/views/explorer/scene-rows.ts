/**
 * Scene-row rendering for the Explorer panel's scene tree: status badge,
 * drag-reorder, indent/unindent, touch move up/down, and the per-scene
 * context menu. Extracted from explorer-view.ts.
 */

import { App, Menu, TFile } from "obsidian";
import { attachRowMenu } from "../../lib/row-menu";
import { tryFileOp } from "../../lib/notify";
import { updateScenes } from "../../projects/index-writer";
import { ProjectStats } from "../../projects/project-stats";
import {
  indentScene,
  moveScene,
  removeScene,
  unindentScene,
} from "../../projects/scene-tree";
import { Project } from "../../projects/types";
import { deleteScene, editSynopsis, renameScene } from "../../scenes/scene-actions";
import { EditSceneModal } from "../../scenes/edit-scene-modal";
import { readSceneMeta, statusLabel } from "../../scenes/scene-meta";
import type InkswellPlugin from "../../../main";

export class SceneRows {
  private app: App;
  private plugin: InkswellPlugin;
  private stats: ProjectStats;
  /** Called when a scene row is clicked — selects it (the host drives the Inspector). */
  private onSelectScene: (file: TFile) => void;

  constructor(
    app: App,
    plugin: InkswellPlugin,
    stats: ProjectStats,
    onSelectScene: (file: TFile) => void
  ) {
    this.app = app;
    this.plugin = plugin;
    this.stats = stats;
    this.onSelectScene = onSelectScene;
  }

  render(
    parent: HTMLElement,
    project: Project,
    scene: Project["scenes"][number],
    index: number,
    activeScenePath: string | null
  ): void {
    const row = parent.createDiv({ cls: "inkswell-scene" });
    row.style.paddingLeft = `${8 + scene.indent * 16}px`;
    row.draggable = true;
    if (scene.path) {
      row.dataset.scenePath = scene.path;
      if (scene.path === activeScenePath) row.addClass("is-active");
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
