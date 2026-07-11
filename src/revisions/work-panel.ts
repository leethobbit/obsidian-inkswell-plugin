/**
 * Revise → To-dos: ONE list of everything left to revise in the active project —
 * inline to-do markers left in the prose (`[TODO: …]`, `[RESEARCH: …]`, …) and
 * logged revision decisions — grouped by scene, exactly like the Write sidebar's
 * Revision panel (same shared grouping and row renderers), filterable by a
 * single chip row across both facets.
 *
 * Markers are jump-only (resolve one by editing the prose in Write); decisions
 * are interactive (tick applied, click to edit, menu to delete). Decision
 * writes are marked as self-writes so the host softens the resulting store
 * notify into `softRefresh()` — the row updates in place, no pane teardown
 * (which is what makes this panel fully usable on phones).
 */

import { App, setIcon } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { decisionsOf, filterDecisions } from "./decisions";
import { persistRevisions } from "./revisions";
import { RevisionModal } from "./revision-modal";
import { DecisionRowContext, renderRevisionGroupItems } from "./revision-rows";
import {
  WorkFilter,
  applyWorkFilter,
  buildRevisionGroups,
  buildWorkChips,
} from "./revision-work";
import { SceneTodos, scanProjectTodos } from "./todos-scan";
import type InkswellPlugin from "../../main";

/** Highlight target handed to the Write panel: a token's offsets in the body. */
export interface TodoHighlight {
  from: number;
  to: number;
}

