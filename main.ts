/**
 * Inkswell — Obsidian writer's suite. Plugin entry point.
 *
 * Wires the project store, explorer, compile, writing tracker, sprints, goals,
 * stats, and settings. Feature modules live under src/; this file only registers
 * and connects them.
 *
 * Persistence: data.json holds `{ settings, writingLog }`. Per-project config
 * (compile, goals, revisions) lives in the project index's `inkswell` frontmatter.
 */

import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { runCompile } from "./src/compile/engine";
import { resolveCompileConfig } from "./src/compile/config";
import { TargetModal } from "./src/goals/target-modal";
import { Idea, newIdeaId } from "./src/ideation/types";
import { countWords } from "./src/lib/wordcount";
import { openScene, promptText } from "./src/scenes/scene-actions";
import { ActiveProject, resolveActive } from "./src/projects/active-project";
import { NewProjectModal } from "./src/projects/new-project-modal";
import { ProjectStats } from "./src/projects/project-stats";
import { ProjectStore } from "./src/projects/project-store";
import { SelfWriteRegistry } from "./src/lib/self-write";
import { Project } from "./src/projects/types";
import { RevisionModal } from "./src/revisions/revision-modal";
import { FeatureId, featureEnabled } from "./src/features";
import { normalizeCustomCategories } from "./src/codex/types";
import {
  DEFAULT_SETTINGS,
  InkswellSettings,
  InkswellSettingTab,
} from "./src/settings/settings";
import { WelcomeModal } from "./src/help/welcome-modal";
import { SprintController } from "./src/sprints/sprint-controller";
import { SprintModal } from "./src/sprints/sprint-modal";
import { WritingLogData, emptyLog } from "./src/tracking/types";
import { WritingTracker } from "./src/tracking/writing-tracker";
import { StatusBar } from "./src/views/status-bar";
import {
  InkswellMode,
  InkswellView,
  VIEW_TYPE_INKSWELL,
} from "./src/views/inkswell-view";

export default class InkswellPlugin extends Plugin {
  settings: InkswellSettings = DEFAULT_SETTINGS;
  writingLog: WritingLogData = emptyLog();
  ideas: Idea[] = [];
  activeProject: ActiveProject = new ActiveProject();
  /** Paths the plugin's own inline forms just wrote — lets the view soften the
   *  store notify those writes produce instead of rebuilding the focused field. */
  selfWrites: SelfWriteRegistry = new SelfWriteRegistry();
  store!: ProjectStore;
  stats!: ProjectStats;
  tracker!: WritingTracker;
  sprints!: SprintController;
  private statusBar: StatusBar | null = null;

