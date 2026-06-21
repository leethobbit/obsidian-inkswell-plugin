/**
 * Write destination: a focused in-plugin manuscript editor. Left: scene
 * navigator for the active project. Center: an editable area for the selected
 * scene's body. Right: the Scene Inspector for that scene. Stays in the Inkswell
 * tab so you write without losing your planning context.
 *
 * Saves happen on blur / scene-switch / unmount (NOT per keystroke) so a store
 * refresh never rebuilds the editor mid-type. Frontmatter is preserved: only the
 * body is rewritten, re-reading current frontmatter at save time so concurrent
 * Inspector edits aren't clobbered. (A future upgrade can embed Obsidian's Live
 * Preview editor per scene; this textarea editor is the robust v1.)
 */

import { App, TFile } from "obsidian";
import {
  PROMPT_CATEGORIES,
  PromptCategory,
  PromptPhase,
  pickPrompt,
} from "../ideation/prompts";
import { countWords } from "../lib/wordcount";
import { resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { SceneInspector } from "../scenes/scene-inspector";
import { SprintController } from "../sprints/sprint-controller";
import type InkswellPlugin from "../../main";

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/;

export class WritePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private sprints: SprintController;
  private inspector: SceneInspector;

  private container: HTMLElement | null = null;
  /** Tracks the project the editor is currently bound to, to reset on change. */
  private lastProject: string | null = null;
  private selectedScene: string | null = null;

  private textarea: HTMLTextAreaElement | null = null;
  private currentFile: TFile | null = null;
  private loadedBody = "";
  private countEl: HTMLElement | null = null;
  private unsub: (() => void) | null = null;

  // Writing-prompt card state (Write empty state).
  private promptPhase: PromptPhase = "draft";
  private promptCategory: PromptCategory | null = null;
  private promptText = "";

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, sprints: SprintController) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.sprints = sprints;
    this.inspector = new SceneInspector(this.app, store);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-write");

    if (!this.unsub) {
      this.unsub = this.sprints.onUpdate(() => this.renderTopbar());
    }

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    this.renderTopbar();

    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project) {
      const wrap = container.createDiv({ cls: "inkswell-write__empty" });
      wrap.createDiv({
        cls: "inkswell-stats__muted",
        text: 'No multi-scene project yet. Use the "New project" button on Home (or the "New project" command).',
      });
      this.renderPromptCard(wrap);
      return;
    }
    // The active project changed underneath us — flush the old scene and reset,
    // so the editor never points at a file from a different project.
    if (project.vaultPath !== this.lastProject) {
      void this.saveBody();
      this.selectedScene = null;
      this.currentFile = null;
      this.lastProject = project.vaultPath;
    }

    const main = container.createDiv({ cls: "inkswell-write__main" });
    this.renderNavigator(main, project);
    this.renderEditor(main);
    const insp = main.createDiv({ cls: "inkswell-write__inspector" });
    this.inspector.render(insp, this.currentFile);
  }

  private renderTopbar(): void {
    if (!this.container) return;
    let bar = this.container.querySelector<HTMLElement>(".inkswell-write__topbar");
    if (!bar) bar = this.container.createDiv({ cls: "inkswell-write__topbar" });
    bar.empty();

    const active = this.sprints.getActive();
    if (active) {
      bar.createSpan({
        cls: "inkswell-stats__muted",
        text: `Sprint: ${active.words}w · ${this.sprints.remainingSec()}s`,
      });
      const end = bar.createEl("button", { text: "End sprint" });
      end.onclick = () => this.sprints.finish();
    } else {
      const sprint = bar.createEl("button", { text: "Start sprint" });
      sprint.onclick = () => this.plugin.startSprint();
    }
    this.countEl = bar.createSpan({ cls: "inkswell-write__count" });
    this.updateCount();
    // Keep the topbar first in the container.
    this.container.prepend(bar);
  }

  private renderNavigator(parent: HTMLElement, project: Project): void {
    const nav = parent.createDiv({ cls: "inkswell-write__nav" });
    for (const scene of project.scenes) {
      const row = nav.createDiv({ cls: "inkswell-write__scene" });
      if (scene.path === this.selectedScene) row.addClass("is-active");
      row.createSpan({ cls: "inkswell-scene__title", text: scene.title });
      if (scene.path) {
        const meta = readSceneMeta(this.app, this.app.vault.getAbstractFileByPath(scene.path) as TFile);
        if (meta.status) {
          row.createSpan({ cls: `inkswell-status inkswell-status--${meta.status}`, text: meta.status[0].toUpperCase() });
        }
      }
      row.onclick = () => {
        if (!scene.path) return;
        void this.saveBody();
        this.selectedScene = scene.path;
        this.rerender();
      };
    }

    // Always-available writing prompt, below the scene list (uses the selected
    // scene as POV context).
    const promptWrap = nav.createDiv({ cls: "inkswell-write__navprompt" });
    this.renderPromptCard(promptWrap);
  }

  private renderEditor(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__editor" });
    const file =
      this.selectedScene && this.app.vault.getAbstractFileByPath(this.selectedScene);
    if (!(file instanceof TFile)) {
      this.currentFile = null;
      this.textarea = null;
      this.emptyState(wrap, "Select a scene to write.");
      return;
    }
    this.currentFile = file;

    const head = wrap.createDiv({ cls: "inkswell-write__editorhead" });
    head.createSpan({ cls: "inkswell-write__editortitle", text: file.basename });
    const open = head.createEl("button", { cls: "clickable-icon", text: "Open in tab" });
    open.onclick = () => openScene(this.app, file);

    const ta = wrap.createEl("textarea", { cls: "inkswell-editor" });
    ta.placeholder = "Write…";
    this.textarea = ta;
    void this.app.vault.cachedRead(file).then((content) => {
      const m = content.match(FRONTMATTER_RE);
      const body = m ? m[2] : content;
      ta.value = body;
      this.loadedBody = body;
      this.updateCount();
    });
    ta.oninput = () => this.updateCount();
    ta.onblur = () => void this.saveBody();
  }

  private updateCount(): void {
    if (this.countEl) this.countEl.setText(this.textarea ? `${countWords(this.textarea.value)} words` : "");
  }

  private async saveBody(): Promise<void> {
    const file = this.currentFile;
    const ta = this.textarea;
    if (!file || !ta) return;
    const body = ta.value;
    if (body === this.loadedBody) return;
    const cur = await this.app.vault.read(file);
    const m = cur.match(FRONTMATTER_RE);
    const fm = m ? m[1] : "";
    await this.app.vault.modify(file, fm + body);
    this.loadedBody = body;
  }

  private emptyState(parent: HTMLElement, text: string): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__empty" });
    wrap.createDiv({ cls: "inkswell-stats__muted", text });
  }

  /**
   * The writing-prompt card. Lives at the bottom of the navigator so it's always
   * reachable (not just on the empty state) and can use the selected scene's POV
   * as context. Also shown on the no-project empty state.
   */
  private renderPromptCard(parent: HTMLElement): void {
    const card = parent.createDiv({ cls: "inkswell-prompt-card" });

    // Filters: phase (draft/revise) + category.
    const filters = card.createDiv({ cls: "inkswell-prompt-card__filters" });
    const phaseSel = filters.createEl("select", { cls: "dropdown" });
    for (const [val, label] of [
      ["draft", "Drafting"],
      ["revise", "Revising"],
    ] as const) {
      const o = phaseSel.createEl("option", { text: label, value: val });
      if (val === this.promptPhase) o.selected = true;
    }
    phaseSel.onchange = () => {
      this.promptPhase = phaseSel.value as PromptPhase;
      this.repickPrompt();
      this.rerender();
    };

    const catSel = filters.createEl("select", { cls: "dropdown" });
    catSel.createEl("option", { text: "Any category", value: "" });
    for (const c of PROMPT_CATEGORIES) {
      const o = catSel.createEl("option", { text: c.label, value: c.id });
      if (c.id === this.promptCategory) o.selected = true;
    }
    catSel.onchange = () => {
      this.promptCategory = (catSel.value || null) as PromptCategory | null;
      this.repickPrompt();
      this.rerender();
    };

    card.createDiv({ cls: "inkswell-stats__muted", text: "Prompt" });
    if (!this.promptText) this.repickPrompt();
    card.createDiv({
      cls: "inkswell-prompt-card__text",
      text: this.promptText || "No prompts match this filter.",
    });
    const nb = card.createEl("button", { text: "New prompt" });
    nb.onclick = () => {
      this.repickPrompt();
      this.rerender();
    };
  }

  /** Re-pick a prompt for the current phase/category, using the active scene's
   * POV as context (fills `{pov}` prompts) and avoiding an immediate repeat. */
  private repickPrompt(): void {
    const picked = pickPrompt({
      phase: this.promptPhase,
      category: this.promptCategory,
      pov: this.activePov(),
      exclude: this.promptText,
    });
    this.promptText = picked ? picked.text : "";
  }

  /**
   * POV for prompt context: the scene selected in Write if there is one,
   * otherwise the workspace's active scene file. Null when neither is a scene.
   */
  private activePov(): string | null {
    let file: TFile | null = null;
    if (this.selectedScene) {
      const f = this.app.vault.getAbstractFileByPath(this.selectedScene);
      if (f instanceof TFile) file = f;
    }
    if (!file) {
      const af = this.app.workspace.getActiveFile();
      if (af instanceof TFile && af.extension === "md") file = af;
    }
    return file ? readSceneMeta(this.app, file).pov ?? null : null;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  dispose(): void {
    void this.saveBody();
    this.unsub?.();
    this.unsub = null;
  }
}