export class RevisionWorkPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private onOpenInWrite: (path: string, highlight?: TodoHighlight) => void;

  private filter: WorkFilter = { facet: "all" };
  private showApplied = false;
  /** Marker scan for the rendered project; reused by softRefresh (a decision
   *  write can't change the prose, so the scan stays valid). */
  private todosCache: SceneTodos[] = [];
  private chipBar: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  /** Bumped per render so a slow marker scan can't fill a stale pane. */
  private token = 0;

  constructor(
    app: App,
    plugin: InkswellPlugin,
    store: ProjectStore,
    onOpenInWrite: (path: string, highlight?: TodoHighlight) => void
  ) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = plugin.activeProject;
    this.onOpenInWrite = onOpenInWrite;
  }

  /** Focus a specific project (used when opened from a command on an active file). */
  focusProject(path: string): void {
    this.active.set(path); // host re-renders on the change
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-revwork");

    const project = this.project();
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }

    container.createDiv({
      cls: "inkswell-stats__muted",
      text: "Everything left to revise — inline markers ([TODO: ], [RESEARCH: ], …) and logged decisions, grouped by scene. Click a marker to jump to it in Write; tick a decision once you've applied it.",
    });

    const bar = container.createDiv({ cls: "inkswell-revwork__toolbar" });
    this.chipBar = bar.createDiv({ cls: "inkswell-revwork__chips" });
    const toggle = bar.createEl("label", { cls: "inkswell-revision__toggle" });
    const cb = toggle.createEl("input", { type: "checkbox" });
    cb.checked = this.showApplied;
    cb.onchange = () => {
      this.showApplied = cb.checked;
      this.renderChips();
      this.renderList();
    };
    toggle.createSpan({ text: "Show applied" });
    const add = bar.createEl("button", { cls: "inkswell-revwork__add", text: "Log a decision" });
    setIcon(add.createSpan({ cls: "inkswell-revwork__addicon" }), "plus");
    // Anchor is chosen in the modal (scene picker), so no scene needs pre-selecting.
    add.onclick = () => {
      const p = this.project();
      if (p) new RevisionModal(this.app, p, null, "", null, this.markWrite).open();
    };

    this.listEl = container.createDiv({ cls: "inkswell-revwork__list" });
    this.listEl.createDiv({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });

    const token = ++this.token;
    void scanProjectTodos(this.app, project.scenes).then((todos) => {
      if (token !== this.token) return; // stale: re-rendered since
      this.todosCache = todos;
      this.renderChips();
      this.renderList();
    });
  }

  /**
   * In-place refresh after one of this panel's own decision writes: fresh
   * decisions from the store, cached marker scan, no async, no pane teardown.
   */
  softRefresh(): void {
    if (!this.listEl?.isConnected) return;
    this.renderChips();
    this.renderList();
  }

  // --- Data --------------------------------------------------------------------

  private project(): Project | null {
    return resolveActive(this.store.getProjects(), this.active.get());
  }

  /** Decisions narrowed to the visible statuses (chips count what's visible). */
  private visibleDecisions(project: Project) {
    const all = decisionsOf(project);
    return this.showApplied ? all : filterDecisions(all, { status: "pending" });
  }

  private markWrite = (path: string): void => {
    this.plugin.selfWrites.mark(path);
  };

  private rowContext(): DecisionRowContext {
    return {
      app: this.app,
      persist: (project, list) => {
        // Mark BEFORE the write so the store notify it produces is recognized
        // as self-inflicted and softened to softRefresh() by the host.
        this.markWrite(project.vaultPath);
        void tryFileOp(
          () => persistRevisions(this.app, project, list),
          "Couldn't save the revision log."
        );
      },
      markWrite: this.markWrite,
    };
  }

  // --- Rendering -----------------------------------------------------------------

  private renderChips(): void {
    const bar = this.chipBar;
    if (!bar) return;
    bar.empty();
    const project = this.project();
    if (!project) return;

    const chips = buildWorkChips(this.todosCache, this.visibleDecisions(project));
    // Only "All" (count may be 0) → no work at all; the list shows the empty state.
    if (chips.length === 1 && chips[0].count === 0) return;

    let lastWasDecision = false;
    for (const c of chips) {
      if (c.decision && !lastWasDecision && c !== chips[0]) {
        bar.createSpan({ cls: "inkswell-revwork__chipsep", text: "·" });
      }
      lastWasDecision = c.decision;
      const b = bar.createEl("button", {
        cls: "inkswell-todos__chip",
        text: `${c.label} (${c.count})`,
      });
      if (c.decision) b.addClass("inkswell-revwork__chip--decision");
      b.toggleClass("is-active", sameFilter(this.filter, c.filter));
      b.onclick = () => {
        this.filter = c.filter;
        this.renderChips();
        this.renderList();
      };
    }
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();
    const project = this.project();
    if (!project) return;

    const visible = this.visibleDecisions(project);
    const total =
      this.todosCache.reduce((n, g) => n + g.todos.length, 0) + visible.length;
    if (total === 0) {
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: "Nothing to revise yet. Drop a [TODO: ] marker while drafting, or log a decision to act on later.",
      });
      return;
    }

    const { todos, decisions } = applyWorkFilter(this.todosCache, visible, this.filter);
    const groups = buildRevisionGroups(project.scenes, todos, decisions, null);
    if (groups.length === 0) {
      list.createDiv({ cls: "inkswell-stats__muted", text: "Nothing matches this filter." });
      return;
    }

    const ctx = this.rowContext();
    for (const g of groups) {
      const header = list.createDiv({ cls: "inkswell-revision__group" });
      const title = header.createSpan({ cls: "inkswell-revision__groupname", text: g.title });
      header.createSpan({
        cls: "inkswell-revision__groupcount",
        text: String(g.todos.length + g.decisions.length),
      });
      // Navigation lives on the scene header — the one clear "go to this scene
      // in Write" action. The Whole-project group has no scene to open.
      if (g.path) {
        const path = g.path;
        header.addClass("is-link");
        header.setAttribute("aria-label", `Open "${g.title}" in Write`);
        title.addClass("inkswell-revision__scenelink");
        header.onclick = () => this.onOpenInWrite(path);
      }
      renderRevisionGroupItems(list, project, g, ctx, (path, from, to) =>
        this.onOpenInWrite(path, { from, to })
      );
    }
  }
}

function sameFilter(a: WorkFilter, b: WorkFilter): boolean {
  if (a.facet !== b.facet) return false;
  if (a.facet === "marker" && b.facet === "marker") return a.kind === b.kind;
  if (a.facet === "decision" && b.facet === "decision") return a.type === b.type;
  return true; // both "all"
}
