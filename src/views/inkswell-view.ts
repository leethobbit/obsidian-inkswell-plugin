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
import { isPhone, renderPhoneRedirect } from "../lib/platform";
import { CodexPanel } from "../codex/codex-panel";
import { AnalysisPanel } from "../insight/analysis-panel";
import { BeatPanel } from "../outliner/beat-panel";
import { BoardPanel } from "../outliner/board-panel";
import { OverviewPanel } from "../plan/overview-panel";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { ChecklistPanel } from "./publish/checklist-panel";
import { LaunchPanel } from "./publish/launch-panel";
import { AuditPanel } from "../revisions/audit-panel";
import { TodosPanel } from "../revisions/todos-panel";
import { RevisionPanel } from "../revisions/revision-view";
import { StatsPanel } from "../stats/stats-view";
import { WritingTracker } from "../tracking/writing-tracker";
import { ExplorerPanel } from "./explorer/explorer-view";
import { CompilePanel } from "./compile-panel";
import { WritePanel } from "./write-panel";
import { SceneInspector } from "../scenes/scene-inspector";
import { HelpPanel } from "../help/help-panel";
import { renderHint } from "../help/hint";
import { hintKey } from "../help/help-content";
import { PhoneShell } from "./phone/phone-shell";
import { openMoreSheet } from "./phone/more-sheet";
import type InkswellPlugin from "../../main";

export const VIEW_TYPE_INKSWELL = "inkswell";

/** Top-level phase destinations. */
export type InkswellMode =
  | "home"
  | "plan"
  | "write"
  | "track"
  | "revise"
  | "publish"
  | "codex"
  | "help";

interface SubTab {
  id: string;
  label: string;
}
interface Destination {
  id: InkswellMode;
  label: string;
  icon: string;
  subtabs?: SubTab[];
  /** Meta cluster (cross-cutting views/tools), rendered after a separator. */
  meta?: boolean;
}

const DESTINATIONS: Destination[] = [
  { id: "home", label: "Home", icon: "home" },
  {
    id: "plan",
    label: "Plan",
    icon: "compass",
    subtabs: [
      { id: "overview", label: "Overview" },
      { id: "beats", label: "Beats" },
      { id: "board", label: "Board" },
    ],
  },
  { id: "write", label: "Write", icon: "pencil" },
  {
    id: "revise",
    label: "Revise",
    icon: "git-compare",
    subtabs: [
      { id: "audit", label: "Audit" },
      { id: "log", label: "Log" },
      { id: "todos", label: "Todos" },
      { id: "analysis", label: "Analysis" },
    ],
  },
  {
    id: "publish",
    label: "Publish",
    icon: "upload",
    subtabs: [
      { id: "compile", label: "Compile" },
      { id: "checklist", label: "Checklist" },
      { id: "launch", label: "Launch" },
    ],
  },
  // Meta cluster (after a separator): cross-cutting tools, not pipeline phases.
  // Codex is reference material used across Plan/Write/Revise, so it sits here.
  { id: "codex", label: "Codex", icon: "book-marked", meta: true },
  { id: "track", label: "Track", icon: "bar-chart-3", meta: true },
  { id: "help", label: "Help", icon: "help-circle", meta: true },
];

/**
 * Destinations always redirected to a "use a larger screen" placeholder on phones
 * — their multi-pane planning/publishing layouts need tablet width. Home, Write,
 * Track, Codex (read-only drill-down), and Revise→Todos stay usable on a phone;
 * Revise's other tabs redirect (handled in `isRedirected`).
 */
const PHONE_REDIRECTED: ReadonlySet<InkswellMode> = new Set<InkswellMode>([
  "plan",
  "publish",
]);

export class InkswellView extends ItemView {
  private plugin: InkswellPlugin;
  private explorer: ExplorerPanel;
  private overview: OverviewPanel;
  private beats: BeatPanel;
  private board: BoardPanel;
  private codex: CodexPanel;
  private write: WritePanel;
  private stats: StatsPanel;
  private revisions: RevisionPanel;
  private todos: TodosPanel;
  private audit: AuditPanel;
  private analysis: AnalysisPanel;
  private compile: CompilePanel;
  private checklist: ChecklistPanel;
  private launch: LaunchPanel;
  private help: HelpPanel;
  private inspector: SceneInspector;

