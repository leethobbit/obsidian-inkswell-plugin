/**
 * Beat-sheet panel: a template-driven structural outline for a project (built-in
 * templates plus the user's custom ones from settings). Each beat
 * shows its purpose, a planning note, an optional scene link, and a done toggle,
 * with an overall progress bar. Rendered inside the Inkswell host view.
 *
 * Reads/writes `inkswell.beats` on the project index frontmatter (never scene
 * bodies), via updateBeats — every write is a delta applied to the CURRENT
 * stored sheet, never the render-time snapshot (which the host's editing-guard
 * deferral can keep stale for a whole typing session).
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { formatNumber, t, tp } from "../i18n";
import { fillTemplate } from "../i18n/dom";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { attachRowMenu } from "../lib/row-menu";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { updateBeats } from "../projects/index-writer";
import { tryFileOp } from "../lib/notify";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { EditSceneModal } from "../scenes/edit-scene-modal";
import { addSceneMenuItems, openSceneOnModClick } from "../scenes/scene-actions";
import { readSceneMeta, statusLabel } from "../scenes/scene-meta";
import { renderEmptyStateAction } from "../views/panel-kit";
import { BeatSheet, DEFAULT_TEMPLATE, beatBlurb, beatName } from "./beat-templates";
import { allTemplateMeta, resolveTemplate, synthesizeBeats } from "./custom-templates";
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

  /** Re-render in place after a notify caused by our own beat writes (marked
   *  as self-writes), so the host's scroller and the field being edited
   *  survive instead of a full body teardown. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-beats");

    const project = resolveActive(this.store.getProjects(), this.active.get());
    if (!project) {
      renderEmptyStateAction(container, t("plan.overview.noProjects"), [
        { label: t("plan.overview.createProject"), cta: true, onClick: () => this.plugin.newProject() },
      ]);
      return;
    }

    const sheet = project.inkswell?.beats;
    const resolved = resolveTemplate(sheet?.template, this.plugin.settings.customBeatTemplates);
    this.renderHeader(container, project, resolved !== null);

    // Missing template (deleted custom, or data.json didn't sync here): degrade
    // to rows synthesized from the assignment keys — same beat-id keyspace, so
    // notes stay visible/editable and reattach when the template comes back.
    // NEVER fall back to another template's beats over these assignments.
    if (resolved === null) {
      const warn = container.createDiv({ cls: "inkswell-beats__warning" });
      fillTemplate(warn, t("beats.missingTemplate", { template: sheet?.template ?? "" }), {
        button: (el) => {
          const open = el.createEl("button", { text: t("beats.openCustomize") });
          open.type = "button";
          open.onclick = () => void this.plugin.openCustomize("beat-templates");
        },
      });
    }
    const template = resolved ?? synthesizeBeats(sheet?.assignments ?? {});
    const beats = mergeBeats(sheet, template);
    const progress = beatProgress(beats);

    const head = container.createDiv({ cls: "inkswell-beats__progress" });
    head.createSpan({
      cls: "inkswell-stats__muted",
      text: t("beats.progress", {
        done: formatNumber(progress.done),
        total: formatNumber(progress.total),
        started: formatNumber(progress.started),
      }),
    });
    const bar = head.createDiv({ cls: "inkswell-progress" });
    bar.createDiv({ cls: "inkswell-progress__fill" }).style.width =
      `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`;

    const sceneTitles = project.scenes.map((s) => s.title);
    for (const beat of beats) {
      this.renderBeat(container, project, sheet?.template, beat, sceneTitles);
    }
  }

  private renderHeader(root: HTMLElement, project: Project, templateAvailable: boolean): void {
    const bar = root.createDiv({ cls: "inkswell-beats__toolbar" });

    const customs = this.plugin.settings.customBeatTemplates;
    const current = project.inkswell?.beats?.template ?? DEFAULT_TEMPLATE;
    const tsel = bar.createEl("select", { cls: "dropdown" });
    tagField(tsel, "beats:template");
    const metas = allTemplateMeta(customs);
    for (const meta of metas) {
      const o = tsel.createEl("option", { text: meta.label, value: meta.id });
      if (meta.id === current) o.selected = true;
    }
    if (!templateAvailable) {
      // The sheet names a template this device doesn't have: show it selected
      // (marked) so switching away is an explicit act, never a side effect.
      const o = tsel.createEl("option", { text: t("beats.template.missing", { template: current }), value: current });
      o.selected = true;
    }
    // Last option opens Customize instead of being a selection; the select snaps
    // back so cancelling leaves the sheet's template untouched (same pattern as
    // the Codex panel's "New type…").
    const MANAGE = "__manage__";
    tsel.createEl("option", { text: t("beats.template.manage"), value: MANAGE });
    const prev = tsel.value;
    tsel.onchange = () => {
      if (tsel.value === MANAGE) {
        tsel.value = prev;
        void this.plugin.openCustomize("beat-templates");
        return;
      }
      this.setTemplate(project, tsel.value);
    };

    const scaffold = bar.createEl("button", { text: t("beats.scaffold") });
    scaffold.setAttribute(
      "aria-label",
      templateAvailable ? t("beats.scaffold.aria") : t("beats.scaffold.unavailable")
    );
    scaffold.disabled = !templateAvailable;
    scaffold.onclick = async () => {
      // Dry-run first: the confirm dialog previews exactly what will be written.
      const analysis = analyzeScaffold(this.app, this.store, project, current, customs);
      if (!analysis) return;
      if (!analysis.structured && analysis.newScenes === 0 && analysis.willLink === 0) {
        new Notice(t("beats.scaffold.nothing"));
        return;
      }
      const label = metas.find((m) => m.id === current)?.label ?? current;
      if (!(await confirmScaffold(this.app, analysis, label))) return;
      const r = await tryFileOp(
        () =>
          scaffoldFromTemplate(
            this.app,
            this.store,
            this.plugin.settings,
            project,
            current,
            customs,
            analysis
          ),
        t("beats.scaffold.failed")
      );
      if (r === null) return;
      if (r.structured && r.chapters > 0) {
        new Notice(
          tp("beats.scaffold.doneStructured", r.scenes, {
            chapters: formatNumber(r.chapters),
            acts: formatNumber(r.acts),
          })
        );
      } else if (r.scenes > 0) {
        new Notice(tp("beats.scaffold.doneScenes", r.scenes));
      } else {
        new Notice(t("beats.scaffold.noNewScenes"));
      }
    };
  }

  private setTemplate(project: Project, templateId: string): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      // Delta against the CURRENT sheet: switching templates must never drop
      // assignments saved since this panel last rendered.
      this.plugin.selfWrites.mark(file.path);
      void tryFileOp(
        () =>
          updateBeats(this.app, file, (cur) => ({
            template: templateId,
            assignments: cur?.assignments ?? {},
          })),
        t("beats.template.switchFailed")
      );
    }
  }

  private renderBeat(
    parent: HTMLElement,
    project: Project,
    templateId: string | undefined,
    beat: ReturnType<typeof mergeBeats>[number],
    sceneTitles: string[]
  ): void {
    const row = parent.createDiv({ cls: "inkswell-beat" });
    if (beat.assignment.done) row.addClass("is-done");

    const header = row.createDiv({ cls: "inkswell-beat__header" });
    const done = header.createEl("input", { type: "checkbox" });
    tagField(done, `beats:done:${beat.id}`);
    done.checked = !!beat.assignment.done;
    done.setAttribute("aria-label", t("beats.markDone"));
    done.onchange = () => this.update(project, beat.id, { done: done.checked });

    header.createSpan({ cls: "inkswell-beat__pos", text: `${Math.round(beat.position * 100)}%` });
    // Display-only translations; `beat.name`/`beat.blurb` stay English data.
    header.createSpan({ cls: "inkswell-beat__name", text: beatName(templateId, beat) });

    row.createDiv({ cls: "inkswell-beat__blurb", text: beatBlurb(templateId, beat) });

    const note = row.createEl("textarea", { cls: "inkswell-beat__note" });
    // Stable identity so preserveFocus can carry focus + UNCOMMITTED text across
    // a rebuild that lands mid-typing (the safety net under the editing guard).
    tagField(note, `beats:note:${beat.id}`);
    note.rows = 2;
    note.placeholder = t("beats.note.placeholder");
    note.value = beat.assignment.note ?? "";
    note.onchange = () => this.update(project, beat.id, { note: note.value });

    // Scenes: a beat can span several scenes — show chips + an add dropdown.
    const sceneRow = row.createDiv({ cls: "inkswell-beat__scene" });
    const attached = beat.assignment.scenes ?? [];
    const chips = sceneRow.createDiv({ cls: "inkswell-beat__chips" });
    for (const title of attached) {
      const chip = chips.createSpan({ cls: "inkswell-chip" });
      // The label opens the scene's metadata window; the × unlinks the scene.
      const label = chip.createSpan({ cls: "inkswell-beat__chiplabel", text: title });
      label.setAttribute("aria-label", t("beats.scene.openMeta", { name: title }));
      label.onclick = () => this.openSceneMeta(project, title);

      // Status badge for the linked scene.
      const file = this.sceneFile(project, title);
      openSceneOnModClick(label, this.app, file?.path);
      if (file) {
        const status = readSceneMeta(this.app, file).status;
        if (status) {
          chip.createSpan({
            cls: `inkswell-status inkswell-status--${status}`,
            text: statusLabel(status, this.plugin.settings.listOverrides["scene.status"]),
          });
        }
      }

      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.setAttribute("aria-label", t("beats.scene.remove", { name: title }));
      x.onclick = () =>
        this.updateSceneLinks(project, beat.id, (scenes) => scenes.filter((s) => s !== title));

      // Scene menu — right-click on desktop, "⋯" tap on touch — for parity with
      // the Board's scene cards. Appended last so "⋯" sits after the × remove.
      if (file) {
        attachRowMenu(chip, chip, () => {
          const menu = new Menu();
          addSceneMenuItems(menu, this.app, project, title, file, {
            includeOpen: true,
            plugin: this.plugin,
          });
          return menu;
        });
      }
    }
    const remaining = sceneTitles.filter((title) => !attached.includes(title));
    if (remaining.length > 0) {
      const add = sceneRow.createEl("select", { cls: "dropdown inkswell-beat__addscene" });
      add.createEl("option", { text: t("beats.scene.add"), value: "" });
      for (const title of remaining) add.createEl("option", { text: title, value: title });
      add.value = "";
      add.onchange = () => {
        const title = add.value;
        if (title) {
          this.updateSceneLinks(project, beat.id, (scenes) =>
            scenes.includes(title) ? scenes : [...scenes, title]
          );
        }
      };
    }

    // Create a brand-new scene already attached to this beat (synopsis seeded from
    // the beat's blurb). createScene inserts it into the index, so the chip links a
    // real file immediately.
    const create = sceneRow.createEl("button", {
      cls: "inkswell-beat__newscene",
      text: t("beats.scene.new"),
    });
    create.setAttribute("aria-label", t("beats.scene.new.aria"));
    create.onclick = () => {
      // Each created scene appends to the beat's CURRENT scene list, so
      // repeated "Create another" attaches every new scene, not just the last.
      promptNewScene(this.app, this.store, this.plugin.settings, project, {
        meta: { synopsis: beat.blurb },
        onCreated: (file) => {
          this.updateSceneLinks(project, beat.id, (scenes) =>
            scenes.includes(file.basename) ? scenes : [...scenes, file.basename]
          );
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
      new Notice(t("beats.scene.noFile", { name: title }));
    }
  }

  /**
   * Apply a value patch (note/done) to one beat against the CURRENT stored
   * sheet. The transform runs inside `processFrontMatter`, so edits saved to
   * OTHER beats since this panel last rendered are never overwritten — the
   * render-time snapshot is only used to locate the beat, never as write state.
   */
  private update(
    project: Project,
    beatId: string,
    patch: Partial<BeatSheet["assignments"][string]>
  ): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      // The frontmatter write triggers a store refresh; the self-write mark
      // routes it to softRefresh so the sheet re-renders in place (scroll and
      // the focused textarea survive).
      this.plugin.selfWrites.mark(file.path);
      void tryFileOp(
        () => updateBeats(this.app, file, (cur) => setAssignment(cur, beatId, patch)),
        t("beats.saveFailed")
      );
    }
  }

  /**
   * Transform one beat's scene-link list against its CURRENT stored state
   * (folding in a legacy single-`scene` link), expressed as a list op so
   * concurrent adds/removes on the same beat compose instead of clobbering.
   */
  private updateSceneLinks(
    project: Project,
    beatId: string,
    op: (currentScenes: string[]) => string[]
  ): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      this.plugin.selfWrites.mark(file.path);
      void tryFileOp(
        () =>
          updateBeats(this.app, file, (cur) => {
            const raw = (cur?.assignments[beatId] ?? {}) as BeatSheet["assignments"][string] & {
              scene?: string;
            };
            const scenes = raw.scenes ?? (raw.scene ? [raw.scene] : []);
            return setAssignment(cur, beatId, { scenes: op(scenes) });
          }),
        t("beats.saveFailed")
      );
    }
  }
}
