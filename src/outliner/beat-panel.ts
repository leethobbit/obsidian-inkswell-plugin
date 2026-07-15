/**
 * Beat-sheet panel: the Save the Cat 15-beat outline for a project. Each beat
 * shows its purpose, a planning note, an optional scene link, and a done toggle,
 * with an overall progress bar. Rendered inside the Inkswell host view.
 *
 * Reads/writes `inkswell.beats` on the project index frontmatter (never scene
 * bodies), via persistInkswellData.
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistInkswellData } from "../projects/index-writer";
import { tryFileOp } from "../lib/notify";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { EditSceneModal } from "../scenes/edit-scene-modal";
import { addSceneMenuItems } from "../scenes/scene-actions";
import { readSceneMeta, statusLabel } from "../scenes/scene-meta";
import { renderEmptyStateAction } from "../views/panel-kit";
import { BeatSheet, DEFAULT_TEMPLATE, TEMPLATE_META } from "./beat-templates";
import { beatProgress, mergeBeats, setAssignment } from "./beats";
import { promptNewScene } from "./create-scene";
import { analyzeScaffold, scaffoldFromTemplate } from "./scaffold";
import { confirmScaffold } from "./scaffold-modal";
import type InkswellPlugin from "../../main";

export class BeatPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;

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
    container.addClass("inkswell-beats");

    const project = resolveActive(this.store.getProjects(), this.active.get());
    if (!project) {
      renderEmptyStateAction(container, "No projects yet — a project holds your scenes, plan, and goals.", [
        { label: "Create a project", cta: true, onClick: () => this.plugin.newProject() },
      ]);
      return;
    }

    this.renderHeader(container, project);

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

  private renderHeader(root: HTMLElement, project: Project): void {
    const bar = root.createDiv({ cls: "inkswell-beats__toolbar" });

    const current = project.inkswell?.beats?.template ?? DEFAULT_TEMPLATE;
    const tsel = bar.createEl("select", { cls: "dropdown" });
    for (const meta of TEMPLATE_META) {
      const o = tsel.createEl("option", { text: meta.label, value: meta.id });
      if (meta.id === current) o.selected = true;
    }
    tsel.onchange = () => this.setTemplate(project, tsel.value);

    const scaffold = bar.createEl("button", { text: "Scaffold structure" });
    scaffold.setAttribute(
      "aria-label",
      "Create acts, chapters, and a placeholder scene for each beat"
    );
    scaffold.onclick = async () => {
      // Dry-run first: the confirm dialog previews exactly what will be written.
      const analysis = analyzeScaffold(this.app, this.store, project, current);
      if (!analysis) return;
      if (!analysis.structured && analysis.newScenes === 0 && analysis.willLink === 0) {
        new Notice("Nothing to scaffold — every beat already has its scene.");
        return;
      }
      const label = TEMPLATE_META.find((m) => m.id === current)?.label ?? current;
      if (!(await confirmScaffold(this.app, analysis, label))) return;
      const r = await tryFileOp(
        () =>
          scaffoldFromTemplate(this.app, this.store, this.plugin.settings, project, current, analysis),
        "Couldn't scaffold the structure."
      );
      if (r === null) return;
      if (r.structured && r.chapters > 0) {
        new Notice(
          `Scaffolded ${r.chapters} chapters across ${r.acts} acts (${r.scenes} new scene${r.scenes === 1 ? "" : "s"}).`
        );
      } else if (r.scenes > 0) {
        new Notice(`Created ${r.scenes} scene(s). Existing structure left unchanged.`);
      } else {
        new Notice("No new scenes to create.");
      }
    };
  }

  private setTemplate(project: Project, templateId: string): void {
    const sheet = project.inkswell?.beats;
    const next: BeatSheet = {
      template: templateId,
      assignments: sheet?.assignments ?? {},
    };
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      void tryFileOp(() => persistInkswellData(this.app, file, { beats: next }), "Couldn't switch the beat template.");
    }
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

    // Scenes: a beat can span several scenes — show chips + an add dropdown.
    const sceneRow = row.createDiv({ cls: "inkswell-beat__scene" });
    const attached = beat.assignment.scenes ?? [];
    const chips = sceneRow.createDiv({ cls: "inkswell-beat__chips" });
    for (const t of attached) {
      const chip = chips.createSpan({ cls: "inkswell-chip" });
      // The label opens the scene's metadata window; the × unlinks the scene.
      const label = chip.createSpan({ cls: "inkswell-beat__chiplabel", text: t });
      label.setAttribute("aria-label", `Open ${t} metadata`);
      label.onclick = () => this.openSceneMeta(project, t);

      // Status badge for the linked scene.
      const file = this.sceneFile(project, t);
      if (file) {
        const status = readSceneMeta(this.app, file).status;
        if (status) {
          chip.createSpan({
            cls: `inkswell-status inkswell-status--${status}`,
            text: statusLabel(status),
          });
        }
      }

      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.setAttribute("aria-label", `Remove ${t}`);
      x.onclick = () =>
        this.update(project, beat.id, { scenes: attached.filter((s) => s !== t) });

      // Scene menu — right-click on desktop, "⋯" tap on touch — for parity with
      // the Board's scene cards. Appended last so "⋯" sits after the × remove.
      if (file) {
        attachRowMenu(chip, chip, () => {
          const menu = new Menu();
          addSceneMenuItems(menu, this.app, project, t, file, {
            includeOpen: true,
            plugin: this.plugin,
          });
          return menu;
        });
      }
    }
    const remaining = sceneTitles.filter((t) => !attached.includes(t));
    if (remaining.length > 0) {
      const add = sceneRow.createEl("select", { cls: "dropdown inkswell-beat__addscene" });
      add.createEl("option", { text: "+ add scene", value: "" });
      for (const t of remaining) add.createEl("option", { text: t, value: t });
      add.value = "";
      add.onchange = () => {
        if (add.value) this.update(project, beat.id, { scenes: [...attached, add.value] });
      };
    }

    // Create a brand-new scene already attached to this beat (synopsis seeded from
    // the beat's blurb). createScene inserts it into the index, so the chip links a
    // real file immediately.
    const create = sceneRow.createEl("button", {
      cls: "inkswell-beat__newscene",
      text: "+ new scene",
    });
    create.setAttribute("aria-label", "Create a new scene attached to this beat");
    create.onclick = () => {
      // Accumulate across repeated "Create another" so every new scene stays
      // attached to this beat, not just the last one.
      const attachedNow = [...attached];
      promptNewScene(this.app, this.store, this.plugin.settings, project, {
        meta: { synopsis: beat.blurb },
        onCreated: (file) => {
          attachedNow.push(file.basename);
          this.update(project, beat.id, { scenes: attachedNow });
        },
      });
    };
  }

  /** Resolve a beat-attached scene title to its TFile, if the file exists. */
  private sceneFile(project: Project, title: string): TFile | null {
    const scene = project.scenes.find((s) => s.title === title);
    const file = scene?.path ? this.app.vault.getAbstractFileByPath(scene.path) : null;
    return file instanceof TFile ? file : null;
  }

  /** Open a beat-attached scene's metadata window, if the scene file exists. */
  private openSceneMeta(project: Project, title: string): void {
    const scene = project.scenes.find((s) => s.title === title);
    const file = scene?.path ? this.app.vault.getAbstractFileByPath(scene.path) : null;
    if (file instanceof TFile) {
      new EditSceneModal(this.app, file, project, this.plugin).open();
    } else {
      new Notice(`No scene file for "${title}" yet — scaffold scenes first.`);
    }
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
      void tryFileOp(() => persistInkswellData(this.app, file, { beats: next }), "Couldn't save the beat change.");
    }
  }
}
