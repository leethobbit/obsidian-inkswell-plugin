/**
 * Write → Revision: the "Revision" panel in the Write tab's right-column slot.
 * Shows outstanding revision work for the whole project, grouped by scene with the
 * scene you're writing first: inline to-do markers (jump straight to them in the
 * editor) and logged Revision Log decisions (mark applied, edit, delete, or log a
 * new one) — so you can see and act on what's left without leaving Write.
 *
 * Read-mostly composition over the pure `buildRevisionGroups` + the shared
 * `scanProjectTodos`; mutations reuse the same decision ops as Revise → Log, so
 * the two stay in sync. Async (marker scan) with a stale-guard token.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { RightPanel } from "../views/right-panel";
import { decisionsOf, filterDecisions } from "./decisions";
import { persistRevisions } from "./revisions";
import { RevisionModal } from "./revision-modal";
import { DecisionRowContext, renderRevisionGroupItems } from "./revision-rows";
import { scanProjectTodos } from "./todos-scan";
import { RevisionDecision } from "./types";
import { RevisionGroup, buildRevisionGroups } from "./revision-work";

/** Jump into the Write editor: markers carry body offsets, so from/to are set. */
export type RevisionJump = (path: string, from?: number, to?: number) => void;

export class RevisionSidebar implements RightPanel {
  readonly id = "revision";
  readonly label = "Revision";

  private host: HTMLElement | null = null;
  private file: TFile | null = null;
  private showApplied = false;
  /** Bumped per render so a slow marker scan can't fill a stale pane. */
  private token = 0;

  constructor(
    private app: App,
    private store: ProjectStore,
    private active: ActiveProject,
    private onJump: RevisionJump
  ) {}

  render(host: HTMLElement, file: TFile | null): void {
    this.host = host;
    this.file = file;
    host.empty();
    host.addClass("inkswell-revsidebar");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project || !isMultiScene(project.draft)) {
      host.createDiv({
        cls: "inkswell-inspector__empty",
        text: "Open a multi-scene project to track revision work.",
      });
      return;
    }

    // Toolbar: log a decision for the current scene + reveal applied ones.
    const bar = host.createDiv({ cls: "inkswell-revsidebar__bar" });
    const add = bar.createEl("button", { cls: "inkswell-revsidebar__add", text: "Log a revision" });
    add.onclick = () => new RevisionModal(this.app, project, this.currentSceneTitle(project), "").open();
    const toggle = bar.createEl("label", { cls: "inkswell-revsidebar__toggle" });
    const cb = toggle.createEl("input", { type: "checkbox" });
    cb.checked = this.showApplied;
    cb.onchange = () => {
      this.showApplied = cb.checked;
      if (this.host) this.render(this.host, this.file);
    };
    toggle.createSpan({ text: "Show applied" });

    const listEl = host.createDiv({ cls: "inkswell-revsidebar__list" });
    listEl.createDiv({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });

    const token = ++this.token;
    void this.build(project).then((groups) => {
      if (token !== this.token) return; // stale: re-rendered or panel swapped away
      listEl.empty();
      if (groups.length === 0) {
        listEl.createDiv({ cls: "inkswell-stats__muted", text: "No revision work yet." });
        return;
      }
      for (const g of groups) this.renderGroup(listEl, project, g);
    });
  }

  // --- Data ------------------------------------------------------------------

  private async build(project: Project): Promise<RevisionGroup[]> {
    const todos = await scanProjectTodos(this.app, project.scenes);
    const all = decisionsOf(project);
    const decisions = this.showApplied ? all : filterDecisions(all, { status: "pending" });
    return buildRevisionGroups(project.scenes, todos, decisions, this.file?.path ?? null);
  }

  private currentSceneTitle(project: Project): string | null {
    const path = this.file?.path;
    return (path && project.scenes.find((s) => s.path === path)?.title) || null;
  }

  // --- Rendering -------------------------------------------------------------

  private renderGroup(parent: HTMLElement, project: Project, g: RevisionGroup): void {
    const count = g.todos.length + g.decisions.length;
    // Current scene + the whole-project group stay expanded; other scenes collapse
    // (they can be a long list project-wide) — a native <details> remembers toggles.
    const expanded = g.isCurrent || g.path === null;
    const box = parent.createEl("details", { cls: "inkswell-revsidebar__group" });
    box.open = expanded;
    const summary = box.createEl("summary", { cls: "inkswell-revsidebar__scene" });
    summary.createSpan({ text: g.isCurrent ? `${g.title} — this scene` : g.title });
    if (count > 0) summary.createSpan({ cls: "inkswell-revsidebar__count", text: String(count) });

    if (count === 0) {
      box.createDiv({ cls: "inkswell-stats__muted", text: "Nothing to revise in this scene." });
      return;
    }
    renderRevisionGroupItems(box, project, g, this.rowContext(), (path, from, to) =>
      this.onJump(path, from, to)
    );
  }

  /** Row context: sidebar writes stay unmarked — in Write mode the store notify
   *  is absorbed by the editor fast path, which is the proven behavior. */
  private rowContext(): DecisionRowContext {
    return {
      app: this.app,
      persist: (project, list) => this.persist(project, list),
    };
  }

  private persist(project: Project, list: RevisionDecision[]): void {
    void tryFileOp(() => persistRevisions(this.app, project, list), "Couldn't save the revision log.");
  }
}
