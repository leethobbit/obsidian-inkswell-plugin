/**
 * Plan → Grid: the plotline × chapter matrix.
 *
 * Columns are the project's plotlines (`inkswell.plotlines`); rows are chapters
 * grouped under acts (the same Outline tree as Plan → Outline); cells are the
 * real scenes tagged with that plotline in that chapter. Everything derives from
 * scene frontmatter, so the grid can never drift from the manuscript. Grid logic
 * is the pure plotgrid.ts; this panel only gathers metadata and renders.
 *
 * Scale mechanisms (large books): Compact mode renders cells as presence dots
 * (auto-on for big grids), a column can be focused to isolate one plotline, and
 * act rows collapse to per-column aggregate dots.
 */

import { App, Menu, Notice, TFile, setIcon } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { attachRowMenu } from "../lib/row-menu";
import { promptNewScene } from "../outliner/create-scene";
import {
  PlotGrid,
  PlotGridRow,
  PlotGridScene,
  Plotline,
  addPlotlineTag,
  buildPlotGrid,
  isOrphanPlotline,
  movePlotline,
  removePlotline,
  removePlotlineTag,
  renamePlotlineTag,
  upsertPlotline,
} from "../outliner/plotgrid";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistPlotlines } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { EditSceneModal } from "../scenes/edit-scene-modal";
import { addSceneMenuItems, confirmDelete, promptText } from "../scenes/scene-actions";
import { SceneMeta, readSceneMeta, statusLabel, writeSceneMeta } from "../scenes/scene-meta";
import { COLORS } from "../scenes/scene-meta-form";
import { renderEmptyState } from "../views/panel-kit";
import type InkswellPlugin from "../../main";

const COLOR_NAMES: Record<string, string> = {
  "#e06c75": "Red",
  "#e5c07b": "Yellow",
  "#98c379": "Green",
  "#56b6c2": "Teal",
  "#61afef": "Blue",
  "#c678dd": "Purple",
};

/** Auto-switch to Compact when the grid is this big (Plottr Small-zoom precedent). */
const COMPACT_COLS = 8;
const COMPACT_CELLS = 300;

/** A visible column: the plotline plus its index into each row's `cells`. */
interface VisibleCol {
  col: Plotline;
  idx: number;
}