  private mode: InkswellMode = "home";
  /** Remembered sub-tab per destination. */
  private subtab: Partial<Record<InkswellMode, string>> = {};
  /** Phone-only single-column drill-down target per destination (null = list). */
  private detail: Partial<Record<InkswellMode, string | null>> = {};
  private rail!: HTMLElement;
  private header!: HTMLElement;
  private body!: HTMLElement;
  /** Phone bottom-bar chrome (built once, hidden on wider screens via CSS). */
  private phone = new PhoneShell();
  private inspectorEl: HTMLElement | null = null;
  /** Scene the Home inspector tracks. Driven by file-open (authoritative). */
  private activeFile: TFile | null = null;
  private unsubs: Array<() => void> = [];
  /** Set while a body rebuild is deferred because an input is focused. */
  private pendingRender = false;
  /** True between pointerdown and pointerup — a deferred rebuild must not fire
   *  mid-gesture or it tears down the element a click is landing on. */
  private pointerDown = false;

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
      // Phone: the inspector is a drill-down screen, not a side column.
      if (isPhone()) this.pushDetail("home", file.path);
      else this.updateInspector();
    });
    this.overview = new OverviewPanel(this.app, plugin, store, plugin.activeProject);
    this.beats = new BeatPanel(this.app, plugin, store, plugin.activeProject);
    this.board = new BoardPanel(this.app, plugin, store, plugin.activeProject);
    this.codex = new CodexPanel(this.app, plugin);
    // On phones a codex row tap drills into a single-column detail screen; on
    // wider screens it falls through to the panel's own two-pane update.
    this.codex.onSelect = (path) => {
      if (!isPhone()) return false;
      this.pushDetail("codex", path);
      return true;
    };
    this.write = new WritePanel(this.app, plugin, store, plugin.sprints);
    this.stats = new StatsPanel(this.app, plugin, tracker, store, stats);
    this.revisions = new RevisionPanel(this.app, plugin, store);
    this.todos = new TodosPanel(this.app, store, plugin.activeProject, (path, hl) =>
      this.openSceneInWrite(path, hl)
    );
    this.audit = new AuditPanel(this.app, store, plugin.activeProject);
    this.analysis = new AnalysisPanel(this.app, store, plugin.activeProject);
    this.compile = new CompilePanel(this.app, plugin, store);
    this.checklist = new ChecklistPanel(this.app, plugin, store);
    this.launch = new LaunchPanel(this.app, plugin, store);
    this.help = new HelpPanel(this.app, plugin);
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
    let metaSeparated = false;
    for (const dest of DESTINATIONS) {
      // Divider between the core pipeline and the meta cluster (Track + Sprint).
      if (dest.meta && !metaSeparated) {
        this.rail.createDiv({ cls: "inkswell-rail__separator" });
        metaSeparated = true;
      }
      const item = this.rail.createDiv({ cls: "inkswell-rail__item" });
      setIcon(item.createSpan({ cls: "inkswell-rail__icon" }), dest.icon);
      item.createSpan({ cls: "inkswell-rail__label", text: dest.label });
      item.dataset.dest = dest.id;
      item.setAttribute("aria-label", dest.label);
      item.onclick = () => this.setMode(dest.id);
    }
    // Sprint is part of the meta cluster (an action, not a destination), so it
    // sits with Track right after the separator — not pinned to the bottom.
    if (!metaSeparated) this.rail.createDiv({ cls: "inkswell-rail__separator" });
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
    // Phone bottom bar: a sibling AFTER the body (last child of main), so the
    // body's per-render empty() can't tear it down. CSS pins it bottom on phones
    // and hides it (and the rail shows instead) on wider screens.
    this.phone.mount(main, {
      onTab: (mode, subtab) => this.setMode(mode, subtab),
      onCapture: () => this.openCapture(),
      onMore: (e) => openMoreSheet(e, (mode, subtab) => this.setMode(mode, subtab)),
    });
    // Keep the bar flush above Obsidian's mobile navbar across orientation /
    // keyboard / safe-area changes.
    this.registerDomEvent(window, "resize", () => {
      if (isPhone()) this.phone.alignAboveNavbar();
    });
    // Clicking a Home scene drives the Inspector directly (see the ExplorerPanel
    // callback above). These workspace events keep the Home inspector following
    // the active scene file when you navigate notes *outside* the host: file-open
    // carries the file; active-leaf-change only updates the target when its leaf
    // actually has a file, so focusing the host (which has none) never blanks it.
    // Track pointer-press state (capture phase, so it's set before the focus
    // change that fires blur). A deferred body rebuild checks this so it never
    // runs between a mousedown and its mouseup — which would destroy the click
    // target and swallow the click (it would just "refresh" the view instead).
    this.registerDomEvent(activeDocument, "pointerdown", () => (this.pointerDown = true), {
      capture: true,
    });
    this.registerDomEvent(activeDocument, "pointerup", () => (this.pointerDown = false), {
      capture: true,
    });
    this.registerDomEvent(activeDocument, "pointercancel", () => (this.pointerDown = false), {
      capture: true,
    });

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
    const activePath = this.plugin.activeProject.get();
    // "All projects" (empty value) is the unfocused default: Home lists every
    // project. Project-scoped tabs fall back to the first project when nothing
    // specific is selected (see resolveActive).
    sel.createEl("option", { text: "All projects", value: "" });
    for (const p of projects) {
      sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
    }
    sel.value = activePath ?? "";
    sel.onchange = () => this.plugin.activeProject.set(sel.value || null);
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

  /** Phone Capture FAB → the shared quick-capture flow. */
  openCapture(): void {
    void this.plugin.quickCaptureIdea();
  }

  /** Phone drill-down: open a single-column detail screen for `mode`. */
  pushDetail(mode: InkswellMode, id: string): void {
    this.detail[mode] = id;
    this.renderActive();
  }

  /** Phone drill-down: return from a detail screen to its list. */
  popDetail(mode: InkswellMode): void {
    this.detail[mode] = null;
    this.renderActive();
  }

  /** Whether a destination shows the "use a larger screen" notice on phones.
   *  Revise is enabled only for its Todos slice; its other tabs redirect. */
  private isRedirected(mode: InkswellMode): boolean {
    if (PHONE_REDIRECTED.has(mode)) return true;
    if (mode === "revise") return (this.subtab["revise"] ?? "audit") !== "todos";
    return false;
  }

  private fileAt(path: string): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(path);
    return f instanceof TFile ? f : null;
  }

  /** A phone drill-down header: a back button + title above the detail screen. */
  private renderPhoneBack(parent: HTMLElement, title: string, onBack: () => void): void {
    const hdr = parent.createDiv({ cls: "inkswell-phonehdr" });
    const back = hdr.createEl("button", { cls: "inkswell-phonehdr__back" });
    back.type = "button";
    setIcon(back, "arrow-left");
    back.setAttribute("aria-label", "Back");
    back.onclick = onBack;
    hdr.createSpan({ cls: "inkswell-phonehdr__title", text: title });
  }

  /** Select a scene in the Write panel and switch to it (cross-panel navigation). */
  openSceneInWrite(path: string, highlight?: { from: number; to: number }): void {
    this.write.selectScene(path, highlight);
    this.setMode("write");
  }

  getRevisionPanel(): RevisionPanel {
    return this.revisions;
  }

  /** True when Write is active with a live editor (gates the insert-todo command). */
  canInsertTodo(): boolean {
    return this.mode === "write" && this.write.hasEditor();
  }

  /** Open the to-do picker for the active Write editor. */
  insertTodo(): void {
    this.write.promptInsertTodo();
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
    const ae = activeDocument.activeElement as HTMLElement | null;
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
        // And never rebuild mid-click — if a pointer is down (the user is
        // clicking away), wait for it to lift so the click isn't swallowed.
        const flush = () => {
          if (this.pointerDown) {
            window.setTimeout(flush, 50);
            return;
          }
          this.pendingRender = false;
          this.renderActive();
        };
        window.setTimeout(flush, 0);
      };
      ae.addEventListener("blur", onBlur);
      return;
    }

    // Rail highlight (desktop/tablet) + bottom-bar highlight (phone).
    this.rail.querySelectorAll<HTMLElement>(".inkswell-rail__item").forEach((b) => {
      b.toggleClass("is-active", b.dataset.dest === this.mode);
    });
    if (isPhone()) {
      this.phone.setActive(this.mode);
      this.phone.alignAboveNavbar();
    }

    this.body.empty();
    this.inspectorEl = null;
    const dest = DESTINATIONS.find((d) => d.id === this.mode);

    // Optional sub-tab bar — suppressed entirely on phones (the bottom bar / More
    // sheet drive navigation; sub-tabs would offer tabs that just redirect).
    if (dest?.subtabs && dest.subtabs.length > 0 && !isPhone()) {
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

    // Home shows the host's active-file Inspector as a second column — wide
    // screens only. On phones the inspector is a drill-down screen (renderContent).
    if (this.mode === "home" && !isPhone()) {
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
    // On a phone, heavy multi-pane destinations show a "larger screen" notice
    // instead of a cramped, unusable layout (the "writing companion" scope).
    if (isPhone() && this.isRedirected(this.mode)) {
      const label = DESTINATIONS.find((d) => d.id === this.mode)?.label ?? "This view";
      renderPhoneRedirect(content, label);
      return;
    }

    // Phone single-column drill-down (master→detail) for Home and Codex. Validate
    // the stored target (it may have been renamed/deleted) and fall back to the
    // list if it no longer resolves.
    const phone = isPhone();
    const homeFile =
      phone && this.mode === "home" && this.detail["home"]
        ? this.fileAt(this.detail["home"]!)
        : null;
    if (phone && this.mode === "home" && this.detail["home"] && !homeFile) {
      this.detail["home"] = null;
    }
    let codexDetail = phone && this.mode === "codex" ? this.detail["codex"] ?? null : null;
    if (codexDetail && !this.fileAt(codexDetail)) {
      this.detail["codex"] = null;
      codexDetail = null;
    }

    // A detail screen gets a back header; the list screen gets the contextual tip.
    // (renderHint owns its host so the panel's self-rerender never wipes it.)
    if (homeFile) this.renderPhoneBack(content, "Scene", () => this.popDetail("home"));
    else if (codexDetail) this.renderPhoneBack(content, "Codex", () => this.popDetail("codex"));
    else renderHint(content, this.plugin, hintKey(this.mode, this.subtab[this.mode]));

    const panel = content.createDiv({ cls: "inkswell-panelhost" });

    switch (this.mode) {
      case "home":
        if (homeFile) this.inspector.render(panel, homeFile);
        else this.explorer.render(panel);
        break;
      case "plan": {
        const sub = this.subtab["plan"] ?? "overview";
        if (sub === "board") this.board.render(panel);
        else if (sub === "beats") this.beats.render(panel);
        else this.overview.render(panel);
        break;
      }
      case "codex":
        if (phone) this.codex.setSelected(codexDetail);
        this.codex.render(panel);
        // Phone: drilled into an entry → CSS hides the list, shows the detail.
        if (codexDetail) panel.addClass("is-codex-detail");
        break;
      case "write":
        this.write.render(panel);
        break;
      case "track":
        this.stats.render(panel);
        break;
      case "revise": {
        const sub = this.subtab["revise"] ?? "audit";
        if (sub === "analysis") this.analysis.render(panel);
        else if (sub === "todos") this.todos.render(panel);
        else if (sub === "log") this.revisions.render(panel);
        else this.audit.render(panel);
        break;
      }
      case "publish": {
        const sub = this.subtab["publish"] ?? "compile";
        if (sub === "checklist") this.checklist.render(panel);
        else if (sub === "launch") this.launch.render(panel);
        else this.compile.render(panel);
        break;
      }
      case "help":
        this.help.render(panel);
        break;
    }
  }
}
