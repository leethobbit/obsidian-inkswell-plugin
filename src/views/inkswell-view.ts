/**
 * The single Inkswell host view: one tab in the main content area whose body
 * swaps between three panels (Projects · Stats · Revision Log) via an internal
 * tab-bar. Keeping Inkswell to one tab is a deliberate constraint — all entry
 * points (ribbon, status bar, commands) reuse this one view.
 *
 * The host owns the data subscriptions and re-renders the active panel on change;
 * the panels are created once and keep their own state across tab switches.
 */

import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { BeatPanel } from "../outliner/beat-panel";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { RevisionPanel } from "../revisions/revision-view";
import { StatsPanel } from "../stats/stats-view";
import { WritingTracker } from "../tracking/writing-tracker";
import { ExplorerPanel } from "./explorer/explorer-view";
import type InkswellPlugin from "../../main";

export const VIEW_TYPE_INKSWELL = "inkswell";

export type InkswellMode = "projects" | "beats" | "stats" | "revisions";

const TABS: { mode: InkswellMode; label: string; icon: string }[] = [
  { mode: "projects", label: "Projects", icon: "pen-tool" },
  { mode: "beats", label: "Beats", icon: "list-ordered" },
  { mode: "stats", label: "Stats", icon: "bar-chart-3" },
  { mode: "revisions", label: "Revision log", icon: "git-compare" },
];

export class InkswellView extends ItemView {
  private plugin: InkswellPlugin;
  private explorer: ExplorerPanel;
  private beats: BeatPanel;
  private stats: StatsPanel;
  private revisions: RevisionPanel;

  private mode: InkswellMode = "projects";
  private tabBar!: HTMLElement;
  private body!: HTMLElement;
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
    this.stats = new StatsPanel(plugin, tracker, store, stats);
    this.revisions = new RevisionPanel(this.app, plugin, store);

    // Re-render the active panel whenever projects or the writing log change.
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

    this.tabBar = root.createDiv({ cls: "inkswell-tabbar" });
    for (const tab of TABS) {
      const btn = this.tabBar.createEl("button", { cls: "inkswell-tab" });
      setIcon(btn.createSpan({ cls: "inkswell-tab__icon" }), tab.icon);
      btn.createSpan({ text: tab.label });
      btn.dataset.mode = tab.mode;
      btn.onclick = () => this.setMode(tab.mode);
    }
    // Spacer + sprint action on the right.
    this.tabBar.createDiv({ cls: "inkswell-tabbar__spacer" });
    const sprint = this.tabBar.createEl("button", { cls: "clickable-icon" });
    setIcon(sprint, "timer");
    sprint.setAttribute("aria-label", "Start a writing sprint");
    sprint.onclick = () => this.plugin.startSprint();

    this.body = root.createDiv({ cls: "inkswell-host__body" });
    this.renderChrome();
    this.renderActive();
  }

  async onClose(): Promise<void> {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  /** Switch the active panel. */
  setMode(mode: InkswellMode): void {
    this.mode = mode;
    this.renderChrome();
    this.renderActive();
  }

  getRevisionPanel(): RevisionPanel {
    return this.revisions;
  }

  /** Force a re-render of the active panel (e.g. after a settings change). */
  refresh(): void {
    this.renderActive();
  }

  /** Reflect the active tab in the tab-bar highlight. */
  private renderChrome(): void {
    if (!this.tabBar) return;
    this.tabBar.querySelectorAll<HTMLElement>(".inkswell-tab").forEach((btn) => {
      btn.toggleClass("is-active", btn.dataset.mode === this.mode);
    });
  }

  private renderActive(): void {
    if (!this.body) return;
    if (this.mode === "projects") this.explorer.render(this.body);
    else if (this.mode === "beats") this.beats.render(this.body);
    else if (this.mode === "stats") this.stats.render(this.body);
    else this.revisions.render(this.body);
  }
}
