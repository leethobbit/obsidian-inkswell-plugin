/**
 * The single Inkswell host view: one tab in the main content area, organized as a
 * phase-centric workspace. A left icon rail switches between goal-bounded
 * destinations (Home · Plan · Write · Track · Revise · Publish); each destination
 * does one job, with depth behind ≤3 sub-tabs. All entry points reuse this one
 * view (the one-tab constraint).
 *
 * The host owns data subscriptions and re-renders the active destination on
 * change; panels are created once and keep their own state across switches.
 */

import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import { CodexPanel } from "../codex/codex-panel";
import { AnalysisPanel } from "../insight/analysis-panel";
import { BeatPanel } from "../outliner/beat-panel";
import { BoardPanel } from "../outliner/board-panel";
import { resolveActive } from "../projects/active-project";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { CommentsPanel } from "../revisions/comments-panel";
import { RevisionPanel } from "../revisions/revision-view";
import { StatsPanel } from "../stats/stats-view";
import { WritingTracker } from "../tracking/writing-tracker";
import { ExplorerPanel } from "./explorer/explorer-view";
import { CompilePanel } from "./compile-panel";
import { WritePanel } from "./write-panel";
import { SceneInspector } from "../scenes/scene-inspector";
import type InkswellPlugin from "../../main";

export const VIEW_TYPE_INKSWELL = "inkswell";

/** Top-level phase destinations. */
export type InkswellMode = "home" | "plan" | "write" | "track" | "revise" | "publish";

interface SubTab {
  id: string;
  label: string;
}
interface Destination {
  id: InkswellMode;
  label: string;
  icon: string;
  subtabs?: SubTab[];
}

const DESTINATIONS: Destination[] = [
  { id: "home", label: "Home", icon: "home" },
  {
    id: "plan",
    label: "Plan",
    icon: "compass",
    subtabs: [
      { id: "beats", label: "Beats" },
      { id: "board", label: "Board" },
      { id: "codex", label: "Codex" },
    ],
  },
  { id: "write", label: "Write", icon: "pencil" },
  { id: "track", label: "Track", icon: "bar-chart-3" },
  {
    id: "revise",
    label: "Revise",
    icon: "git-compare",
    subtabs: [
      { id: "log", label: "Log" },
      { id: "comments", label: "Comments" },
      { id: "analysis", label: "Analysis" },
    ],
  },
  { id: "publish", label: "Publish", icon: "upload" },
];

export class InkswellView extends ItemView {
  private plugin: InkswellPlugin;
  private explorer: ExplorerPanel;
  private beats: BeatPanel;
  private board: BoardPanel;
  private codex: CodexPanel;
  private write: WritePanel;
  private stats: StatsPanel;
  private revisions: RevisionPanel;
  private comments: CommentsPanel;
  private analysis: AnalysisPanel;
  private compile: CompilePanel;
  private inspector: SceneInspector;

  private mode: InkswellMode = "home";
  /** Remembered sub-tab per destination. */
  private subtab: Partial<Record<InkswellMode, string>> = {};
  private rail!: HTMLElement;
  private header!: HTMLElement;
  private body!: HTMLElement;
  private inspectorEl: HTMLElement | null = null;
  /** Scene the Home inspector tracks. Driven by file-open (authoritative). */
  private activeFile: TFile | null = null;
  private unsubs: Array<() => void> = [];
  /** Set while a body rebuild is deferred because an input is focused. */
  private pendingRender = false;