  async onload(): Promise<void> {
    await this.loadPersisted();

    this.store = new ProjectStore(this.app);
    this.stats = new ProjectStats(this.app);
    this.tracker = new WritingTracker(this.app, this.writingLog, () => void this.persist());
    this.sprints = new SprintController(this.tracker, this.writingLog, () =>
      void this.persist()
    );
    this.addChild(this.store);
    this.addChild(this.tracker);
    this.addChild(this.sprints);

    // Persist the active project whenever it changes (survives restart).
    this.register(this.activeProject.subscribe(() => void this.persist()));

    this.registerView(
      VIEW_TYPE_INKSWELL,
      (leaf) => new InkswellView(leaf, this, this.store, this.stats, this.tracker)
    );

    this.addRibbonIcon("pen-tool", "Inkswell projects", () => this.openProjects());

    // Status bar: today's words / sprint countdown; click → stats.
    const statusEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(
      statusEl,
      this.tracker,
      this.sprints,
      () => this.settings.dailyWordGoal,
      () => void this.openStats()
    );
    this.register(() => this.statusBar?.destroy());

    this.registerCommands();
    this.addSettingTab(new InkswellSettingTab(this.app, this));

    // One-time welcome, once the workspace is ready (so the modal isn't fighting
    // Obsidian's own startup UI). The modal sets `welcomeSeen` on close.
    this.app.workspace.onLayoutReady(() => {
      if (!this.settings.welcomeSeen) new WelcomeModal(this.app, this).open();
    });
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open-explorer",
      name: "Open projects",
      callback: () => this.openProjects(),
    });
    this.addCommand({
      id: "new-project",
      name: "New project",
      callback: () => this.newProject(),
    });
    this.addCommand({
      id: "open-beats",
      name: "Open beat sheet (Plan)",
      checkCallback: (checking) =>
        this.featureCommand(checking, "beats", () => void this.openBeats()),
    });
    this.addCommand({
      id: "open-board",
      name: "Open board (Plan)",
      checkCallback: (checking) =>
        this.featureCommand(checking, "board", () => void this.openBoard()),
    });
    this.addCommand({
      id: "open-plot-grid",
      name: "Open plot grid (Plan)",
      checkCallback: (checking) =>
        this.featureCommand(checking, "plot-grid", () => void this.openPlotGrid()),
    });
    this.addCommand({
      id: "open-codex",
      name: "Open codex",
      callback: () => this.openCodex(),
    });
    this.addCommand({
      id: "open-write",
      name: "Open Write",
      callback: () => this.openWrite(),
    });
    this.addCommand({
      id: "open-stats",
      name: "Open writing stats (Track)",
      callback: () => this.openStats(),
    });
    this.addCommand({
      id: "open-compile",
      name: "Open compile (Publish)",
      callback: () => this.openCompile(),
    });
    this.addCommand({
      id: "compile-active-project",
      name: "Compile the active project",
      callback: () => void this.compileActiveProject(),
    });
    this.addCommand({
      id: "open-todos",
      name: "Open to-dos (Revise)",
      callback: () => this.openTodos(),
    });
    this.addCommand({
      id: "search-scenes",
      name: "Search scenes",
      callback: () => this.openSearch(),
    });
    this.addCommand({
      id: "insert-todo",
      name: "Insert a to-do marker…",
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canInsertTodo()) return false;
        if (!checking) view.insertTodo();
        return true;
      },
    });
    this.addCommand({
      id: "start-sprint",
      name: "Start a writing sprint",
      callback: () => this.startSprint(),
    });
    this.addCommand({
      id: "end-sprint",
      name: "End the current sprint now",
      checkCallback: (checking) => {
        if (!this.sprints.isActive()) return false;
        if (!checking) this.sprints.finish();
        return true;
      },
    });
    this.addCommand({
      id: "cancel-sprint",
      name: "Cancel the current sprint",
      checkCallback: (checking) => {
        if (!this.sprints.isActive()) return false;
        if (!checking) this.sprints.cancel();
        return true;
      },
    });
    this.addCommand({
      id: "set-word-target",
      name: "Set word target for the active project",
      callback: () => this.withActiveProject((p) => new TargetModal(this.app, p).open()),
    });
    this.addCommand({
      id: "log-revision",
      name: "Log a revision decision",
      editorCallback: (editor, ctx) => {
        const file = ctx.file;
        if (!file) return;
        const project = this.projectForPath(file.path);
        if (!project) {
          new Notice("The active file isn't part of an Inkswell project.");
          return;
        }
        const scene = project.scenes.find((s) => s.path === file.path)?.title ?? null;
        new RevisionModal(this.app, project, scene, editor.getSelection()).open();
      },
    });
    this.addCommand({
      id: "open-revisions",
      name: "Open revision log",
      callback: () => this.openRevisions(),
    });
    this.addCommand({
      id: "open-analysis",
      name: "Open analysis (Revise)",
      checkCallback: (checking) =>
        this.featureCommand(checking, "analysis", () => void this.openAnalysis()),
    });
    this.addCommand({
      id: "open-help",
      name: "Open help",
      callback: () => this.openHelp(),
    });
    this.addCommand({
      id: "manage-features",
      name: "Manage features",
      callback: () => this.openFeatureSettings(),
    });
    this.addCommand({
      id: "quick-capture",
      name: "Quick capture an idea",
      callback: () => void this.quickCaptureIdea(),
    });
  }

  /** The project whose index or a scene matches a vault path. */
  private projectForPath(path: string): Project | undefined {
    return this.store
      .getProjects()
      .find((p) => p.vaultPath === path || p.scenes.some((s) => s.path === path));
  }

  async loadPersisted(): Promise<void> {
    const stored = ((await this.loadData()) ?? {}) as {
      settings?: Partial<InkswellSettings>;
      writingLog?: Partial<WritingLogData>;
      ideas?: Idea[];
      activeProject?: string;
    };
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored.settings ?? {});
    // data.json is hand-editable and the merge above doesn't validate shapes —
    // drop malformed/colliding custom codex types before anything renders them.
    this.settings.customCategories = normalizeCustomCategories(this.settings.customCategories);
    this.writingLog = Object.assign({}, emptyLog(), stored.writingLog ?? {});
    this.ideas = Array.isArray(stored.ideas) ? stored.ideas : [];
    this.activeProject = new ActiveProject(
      typeof stored.activeProject === "string" ? stored.activeProject : null
    );
  }

  /** Serializes data.json writes so overlapping persist() calls can't interleave. */
  private persistChain: Promise<void> = Promise.resolve();

  /** Persist settings, the writing log, ideas, and the active project to data.json.
   *  Calls are serialized: a call queues behind any in-flight save and snapshots
   *  state only when it runs, so the last write always carries current state and
   *  two saveData writes never overlap on the file. */
  persist(): Promise<void> {
    this.persistChain = this.persistChain
      .then(() =>
        this.saveData({
          settings: this.settings,
          writingLog: this.writingLog,
          ideas: this.ideas,
          activeProject: this.activeProject.get(),
        })
      )
      .catch((e) => console.error("[Inkswell] Failed to save data.json", e));
    return this.persistChain;
  }

  // --- Story ideas inbox ---

  /** Prompt for an idea and add it to the inbox. Shared by the command and the
   *  phone "More → Capture idea" action. */
  async quickCaptureIdea(): Promise<void> {
    const text = await promptText(this.app, {
      title: "Quick capture",
      value: "",
      multiline: true,
      cta: "Capture",
    });
    if (text) {
      this.addIdea(text);
      new Notice("Idea captured.");
    }
  }

  addIdea(text: string): void {
    const t = text.trim();
    if (!t) return;
    this.ideas.unshift({ id: newIdeaId(), text: t, created: new Date().toISOString(), pinned: false });
    void this.persist();
    this.refreshExplorer();
  }

  removeIdea(id: string): void {
    this.ideas = this.ideas.filter((i) => i.id !== id);
    void this.persist();
    this.refreshExplorer();
  }

  togglePinIdea(id: string): void {
    this.ideas = this.ideas.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i));
    void this.persist();
    this.refreshExplorer();
  }

  /** Back-compat alias used by the settings tab. */
  async saveSettings(): Promise<void> {
    await this.persist();
  }

  refreshExplorer(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)) {
      if (leaf.view instanceof InkswellView) leaf.view.refresh();
    }
  }

  /** Force a full rebuild of the open view (bypasses the Write fast path). Used
   *  after a feature toggle so a change to the Write toolbar actually re-renders. */
  refreshView(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)) {
      if (leaf.view instanceof InkswellView) leaf.view.forceRefresh();
    }
  }

  /**
   * checkCallback body shared by every optional-feature command: hide the command
   * from the palette when its feature is off, else run `run`.
   */
  private featureCommand(checking: boolean, id: FeatureId, run: () => void): boolean {
    if (!featureEnabled(this.settings.disabledFeatures, id)) return false;
    if (!checking) run();
    return true;
  }

  /** Enable/disable an optional feature (lossless — only gates UI) and re-render. */
  async setFeatureEnabled(id: FeatureId, enabled: boolean): Promise<void> {
    const set = new Set(this.settings.disabledFeatures);
    if (enabled) set.delete(id);
    else set.add(id);
    this.settings.disabledFeatures = [...set];
    await this.saveSettings();
    this.refreshView();
  }

  /** Open plugin settings to the Inkswell tab (the "Manage features" command). */
  private openFeatureSettings(): void {
    const setting = (this.app as unknown as { setting: { open(): void; openTabById(id: string): void } })
      .setting;
    setting.open();
    setting.openTabById(this.manifest.id);
  }

  refreshStatus(): void {
    this.statusBar?.render();
  }

  // --- Shared entry points (used by commands, the ribbon, and the explorer toolbar) ---

  openProjects(): Promise<void> {
    return this.openInkswell("home");
  }

  openBeats(): Promise<void> {
    return this.openInkswell("plan", undefined, "beats");
  }

  openBoard(): Promise<void> {
    return this.openInkswell("plan", (view) => view.openPlanStructure("board"));
  }

  openPlotGrid(): Promise<void> {
    return this.openInkswell("plan", (view) => view.openPlanStructure("grid"));
  }

  openCodex(): Promise<void> {
    return this.openInkswell("codex");
  }

  openWrite(): Promise<void> {
    return this.openInkswell("write");
  }

  openStats(): Promise<void> {
    return this.openInkswell("track");
  }

  openCompile(): Promise<void> {
    return this.openInkswell("publish");
  }

  /**
   * One-shot compile of the active project using its SAVED compile config — the
   * same config, output name, and steps the Publish → Compile panel uses (via the
   * shared {@link resolveCompileConfig}), so the command and the panel can't
   * diverge. Resolves the active project the way every panel does (the header's
   * selection), not the open markdown file.
   */
  private async compileActiveProject(): Promise<void> {
    const project = resolveActive(this.store.getProjects(), this.activeProject.get());
    if (!project) {
      new Notice("No active project to compile. Open one in Inkswell first.");
      return;
    }
    try {
      const config = resolveCompileConfig(project, this.settings.defaultCompileFormat);
      const result = await runCompile(this.app, project, config);
      const words = countWords(result.wordCountSource);
      new Notice(`Compiled ${words.toLocaleString()} words to ${result.outputPath}`);
    } catch (e) {
      new Notice(`Compile failed: ${(e as Error).message}`, 8000);
    }
  }

  openHelp(): Promise<void> {
    return this.openInkswell("help");
  }

  /** Open Revise → To-dos (markers left in prose + logged decisions). */
  openTodos(): Promise<void> {
    return this.openInkswell("revise", undefined, "todos");
  }

  /** Open cross-scene search. */
  openSearch(): Promise<void> {
    return this.openInkswell("search");
  }

  /** The live InkswellView, if its tab is open (for editor-scoped commands). */
  private inkswellView(): InkswellView | null {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)[0];
    return leaf && leaf.view instanceof InkswellView ? leaf.view : null;
  }

  openAnalysis(): Promise<void> {
    return this.openInkswell("revise", undefined, "analysis");
  }

  /** Open the merged revision worklist (Revise → To-dos), focused on the active
   *  file's project when possible. */
  openRevisions(): Promise<void> {
    const active = this.app.workspace.getActiveFile();
    const project = active ? this.projectForPath(active.path) : null;
    return this.openInkswell(
      "revise",
      (view) => {
        if (project) view.getRevisionPanel().focusProject(project.vaultPath);
      },
      "todos"
    );
  }

  startSprint(): void {
    new SprintModal(
      this.app,
      this.sprints,
      this.settings.defaultSprintMinutes,
      this.settings.defaultSprintWordGoal
    ).open();
  }

  /** Create a new project, make it active, reveal it on Home, open its index. */
  newProject(): void {
    new NewProjectModal(this.app, this.settings, (file) => {
      this.activeProject.set(file.path);
      this.refreshExplorer();
      void this.openProjects();
      openScene(this.app, file);
    }).open();
  }

  /**
   * Open (or reveal) the single Inkswell tab and switch it to `mode`. Every entry
   * point funnels through here so Inkswell stays one tab in the main window.
   */
  async openInkswell(
    mode: InkswellMode,
    after?: (view: InkswellView) => void,
    subtab?: string
  ): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_INKSWELL, active: true });
    }
    if (leaf.view instanceof InkswellView) {
      leaf.view.setMode(mode, subtab);
      if (after) after(leaf.view);
    }
    void workspace.revealLeaf(leaf);
  }

  /** Reveal the Inkswell tab, switch to Write, and open the given scene there. */
  openSceneInWrite(path: string): void {
    void this.openInkswell("write", (view) => view.openSceneInWrite(path));
  }

  /**
   * Resolve the project a project-scoped command acts on, the same way the
   * panels do: the header's explicit selection first, then the active file's
   * project, then the first project. (Editor-scoped commands like log-revision
   * intentionally stay file-scoped — they act on the scene being edited.)
   */
  private withActiveProject(fn: (p: Project) => void): void {
    const activeFile = this.app.workspace.getActiveFile();
    const selected = this.store.getProject(this.activeProject.get() ?? "");
    const project =
      selected ??
      (activeFile ? this.projectForPath(activeFile.path) : undefined) ??
      resolveActive(this.store.getProjects(), null);
    if (!project) {
      new Notice("No Inkswell project found. Create one with the New project command.");
      return;
    }
    fn(project);
  }
}