export class PlotGridPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;

  // View state that must survive host re-renders (panels are constructed once).
  /** Expanded chapter-row keys (chapters collapse to stacked cells by default). */
  private expanded = new Set<string>();
  /** Collapsed act keys (acts render expanded by default). */
  private collapsedActs = new Set<string>();
  /** User's Detail/Compact choice; null = auto by grid size. */
  private compactOverride: boolean | null = null;
  /** Focused plotline id (show only that column), or null. */
  private focus: string | null = null;

  private project: Project | null = null;
  private grid: PlotGrid | null = null;
  private visible: VisibleCol[] = [];

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
    container.addClass("inkswell-plotgrid");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project || !isMultiScene(project.draft)) {
      renderEmptyState(container, "The plot grid applies to multi-scene projects.");
      return;
    }
    this.project = project;

    const scenes: PlotGridScene[] = project.scenes.map((s) => {
      const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      const m = f instanceof TFile ? readSceneMeta(this.app, f) : {};
      return {
        title: s.title,
        path: s.path,
        chapter: m.chapter,
        act: m.act,
        plotlines: m.plotlines,
        status: m.status,
        synopsis: m.synopsis,
        color: m.color,
        inactive: m.inactive,
      };
    });
    const grid = buildPlotGrid(
      scenes,
      project.inkswell?.plotlines,
      project.inkswell?.chapters,
      project.inkswell?.acts
    );
    this.grid = grid;

    if (grid.columns.length === 0) {
      this.renderOnboarding(container);
      return;
    }

    // A focused plotline that no longer exists (renamed/deleted) clears itself.
    if (this.focus && !grid.columns.some((c) => c.id === this.focus)) this.focus = null;
    this.visible = grid.columns
      .map((col, idx) => ({ col, idx }))
      .filter((v) => !this.focus || v.col.id === this.focus);

    this.renderToolbar(container, grid);

    const scroller = container.createDiv({ cls: "inkswell-plotgrid__scroll" });
    const table = scroller.createDiv({ cls: "inkswell-plotgrid__table" });
    table.style.setProperty("--plotgrid-cols", String(this.visible.length));

    this.renderHeader(table, grid);

    const actTier = grid.byChapter && grid.groups.some((g) => g.title !== "");
    for (const group of grid.groups) {
      const collapsed = actTier && group.title !== "" && this.collapsedActs.has(group.key);
      if (actTier && group.title !== "") this.renderActRow(table, group.key, group.title, group.counts, collapsed);
      if (collapsed) continue;
      for (const row of group.rows) this.renderRow(table, row);
    }
  }

  /** Detail ⇄ Compact: the user's toggle wins; otherwise auto by grid size. */
  private isCompact(grid: PlotGrid): boolean {
    if (this.compactOverride !== null) return this.compactOverride;
    const rowCount = grid.groups.reduce((n, g) => n + g.rows.length, 0);
    return grid.columns.length > COMPACT_COLS || grid.columns.length * rowCount > COMPACT_CELLS;
  }

  // --- Empty state / toolbar -------------------------------------------------

  private renderOnboarding(container: HTMLElement): void {
    const box = container.createDiv({ cls: "inkswell-plotgrid__onboard" });
    box.createDiv({
      cls: "inkswell-stats__muted",
      text:
        "Track subplots and arcs across your chapters. Columns are plotlines; " +
        "cells are the scenes that advance them — so the grid always matches the manuscript.",
    });
    const btn = box.createEl("button", { text: "Create your first plotline", cls: "mod-cta" });
    btn.onclick = () => void this.addPlotline();
  }

  private renderToolbar(root: HTMLElement, grid: PlotGrid): void {
    const bar = root.createDiv({ cls: "inkswell-plotgrid__toolbar" });
    const add = bar.createEl("button", { text: "New plotline" });
    add.setAttribute("aria-label", "Create a new plotline");
    add.onclick = () => void this.addPlotline();

    const compact = this.isCompact(grid);
    const zoom = bar.createEl("button", { text: compact ? "Detail" : "Compact" });
    zoom.setAttribute(
      "aria-label",
      compact ? "Show scene cards in cells" : "Show cells as compact presence dots"
    );
    zoom.onclick = () => {
      this.compactOverride = !compact;
      this.rerender();
    };

    if (this.focus) {
      const col = grid.columns.find((c) => c.id === this.focus);
      const chip = bar.createSpan({ cls: "inkswell-chip inkswell-plotgrid__focuschip" });
      chip.createSpan({ text: `Focused: ${col?.title ?? ""}` });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => {
        this.focus = null;
        this.rerender();
      };
    }
  }

  // --- Header ------------------------------------------------------------------

  private renderHeader(table: HTMLElement, grid: PlotGrid): void {
    table.createDiv({ cls: "inkswell-plotgrid__corner" });
    for (const v of this.visible) {
      const head = table.createDiv({ cls: "inkswell-plotgrid__colhead" });
      if (isOrphanPlotline(v.col)) head.addClass("is-orphan");
      if (v.col.color) {
        const dot = head.createSpan({ cls: "inkswell-plotgrid__coldot" });
        dot.style.backgroundColor = v.col.color;
      }
      const label = head.createSpan({ cls: "inkswell-plotgrid__coltitle", text: v.col.title });
      head.createSpan({ cls: "inkswell-plotgrid__colcount", text: String(grid.totals[v.idx]) });
      if (isOrphanPlotline(v.col)) {
        head.setAttribute("title", "Tag found on scenes but not in your plotline list");
        head.createSpan({ cls: "inkswell-stats__muted", text: " (untracked)" });
      }
      // Click the title to focus the column (click again on the chip to clear).
      label.onclick = () => {
        this.focus = this.focus === v.col.id ? null : v.col.id;
        this.rerender();
      };

      // Reorder configured columns by dragging headers (horizontal positional drop).
      if (!isOrphanPlotline(v.col)) {
        head.draggable = true;
        head.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("inkswell/plotgrid-col", v.col.id);
          head.addClass("is-dragging");
        });
        head.addEventListener("dragend", () => head.removeClass("is-dragging"));
      }
      head.addEventListener("dragover", (e) => {
        if (!e.dataTransfer?.types.includes("inkswell/plotgrid-col") || isOrphanPlotline(v.col)) {
          // A scene chip dropped on a header adds that plotline (membership only).
          if (e.dataTransfer?.types.includes("inkswell/plotgrid-scene")) {
            e.preventDefault();
            head.addClass("is-drop");
          }
          return;
        }
        e.preventDefault();
        const r = head.getBoundingClientRect();
        head.removeClasses(["is-drop-left", "is-drop-right"]);
        head.addClass(e.clientX > r.left + r.width / 2 ? "is-drop-right" : "is-drop-left");
      });
      head.addEventListener("dragleave", () =>
        head.removeClasses(["is-drop", "is-drop-left", "is-drop-right"])
      );
      head.addEventListener("drop", (e) => {
        head.removeClasses(["is-drop", "is-drop-left", "is-drop-right"]);
        const colId = e.dataTransfer?.getData("inkswell/plotgrid-col");
        if (colId && !isOrphanPlotline(v.col)) {
          e.preventDefault();
          const r = head.getBoundingClientRect();
          const after = e.clientX > r.left + r.width / 2;
          this.persist(movePlotline(this.configured(), colId, v.col.id, after));
          return;
        }
        const payload = this.scenePayload(e);
        if (payload) {
          e.preventDefault();
          void this.moveMembership(payload.path, payload.from, v.col.title, null);
        }
      });

      attachRowMenu(head, head, () => this.columnMenu(v.col));
    }
  }

  private columnMenu(col: Plotline): Menu {
    const menu = new Menu();
    if (isOrphanPlotline(col)) {
      menu.addItem((i) =>
        i.setTitle("Add to plotlines").setIcon("plus").onClick(() => {
          this.persist(upsertPlotline(this.configured(), { title: col.title }));
        })
      );
      menu.addItem((i) =>
        i.setTitle("Remove tag from all scenes…").setIcon("trash").onClick(() => {
          void this.stripTagEverywhere(col.title);
        })
      );
      return menu;
    }
    menu.addItem((i) =>
      i.setTitle(this.focus === col.id ? "Clear focus" : "Focus").setIcon("eye").onClick(() => {
        this.focus = this.focus === col.id ? null : col.id;
        this.rerender();
      })
    );
    menu.addItem((i) => i.setTitle("Rename…").setIcon("pencil").onClick(() => void this.renamePlotline(col)));
    menu.addSeparator();
    for (const c of COLORS) {
      menu.addItem((i) =>
        i.setTitle(`Color: ${COLOR_NAMES[c] ?? c}`).setChecked(col.color === c).onClick(() => {
          this.persist(upsertPlotline(this.configured(), { id: col.id, title: col.title, color: c }));
        })
      );
    }
    if (col.color) {
      menu.addItem((i) =>
        i.setTitle("Clear color").onClick(() => {
          this.persist(upsertPlotline(this.configured(), { id: col.id, title: col.title, color: "" }));
        })
      );
    }
    menu.addSeparator();
    // Touch/keyboard fallback for header drag.
    const cfg = this.configured();
    const idx = cfg.findIndex((p) => p.id === col.id);
    if (idx > 0) {
      menu.addItem((i) =>
        i.setTitle("Move left").setIcon("arrow-left").onClick(() => {
          this.persist(movePlotline(cfg, col.id, cfg[idx - 1].id, false));
        })
      );
    }
    if (idx >= 0 && idx < cfg.length - 1) {
      menu.addItem((i) =>
        i.setTitle("Move right").setIcon("arrow-right").onClick(() => {
          this.persist(movePlotline(cfg, col.id, cfg[idx + 1].id, true));
        })
      );
    }
    menu.addItem((i) => i.setTitle("Delete…").setIcon("trash").onClick(() => void this.deletePlotline(col)));
    return menu;
  }

  // --- Rows ----------------------------------------------------------------------

  private renderActRow(
    table: HTMLElement,
    key: string,
    title: string,
    counts: number[],
    collapsed: boolean
  ): void {
    const label = table.createDiv({ cls: "inkswell-plotgrid__rowlabel is-act" });
    const chev = label.createSpan({ cls: "inkswell-plotgrid__chev" });
    setIcon(chev, collapsed ? "chevron-right" : "chevron-down");
    // Same label convention as the Outline's act rows ("Act — One").
    label.createSpan({ text: `Act — ${title}` });
    label.onclick = () => {
      if (this.collapsedActs.has(key)) this.collapsedActs.delete(key);
      else this.collapsedActs.add(key);
      this.rerender();
    };
    // Per-column aggregate dots keep the act glanceable even when collapsed.
    for (const v of this.visible) {
      const cell = table.createDiv({ cls: "inkswell-plotgrid__cell is-act" });
      const n = counts[v.idx];
      if (n > 0) {
        const dot = cell.createSpan({ cls: "inkswell-plotgrid__dot" });
        if (v.col.color) dot.style.backgroundColor = v.col.color;
        cell.createSpan({ cls: "inkswell-plotgrid__aggcount", text: String(n) });
      }
    }
  }

  private renderRow(table: HTMLElement, row: PlotGridRow): void {
    const grid = this.grid!;
    const compact = this.isCompact(grid);
    const isSceneRow = row.kind === "scene";
    const isExpanded = !isSceneRow && this.expanded.has(row.key);

    const label = table.createDiv({ cls: "inkswell-plotgrid__rowlabel" });
    if (row.kind === "planned") label.addClass("is-planned");
    if (isSceneRow) {
      const scene = row.scenes[0];
      const name = label.createSpan({ text: row.label });
      if (scene?.path) {
        name.addClass("is-link");
        name.onclick = () => this.plugin.openSceneInWrite(scene.path!);
      }
    } else {
      const chev = label.createSpan({ cls: "inkswell-plotgrid__chev" });
      setIcon(chev, isExpanded ? "chevron-down" : "chevron-right");
      label.createSpan({ text: row.label });
      if (row.kind === "planned") label.createSpan({ cls: "inkswell-stats__muted", text: " planned" });
      else label.createSpan({ cls: "inkswell-plotgrid__rowcount", text: String(row.scenes.length) });
      label.onclick = () => {
        if (this.expanded.has(row.key)) this.expanded.delete(row.key);
        else this.expanded.add(row.key);
        this.rerender();
      };
    }
    // Dropping a chip on a row label changes the scene's chapter only.
    if (row.chapterTitle !== undefined) this.chapterDropZone(label, row);

    if (isSceneRow) {
      const scene = row.scenes[0];
      for (const v of this.visible) this.renderToggleCell(table, scene, v);
      return;
    }

    for (const v of this.visible) {
      const cell = table.createDiv({ cls: "inkswell-plotgrid__cell" });
      const members = row.cells[v.idx];
      if (compact) {
        cell.addClass("is-compact");
        // Compact: presence dots; click expands the chapter for detail.
        if (members.length > 0) {
          cell.setAttribute("title", members.map((s) => s.title).join("\n"));
          for (const s of members) {
            const dot = cell.createSpan({ cls: "inkswell-plotgrid__dot" });
            const color = s.color ?? v.col.color;
            if (color) dot.style.backgroundColor = color;
            if (s.inactive) dot.addClass("is-inactive");
          }
        }
        cell.onclick = () => {
          this.expanded.add(row.key);
          this.compactOverride = false;
          this.rerender();
        };
      } else {
        for (const s of members) this.renderChip(cell, s, v.col);
        this.renderCellAdd(cell, row, v.col);
      }
      this.cellDropZone(cell, row, v.col);
    }

    if (isExpanded && !compact) {
      for (const scene of row.scenes) {
        const sub = table.createDiv({ cls: "inkswell-plotgrid__rowlabel is-scene" });
        const name = sub.createSpan({ text: scene.title });
        if (scene.path) {
          name.addClass("is-link");
          name.onclick = () => this.plugin.openSceneInWrite(scene.path!);
        }
        if (scene.status) {
          sub.createSpan({
            cls: `inkswell-status inkswell-status--${scene.status}`,
            text: statusLabel(scene.status),
          });
        }
        for (const v of this.visible) this.renderToggleCell(table, scene, v);
      }
    }
  }

  /**
   * A per-scene cell: the scene's chip when it's in this plotline, else a faint
   * dashed toggle — the fastest bulk-tagging surface (no drag needed).
   */
  private renderToggleCell(table: HTMLElement, scene: PlotGridScene, v: VisibleCol): void {
    const cell = table.createDiv({ cls: "inkswell-plotgrid__cell is-scene" });
    const member = (scene.plotlines ?? []).includes(v.col.title);
    if (member) {
      this.renderChip(cell, scene, v.col);
    } else if (scene.path) {
      const toggle = cell.createEl("button", { cls: "inkswell-plotgrid__toggle", text: "+" });
      toggle.setAttribute("aria-label", `Add "${scene.title}" to ${v.col.title}`);
      toggle.onclick = () => void this.moveMembership(scene.path!, null, v.col.title, null);
    }
    // Chips dragged onto a per-scene cell still mean "move that membership here".
    this.cellDropZone(cell, null, v.col);
  }

  private renderChip(cell: HTMLElement, scene: PlotGridScene, col: Plotline): void {
    const chip = cell.createDiv({ cls: "inkswell-plotgrid__chip" });
    if (scene.color) chip.style.borderLeft = `3px solid ${scene.color}`;
    if (scene.inactive) chip.addClass("is-inactive");
    const text = (scene.synopsis ?? "").split("\n")[0].trim() || scene.title;
    chip.createSpan({ cls: "inkswell-plotgrid__chiptext", text });
    chip.setAttribute("title", scene.title);
    if (scene.status) {
      chip.createSpan({
        cls: `inkswell-status inkswell-status--${scene.status}`,
        text: statusLabel(scene.status),
      });
    }
    if (!scene.path) return; // missing file: visible but non-interactive

    chip.draggable = true;
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData(
        "inkswell/plotgrid-scene",
        JSON.stringify({ path: scene.path, from: col.title })
      );
      chip.addClass("is-dragging");
    });
    chip.addEventListener("dragend", () => chip.removeClass("is-dragging"));
    chip.onclick = () => {
      const file = this.app.vault.getAbstractFileByPath(scene.path!);
      if (file instanceof TFile && this.project) {
        new EditSceneModal(this.app, file, this.project, this.plugin).open();
      }
    };
    const file = this.app.vault.getAbstractFileByPath(scene.path);
    if (file instanceof TFile && this.project) {
      attachRowMenu(chip, chip, () => this.chipMenu(scene, col, file));
    }
  }

  /** The "+" affordance in a chapter cell: new stub scene here, or tag an existing one. */
  private renderCellAdd(cell: HTMLElement, row: PlotGridRow, col: Plotline): void {
    const btn = cell.createEl("button", { cls: "inkswell-plotgrid__add", text: "+" });
    btn.setAttribute("aria-label", `Add a scene to ${col.title} in ${row.label}`);
    btn.onclick = (e) => {
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("New scene here…").setIcon("plus").onClick(() => {
          if (!this.project) return;
          // The plan-a-future-beat flow: an idea-status stub lands in the right
          // chapter and plotline in one step (works in planned chapters too).
          promptNewScene(this.app, this.store, this.project, {
            afterTitle: row.scenes[row.scenes.length - 1]?.title,
            meta: {
              chapter: row.chapterTitle || undefined,
              plotlines: [col.title],
            },
          });
        })
      );
      const candidates = row.scenes.filter(
        (s) => s.path && !(s.plotlines ?? []).includes(col.title)
      );
      if (candidates.length > 0) menu.addSeparator();
      for (const s of candidates) {
        menu.addItem((i) =>
          i.setTitle(`Add: ${s.title}`).onClick(() => {
            void this.moveMembership(s.path!, null, col.title, null);
          })
        );
      }
      menu.showAtMouseEvent(e);
    };
  }

  private chipMenu(scene: PlotGridScene, col: Plotline, file: TFile): Menu {
    const menu = new Menu();
    addSceneMenuItems(menu, this.app, this.project!, scene.title, file, {
      includeOpen: true,
      plugin: this.plugin,
    });
    menu.addSeparator();
    menu.addItem((i) =>
      i.setTitle(`Remove from "${col.title}"`).setIcon("x").onClick(() => {
        void this.moveMembership(scene.path!, col.title, null, null);
      })
    );
    // Touch fallback for drag-drop: move/add membership and chapter via menu.
    for (const other of this.grid?.columns ?? []) {
      if (other.title === col.title || (scene.plotlines ?? []).includes(other.title)) continue;
      if (isOrphanPlotline(other)) continue;
      menu.addItem((i) =>
        i.setTitle(`Add to: ${other.title}`).onClick(() => {
          void this.moveMembership(scene.path!, null, other.title, null);
        })
      );
    }
    if (this.grid?.byChapter) {
      menu.addSeparator();
      const rows = this.grid.groups.flatMap((g) => g.rows);
      for (const r of rows) {
        if (r.chapterTitle === undefined || r.chapterTitle === (scene.chapter ?? "")) continue;
        menu.addItem((i) =>
          i.setTitle(`Move to chapter: ${r.label}`).onClick(() => {
            void this.moveMembership(scene.path!, null, null, r.chapterTitle!);
          })
        );
      }
    }
    return menu;
  }

  // --- Drag-drop zones -------------------------------------------------------

  private scenePayload(e: DragEvent): { path: string; from: string | null } | null {
    const raw = e.dataTransfer?.getData("inkswell/plotgrid-scene");
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as { path?: string; from?: string };
      return p.path ? { path: p.path, from: p.from ?? null } : null;
    } catch {
      return null;
    }
  }

  /** Cells accept chips: move the grabbed membership here (+ chapter when the row differs). */
  private cellDropZone(cell: HTMLElement, row: PlotGridRow | null, col: Plotline): void {
    cell.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types.includes("inkswell/plotgrid-scene")) return;
      e.preventDefault();
      e.stopPropagation();
      cell.addClass("is-drop");
    });
    cell.addEventListener("dragleave", () => cell.removeClass("is-drop"));
    cell.addEventListener("drop", (e) => {
      cell.removeClass("is-drop");
      const payload = this.scenePayload(e);
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      void this.moveMembership(payload.path, payload.from, col.title, row?.chapterTitle ?? null);
    });
  }

  /** Row labels accept chips: change the scene's chapter only. */
  private chapterDropZone(label: HTMLElement, row: PlotGridRow): void {
    label.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types.includes("inkswell/plotgrid-scene")) return;
      e.preventDefault();
      label.addClass("is-drop");
    });
    label.addEventListener("dragleave", () => label.removeClass("is-drop"));
    label.addEventListener("drop", (e) => {
      label.removeClass("is-drop");
      const payload = this.scenePayload(e);
      if (!payload) return;
      e.preventDefault();
      void this.moveMembership(payload.path, null, null, row.chapterTitle ?? null);
    });
  }

  // --- Writes ------------------------------------------------------------------

  private configured(): Plotline[] {
    return this.project?.inkswell?.plotlines ?? [];
  }

  private indexFile(): TFile | null {
    if (!this.project) return null;
    const f = this.app.vault.getAbstractFileByPath(this.project.vaultPath);
    return f instanceof TFile ? f : null;
  }

  private persist(plotlines: Plotline[]): void {
    const file = this.indexFile();
    if (!file || plotlines === this.configured()) return;
    void tryFileOp(
      () => persistPlotlines(this.app, file, plotlines),
      "Couldn't save the plotlines."
    );
  }

  /**
   * The single scene-write path for all grid interactions: drop `fromCol`
   * membership (when set), add `toCol` membership (when set), and change the
   * chapter (when `toChapter` differs; "" clears). One combined frontmatter write.
   */
  private async moveMembership(
    path: string,
    fromCol: string | null,
    toCol: string | null,
    toChapter: string | null
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const meta = readSceneMeta(this.app, file);
    const patch: Partial<SceneMeta> = {};

    if (fromCol !== toCol) {
      let tags = meta.plotlines ?? [];
      let changed = false;
      if (fromCol) {
        const next = removePlotlineTag(tags, fromCol);
        if (next) {
          tags = next;
          changed = true;
        }
      }
      if (toCol) {
        const next = addPlotlineTag(tags, toCol);
        if (next) {
          tags = next;
          changed = true;
        }
      }
      if (changed) patch.plotlines = tags;
    }
    if (toChapter !== null && toChapter !== (meta.chapter ?? "")) {
      patch.chapter = toChapter || undefined;
    }
    if (Object.keys(patch).length === 0) return;
    await tryFileOp(() => writeSceneMeta(this.app, file, patch), "Couldn't move the scene.");
  }

  private async addPlotline(): Promise<void> {
    const name = await promptText(this.app, {
      title: "New plotline",
      value: "",
      multiline: false,
      cta: "Add",
    });
    const t = name?.trim();
    if (!t) return;
    this.persist(upsertPlotline(this.configured(), { title: t }));
  }

  private async renamePlotline(col: Plotline): Promise<void> {
    const input = await promptText(this.app, {
      title: "Rename plotline",
      value: col.title,
      multiline: false,
      cta: "Rename",
    });
    const t = input?.trim();
    if (!t || t === col.title) return;
    if (this.configured().some((p) => p.id !== col.id && p.title === t)) {
      new Notice(`A plotline named "${t}" already exists.`);
      return;
    }
    const file = this.indexFile();
    if (!file || !this.project) return;
    await tryFileOp(async () => {
      // Scene tags first (changed-only writes), config last so the id keeps its color.
      for (const s of this.project!.scenes) {
        if (!s.path) continue;
        const f = this.app.vault.getAbstractFileByPath(s.path);
        if (!(f instanceof TFile)) continue;
        const next = renamePlotlineTag(readSceneMeta(this.app, f).plotlines, col.title, t);
        if (next) await writeSceneMeta(this.app, f, { plotlines: next });
      }
      await persistPlotlines(
        this.app,
        file,
        upsertPlotline(this.configured(), { id: col.id, title: t })
      );
    }, "Couldn't rename the plotline.");
  }

  private async deletePlotline(col: Plotline): Promise<void> {
    const count = this.taggedScenes(col.title).length;
    const ok = await confirmDelete(
      this.app,
      count > 0
        ? `Delete plotline "${col.title}"? Its tag will be removed from ${count} scene(s) — scene files are kept.`
        : `Delete plotline "${col.title}"?`
    );
    if (!ok) return;
    const file = this.indexFile();
    if (!file) return;
    await tryFileOp(async () => {
      await this.stripTag(col.title);
      await persistPlotlines(this.app, file, removePlotline(this.configured(), col.id));
    }, "Couldn't delete the plotline.");
  }

  /** Orphan-column cleanup: strip the tag from every scene (no config change). */
  private async stripTagEverywhere(title: string): Promise<void> {
    const count = this.taggedScenes(title).length;
    const ok = await confirmDelete(
      this.app,
      `Remove the "${title}" tag from ${count} scene(s)? Scene files are kept.`
    );
    if (!ok) return;
    await tryFileOp(() => this.stripTag(title), "Couldn't remove the tag.");
  }

  private taggedScenes(title: string): TFile[] {
    const out: TFile[] = [];
    for (const s of this.project?.scenes ?? []) {
      if (!s.path) continue;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      if (!(f instanceof TFile)) continue;
      if ((readSceneMeta(this.app, f).plotlines ?? []).includes(title)) out.push(f);
    }
    return out;
  }

  private async stripTag(title: string): Promise<void> {
    for (const f of this.taggedScenes(title)) {
      const next = removePlotlineTag(readSceneMeta(this.app, f).plotlines, title);
      if (next) await writeSceneMeta(this.app, f, { plotlines: next });
    }
  }
}
