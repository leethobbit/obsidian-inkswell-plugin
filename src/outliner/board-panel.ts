/**
 * Kanban board (Plan → Board): the active project's scenes as cards grouped into
 * columns by status, act, or POV. Drag a card to a column to set that field on
 * the scene (writes the scene's frontmatter). Click a card to open the scene.
 *
 * Grouping logic is the pure `buildColumns` in board.ts; this panel only gathers
 * scene metadata and renders/handles drag.
 */

import { App, Menu, TFile } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { addSceneMenuItems } from "../scenes/scene-actions";
import { promptNewScene } from "./create-scene";
import { EditSceneModal } from "../scenes/edit-scene-modal";
import { readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { BoardColumn, BoardItem, GroupField, buildColumns } from "./board";
import type InkswellPlugin from "../../main";

const FIELDS: { id: GroupField; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "act", label: "Act" },
  { id: "pov", label: "POV" },
];

export class BoardPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;
  private field: GroupField = "status";

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = active;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-board");

    const projects = this.store
      .getProjects()
      .filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({
        cls: "inkswell-stats__muted",
        text: "No multi-scene projects to board.",
      });
      return;
    }

    this.renderToolbar(container, project);

    const items: BoardItem[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const m = readSceneMeta(this.app, file);
      items.push({
        title: scene.title,
        path: scene.path,
        status: m.status,
        act: m.act,
        pov: m.pov,
        synopsis: m.synopsis,
        color: m.color,
      });
    }

    const cols = buildColumns(items, this.field);
    const board = container.createDiv({ cls: "inkswell-board__cols" });
    for (const col of cols) this.renderColumn(board, col, project);
  }

  private renderToolbar(root: HTMLElement, project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-board__toolbar" });
    bar.createSpan({ cls: "inkswell-stats__muted", text: "Group by:" });
    const fsel = bar.createEl("select", { cls: "dropdown" });
    for (const f of FIELDS) {
      const o = fsel.createEl("option", { text: f.label, value: f.id });
      if (f.id === this.field) o.selected = true;
    }
    fsel.onchange = () => {
      this.field = fsel.value as GroupField;
      this.rerender();
    };

    const add = bar.createEl("button", { text: "New scene" });
    add.setAttribute("aria-label", "Create a new scene");
    add.onclick = () => void promptNewScene(this.app, this.store, project);
  }

  private renderColumn(board: HTMLElement, col: BoardColumn, project: Project): void {
    const el = board.createDiv({ cls: "inkswell-board__col" });
    el.createDiv({
      cls: "inkswell-board__colhead",
      text: `${col.label} (${col.items.length})`,
    });
    const list = el.createDiv({ cls: "inkswell-board__list" });

    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.addClass("is-drop");
    });
    el.addEventListener("dragleave", () => el.removeClass("is-drop"));
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.removeClass("is-drop");
      const path = e.dataTransfer?.getData("inkswell/card");
      if (path) this.assign(path, col.key);
    });

    for (const it of col.items) this.renderCard(list, it, project);
  }

  private renderCard(list: HTMLElement, it: BoardItem, project: Project): void {
    const card = list.createDiv({ cls: "inkswell-board__card" });
    card.draggable = true;
    if (it.color) card.style.borderLeft = `3px solid ${it.color}`;
    card.createDiv({ cls: "inkswell-board__cardtitle", text: it.title });
    if (it.synopsis) {
      card.createDiv({ cls: "inkswell-board__cardsyn", text: it.synopsis });
    }
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("inkswell/card", it.path);
      card.addClass("is-dragging");
    });
    card.addEventListener("dragend", () => card.removeClass("is-dragging"));
    card.onclick = () => {
      const file = this.app.vault.getAbstractFileByPath(it.path);
      // Click opens the scene's metadata window (not a random editor tab) — the
      // modal carries "Open in tab" / "Open in Write" for explicit navigation.
      if (file instanceof TFile) new EditSceneModal(this.app, file, project, this.plugin).open();
    };
    card.oncontextmenu = (e) => {
      e.preventDefault();
      const file = this.app.vault.getAbstractFileByPath(it.path);
      if (!(file instanceof TFile)) return;
      const menu = new Menu();
      addSceneMenuItems(menu, this.app, project, it.title, file, { includeOpen: true, plugin: this.plugin });
      menu.showAtMouseEvent(e);
    };
  }

  private assign(path: string, key: string): void {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const value = key || undefined;
    const patch =
      this.field === "status"
        ? { status: value as BoardItem["status"] }
        : this.field === "act"
          ? { act: value }
          : { pov: value };
    // Writing the scene frontmatter triggers a store refresh → host re-renders.
    void writeSceneMeta(this.app, file, patch);
  }
}
