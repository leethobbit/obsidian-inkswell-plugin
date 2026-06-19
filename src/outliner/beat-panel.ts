/**
 * Beat-sheet panel: the Save the Cat 15-beat outline for a project. Each beat
 * shows its purpose, a planning note, an optional scene link, and a done toggle,
 * with an overall progress bar. Rendered inside the Inkswell host view.
 *
 * Reads/writes `inkswell.beats` on the project index frontmatter (never scene
 * bodies), via persistInkswellData.
 */

import { App, Notice, TFile } from "obsidian";
import { persistInkswellData } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { BeatSheet, DEFAULT_TEMPLATE, TEMPLATE_META } from "./beat-templates";
import { beatProgress, mergeBeats, setAssignment } from "./beats";
import { scaffoldFromTemplate } from "./scaffold";

export class BeatPanel {
  private app: App;
  private store: ProjectStore;
  private container: HTMLElement | null = null;
  private selectedPath: string | null = null;

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
    container.addClass("inkswell-beats");

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }
    const project =
      projects.find((p) => p.vaultPath === this.selectedPath) ?? projects[0];
    this.selectedPath = project.vaultPath;

    this.renderHeader(container, projects, project);

    const sheet = project.inkswell?.beats;
    const beats = mergeBeats(sheet);
    const progress = beatProgress(beats);

    const head = container.createDiv({ cls: "inkswell-beats__progress" });
    head.createSpan({
      cls: "inkswell-stats__muted",
      text: `${progress.done}/${progress.total} beats done · ${progress.started} started`,
    });
    const bar = head.createDiv({ cls: "inkswell-progress" });
    bar.createDiv({ cls: "inkswell-progress__fill" }).style.width =
      `${(progress.done / progress.total) * 100}%`;

    const sceneTitles = project.scenes.map((s) => s.title);
    for (const beat of beats) {
      this.renderBeat(container, project, beat, sceneTitles);
    }
  }

  private renderHeader(root: HTMLElement, projects: Project[], project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-beats__toolbar" });

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

    const current = project.inkswell?.beats?.template ?? DEFAULT_TEMPLATE;
    const tsel = bar.createEl("select", { cls: "dropdown" });
    for (const meta of TEMPLATE_META) {
      const o = tsel.createEl("option", { text: meta.label, value: meta.id });
      if (meta.id === current) o.selected = true;
    }
    tsel.onchange = () => this.setTemplate(project, tsel.value);

    const scaffold = bar.createEl("button", { text: "Scaffold scenes" });
    scaffold.setAttribute("aria-label", "Create a placeholder scene for each beat");
    scaffold.onclick = async () => {
      const n = await scaffoldFromTemplate(this.app, this.store, project, current);
      new Notice(
        n > 0 ? `Created ${n} placeholder scene(s).` : "No new scenes to create."
      );
    };
  }

  private setTemplate(project: Project, templateId: string): void {
    const sheet = project.inkswell?.beats;
    const next: BeatSheet = {
      template: templateId,
      assignments: sheet?.assignments ?? {},
    };
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) void persistInkswellData(this.app, file, { beats: next });
  }

  private renderBeat(
    parent: HTMLElement,
    project: Project,
    beat: ReturnType<typeof mergeBeats>[number],
    sceneTitles: string[]
  ): void {
    const row = parent.createDiv({ cls: "inkswell-beat" });
    if (beat.assignment.done) row.addClass("is-done");

    const header = row.createDiv({ cls: "inkswell-beat__header" });
    const done = header.createEl("input", { type: "checkbox" });
    done.checked = !!beat.assignment.done;
    done.setAttribute("aria-label", "Mark beat done");
    done.onchange = () => this.update(project, beat.id, { done: done.checked });

    header.createSpan({ cls: "inkswell-beat__pos", text: `${Math.round(beat.position * 100)}%` });
    header.createSpan({ cls: "inkswell-beat__name", text: beat.name });

    row.createDiv({ cls: "inkswell-beat__blurb", text: beat.blurb });

    const note = row.createEl("textarea", { cls: "inkswell-beat__note" });
    note.rows = 2;
    note.placeholder = "What happens at this beat…";
    note.value = beat.assignment.note ?? "";
    note.onchange = () => this.update(project, beat.id, { note: note.value });

    const sceneRow = row.createDiv({ cls: "inkswell-beat__scene" });
    sceneRow.createSpan({ cls: "inkswell-stats__muted", text: "Scene:" });
    const sel = sceneRow.createEl("select", { cls: "dropdown" });
    sel.createEl("option", { text: "— none —", value: "__none__" });
    for (const t of sceneTitles) {
      const o = sel.createEl("option", { text: t, value: t });
      if (beat.assignment.scene === t) o.selected = true;
    }
    sel.value = beat.assignment.scene ?? "__none__";
    sel.onchange = () =>
      this.update(project, beat.id, {
        scene: sel.value === "__none__" ? null : sel.value,
      });
  }

  private update(
    project: Project,
    beatId: string,
    patch: Partial<BeatSheet["assignments"][string]>
  ): void {
    const next = setAssignment(project.inkswell?.beats, beatId, patch);
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      // The frontmatter write triggers a store refresh, which re-renders this
      // panel via the host's subscription — no immediate rerender (avoids a
      // flicker from the stale snapshot and preserves textarea focus).
      void persistInkswellData(this.app, file, { beats: next });
    }
  }
}
