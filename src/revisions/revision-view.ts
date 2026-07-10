/**
 * Revision-log panel: pick a project, optionally filter by scene, and work the
 * decision list — pending → applied during the revision pass, reopen, or delete.
 * Rendered inside the Inkswell host view. Reads decisions from the project index
 * frontmatter (via the store) and writes changes back through persistRevisions.
 */

import { App, Menu, setIcon } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { attachRowMenu } from "../lib/row-menu";
import { resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { RevisionModal } from "./revision-modal";
import {
  decisionType,
  decisionsOf,
  filterDecisions,
  persistRevisions,
  removeDecision,
  setDecisionStatus,
} from "./revisions";
import { REVISION_TYPES, RevisionDecision, RevisionType } from "./types";
import { RevisionGroup, buildRevisionGroups } from "./revision-work";
import type InkswellPlugin from "../../main";

export class RevisionPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private container: HTMLElement | null = null;

  private typeFilter: RevisionType | undefined = undefined;
  private showApplied = false;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  /** Focus a specific project (used when opened from a command on an active file). */
  focusProject(path: string): void {
    this.plugin.activeProject.set(path); // host re-renders on the change
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-revision");

    const project = resolveActive(
      this.store.getProjects(),
      this.plugin.activeProject.get()
    );
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }

    this.renderToolbar(container, project);

    // Decisions to show, filtered by status (pending unless "show applied") and
    // type, then grouped by scene — the same grouping the Write → Revision sidebar
    // uses (no markers here, no "current scene"). Grouping replaces the old scene
    // filter and makes navigation a scene-level action, so decision rows stay
    // uniform (click = edit) whether they're scene-anchored or project-wide.
    const all = decisionsOf(project);
    let decisions = this.showApplied ? all : filterDecisions(all, { status: "pending" });
    if (this.typeFilter) decisions = filterDecisions(decisions, { type: this.typeFilter });
    const groups = buildRevisionGroups(project.scenes, [], decisions, null);

    const list = container.createDiv({ cls: "inkswell-revision__list" });
    if (groups.length === 0) {
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: "No decisions yet. Draft forward; log changes as you go.",
      });
      return;
    }
    for (const g of groups) this.renderGroup(list, project, g);
  }

  private renderGroup(parent: HTMLElement, project: Project, g: RevisionGroup): void {
    const header = parent.createDiv({ cls: "inkswell-revision__group" });
    const title = header.createSpan({ cls: "inkswell-revision__groupname", text: g.title });
    header.createSpan({ cls: "inkswell-revision__groupcount", text: String(g.decisions.length) });
    // Navigation lives on the scene header — the one clear "go to this scene in
    // Write" action. The Whole-project group has no scene, so it doesn't navigate.
    if (g.path) {
      const path = g.path;
      header.addClass("is-link");
      header.setAttribute("aria-label", `Open "${g.title}" in Write`);
      title.addClass("inkswell-revision__scenelink");
      header.onclick = () => this.plugin.openSceneInWrite(path);
    }
    for (const d of g.decisions) this.renderRow(parent, project, d);
  }

  private renderToolbar(root: HTMLElement, project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-revision__toolbar" });

    const typeSel = bar.createEl("select", { cls: "dropdown" });
    typeSel.createEl("option", { text: "All types", value: "__all__" });
    for (const t of REVISION_TYPES) typeSel.createEl("option", { text: t.label, value: t.id });
    typeSel.value = this.typeFilter ?? "__all__";
    typeSel.onchange = () => {
      this.typeFilter = typeSel.value === "__all__" ? undefined : (typeSel.value as RevisionType);
      this.rerender();
    };

    const toggle = bar.createEl("label", { cls: "inkswell-revision__toggle" });
    const cb = toggle.createEl("input", { type: "checkbox" });
    cb.checked = this.showApplied;
    cb.onchange = () => {
      this.showApplied = cb.checked;
      this.rerender();
    };
    toggle.createSpan({ text: "Show applied" });

    const add = bar.createEl("button", { cls: "clickable-icon" });
    setIcon(add, "plus");
    add.setAttribute("aria-label", "Log a decision");
    // Anchor is chosen in the modal (scene picker), so no scene needs pre-selecting.
    add.onclick = () => new RevisionModal(this.app, project, null).open();
  }

  private renderRow(parent: HTMLElement, project: Project, d: RevisionDecision): void {
    const row = parent.createDiv({ cls: "inkswell-revision__row" });
    if (d.status === "applied") row.addClass("is-applied");

    const check = row.createEl("input", { type: "checkbox" });
    check.checked = d.status === "applied";
    check.setAttribute("aria-label", d.status === "applied" ? "Reopen" : "Mark applied");
    check.onchange = () =>
      this.persist(
        project,
        setDecisionStatus(decisionsOf(project), d.id, check.checked ? "applied" : "pending")
      );

    // Uniform decision row: click the text to edit it, regardless of whether it's
    // scene-anchored or project-wide (navigation lives on the scene group header).
    const body = row.createDiv({ cls: "inkswell-revision__body" });
    const textEl = body.createDiv({ cls: "inkswell-revision__text", text: d.text });
    textEl.setAttribute("aria-label", "Edit decision");
    textEl.onclick = () => this.openEdit(project, d);
    const meta = body.createDiv({ cls: "inkswell-revision__meta" });
    const type = decisionType(d);
    const typeLabel = REVISION_TYPES.find((t) => t.id === type)?.label ?? type;
    meta.createSpan({ cls: `inkswell-revision__type inkswell-revision__type--${type}`, text: typeLabel });
    if (d.priority) {
      meta.createSpan({
        cls: `inkswell-revision__pri inkswell-revision__pri--${d.priority}`,
        text: d.priority,
      });
    }

    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle("Edit…")
          .setIcon("pencil")
          .onClick(() => this.openEdit(project, d))
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Delete")
          .setIcon("trash")
          .onClick(() => this.persist(project, removeDecision(decisionsOf(project), d.id)))
      );
      return menu;
    });
  }

  /** Open the modal pre-filled to edit a decision in place (preserves id/status). */
  private openEdit(project: Project, d: RevisionDecision): void {
    new RevisionModal(this.app, project, d.scene, "", d).open();
  }

  private persist(project: Project, list: RevisionDecision[]): void {
    void tryFileOp(() => persistRevisions(this.app, project, list), "Couldn't save the revision log.");
  }
}
