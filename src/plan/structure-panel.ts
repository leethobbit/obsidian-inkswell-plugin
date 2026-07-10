/**
 * Plan → Structure: the one place to shape a book's scenes, with a Tree | Board |
 * Grid switcher across the top. All three are views of the same scene structure
 * (derived from scene frontmatter), so they live behind one sub-tab instead of
 * three — a newcomer sees one "structure your scenes" surface, not three.
 *
 *   Tree  — the authoritative Act › Chapter › Scene outline ({@link OutlinePanel}).
 *   Board — a Kanban grouped by status/act/chapter/POV ({@link BoardPanel}).
 *   Grid  — the plotline × chapter matrix ({@link PlotGridPanel}).
 *
 * This is a thin host: it owns the switcher and the per-view contextual tip, then
 * delegates rendering to the existing panel classes unchanged. The switcher and
 * tip live OUTSIDE the container handed to a child panel, because each child calls
 * `container.empty()` when it self-rerenders (a Group-by change, a drag write).
 */

import { App, Menu, Notice } from "obsidian";
import { FeatureId, featureEnabled } from "../features";
import { renderHint } from "../help/hint";
import { BoardPanel } from "../outliner/board-panel";
import { ActiveProject } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { OutlinePanel } from "./outline-panel";
import { PlotGridPanel } from "./plotgrid-panel";
import type InkswellPlugin from "../../main";

export type StructureView = "tree" | "board" | "grid";

/**
 * The switcher buttons, in order. `hint` is the frozen HINTS key for each view;
 * `feature` (when set) gates the view behind an optional-feature toggle — Tree is
 * the always-on core view.
 */
const VIEWS: { id: StructureView; label: string; icon: string; hint: string; feature?: FeatureId }[] =
  [
    { id: "tree", label: "Tree", icon: "list-tree", hint: "plan/outline" },
    { id: "board", label: "Board", icon: "square-kanban", hint: "plan/board", feature: "board" },
    { id: "grid", label: "Grid", icon: "grid-3x3", hint: "plan/grid", feature: "plot-grid" },
  ];

export class StructurePanel {
  private plugin: InkswellPlugin;
  private container: HTMLElement | null = null;
  /** Selected view — in-memory, like the host's remembered sub-tab. */
  private view: StructureView = "tree";

  private tree: OutlinePanel;
  private board: BoardPanel;
  private grid: PlotGridPanel;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.plugin = plugin;
    this.tree = new OutlinePanel(app, plugin, store, active);
    this.board = new BoardPanel(app, plugin, store, active);
    this.grid = new PlotGridPanel(app, plugin, store, active);
  }

  /** Switch to a view (deep-link entry point). Re-renders if already mounted. */
  setView(view: StructureView): void {
    this.view = view;
    if (this.container) this.render(this.container);
  }

  /** Right-click an optional view button to hide it (re-enable in Settings). */
  private attachHideMenu(el: HTMLElement, feature: FeatureId, label: string): void {
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle(`Hide ${label}`)
          .setIcon("eye-off")
          .onClick(() => {
            void this.plugin.setFeatureEnabled(feature, false);
            new Notice(`${label} hidden — re-enable in Settings → Features.`);
          })
      );
      menu.showAtMouseEvent(e);
    });
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-structure");

    // Drop views whose optional feature is disabled; Tree (no feature) always
    // stays. If the active view was just hidden, fall back to Tree.
    const disabled = this.plugin.settings.disabledFeatures;
    const views = VIEWS.filter((v) => !v.feature || featureEnabled(disabled, v.feature));
    if (!views.some((v) => v.id === this.view)) this.view = "tree";

    // Switcher: a segmented control, one active view at a time. A single remaining
    // view needs no switcher.
    if (views.length > 1) {
      const bar = container.createDiv({ cls: "inkswell-structure__bar" });
      const seg = bar.createDiv({ cls: "inkswell-viewswitch" });
      for (const v of views) {
        const btn = seg.createEl("button", { cls: "inkswell-viewswitch__btn", text: v.label });
        btn.toggleClass("is-active", v.id === this.view);
        btn.setAttribute("aria-label", `${v.label} view`);
        btn.onclick = () => this.setView(v.id);
        // Right-click an optional view to hide it (re-enable in Settings → Features).
        if (v.feature) this.attachHideMenu(btn, v.feature, `${v.label} view`);
      }
    }

    // Per-view contextual tip — its own host so a child's self-rerender can't wipe
    // it, and keyed by the frozen HINTS key so dismissals persist across the merge.
    const active = views.find((v) => v.id === this.view) ?? views[0];
    renderHint(container.createDiv(), this.plugin, active.hint);

    // The child panel renders into its own host below the chrome.
    const host = container.createDiv({ cls: "inkswell-structure__view" });
    if (this.view === "board") this.board.render(host);
    else if (this.view === "grid") this.grid.render(host);
    else this.tree.render(host);
  }
}
