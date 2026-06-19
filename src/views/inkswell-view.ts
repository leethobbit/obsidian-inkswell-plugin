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

import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { CodexPanel } from "../codex/codex-panel";
import { BeatPanel } from "../outliner/beat-panel";
import { BoardPanel } from "../outliner/board-panel";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
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
  { id: "revise", label: "Revise", icon: "git-compare" },
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
  private compile: CompilePanel;
  private inspector: SceneInspector;

  private mode: InkswellMode = "home";
  /** Remembered sub-tab per destination. */
  private subtab: Partial<Record<InkswellMode, string>> = {};
  private rail!: HTMLElement;
  private body!: HTMLElement;
  private inspectorEl: HTMLElement | null = null;
  private unsubs: Array<() => void> = [];

  constructor(
    leaf: WorkspaceLeaf,
    plugin: InkswellPlugin,
    store: ProjectStore,
    stats: ProjectStats,
    tracker: WritingTracker
  ) {
    super(leaf);
    this.plugin = plugin;
    this.explorer = new ExplorerPanel(this.app, plugin, store, stats);
    this.beats = new BeatPanel(this.app, store);
    this.board = new BoardPanel(this.app, store);
    this.codex = new CodexPanel(this.app, plugin);
    this.write = new WritePanel(this.app, plugin, plugin.sprints);
    this.stats = new StatsPanel(plugin, tracker, store, stats);
    this.revisions = new RevisionPanel(this.app, plugin, store);
    this.compile = new CompilePanel(this.app, plugin, store);
    this.inspector = new SceneInspector(this.app, store);

    // Re-render the active destination whenever projects or the log change.
    this.unsubs.push(store.subscribe(() => this.renderActive()));
    this.unsubs.push(tracker.onChange(() => this.renderActive()));
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

    this.body = root.createDiv({ cls: "inkswell-host__body" });
    // The Scene Inspector (Home/Write) follows the active scene file.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.updateInspector())
    );
    this.renderActive();
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
    if (!this.body || !this.rail) return;

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

    if (this.mode === "home" || this.mode === "write") {
      this.inspectorEl = main.createDiv({ cls: "inkswell-inspector-col" });
      this.updateInspector();
    }
  }

  /** Re-render the inspector for the active scene file (if the column is shown). */
  private updateInspector(): void {
    if (!this.inspectorEl) return;
    this.inspector.render(this.inspectorEl, this.app.workspace.getActiveFile());
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
      case "revise":
        this.revisions.render(content);
        break;
      case "publish":
        this.compile.render(content);
        break;
    }
  }
}
