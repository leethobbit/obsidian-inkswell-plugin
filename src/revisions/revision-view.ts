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
import type InkswellPlugin from "../../main";

export class RevisionPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private container: HTMLElement | null = null;

  /** undefined = all scenes, null = project-wide only, string = a scene title. */
  private sceneFilter: string | null | undefined = undefined;
  private typeFilter: RevisionType | undefined = undefined;
  private showApplied = false;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  /** Focus a specific project (used when opened from a command on an active file). */
  focusProject(path: string): void {
    this.sceneFilter = undefined;
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

    const all = decisionsOf(project);
    const pending = filterDecisions(all, {
      status: "pending",
      scene: this.sceneFilter,
      type: this.typeFilter,
    });
    const applied = filterDecisions(all, {
      status: "applied",
      scene: this.sceneFilter,
      type: this.typeFilter,
    });

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

  private renderToolbar(root: HTMLElement, project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-revision__toolbar" });

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

    // A scene-anchored decision: clicking its text opens that scene in Write (the
    // primary "go act on it" action). Edit moves to the ⋯ menu. A scene-less
    // decision has nowhere to jump, so its text still opens the editor.
    const scenePath = d.scene ? this.scenePathFor(project, d.scene) : null;

    const body = row.createDiv({ cls: "inkswell-revision__body" });
    const textEl = body.createDiv({ cls: "inkswell-revision__text", text: d.text });
    if (scenePath) {
      textEl.setAttribute("aria-label", `Open "${d.scene ?? ""}" in Write`);
      textEl.onclick = () => this.plugin.openSceneInWrite(scenePath);
    } else {
      textEl.setAttribute("aria-label", "Edit decision");
      textEl.onclick = () => this.openEdit(project, d);
    }
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
    // The scene anchor, also a link to Write (a second, explicit affordance).
    if (d.scene) {
      const sceneEl = meta.createSpan({ text: `↳ ${d.scene}` });
      if (scenePath) {
        sceneEl.addClass("inkswell-revision__scenelink");
        sceneEl.setAttribute("aria-label", `Open "${d.scene}" in Write`);
        sceneEl.onclick = (e) => {
          e.stopPropagation();
          this.plugin.openSceneInWrite(scenePath);
        };
      }
    } else {
      meta.createSpan({ text: "project-wide" });
    }

    attachRowMenu(row, row, () => {
      const menu = new Menu();
      if (scenePath) {
        menu.addItem((i) =>
          i
            .setTitle("Open scene in Write")
            .setIcon("pen-tool")
            .onClick(() => this.plugin.openSceneInWrite(scenePath))
        );
        menu.addSeparator();
      }
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

  /** Resolve a decision's scene title to its vault path within the project. */
  private scenePathFor(project: Project, title: string): string | null {
    return project.scenes.find((s) => s.title === title)?.path ?? null;
  }

  /** Open the modal pre-filled to edit a decision in place (preserves id/status). */
  private openEdit(project: Project, d: RevisionDecision): void {
    new RevisionModal(this.app, project, d.scene, "", d).open();
  }

  private persist(project: Project, list: RevisionDecision[]): void {
    void tryFileOp(() => persistRevisions(this.app, project, list), "Couldn't save the revision log.");
  }
}
