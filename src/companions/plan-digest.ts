/**
 * A condensed plan that follows the scene you're writing: this chapter's scenes
 * with their synopses (there is no chapter-level synopsis field), the beats
 * assigned to those scenes, the logline and theme, then the planning note
 * itself, rendered read-only. "Open note" edits it.
 *
 * One renderer, two homes (see reference.ts): the Plan sidebar companion and
 * the Plan panel in Write's side column.
 */

import { Component, MarkdownRenderer, TFile } from "obsidian";
import { t, tp } from "../i18n";
import { attachOpenInTab } from "../lib/row-menu";
import { resolveTemplate, synthesizeBeats } from "../outliner/custom-templates";
import { findPlanningNote } from "../plan/planning-note";
import { Project } from "../projects/types";
import { openFileInTab } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { beatsForScenes, chapterOf } from "./context";
import { ReferenceHost, Sections, renderReferenceEmpty } from "./reference";

/** The planning note as last rendered, kept so a redraw can put the same
 *  element back instead of rendering the markdown again. */
interface RenderedNote {
  path: string;
  mtime: number;
  el: HTMLElement;
  md: HTMLElement;
  component: Component;
  more: HTMLElement | null;
}

export class PlanDigest {
  private note: RenderedNote | null = null;
  private noteExpanded = false;
  private sections = new Sections();

  constructor(private host: ReferenceHost) {}

  /** Whether `path` is the planning note this digest shows for `project`. */
  showsNote(project: Project, path: string): boolean {
    return findPlanningNote(this.host.app, project)?.path === path;
  }

  dispose(): void {
    this.dropNote();
  }

  render(body: HTMLElement, project: Project, scene: TFile | null): void {
    const app = this.host.app;
    const scenes = project.scenes.map((s) => {
      const f = s.path ? app.vault.getAbstractFileByPath(s.path) : null;
      return { title: s.title, file: f instanceof TFile ? f : null };
    });
    const metas = scenes.map((s) => (s.file ? readSceneMeta(app, s.file) : null));
    const chapter = scene
      ? chapterOf(
          scenes.map((s, i) => ({ title: s.title, chapter: metas[i]?.chapter })),
          project.inkswell?.chapters,
          scene.basename
        )
      : null;

    if (!scene) {
      renderReferenceEmpty(body, t("companion.plan.noScene"));
    } else if (!chapter) {
      renderReferenceEmpty(body, t("companion.plan.noChapter"));
    }

    if (chapter) {
      this.sections.section(body, "chapter", chapter.title, (host) => {
        chapter.scenes.forEach((title, i) => {
          const idx = scenes.findIndex((s) => s.title === title);
          const file = scenes[idx]?.file ?? null;
          const synopsis = metas[idx]?.synopsis?.trim();
          const row = host.createDiv({ cls: "inkswell-companion__scene" });
          if (i === chapter.current) row.addClass("is-current");
          const name = row.createDiv({ cls: "inkswell-companion__scenename", text: title });
          row.createDiv({
            cls: synopsis ? "inkswell-companion__synopsis" : "inkswell-companion__synopsis is-empty",
            text: synopsis || t("companion.plan.noSynopsis"),
          });
          if (file && i !== chapter.current) {
            name.addClass("is-link");
            name.setAttribute("role", "link");
            name.tabIndex = 0;
            name.onclick = (e) => this.host.openScene(file, e.ctrlKey || e.metaKey);
          }
        });
      });

      const sheet = project.inkswell?.beats;
      const assignments = sheet?.assignments;
      const beats = resolveTemplate(sheet?.template, this.host.plugin.settings.customBeatTemplates);
      const here = beatsForScenes(beats ?? synthesizeBeats(assignments ?? {}), assignments, chapter.scenes);
      if (here.length > 0) {
        this.sections.section(body, "beats", tp("companion.plan.beats", here.length), (host) => {
          for (const { beat, assignment } of here) {
            const row = host.createDiv({ cls: "inkswell-companion__beat" });
            const head = row.createDiv({ cls: "inkswell-companion__beathead" });
            head.createSpan({ text: beat.name });
            if (assignment.done) head.createSpan({ cls: "inkswell-companion__done", text: t("companion.plan.done") });
            const note = assignment.note?.trim();
            if (note) row.createDiv({ cls: "inkswell-companion__beatnote", text: note });
            else if (beat.blurb) row.createDiv({ cls: "inkswell-companion__beatblurb", text: beat.blurb });
          }
        });
      }
    }

    const overview = project.inkswell?.overview;
    const logline = overview?.logline?.trim();
    const theme = overview?.theme?.trim();
    if (logline || theme) {
      this.sections.section(body, "story", t("companion.plan.story"), (host) => {
        if (logline) this.labelled(host, t("companion.plan.logline"), logline);
        if (theme) this.labelled(host, t("companion.plan.theme"), theme);
      });
    }

    const note = findPlanningNote(app, project);
    if (!note) {
      this.dropNote();
      return;
    }
    const details = this.sections.section(body, "note", t("companion.plan.note"), (host) =>
      this.renderNote(host, note)
    );
    // Folding is measured, and a closed section has no height to measure.
    details.addEventListener("toggle", () => this.syncFold());
  }

  private labelled(host: HTMLElement, label: string, text: string): void {
    const row = host.createDiv({ cls: "inkswell-companion__labelled" });
    row.createDiv({ cls: "inkswell-companion__label", text: label });
    row.createDiv({ text });
  }

  private renderNote(host: HTMLElement, note: TFile): void {
    const actions = host.createDiv({ cls: "inkswell-companion__noteactions" });
    const open = actions.createEl("button", { text: t("card.openNote") });
    const openTab = () => openFileInTab(this.host.app, note);
    open.onclick = openTab;
    attachOpenInTab(open, openTab);

    // Unchanged since the last draw: put the same element back. Rendering the
    // markdown again would blank the section for a moment on every refresh
    // (and, in Write, there is one after each autosave), losing the scroll
    // position of anyone reading it.
    const kept = this.note;
    if (kept && kept.path === note.path && kept.mtime === note.stat.mtime) {
      host.appendChild(kept.el);
      this.syncFold();
      return;
    }

    this.dropNote();
    const el = host.createDiv({ cls: "inkswell-companion__notewrap" });
    const md = el.createDiv({ cls: "inkswell-companion__note markdown-rendered" });
    if (!this.noteExpanded) md.addClass("is-folded");
    const component = new Component();
    component.load();
    const rendered: RenderedNote = { path: note.path, mtime: note.stat.mtime, el, md, component, more: null };
    this.note = rendered;
    void this.host.app.vault.cachedRead(note).then(async (text) => {
      if (this.note !== rendered) return;
      await MarkdownRenderer.render(this.host.app, text, md, note.path, component);
      if (this.note === rendered) this.syncFold();
    });
  }

  /** Offer "Show all" exactly when the folded note is taller than its fold. */
  private syncFold(): void {
    const note = this.note;
    if (!note || !note.el.isConnected) return;
    const overflows = !this.noteExpanded && note.md.scrollHeight > note.md.clientHeight + 4;
    if (overflows && !note.more) {
      const more = note.el.createEl("button", {
        cls: "inkswell-companion__more",
        text: t("companion.plan.showAll"),
      });
      more.onclick = () => {
        this.noteExpanded = true;
        note.md.removeClass("is-folded");
        more.remove();
        note.more = null;
      };
      note.more = more;
    } else if (!overflows && note.more && note.md.clientHeight > 0) {
      note.more.remove();
      note.more = null;
    }
  }

  private dropNote(): void {
    this.note?.component.unload();
    this.note = null;
  }
}
