/**
 * Kanban board (Plan → Structure → Board): the active project's scenes as cards
 * grouped into columns. Status/POV are flat scene fields — a drop writes the
 * field. Act/Chapter are STRUCTURAL: columns derive from the outline tree (the
 * same authoritative model the Tree and Grid render, so empty chapters/acts
 * show as columns) and a drop is an outline move via moveScene/applyOutline —
 * the manuscript reorders, chapters stay contiguous, and all three Structure
 * views agree. Click a card to open the scene's metadata window.
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { tryFileOp } from "../lib/notify";
import { addSceneMenuItems } from "../scenes/scene-actions";
import { promptNewScene } from "./create-scene";
import { EditSceneModal } from "../scenes/edit-scene-modal";
import { readSceneMeta, statusLabel, writeSceneMeta } from "../scenes/scene-meta";
import { renderEmptyState, renderEmptyStateAction } from "../views/panel-kit";
import { applyOutline } from "./apply-outline";
import { OutlineTree, buildOutline, moveScene } from "./outline";
import {
  BoardColumn,
  BoardItem,
  GroupField,
  buildColumns,
  buildOutlineColumns,
  resolveActDrop,
} from "./board";
import type InkswellPlugin from "../../main";

const FIELDS: { id: GroupField; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "act", label: "Act" },
  { id: "chapter", label: "Chapter" },
  { id: "pov", label: "POV" },
];

export class BoardPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;
  private field: GroupField = "status";
  /** Columns from the most recent render — reused by the touch "Move to…" menu. */
  private columns: BoardColumn[] = [];

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
      renderEmptyState(container, "No multi-scene projects to board.");
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
        chapter: m.chapter,
        pov: m.pov,
        synopsis: m.synopsis,
        color: m.color,
      });
    }

    if (items.length === 0) {
      renderEmptyStateAction(container, "No scenes yet — cards appear here as you create scenes.", [
        { label: "New scene", cta: true, onClick: () => promptNewScene(this.app, this.store, project) },
        { label: "Go to Beats", onClick: () => void this.plugin.openBeats() },
      ]);
      return;
    }

    const cols =
      this.field === "act" || this.field === "chapter"
        ? buildOutlineColumns(this.outlineOf(project, items), this.field, items)
        : buildColumns(items, this.field);
    this.columns = cols;
    const board = container.createDiv({ cls: "inkswell-board__cols" });
    for (const col of cols) this.renderColumn(board, col, project);
  }

  /** The project's outline tree — the structural model act/chapter columns and
   *  drops operate on (identical inputs to the Tree and Grid). */
  private outlineOf(project: Project, items: BoardItem[]): OutlineTree {
    const metaByPath = new Map(items.map((it) => [it.path, it] as const));
    const scenes = project.scenes.map((s) => {
      const m = s.path ? metaByPath.get(s.path) : undefined;
      return { title: s.title, path: s.path, indent: s.indent, chapter: m?.chapter, act: m?.act };
    });
    return buildOutline(project.inkswell?.acts, project.inkswell?.chapters, scenes);
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
    add.onclick = () => promptNewScene(this.app, this.store, project);
  }

  private renderColumn(board: HTMLElement, col: BoardColumn, project: Project): void {
    const el = board.createDiv({ cls: "inkswell-board__col" });
    const head = el.createDiv({ cls: "inkswell-board__colhead" });
    head.createSpan({ text: `${col.label} (${col.items.length})` });
    // Structural context (a chapter column's act) as a muted second line.
    if (col.sub) head.createDiv({ cls: "inkswell-board__colsub", text: col.sub });
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
      if (path) this.assign(path, col.key, project);
    });

    for (const it of col.items) this.renderCard(list, it, project);
  }

  private renderCard(list: HTMLElement, it: BoardItem, project: Project): void {
    const card = list.createDiv({ cls: "inkswell-board__card" });
    card.draggable = true;
    if (it.color) card.style.borderLeft = `3px solid ${it.color}`;
    const head = card.createDiv({ cls: "inkswell-board__cardhead" });
    head.createDiv({ cls: "inkswell-board__cardtitle", text: it.title });
    // Status badge on every card EXCEPT when grouping by status (where the column
    // already conveys it). Lets you read each scene's status while grouped by act,
    // chapter, or POV.
    if (this.field !== "status" && it.status) {
      head.createSpan({
        cls: `inkswell-status inkswell-status--${it.status}`,
        text: statusLabel(it.status),
      });
    }
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
    const file = this.app.vault.getAbstractFileByPath(it.path);
    if (file instanceof TFile) {
      attachRowMenu(card, head, () => {
        const menu = new Menu();
        addSceneMenuItems(menu, this.app, project, it.title, file, {
          includeOpen: true,
          plugin: this.plugin,
        });
        // Touch fallback for drag-drop: move this card to another column.
        this.addMoveToColumnItems(menu, it, project);
        return menu;
      });
    }
  }

  /** The key of the column a card currently sits in — read off the rendered
   *  columns themselves, so it's correct for flat AND structural groupings. */
  private currentColumnKey(it: BoardItem): string {
    return this.columns.find((c) => c.items.some((x) => x.path === it.path))?.key ?? "";
  }

  /**
   * Touch fallback for drag-drop (drag events don't fire on touch): append a
   * "Move to <other column>" item for each column other than the card's own,
   * reusing the exact columns the user sees and the same `assign` write path.
   */
  private addMoveToColumnItems(menu: Menu, it: BoardItem, project: Project): void {
    if (this.columns.length <= 1) return;
    const currentKey = this.currentColumnKey(it);
    menu.addSeparator();
    for (const col of this.columns) {
      if (col.key === currentKey) continue;
      menu.addItem((i) =>
        i
          .setTitle(`Move to: ${col.label}`)
          .setIcon("corner-up-right")
          .onClick(() => this.assign(it.path, col.key, project))
      );
    }
  }

  private assign(path: string, key: string, project: Project): void {
    // Dropping a card back on its own column is a no-op — for structural
    // groupings a move would otherwise reorder the scene to the chapter's end.
    const current = this.columns.find((c) => c.items.some((x) => x.path === path));
    if (current && current.key === key) return;

    if (this.field === "act" || this.field === "chapter") {
      this.assignStructural(path, key, project);
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const value = key || undefined;
    const patch =
      this.field === "status" ? { status: value as BoardItem["status"] } : { pov: value };
    // Writing the scene frontmatter triggers a store refresh → host re-renders.
    void tryFileOp(() => writeSceneMeta(this.app, file, patch), "Couldn't move the card.");
  }

  /**
   * Act/chapter drops are outline moves, not field writes: route through
   * moveScene + applyOutline so the manuscript reorders, chapters stay
   * contiguous, and the Tree/Grid show the same structure.
   */
  private assignStructural(path: string, key: string, project: Project): void {
    const sceneTitle = project.scenes.find((s) => s.path === path)?.title;
    const indexFile = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!sceneTitle || !(indexFile instanceof TFile)) return;

    // Rebuild the tree from current metadata (don't trust render-time state).
    const items: BoardItem[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const m = readSceneMeta(this.app, file);
      items.push({ title: scene.title, path: scene.path, act: m.act, chapter: m.chapter });
    }
    const tree = this.outlineOf(project, items);

    let targetChapterId: string | null;
    if (!key) {
      targetChapterId = null; // None column → unassign from any chapter
    } else if (this.field === "chapter") {
      targetChapterId = key;
    } else {
      const res = resolveActDrop(tree, sceneTitle, key);
      if (res.kind === "noop") return;
      if (res.kind === "empty-act") {
        const label = this.columns.find((c) => c.key === key)?.label ?? "That act";
        new Notice(`${label} has no chapters yet — add one in the Tree first.`);
        return;
      }
      targetChapterId = res.chapterId;
    }

    const next = moveScene(tree, sceneTitle, targetChapterId);
    if (next === tree) return; // scene/chapter not found — nothing to write
    // applyOutline persists everything (scene strings, manuscript order, config)
    // and the store notify re-renders every Structure view consistently.
    void applyOutline(this.app, indexFile, project, next);
  }
}
