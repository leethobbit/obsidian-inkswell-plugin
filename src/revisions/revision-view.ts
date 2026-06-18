/**
 * Revision-log panel: pick a project, optionally filter by scene, and work the
 * decision list — pending → applied during the revision pass, reopen, or delete.
 * Rendered inside the Inkswell host view. Reads decisions from the project index
 * frontmatter (via the store) and writes changes back through persistRevisions.
 */

import { App, Menu, setIcon } from "obsidian";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { RevisionModal } from "./revision-modal";
import {
  decisionsOf,
  filterDecisions,
  persistRevisions,
  removeDecision,
  setDecisionStatus,
} from "./revisions";
import { RevisionDecision } from "./types";
import type InkswellPlugin from "../../main";

export class RevisionPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private container: HTMLElement | null = null;

  private selectedPath: string | null = null;
  /** undefined = all scenes, null = project-wide only, string = a scene title. */
  private sceneFilter: string | null | undefined = undefined;
  private showApplied = false;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  /** Focus a specific project (used when opened from a command on an active file). */
  focusProject(path: string): void {
    this.selectedPath = path;
    this.sceneFilter = undefined;
    this.rerender();
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  private currentProject(projects: Project[]): Project | null {
    return (
      projects.find((p) => p.vaultPath === this.selectedPath) ?? projects[0] ?? null
    );
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-revision");

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }

    const project = this.currentProject(projects);
    if (!project) return;
    this.selectedPath = project.vaultPath;

    this.renderToolbar(container, projects, project);

    const all = decisionsOf(project);
    const pending = filterDecisions(all, { status: "pending", scene: this.sceneFilter });
    const applied = filterDecisions(all, { status: "applied", scene: this.sceneFilter });

    const list = container.createDiv({ cls: "inkswell-revision__list" });
    if (pending.length === 0 && (!this.showApplied || applied.length === 0)) {
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: "No decisions yet. Draft forward; log changes as you go.",
      });
    }

    if (pending.length > 0) {
      list.createEl("h4", { text: `Pending (${pending.length})` });
      pending.forEach((d) => this.renderRow(list, project, d));
    }
    if (this.showApplied && applied.length > 0) {
      list.createEl("h4", { text: `Applied (${applied.length})` });
      applied.forEach((d) => this.renderRow(list, project, d));
    }
  }

  private renderToolbar(root: HTMLElement, projects: Project[], project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-revision__toolbar" });

    if (projects.length > 1) {
      const sel = bar.createEl("select", { cls: "dropdown" });
      for (const p of projects) {
        const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
        if (p.vaultPath === project.vaultPath) o.selected = true;
      }
      sel.onchange = () => {
        this.selectedPath = sel.value;
        this.sceneFilter = undefined;
        this.rerender();
      };
    } else {
      bar.createSpan({ cls: "inkswell-revision__project", text: project.draft.title });
    }

    const sceneSel = bar.createEl("select", { cls: "dropdown" });
    sceneSel.createEl("option", { text: "All scenes", value: "__all__" });
    sceneSel.createEl("option", { text: "Project-wide", value: "__global__" });
    for (const s of project.scenes) {
      sceneSel.createEl("option", { text: s.title, value: s.title });
    }
    sceneSel.value =
      this.sceneFilter === undefined
        ? "__all__"
        : this.sceneFilter === null
          ? "__global__"
          : this.sceneFilter;
    sceneSel.onchange = () => {
      this.sceneFilter =
        sceneSel.value === "__all__"
          ? undefined
          : sceneSel.value === "__global__"
            ? null
            : sceneSel.value;
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
    add.onclick = () => {
      const scene = typeof this.sceneFilter === "string" ? this.sceneFilter : null;
      new RevisionModal(this.app, project, scene).open();
    };
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

    const body = row.createDiv({ cls: "inkswell-revision__body" });
    body.createDiv({ cls: "inkswell-revision__text", text: d.text });
    body.createDiv({
      cls: "inkswell-revision__meta",
      text: d.scene ? `↳ ${d.scene}` : "project-wide",
    });

    row.oncontextmenu = (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle("Delete")
          .setIcon("trash")
          .onClick(() => this.persist(project, removeDecision(decisionsOf(project), d.id)))
      );
      menu.showAtMouseEvent(e);
    };
  }

  private persist(project: Project, list: RevisionDecision[]): void {
    void persistRevisions(this.app, project, list);
  }
}
