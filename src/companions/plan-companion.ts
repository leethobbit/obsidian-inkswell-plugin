/**
 * Plan companion (sidebar): a condensed plan that follows the scene you're
 * writing — this chapter's scenes with their synopses (there is no chapter-level
 * synopsis field), the beats assigned to those scenes, the logline and theme,
 * then the planning note itself, rendered read-only. "Open note" edits it.
 */

import { Component, MarkdownRenderer, TFile, WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { t, tp } from "../i18n";
import { attachOpenInTab } from "../lib/row-menu";
import { resolveTemplate, synthesizeBeats } from "../outliner/custom-templates";
import { findPlanningNote } from "../plan/planning-note";
import { Project } from "../projects/types";
import { openFileInTab } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { CompanionView } from "./companion-view";
import { beatsForScenes, chapterOf } from "./context";
import { CompanionId } from "./registry";

export class PlanCompanionView extends CompanionView {
  /** Owns the planning note's rendered markdown; replaced on every render. */
  private noteComponent: Component | null = null;
  private noteExpanded = false;

  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    // The planning note is a normal note: re-render when it's saved.
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        const project = this.project();
        if (project && findPlanningNote(this.app, project)?.path === file.path) this.requestRender();
      })
    );
  }

  async onClose(): Promise<void> {
    this.noteComponent?.unload();
    this.noteComponent = null;
    await super.onClose();
  }

  protected companionId(): CompanionId {
    return "plan";
  }

  protected openInInkswell(): void {
    void this.plugin.openInkswell("plan");
  }

  protected renderBody(body: HTMLElement, project: Project): void {
    const scene = this.sceneFile(project);
    const scenes = project.scenes.map((s) => {
      const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      return { title: s.title, file: f instanceof TFile ? f : null };
    });
    const metas = scenes.map((s) => (s.file ? readSceneMeta(this.app, s.file) : null));
    const chapter = scene
      ? chapterOf(
          scenes.map((s, i) => ({ title: s.title, chapter: metas[i]?.chapter })),
          project.inkswell?.chapters,
          scene.basename
        )
      : null;

    if (!scene) {
      this.empty(body, t("companion.plan.noScene"));
    } else if (!chapter) {
      this.empty(body, t("companion.plan.noChapter"));
    }

    if (chapter) {
      this.section(body, "chapter", chapter.title, (host) => {
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
            name.onclick = (e) => this.openScene(file, e.ctrlKey || e.metaKey);
          }
        });
      });

      const sheet = project.inkswell?.beats;
      const assignments = sheet?.assignments;
      const beats = resolveTemplate(sheet?.template, this.plugin.settings.customBeatTemplates);
      const here = beatsForScenes(beats ?? synthesizeBeats(assignments ?? {}), assignments, chapter.scenes);
      if (here.length > 0) {
        this.section(body, "beats", tp("companion.plan.beats", here.length), (host) => {
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
      this.section(body, "story", t("companion.plan.story"), (host) => {
        if (logline) this.labelled(host, t("companion.plan.logline"), logline);
        if (theme) this.labelled(host, t("companion.plan.theme"), theme);
      });
    }

    const note = findPlanningNote(this.app, project);
    this.noteComponent?.unload();
    this.noteComponent = null;
    if (note) {
      this.section(body, "note", t("companion.plan.note"), (host) => this.renderNote(host, note));
    }
  }

  private labelled(host: HTMLElement, label: string, text: string): void {
    const row = host.createDiv({ cls: "inkswell-companion__labelled" });
    row.createDiv({ cls: "inkswell-companion__label", text: label });
    row.createDiv({ text });
  }

  private renderNote(host: HTMLElement, note: TFile): void {
    const actions = host.createDiv({ cls: "inkswell-companion__noteactions" });
    const open = actions.createEl("button", { text: t("card.openNote") });
    const openTab = () => openFileInTab(this.app, note);
    open.onclick = openTab;
    attachOpenInTab(open, openTab);

    const md = host.createDiv({ cls: "inkswell-companion__note markdown-rendered" });
    if (!this.noteExpanded) md.addClass("is-folded");
    const component = new Component();
    component.load();
    this.noteComponent = component;
    void this.app.vault.cachedRead(note).then(async (text) => {
      if (this.noteComponent !== component) return;
      await MarkdownRenderer.render(this.app, text, md, note.path, component);
      if (this.noteExpanded || md.scrollHeight <= md.clientHeight + 4) return;
      const more = host.createEl("button", { cls: "inkswell-companion__more", text: t("companion.plan.showAll") });
      more.onclick = () => {
        this.noteExpanded = true;
        md.removeClass("is-folded");
        more.remove();
      };
    });
  }
}
