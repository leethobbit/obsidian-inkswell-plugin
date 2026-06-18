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

import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { CompileModal } from "./src/compile/compile-modal";
import { TargetModal } from "./src/goals/target-modal";
import { ProjectStats } from "./src/projects/project-stats";
import { ProjectStore } from "./src/projects/project-store";
import { Project } from "./src/projects/types";
import { RevisionModal } from "./src/revisions/revision-modal";
import {
  RevisionView,
  VIEW_TYPE_INKSWELL_REVISIONS,
} from "./src/revisions/revision-view";
import {
  DEFAULT_SETTINGS,
  InkswellSettings,
  InkswellSettingTab,
} from "./src/settings/settings";
import { SprintController } from "./src/sprints/sprint-controller";
import { SprintModal } from "./src/sprints/sprint-modal";
import { StatsView, VIEW_TYPE_INKSWELL_STATS } from "./src/stats/stats-view";
import { WritingLogData, emptyLog } from "./src/tracking/types";
import { WritingTracker } from "./src/tracking/writing-tracker";
import { StatusBar } from "./src/views/status-bar";
import {
  ExplorerView,
  VIEW_TYPE_INKSWELL_EXPLORER,
} from "./src/views/explorer/explorer-view";

export default class InkswellPlugin extends Plugin {
  settings: InkswellSettings = DEFAULT_SETTINGS;
  writingLog: WritingLogData = emptyLog();
  store!: ProjectStore;
  stats!: ProjectStats;
  tracker!: WritingTracker;
  sprints!: SprintController;
  private statusBar: StatusBar | null = null;

  async onload(): Promise<void> {
    await this.loadPersisted();

    this.store = new ProjectStore(this.app);
    this.stats = new ProjectStats(this.app);
    this.tracker = new WritingTracker(this.app, this.writingLog, () => this.persist());
    this.sprints = new SprintController(this.tracker, this.writingLog, () =>
      this.persist()
    );
    this.addChild(this.store);
    this.addChild(this.tracker);
    this.addChild(this.sprints);

    this.registerView(
      VIEW_TYPE_INKSWELL_EXPLORER,
      (leaf) => new ExplorerView(leaf, this, this.store, this.stats)
    );
    this.registerView(
      VIEW_TYPE_INKSWELL_STATS,
      (leaf) => new StatsView(leaf, this, this.tracker, this.store, this.stats)
    );
    this.registerView(
      VIEW_TYPE_INKSWELL_REVISIONS,
      (leaf) => new RevisionView(leaf, this, this.store)
    );

    this.addRibbonIcon("pen-tool", "Inkswell projects", () => this.openProjects());

    // Status bar: today's words / sprint countdown; click → stats.
    const statusEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(
      statusEl,
      this.tracker,
      this.sprints,
      () => this.settings.dailyWordGoal,
      () => this.activateView(VIEW_TYPE_INKSWELL_STATS)
    );
    this.register(() => this.statusBar?.destroy());

    this.registerCommands();
    this.addSettingTab(new InkswellSettingTab(this.app, this));
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open-explorer",
      name: "Open Inkswell projects",
      callback: () => this.openProjects(),
    });
    this.addCommand({
      id: "open-stats",
      name: "Open writing stats",
      callback: () => this.openStats(),
    });
    this.addCommand({
      id: "compile-active-project",
      name: "Compile the active project",
      callback: () => this.withActiveProject((p) =>
        new CompileModal(this.app, p, this.settings).open()
      ),
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
  }

  /** The project whose index or a scene matches a vault path. */
  private projectForPath(path: string): Project | undefined {
    return this.store
      .getProjects()
      .find((p) => p.vaultPath === path || p.scenes.some((s) => s.path === path));
  }

  async loadPersisted(): Promise<void> {
    const stored = (await this.loadData()) ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored.settings ?? {});
    this.writingLog = Object.assign({}, emptyLog(), stored.writingLog ?? {});
  }

  /** Persist both settings and the writing log to data.json. */
  async persist(): Promise<void> {
    await this.saveData({ settings: this.settings, writingLog: this.writingLog });
  }

  /** Back-compat alias used by the settings tab. */
  async saveSettings(): Promise<void> {
    await this.persist();
  }

  refreshExplorer(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL_EXPLORER)) {
      if (leaf.view instanceof ExplorerView) leaf.view.render();
    }
  }

  refreshStatus(): void {
    this.statusBar?.render();
  }

  // --- Shared entry points (used by commands, the ribbon, and the explorer toolbar) ---

  openProjects(): Promise<void> {
    return this.activateView(VIEW_TYPE_INKSWELL_EXPLORER);
  }

  openStats(): Promise<void> {
    return this.activateView(VIEW_TYPE_INKSWELL_STATS);
  }

  /** Open the revision log, focused on the active file's project when possible. */
  async openRevisions(): Promise<void> {
    const active = this.app.workspace.getActiveFile();
    const project = active ? this.projectForPath(active.path) : null;
    await this.activateView(VIEW_TYPE_INKSWELL_REVISIONS);
    if (project) {
      for (const leaf of this.app.workspace.getLeavesOfType(
        VIEW_TYPE_INKSWELL_REVISIONS
      )) {
        if (leaf.view instanceof RevisionView) leaf.view.focusProject(project.vaultPath);
      }
    }
  }

  startSprint(): void {
    new SprintModal(this.app, this.sprints, this.settings.defaultSprintMinutes).open();
  }

  /** Open (or reveal) a plugin view as a tab in the main content area. */
  async activateView(type: string): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(type)[0] ?? null;
    if (!leaf) {
      // Main content area (a new tab), not the sidebar.
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type, active: true });
    }
    if (leaf) workspace.revealLeaf(leaf);
  }

  private withActiveProject(fn: (p: Project) => void): void {
    const active = this.app.workspace.getActiveFile();
    if (!active) {
      new Notice("No active file.");
      return;
    }
    const project = this.projectForPath(active.path);
    if (!project) {
      new Notice("The active file isn't part of an Inkswell project.");
      return;
    }
    fn(project);
  }
}