  constructor(
    leaf: WorkspaceLeaf,
    plugin: InkswellPlugin,
    store: ProjectStore,
    stats: ProjectStats,
    tracker: WritingTracker
  ) {
    super(leaf);
    this.plugin = plugin;
    this.explorer = new ExplorerPanel(this.app, plugin, store, stats, (file) => {
      // Clicking a Home scene drives the Inspector directly — no note is opened,
      // so we set the tracked file ourselves rather than waiting on file-open.
      this.activeFile = file;
      this.updateInspector();
    });
    this.beats = new BeatPanel(this.app, store, plugin.activeProject);
    this.board = new BoardPanel(this.app, store, plugin.activeProject);
    this.codex = new CodexPanel(this.app, plugin);
    this.write = new WritePanel(this.app, plugin, store, plugin.sprints);
    this.stats = new StatsPanel(this.app, plugin, tracker, store, stats);
    this.revisions = new RevisionPanel(this.app, plugin, store);
    this.comments = new CommentsPanel(this.app, store, plugin.activeProject);
    this.analysis = new AnalysisPanel(this.app, store, plugin.activeProject);
    this.compile = new CompilePanel(this.app, plugin, store);
    this.inspector = new SceneInspector(this.app, store);

    // Re-render the active destination whenever projects, the log, or the active
    // project change.
    this.unsubs.push(store.subscribe(() => this.renderActive()));
    this.unsubs.push(tracker.onChange(() => this.renderActive()));
    this.unsubs.push(plugin.activeProject.subscribe(() => this.renderActive()));
  }

