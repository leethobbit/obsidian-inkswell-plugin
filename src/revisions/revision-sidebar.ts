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

import { App, Menu, TFile } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { tryFileOp } from "../lib/notify";
import { GapHit, PlaceholderKind } from "../lib/placeholders";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { RightPanel } from "../views/right-panel";
import { decisionType, decisionsOf, filterDecisions, removeDecision, setDecisionStatus } from "./decisions";
import { persistRevisions } from "./revisions";
import { RevisionModal } from "./revision-modal";
import { scanProjectTodos } from "./todos-scan";
import { REVISION_TYPES, RevisionDecision } from "./types";
import { RevisionGroup, buildRevisionGroups } from "./revision-work";

const KIND_LABEL: Record<PlaceholderKind, string> = {
  todo: "TODO",
  research: "Research",
  note: "Note",
  dialogue: "Dialogue",
  scene: "Scene",
};

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
    for (const d of g.decisions) this.renderDecision(box, project, d);
    if (g.path) for (const t of g.todos) this.renderMarker(box, g.path, t);
  }

  private renderMarker(parent: HTMLElement, path: string, t: GapHit): void {
    const row = parent.createDiv({ cls: "inkswell-todos__row" });
    row.createSpan({ cls: `inkswell-todos__kind inkswell-todos__kind--${t.kind}`, text: KIND_LABEL[t.kind] });
    row.createSpan({ cls: "inkswell-todos__line", text: `L${t.line}` });
    row.createSpan({ cls: "inkswell-todos__text", text: t.excerpt });
    row.onclick = () => this.onJump(path, t.from, t.to);
  }

  private renderDecision(parent: HTMLElement, project: Project, d: RevisionDecision): void {
    const row = parent.createDiv({ cls: "inkswell-revision__row" });
    if (d.status === "applied") row.addClass("is-applied");

    const check = row.createEl("input", { type: "checkbox" });
    check.checked = d.status === "applied";
    check.setAttribute("aria-label", d.status === "applied" ? "Reopen" : "Mark applied");
    check.onchange = () =>
      this.persist(project, setDecisionStatus(decisionsOf(project), d.id, check.checked ? "applied" : "pending"));

    const body = row.createDiv({ cls: "inkswell-revision__body" });
    const textEl = body.createDiv({ cls: "inkswell-revision__text", text: d.text });
    textEl.setAttribute("aria-label", "Edit decision");
    textEl.onclick = () => new RevisionModal(this.app, project, d.scene, "", d).open();
    const meta = body.createDiv({ cls: "inkswell-revision__meta" });
    const type = decisionType(d);
    const typeLabel = REVISION_TYPES.find((t) => t.id === type)?.label ?? type;
    meta.createSpan({ cls: `inkswell-revision__type inkswell-revision__type--${type}`, text: typeLabel });
    if (d.priority) {
      meta.createSpan({ cls: `inkswell-revision__pri inkswell-revision__pri--${d.priority}`, text: d.priority });
    }

    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("Edit…").setIcon("pencil").onClick(() => new RevisionModal(this.app, project, d.scene, "", d).open())
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Delete").setIcon("trash").onClick(() => this.persist(project, removeDecision(decisionsOf(project), d.id)))
      );
      return menu;
    });
  }

  private persist(project: Project, list: RevisionDecision[]): void {
    void tryFileOp(() => persistRevisions(this.app, project, list), "Couldn't save the revision log.");
  }
}
