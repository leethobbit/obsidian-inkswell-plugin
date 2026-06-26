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

import { EditorView } from "@codemirror/view";
import { App, FuzzySuggestModal, TFile } from "obsidian";
import { PromptModal } from "../ideation/prompt-modal";
import { RevisionModal } from "../revisions/revision-modal";
import { createSceneEditor, flashRange, insertPlaceholder } from "./scene-editor";
import { PlaceholderKind, scanPlaceholders } from "../lib/placeholders";
import { PromptCategory, PromptPhase } from "../ideation/prompts";
import { countWords } from "../lib/wordcount";
import { resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { readSceneMeta } from "../scenes/scene-meta";
import { SceneInspector } from "../scenes/scene-inspector";
import { SprintController } from "../sprints/sprint-controller";
import type InkswellPlugin from "../../main";

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/;

/** The five to-do marker types, for the insert picker. */
interface TodoType {
  kind: PlaceholderKind;
  label: string;
  desc: string;
}
const TODO_TYPES: TodoType[] = [
  { kind: "todo", label: "TODO", desc: "A generic to-do" },
  { kind: "research", label: "Research", desc: "A fact or detail to look up / verify" },
  { kind: "note", label: "Note", desc: "A note or reminder to yourself" },
  { kind: "dialogue", label: "Dialogue", desc: "Dialogue to write later" },
  { kind: "scene", label: "Scene", desc: "A scene to write or expand" },
];

/** Quick picker for "Insert a to-do marker…" (command palette + toolbar). */
class TodoPickerModal extends FuzzySuggestModal<TodoType> {
  constructor(app: App, private onPick: (kind: PlaceholderKind) => void) {
    super(app);
    this.setPlaceholder("Insert a to-do marker…");
  }
  getItems(): TodoType[] {
    return TODO_TYPES;
  }
  getItemText(t: TodoType): string {
    return `${t.label} — ${t.desc}`;
  }
  onChooseItem(t: TodoType): void {
    this.onPick(t.kind);
  }
}

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

  private editor: EditorView | null = null;
  /** Bumped each render; a stale async scene-load checks it and bails. */
  private editorToken = 0;
  private currentFile: TFile | null = null;
  private loadedBody = "";
  /** Frontmatter of the loaded scene, kept so the live word count reconciles
   *  with the on-disk count (which includes it). */
  private loadedFrontmatter = "";
  private countEl: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  /** A token to scroll-to + flash once the editor finishes loading (from Todos). */
  private pendingHighlight: { from: number; to: number } | null = null;

  // Writing-prompt state. Filters persist across modal opens; promptText is the
  // chosen prompt currently shown next to the topbar "Prompt" button ("" = none).
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

  /**
   * Select a scene for editing (used when navigating in from another panel).
   * Sets the owning project active and pins `lastProject` so the next render
   * keeps the selection instead of clearing it on a perceived project change.
   */
  selectScene(path: string, highlight?: { from: number; to: number }): void {
    const ctx = this.store.findSceneByPath(path);
    if (!ctx) return;
    this.plugin.activeProject.set(ctx.project.vaultPath);
    this.selectedScene = path;
    this.lastProject = ctx.project.vaultPath;
    this.pendingHighlight = highlight ?? null;
  }

  /** Whether a live scene editor is currently mounted (for command availability). */
  hasEditor(): boolean {
    return !!this.editor;
  }

  /** Open the to-do picker and insert the chosen marker into the live editor. */
  promptInsertTodo(): void {
    if (!this.editor) return;
    new TodoPickerModal(this.app, (kind) => {
      if (this.editor) insertPlaceholder(this.editor, kind);
    }).open();
  }

  render(container: HTMLElement): void {
    // Flush + tear down any live editor before we rebuild the DOM. saveBody reads
    // the doc synchronously, so calling it before destroy() captures the content.
    if (this.editor) {
      void this.saveBody();
      this.editor.destroy();
      this.editor = null;
    }

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
      return;
    }
    // The active project changed underneath us — reset, so the editor never
    // points at a file from a different project. (The old scene was already
    // flushed by the editor teardown at the top of render.)
    if (project.vaultPath !== this.lastProject) {
      this.selectedScene = null;
      this.currentFile = null;
      this.lastProject = project.vaultPath;
    }

    this.renderNextUp(container);

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

    // Sprint group.
    const sprintGroup = bar.createDiv({ cls: "inkswell-write__group" });
    const active = this.sprints.getActive();
    if (active) {
      sprintGroup.createSpan({
        cls: "inkswell-stats__muted",
        text: `Sprint: ${active.words}w · ${this.sprints.remainingSec()}s`,
      });
      const end = sprintGroup.createEl("button", { text: "End sprint" });
      end.onclick = () => this.sprints.finish();
    } else {
      const sprint = sprintGroup.createEl("button", { text: "Start sprint" });
      sprint.onclick = () => this.plugin.startSprint();
    }

    // Prompt group — separated from the sprint controls by a divider; the chosen
    // prompt fills the remaining space (ellipsis-truncated) and reopens on click.
    const promptGroup = bar.createDiv({
      cls: "inkswell-write__group inkswell-write__group--prompt",
    });
    const promptBtn = promptGroup.createEl("button", { text: "Prompt" });
    promptBtn.onclick = () => this.openPromptModal();
    const promptEl = promptGroup.createSpan({
      cls: "inkswell-write__prompt",
      text: this.promptText,
    });
    if (this.promptText) promptEl.onclick = () => this.openPromptModal();

    // To-do-insert group — only useful with a scene open. Lets you drop a
    // [TODO:…]/[RESEARCH:…]/[NOTE:…]/[DIALOGUE:…]/[SCENE:…] marker and keep drafting.
    if (this.selectedScene) {
      const insertGroup = bar.createDiv({
        cls: "inkswell-write__group inkswell-write__group--insert",
      });
      insertGroup.createSpan({ cls: "inkswell-stats__muted", text: "Insert:" });
      for (const { kind, label } of TODO_TYPES) {
        const btn = insertGroup.createEl("button", { text: label });
        // Insert WITHOUT stealing focus from the editor. If the button took focus,
        // the editor would blur → saveBody → store refresh → the host rebuilds the
        // Write panel, destroying the live editor mid-insert (cursor resets to 0,
        // the next clicks misfire). preventDefault on mousedown keeps the caret in
        // the editor so every click inserts where the cursor actually is.
        btn.onmousedown = (e) => e.preventDefault();
        btn.onclick = () => {
          if (this.editor) insertPlaceholder(this.editor, kind);
        };
      }
      const gaps = insertGroup.createEl("button", { text: "Find to-dos" });
      gaps.setAttribute("aria-label", "Open the Todos sweep (Revise)");
      gaps.onclick = () => void this.plugin.openTodos();
      const issue = insertGroup.createEl("button", { text: "Log issue" });
      issue.setAttribute("aria-label", "Log a revision issue for this scene (Mod-Shift-L)");
      issue.onclick = () => this.logIssue();
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
      const sceneFile = scene.path && this.app.vault.getAbstractFileByPath(scene.path);
      if (sceneFile instanceof TFile) {
        const meta = readSceneMeta(this.app, sceneFile);
        if (meta.status) {
          row.createSpan({ cls: `inkswell-status inkswell-status--${meta.status}`, text: meta.status[0].toUpperCase() });
        }
      }
      row.onclick = () => {
        if (!scene.path) return;
        this.selectedScene = scene.path;
        this.rerender();
      };
    }
  }

  private renderEditor(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__editor" });
    const file =
      this.selectedScene && this.app.vault.getAbstractFileByPath(this.selectedScene);
    // Invalidate any in-flight scene-load from a prior render before we branch.
    const token = ++this.editorToken;
    if (!(file instanceof TFile)) {
      this.currentFile = null;
      this.emptyState(wrap, "Select a scene to write.");
      return;
    }
    this.currentFile = file;

    const head = wrap.createDiv({ cls: "inkswell-write__editorhead" });
    head.createSpan({ cls: "inkswell-write__editortitle", text: file.basename });

    // Read async, then build the editor seeded with the body. Seeding the initial
    // state (vs. dispatching after) keeps the undo history clean and avoids a
    // load→empty undo step. The token guards against a stale read landing after
    // the user has already switched scenes.
    const host = wrap.createDiv({ cls: "inkswell-write__cm" });
    void this.app.vault.cachedRead(file).then((content) => {
      if (token !== this.editorToken) return;
      const m = content.match(FRONTMATTER_RE);
      const body = m ? m[2] : content;
      this.loadedBody = body;
      this.loadedFrontmatter = m ? m[1] : "";
      this.editor = createSceneEditor({
        parent: host,
        doc: body,
        onChange: () => this.onEditorChange(),
        onBlur: () => void this.saveBody(),
        onLogIssue: () => this.logIssue(),
      });
      this.updateCount();
      // Prime the tracker baseline for this scene so the first word typed in a
      // not-yet-seen file isn't lost to first-sight baselining.
      this.reportLiveCount();
      this.applyPendingHighlight(body);
    });
  }

  /**
   * After the editor loads, scroll to + flash the token a Todos-panel click asked
   * for. Editor doc == body (frontmatter stripped), so the panel's offsets line up;
   * we re-scan to confirm the exact token (the file may have shifted since the scan)
   * and fall back to the raw offsets (flashRange clamps them) if it's gone.
   */
  private applyPendingHighlight(body: string): void {
    const hl = this.pendingHighlight;
    this.pendingHighlight = null;
    if (!hl || !this.editor) return;
    const match = scanPlaceholders(body).find((m) => m.from === hl.from);
    const target = match ?? hl;
    flashRange(this.editor, target.from, target.to);
  }

  private updateCount(): void {
    if (this.countEl) {
      this.countEl.setText(this.editor ? `${countWords(this.editor.state.doc.toString())} words` : "");
    }
  }

  /** A live document edit: refresh the visible count and feed the live word
   *  count to the tracker so the sprint tally ticks up as you type (not just on
   *  blur/save). */
  private onEditorChange(): void {
    this.updateCount();
    this.reportLiveCount();
  }

  /** Report the editor's current word count to the tracker for the active scene. */
  private reportLiveCount(): void {
    if (!this.editor || !this.currentFile) return;
    const body = this.editor.state.doc.toString();
    this.plugin.tracker.noteLiveContent(this.currentFile.path, this.loadedFrontmatter + body);
  }

  private async saveBody(): Promise<void> {
    const file = this.currentFile;
    const ed = this.editor;
    if (!file || !ed) return;
    const body = ed.state.doc.toString();
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
   * Open the writing-prompt generator. Seeds it with the persisted filters and
   * the active scene's POV (for `{pov}` prompts); on "Use this prompt" the chosen
   * text is shown next to the topbar button and the filters are remembered.
   */
  private openPromptModal(): void {
    new PromptModal(
      this.app,
      {
        phase: this.promptPhase,
        category: this.promptCategory,
        pov: this.activePov(),
        text: this.promptText,
      },
      (res) => {
        this.promptPhase = res.phase;
        this.promptCategory = res.category;
        this.promptText = res.text;
        this.renderTopbar();
      }
    ).open();
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

  /**
   * "Tell tomorrow-you what's next": a single rolling breadcrumb (data.json), shown
   * at the top of Write so re-entry is fast. Light-touch — empty by default.
   */
  private renderNextUp(container: HTMLElement): void {
    const card = container.createDiv({ cls: "inkswell-write__nextup" });
    card.createSpan({ cls: "inkswell-stats__muted", text: "Next up:" });
    const input = card.createEl("input", { type: "text", cls: "inkswell-write__nextupinput" });
    input.value = this.plugin.tracker.getNextUp();
    input.placeholder = "Leave yourself a note for next session…";
    input.onchange = () => this.plugin.tracker.setNextUp(input.value);
  }

  /** Open the revision-issue modal anchored to the scene currently being written. */
  private logIssue(): void {
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project) return;
    const scene =
      this.selectedScene != null
        ? this.store.findSceneByPath(this.selectedScene)?.scene.title ?? null
        : null;
    new RevisionModal(this.app, project, scene).open();
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  dispose(): void {
    void this.saveBody();
    this.editor?.destroy();
    this.editor = null;
    this.unsub?.();
    this.unsub = null;
  }
}
