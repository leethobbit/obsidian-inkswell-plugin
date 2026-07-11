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

import { ItemView, Menu, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import { isPhone, renderPhoneRedirect } from "../lib/platform";
import { preserveFocus } from "../lib/focus-preserve";
import { KeyboardWatcher } from "./phone/keyboard-watch";
import { createDraft, deleteDraft, renameDraft } from "../projects/draft-actions";
import { draftLabel, groupIntoStories, Story, storyOf } from "../projects/stories";
import { promptText } from "../scenes/scene-actions";
import { Project } from "../projects/types";
import { NewDraftModal } from "./drafts-modal";
import { CodexPanel } from "../codex/codex-panel";
import { AnalysisPanel } from "../insight/analysis-panel";
import { BeatPanel } from "../outliner/beat-panel";
import { OverviewPanel } from "../plan/overview-panel";
import { StructurePanel, StructureView } from "../plan/structure-panel";
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
import { WritePanel, SceneHighlight } from "./write-panel";
import { SearchPanel } from "./search-panel";
import { SceneInspector } from "../scenes/scene-inspector";
import { HelpPanel } from "../help/help-panel";
import { renderHint } from "../help/hint";
import { hintKey } from "../help/help-content";
import { PhoneShell } from "./phone/phone-shell";
import { openMoreSheet } from "./phone/more-sheet";
import {
  DESTINATIONS,
  InkswellMode,
  PHONE_REDIRECTED,
  RAIL_FOOTER_GROUP,
  enabledSubtabs,
  resolveSubtab,
} from "./nav-model";
import { FeatureId } from "../features";
import type InkswellPlugin from "../../main";

export const VIEW_TYPE_INKSWELL = "inkswell";

// The nav model (destinations, sub-tabs, phone placement/redirects) lives in
// nav-model.ts — ONE declaration drives the rail, bottom bar, and More sheet.
export type { InkswellMode } from "../views/nav-model";

export class InkswellView extends ItemView {
  private plugin: InkswellPlugin;
  private explorer: ExplorerPanel;
  private overview: OverviewPanel;
  private beats: BeatPanel;
  private structure: StructurePanel;
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
  private search: SearchPanel;
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
  /** Timer id for the pending-render safety sweep (0 = none scheduled). */
  private pendingSweep = 0;
  /** Destination the body was last FULLY built for (gates the Write fast path). */
  private renderedMode: InkswellMode | null = null;
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
    this.structure = new StructurePanel(this.app, plugin, store, plugin.activeProject);
    this.codex = new CodexPanel(this.app, plugin);
    // On phones a codex row tap drills into a single-column detail screen; on
    // wider screens it falls through to the panel's own two-pane update.
    this.codex.onSelect = (path) => {
      if (!isPhone()) return false;
      this.pushDetail("codex", path);
      return true;
    };
    // An "Appears in" scene opens in the Write editor (flashing the first mention),
    // never as a raw note — matching Search/To-dos navigation.
    this.codex.onOpenInWrite = (path, hl) => this.openSceneInWrite(path, hl);
    this.write = new WritePanel(this.app, plugin, store, plugin.sprints);
    this.stats = new StatsPanel(this.app, plugin, tracker, store, stats);
    this.revisions = new RevisionPanel(this.app, plugin, store);
    this.todos = new TodosPanel(this.app, store, plugin.activeProject, (path, hl) =>
      this.openSceneInWrite(path, hl)
    );
    this.audit = new AuditPanel(this.app, store, plugin.activeProject, (path) =>
      plugin.selfWrites.mark(path)
    );
    this.analysis = new AnalysisPanel(this.app, store, plugin.activeProject);
    this.compile = new CompilePanel(this.app, plugin, store);
    this.checklist = new ChecklistPanel(this.app, plugin, store);
    this.launch = new LaunchPanel(this.app, plugin, store);
    this.search = new SearchPanel(this.app, store, plugin.activeProject, {
      onOpenInWrite: (path, hl) => this.openSceneInWrite(path, hl),
      // Flush the open scene's unsaved text before replace re-reads from disk.
      beforeReplace: () => this.write.flushPendingSave(),
      // If the editor is bound to a scene that just changed, reload it from disk
      // so its stale buffer can't clobber the replacement on a later blur.
      afterReplace: (changedPaths) => {
        const open = this.write.currentScenePath();
        if (open && changedPaths.includes(open)) this.write.reloadCurrentScene();
      },
    });
    this.help = new HelpPanel(this.app, plugin);
    this.inspector = new SceneInspector(this.app, plugin, store);

    // Re-render the active destination whenever projects, the log, or the active
    // project change. The store also reports WHICH paths changed, so a notify
    // caused purely by our own inline-form writes can be softened (no rebuild
    // under the user's caret).
    this.unsubs.push(store.subscribe((_, changed) => this.renderActive(changed)));
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
    // Draw a divider whenever the group changes between consecutive destinations
    // (groups are contiguous runs in DESTINATIONS). The divider that begins the
    // footer group gets `--push` so CSS floats that group to the bottom. Sprint
    // is intentionally absent — it's an action, not a destination (reachable from
    // the Write topbar, the status bar, and the command palette).
    let prevGroup: string | null = null;
    for (const dest of DESTINATIONS) {
      if (prevGroup !== null && dest.group !== prevGroup) {
        const sep = this.rail.createDiv({ cls: "inkswell-rail__separator" });
        if (dest.group === RAIL_FOOTER_GROUP) sep.addClass("inkswell-rail__separator--push");
      }
      prevGroup = dest.group;
      const item = this.rail.createDiv({ cls: "inkswell-rail__item" });
      setIcon(item.createSpan({ cls: "inkswell-rail__icon" }), dest.icon);
      item.createSpan({ cls: "inkswell-rail__label", text: dest.label });
      item.dataset.dest = dest.id;
      item.setAttribute("aria-label", dest.label);
      item.onclick = () => this.setMode(dest.id);
    }

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
      onMore: (e) =>
        openMoreSheet(
          e,
          (mode, subtab) => this.setMode(mode, subtab),
          () => this.openCapture()
        ),
    });
    // Keep the bar flush above Obsidian's mobile navbar across orientation /
    // keyboard / safe-area changes.
    this.registerDomEvent(window, "resize", () => {
      if (isPhone()) this.phone.alignAboveNavbar();
    });
    // Deferred-rebuild flush: one delegated focusout on the body (bubbles from
    // every field, present or future) instead of a per-element blur listener a
    // mobile webview could orphan. See renderActive's editing guard.
    this.registerDomEvent(this.body, "focusout", () => {
      window.setTimeout(() => this.flushPendingRender(), 0);
    });
    this.register(() => window.clearTimeout(this.pendingSweep));
    // Phone: keep the focused field visible once the soft keyboard settles
    // (the webview doesn't reliably scroll fields inside nested flex columns).
    this.registerDomEvent(this.body, "focusin", (e) => {
      if (!isPhone()) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA" && t.tagName !== "SELECT") return;
      window.setTimeout(() => {
        if (t.isConnected && activeDocument.activeElement === t) {
          t.scrollIntoView({ block: "center" });
        }
      }, 300);
    });
    // Track the soft keyboard: exposes --inkswell-keyboard-inset / is-keyboard-open
    // on the host (CSS hides the bottom bar while typing), and re-measures the
    // navbar lift. Measure twice: once immediately, and again after Obsidian's
    // floating navbar finishes animating back in — measuring mid-animation
    // reads zero overlap and leaves the bar parked under the navbar.
    if (isPhone()) {
      const keyboard = new KeyboardWatcher();
      this.register(
        keyboard.attach(root, () => {
          this.phone.alignAboveNavbar();
          window.setTimeout(() => this.phone.alignAboveNavbar(), 400);
        })
      );
    }
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

  /**
   * Persistent project selector, visible across all destinations. Drafts of one
   * story share a `longform.title`, so the first selector picks the *story*; a
   * second selector appears only when the active story has more than one draft
   * (single-draft stories look exactly as before). A `⋯` menu manages drafts.
   */
  private renderHeader(): void {
    if (!this.header) return;
    this.header.empty();
    const projects = this.plugin.store.getProjects();
    if (projects.length === 0) {
      this.header.createSpan({ cls: "inkswell-stats__muted", text: "No project yet" });
      return;
    }
    const stories = groupIntoStories(projects);
    const activePath = this.plugin.activeProject.get();
    const activeStory = storyOf(stories, activePath);

    this.header.createSpan({ cls: "inkswell-host__headerlabel", text: "Project" });
    const sel = this.header.createEl("select", { cls: "dropdown" });
    // "All projects" (empty value) is the unfocused default: Home lists every
    // project. Project-scoped tabs fall back to the first project when nothing
    // specific is selected (see resolveActive).
    sel.createEl("option", { text: "All projects", value: "" });
    for (const s of stories) {
      sel.createEl("option", { text: s.title, value: s.title });
    }
    sel.value = activeStory?.title ?? "";
    sel.onchange = () => {
      const story = stories.find((s) => s.title === sel.value);
      // Switching story selects its first draft (or "All projects" → null).
      this.plugin.activeProject.set(story ? story.drafts[0].vaultPath : null);
    };

    // Draft controls only make sense once a specific story is in focus.
    if (!activeStory) return;
    const activeDraft =
      activeStory.drafts.find((d) => d.vaultPath === activePath) ?? activeStory.drafts[0];

    if (activeStory.drafts.length > 1) {
      this.header.createSpan({ cls: "inkswell-host__headerlabel", text: "Draft" });
      const dsel = this.header.createEl("select", { cls: "dropdown" });
      activeStory.drafts.forEach((d, i) => {
        dsel.createEl("option", { text: draftLabel(d, i), value: d.vaultPath });
      });
      dsel.value = activeDraft.vaultPath;
      dsel.onchange = () => this.plugin.activeProject.set(dsel.value);
    }

    const menuBtn = this.header.createEl("button", {
      cls: "inkswell-host__draftsmenu",
      attr: { "aria-label": "Drafts" },
    });
    menuBtn.type = "button";
    setIcon(menuBtn, "ellipsis");
    menuBtn.onclick = (e) => this.openDraftsMenu(e, activeStory, activeDraft);
  }

  /** Drafts management menu (New / Rename / Delete) for the active story. */
  private openDraftsMenu(e: MouseEvent, story: Story, active: Project): void {
    const menu = new Menu();
    menu.addItem((i) =>
      i.setTitle("New draft").setIcon("copy-plus").onClick(() => this.newDraftAction(active))
    );
    menu.addItem((i) =>
      i.setTitle("Rename draft").setIcon("pencil").onClick(() => this.renameDraftAction(active))
    );
    menu.addItem((i) =>
      i
        .setTitle("Delete draft")
        .setIcon("trash-2")
        .onClick(() => void this.deleteDraftAction(story, active))
    );
    menu.showAtMouseEvent(e);
  }

  private newDraftAction(source: Project): void {
    new NewDraftModal(
      this.app,
      { title: source.draft.title, isFirstSplit: source.draft.draftTitle == null },
      (res) => {
        if (!res) return;
        void createDraft(this.app, source, res.newName, res.originalName).then((file) => {
          if (file) this.plugin.activeProject.set(file.path);
        });
      }
    ).open();
  }

  private renameDraftAction(project: Project): void {
    void promptText(this.app, {
      title: "Rename draft",
      value: project.draft.draftTitle ?? "",
      multiline: false,
      cta: "Rename",
    }).then((name) => {
      if (name == null || !name.trim()) return;
      void renameDraft(this.app, project, name);
    });
  }

  private async deleteDraftAction(story: Story, project: Project): Promise<void> {
    const deleted = await deleteDraft(this.app, project, story.drafts.length <= 1);
    if (!deleted) return;
    const sibling = story.drafts.find((d) => d.vaultPath !== project.vaultPath);
    this.plugin.activeProject.set(sibling ? sibling.vaultPath : null);
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

  /**
   * The sub-tab to actually show for `mode`: the remembered one if it's still
   * enabled, else the first enabled tab (so a hidden active tab falls back to a
   * visible core one instead of a blank pane).
   */
  private effectiveSubtab(mode: InkswellMode): string | undefined {
    const dest = DESTINATIONS.find((d) => d.id === mode);
    if (!dest) return undefined;
    return resolveSubtab(dest, this.subtab[mode], this.plugin.settings.disabledFeatures);
  }

  /** Right-click "Hide <label>" on an optional tab/view → disable + toast. */
  private attachHideMenu(el: HTMLElement, feature: FeatureId, label: string): void {
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle(`Hide ${label}`)
          .setIcon("eye-off")
          .onClick(() => {
            void this.plugin.setFeatureEnabled(feature, false);
            new Notice(`${label} hidden — re-enable in Settings → Features.`);
          })
      );
      menu.showAtMouseEvent(e);
    });
  }

  /** Phone "More → Capture idea" → the shared quick-capture flow. */
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
  openSceneInWrite(path: string, highlight?: SceneHighlight): void {
    this.write.selectScene(path, highlight);
    this.setMode("write");
  }

  /** Open Plan → Structure on a specific view (deep link for board/grid commands). */
  openPlanStructure(view: StructureView): void {
    this.structure.setView(view);
    this.setMode("plan", "structure");
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

  /** Full rebuild that bypasses the Write fast path — used after a feature toggle
   *  so the Write toolbar (e.g. the prompts button) actually re-renders. */
  forceRefresh(): void {
    this.renderedMode = null;
    this.renderActive();
  }

  private renderActive(changed?: ReadonlySet<string>): void {
    if (!this.body || !this.rail || !this.header) return;

    // The header is outside the body and safe to refresh anytime.
    this.renderHeader();

    // Self-write soft path: when every path in this notify was just written by
    // one of our own inline forms (codex profile, scene meta), the active panel
    // triggered it and its editor DOM must be left alone — rebuild it and the
    // focused field is destroyed mid-keystroke (caret to 0; on mobile that
    // reads as text entering backwards). Refresh only what the panel needs.
    if (changed && this.plugin.selfWrites.coveredBy(changed) && this.softRefreshActive()) {
      return;
    }

    // Don't rebuild the body while the user is typing inside it — that would
    // destroy focus mid-keystroke. Defer the rebuild; the body-level focusout
    // handler (onOpen) flushes it once the field is actually left. Delegated
    // focusout can't be orphaned the way a per-element blur listener could
    // (mobile webviews replace elements under a stuck listener), and each new
    // notify re-evaluates the editing check, so a stale flag can't wedge.
    if (this.isEditingInBody()) {
      this.pendingRender = true;
      // Safety sweep: focus can vanish WITHOUT a focusout (Chrome doesn't fire
      // one when the focused element is removed from the DOM), which would
      // strand this deferral until the next notify. Poll cheaply while pending.
      this.schedulePendingSweep();
      return;
    }
    this.pendingRender = false;

    // Rail highlight (desktop/tablet) + bottom-bar highlight (phone).
    this.rail.querySelectorAll<HTMLElement>(".inkswell-rail__item").forEach((b) => {
      b.toggleClass("is-active", b.dataset.dest === this.mode);
    });
    if (isPhone()) {
      this.phone.setActive(this.mode);
      this.phone.alignAboveNavbar();
    }

    // Write fast path: when Write is already built and the refresh doesn't
    // change what the editor is bound to, let the panel absorb it in place —
    // a body teardown here would destroy the live CM6 editor (undo history,
    // scroll, cursor) for a background metadata change.
    if (
      this.mode === "write" &&
      this.renderedMode === "write" &&
      !(isPhone() && this.isRedirected("write")) &&
      this.write.update()
    ) {
      return;
    }

    // Safety net for a rebuild that fires while a field is somehow still
    // focused (the guard above depends on activeElement, which mobile webviews
    // report unreliably): carry focus, caret, and un-committed text across.
    preserveFocus(this.body, () => {
      this.renderedMode = this.mode;
      this.body.empty();
      this.inspectorEl = null;
      const dest = DESTINATIONS.find((d) => d.id === this.mode);

      // Optional sub-tab bar — suppressed entirely on phones (the bottom bar / More
      // sheet drive navigation; sub-tabs would offer tabs that just redirect).
      const subtabs = dest ? enabledSubtabs(dest, this.plugin.settings.disabledFeatures) : [];
      if (subtabs.length > 0 && !isPhone()) {
        const active = this.effectiveSubtab(this.mode);
        const bar = this.body.createDiv({ cls: "inkswell-subtabs" });
        for (const st of subtabs) {
          const b = bar.createEl("button", { cls: "inkswell-subtab", text: st.label });
          b.toggleClass("is-active", st.id === active);
          b.onclick = () => this.setMode(this.mode, st.id);
          // Optional tabs can be hidden in place (re-enable in Settings → Features).
          if (st.feature) this.attachHideMenu(b, st.feature, st.label);
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
    });
  }

  /** True while an editable field inside the body has focus. */
  private isEditingInBody(): boolean {
    const ae = activeDocument.activeElement as HTMLElement | null;
    return (
      !!ae &&
      this.body.contains(ae) &&
      (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT" || ae.isContentEditable)
    );
  }

  /** One-shot recheck while a deferred rebuild is pending; reschedules itself
   *  until the deferral resolves. Only runs while pendingRender is set. */
  private schedulePendingSweep(): void {
    if (this.pendingSweep) return;
    this.pendingSweep = window.setTimeout(() => {
      this.pendingSweep = 0;
      if (!this.pendingRender) return;
      if (this.isEditingInBody()) {
        this.schedulePendingSweep();
        return;
      }
      this.flushPendingRender();
    }, 1500);
  }

  /** Flush a deferred rebuild once focus has settled outside any field. Defer
   *  past the tick so tabbing between fields doesn't rebuild in the gap, and
   *  never rebuild mid-click — the click's target would be torn down. */
  private flushPendingRender(): void {
    if (!this.pendingRender) return;
    if (this.pointerDown) {
      window.setTimeout(() => this.flushPendingRender(), 50);
      return;
    }
    if (this.isEditingInBody()) return; // moved to another field; next focusout retries
    this.pendingRender = false;
    this.renderActive();
  }

  /**
   * Targeted refresh for a notify that only reflects the active panel's own
   * writes. Returns true when handled (the focused editor DOM was left alone);
   * false falls through to the normal render path.
   */
  private softRefreshActive(): boolean {
    if (this.renderedMode !== this.mode) return false; // body isn't this panel's DOM
    switch (this.mode) {
      case "codex":
        // Names/aliases/parents show in the list; the detail pane holds the caret.
        this.codex.softRefresh();
        return true;
      case "home": {
        // Refresh the scene list (status badges); the explorer no-ops on a
        // phone detail screen where its container is detached.
        this.explorer.softRefresh();
        // The inspector (side column on desktop, drill-down screen on phone)
        // shows chips/badges the write may have changed — rebuild it with
        // focus preserved so the field being edited keeps caret and text.
        if (this.inspectorEl) {
          preserveFocus(this.inspectorEl, () => this.updateInspector());
        } else if (isPhone() && this.detail["home"]) {
          const host = this.body.querySelector<HTMLElement>(".inkswell-panelhost");
          const file = this.fileAt(this.detail["home"]);
          if (host && file) preserveFocus(host, () => this.inspector.render(host, file));
        }
        return true;
      }
      case "write":
        // The Write fast path already absorbs metadata changes in place.
        return this.write.update();
      case "revise":
        // Audit checkbox/note writes update their own badges via onChange.
        return true;
      default:
        return false;
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
        ? this.fileAt(this.detail["home"])
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
    if (homeFile) {
      this.renderPhoneBack(content, homeFile.basename, () => this.popDetail("home"));
    } else if (codexDetail) {
      const entryName = this.fileAt(codexDetail)?.basename ?? "Codex";
      this.renderPhoneBack(content, entryName, () => this.popDetail("codex"));
    } else {
      renderHint(content, this.plugin, hintKey(this.mode, this.subtab[this.mode]));
    }

    const panel = content.createDiv({ cls: "inkswell-panelhost" });

    switch (this.mode) {
      case "home":
        if (homeFile) this.inspector.render(panel, homeFile);
        else this.explorer.render(panel);
        break;
      case "plan": {
        const sub = this.effectiveSubtab("plan") ?? "overview";
        if (sub === "beats") this.beats.render(panel);
        else if (sub === "structure") this.structure.render(panel);
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
      case "search":
        this.search.render(panel);
        break;
      case "track":
        this.stats.render(panel);
        break;
      case "revise": {
        const sub = this.effectiveSubtab("revise") ?? "audit";
        if (sub === "analysis") this.analysis.render(panel);
        else if (sub === "todos") this.todos.render(panel);
        else if (sub === "log") this.revisions.render(panel);
        else this.audit.render(panel);
        break;
      }
      case "publish": {
        const sub = this.effectiveSubtab("publish") ?? "compile";
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
