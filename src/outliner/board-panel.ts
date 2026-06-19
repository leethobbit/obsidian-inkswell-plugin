/**
 * Kanban board (Plan → Board): the active project's scenes as cards grouped into
 * columns by status, act, or POV. Drag a card to a column to set that field on
 * the scene (writes the scene's frontmatter). Click a card to open the scene.
 *
 * Grouping logic is the pure `buildColumns` in board.ts; this panel only gathers
 * scene metadata and renders/handles drag.
 */

import { App, Menu, TFile } from "obsidian";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { addSceneMenuItems, openScene } from "../scenes/scene-actions";
import { readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { BoardColumn, BoardItem, GroupField, buildColumns } from "./board";

const FIELDS: { id: GroupField; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "act", label: "Act" },
  { id: "pov", label: "POV" },
];

export class BoardPanel {
  private app: App;
  private store: ProjectStore;
  private container: HTMLElement | null = null;
  private selectedPath: string | null = null;
  private field: GroupField = "status";

  constructor(app: App, store: ProjectStore) {
    this.app = app;
    this.store = store;
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
    if (projects.length === 0) {
      container.createDiv({
        cls: "inkswell-stats__muted",
        text: "No multi-scene projects to board.",
      });
      return;
    }
    const project =
      projects.find((p) => p.vaultPath === this.selectedPath) ?? projects[0];
    this.selectedPath = project.vaultPath;

    this.renderToolbar(container, projects, project);

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

  private renderToolbar(root: HTMLElement, projects: Project[], project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-board__toolbar" });
    if (projects.length > 1) {
      const sel = bar.createEl("select", { cls: "dropdown" });
      for (const p of projects) {
        const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
        if (p.vaultPath === project.vaultPath) o.selected = true;
      }
      sel.onchange = () => {
        this.selectedPath = sel.value;
        this.rerender();
      };
    }
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
      if (file instanceof TFile) openScene(this.app, file);
    };
    card.oncontextmenu = (e) => {
      e.preventDefault();
      const file = this.app.vault.getAbstractFileByPath(it.path);
      if (!(file instanceof TFile)) return;
      const menu = new Menu();
      addSceneMenuItems(menu, this.app, project, it.title, file, { includeOpen: true });
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