  getViewType(): string {
    return VIEW_TYPE_INKSWELL;
  }
  getDisplayText(): string {
    return "Inkswell";
  }
  getIcon(): string {
    return "pen-tool";
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("inkswell-host");

    this.rail = root.createDiv({ cls: "inkswell-rail" });
    for (const dest of DESTINATIONS) {
      const item = this.rail.createDiv({ cls: "inkswell-rail__item" });
      setIcon(item.createSpan({ cls: "inkswell-rail__icon" }), dest.icon);
      item.createSpan({ cls: "inkswell-rail__label", text: dest.label });
      item.dataset.dest = dest.id;
      item.setAttribute("aria-label", dest.label);
      item.onclick = () => this.setMode(dest.id);
    }
    this.rail.createDiv({ cls: "inkswell-rail__spacer" });
    const sprint = this.rail.createDiv({ cls: "inkswell-rail__item" });
    setIcon(sprint.createSpan({ cls: "inkswell-rail__icon" }), "timer");
    sprint.createSpan({ cls: "inkswell-rail__label", text: "Sprint" });
    sprint.setAttribute("aria-label", "Start a writing sprint");
    sprint.onclick = () => this.plugin.startSprint();

    // Right of the rail: a persistent header (project selector) above the body.
    // The header lives OUTSIDE the body so renderActive()'s body.empty() never
    // destroys it (and never steals focus from an input the user is editing).
    const main = root.createDiv({ cls: "inkswell-host__main" });
    this.header = main.createDiv({ cls: "inkswell-host__header" });
    this.body = main.createDiv({ cls: "inkswell-host__body" });
    // Clicking a Home scene drives the Inspector directly (see the ExplorerPanel
    // callback above). These workspace events keep the Home inspector following
    // the active scene file when you navigate notes *outside* the host: file-open
    // carries the file; active-leaf-change only updates the target when its leaf
    // actually has a file, so focusing the host (which has none) never blanks it.
    this.activeFile = this.app.workspace.getActiveFile();
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.activeFile = file;
        this.updateInspector();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const f = this.app.workspace.getActiveFile();
        if (f) this.activeFile = f;
        this.updateInspector();
      })
    );
    this.renderActive();
  }

  /** Persistent project selector, visible across all destinations. */
  private renderHeader(): void {
    if (!this.header) return;
    this.header.empty();
    const projects = this.plugin.store.getProjects();
    if (projects.length === 0) {
      this.header.createSpan({ cls: "inkswell-stats__muted", text: "No project yet" });
      return;
    }
    this.header.createSpan({ cls: "inkswell-host__headerlabel", text: "Project" });
    const sel = this.header.createEl("select", { cls: "dropdown" });
    const active = resolveActive(projects, this.plugin.activeProject.get());
    for (const p of projects) {
      const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
      if (p.vaultPath === active?.vaultPath) o.selected = true;
    }
    sel.value = active?.vaultPath ?? "";
    sel.onchange = () => this.plugin.activeProject.set(sel.value);
  }

  async onClose(): Promise<void> {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.write.dispose();
  }

  /** Switch destination (and optionally a sub-tab within it). */
  setMode(mode: InkswellMode, subtab?: string): void {
    this.mode = mode;
    if (subtab) this.subtab[mode] = subtab;
    this.renderActive();
  }

  getRevisionPanel(): RevisionPanel {
    return this.revisions;
  }

  /** Force a re-render (e.g. after a settings change). */
  refresh(): void {
    this.renderActive();
  }

  private renderActive(): void {
    if (!this.body || !this.rail || !this.header) return;

    // The header is outside the body and safe to refresh anytime.
    this.renderHeader();

    // Don't rebuild the body while the user is typing inside it — that would
    // destroy focus mid-keystroke. Defer the rebuild until the field blurs.
    const ae = document.activeElement as HTMLElement | null;
    const editing =
      !!ae &&
      this.body.contains(ae) &&
      (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT" || ae.isContentEditable);
    if (editing) {
      if (this.pendingRender) return;
      this.pendingRender = true;
      const onBlur = () => {
        ae.removeEventListener("blur", onBlur);
        // Defer to the next tick so focus has settled: tabbing to another field
        // fires blur on this one before that field gains focus, so re-checking
        // immediately would rebuild and destroy the field being tabbed into.
        window.setTimeout(() => {
          this.pendingRender = false;
          this.renderActive();
        }, 0);
      };
      ae.addEventListener("blur", onBlur);
      return;
    }

    // Rail highlight.
    this.rail.querySelectorAll<HTMLElement>(".inkswell-rail__item").forEach((b) => {
      b.toggleClass("is-active", b.dataset.dest === this.mode);
    });

    this.body.empty();
    this.inspectorEl = null;
    const dest = DESTINATIONS.find((d) => d.id === this.mode);

    // Optional sub-tab bar.
    if (dest?.subtabs && dest.subtabs.length > 0) {
      const active = this.subtab[this.mode] ?? dest.subtabs[0].id;
      const bar = this.body.createDiv({ cls: "inkswell-subtabs" });
      for (const st of dest.subtabs) {
        const b = bar.createEl("button", { cls: "inkswell-subtab", text: st.label });
        b.toggleClass("is-active", st.id === active);
        b.onclick = () => this.setMode(this.mode, st.id);
      }
    }

    // Main row: content + optional Scene Inspector (Home & Write).
    const main = this.body.createDiv({ cls: "inkswell-main" });
    const content = main.createDiv({ cls: "inkswell-content" });
    this.renderContent(content);

    // Home shows the host's active-file Inspector; Write renders its own
    // inspector for the scene it's editing.
    if (this.mode === "home") {
      this.inspectorEl = main.createDiv({ cls: "inkswell-inspector-col" });
      this.updateInspector();
    }
  }

  /** Re-render the inspector for the active scene file (if the column is shown). */
  private updateInspector(): void {
    if (!this.inspectorEl) return;
    this.inspector.render(this.inspectorEl, this.activeFile);
    // Keep the Home scene list highlight in sync with the Inspector.
    this.explorer.setActiveScene(this.activeFile?.path ?? null);
  }

  private renderContent(content: HTMLElement): void {
    switch (this.mode) {
      case "home":
        this.explorer.render(content);
        break;
      case "plan": {
        const sub = this.subtab["plan"] ?? "beats";
        if (sub === "board") this.board.render(content);
        else if (sub === "codex") this.codex.render(content);
        else this.beats.render(content);
        break;
      }
      case "write":
        this.write.render(content);
        break;
      case "track":
        this.stats.render(content);
        break;
      case "revise": {
        const sub = this.subtab["revise"] ?? "log";
        if (sub === "analysis") this.analysis.render(content);
        else if (sub === "comments") this.comments.render(content);
        else this.revisions.render(content);
        break;
      }
      case "publish":
        this.compile.render(content);
        break;
    }
  }
}
