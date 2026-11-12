/**
 * Write destination: a focused in-plugin manuscript editor. Left: scene
 * navigator for the active project. Center: an editable area for the selected
 * scene's body. Right: the Scene Inspector for that scene. Stays in the Inkswell
 * tab so you write without losing your planning context.
 *
 * Saving is owned by a per-scene {@link SceneSession}: debounced autosave (~2s)
 * plus blur / scene-switch / unmount flushes. Only the body is rewritten,
 * atomically via `vault.process`, and NEVER over disk text the session hasn't
 * seen — an external change (sync, the same note open in a normal tab) reloads
 * in place when the editor is clean and raises a conflict banner when it's
 * dirty, with both resolutions backing the displaced version up to the
 * "Inkswell conflicts" folder. The editor is a custom CM6 Live-Preview surface
 * (see scene-editor.ts); embedding Obsidian's own editor remains deferred.
 */

import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  App,
  EventRef,
  FuzzySuggestModal,
  HoverParent,
  HoverPopover,
  Menu,
  Notice,
  Platform,
  Scope,
  TFile,
  setIcon,
} from "obsidian";
import { createEntityForProject, getCodexEntities } from "../codex/codex-store";
import { isPinnedIn } from "../codex/codex-list";
import {
  defaultScopeForProject,
  describeCreateScope,
  filterToScope,
  scopeContextForProject,
} from "../codex/codex-scope";
import {
  buildLinkText,
  buildReplacement,
  findExistingEntity,
  relocate,
  seedFromSelection,
  selectionInsideWikilink,
} from "../codex/quick-codex";
import { QuickCodexModal } from "../codex/quick-codex-modal";
import { CodexEntity, allCategories, categoryDisplayLabel, categoryDisplayName } from "../codex/types";
import { mentionAt } from "../codex/codex";
import { entitiesForScene } from "../codex/peek";
import { wikilinkAt } from "../lib/wikilinks";
import { formatNumber, t, tp } from "../i18n";
import type { MessageKey } from "../i18n/locales/en";
import { LinkCandidate } from "../lib/link-complete";
import { featureEnabled } from "../features";
import { tryFileOp } from "../lib/notify";
import { isMobileApp, isPhone } from "../lib/platform";
import { attachHideMenu } from "../lib/hide-menu";
import { nearestIndexOf } from "../lib/text-locate";
import { attachRowMenu } from "../lib/row-menu";
import {
  addSceneMenuItems,
  openSceneOnModClick,
  promptText as promptForText,
} from "../scenes/scene-actions";
import { createScene, promptNewScene } from "../outliner/create-scene";
import { chapterRuns } from "../outliner/outline";
import { PromptModal } from "../ideation/prompt-modal";
import { writingPrompts } from "../ideation/prompts";
import { RevisionModal } from "../revisions/revision-modal";
import { renderEmptyState } from "./panel-kit";
import { tagField } from "../lib/focus-preserve";
import { preserveUi, tagScroller } from "../lib/scroll-preserve";
import { SceneSession } from "./scene-session";
import {
  EDITOR_SHORTCUTS,
  EditorPrefs,
  EditorShortcutHooks,
  createSceneEditor,
  flashRange,
  formatSelection,
  insertPlaceholder,
  linkAtCursor,
  refreshMarkers,
  refreshMilestones,
  setTypewriter,
} from "./scene-editor";
import { MarkKind } from "../lib/inline-format";
import {
  MarkerDef,
  MarkerSet,
  ShippedMarkerId,
  insertableMarkers,
  markerSet,
  scanPlaceholders,
} from "../lib/placeholders";
import { PromptCategory, PromptPhase } from "../ideation/prompts";
import { countWords } from "../lib/wordcount";
import { resolveActive } from "../projects/active-project";
import { updateNextUp } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { SceneMeta, SceneStatus, readSceneMeta, statusLabel } from "../scenes/scene-meta";
import {
  ChapterStop,
  StreamField,
  StreamFilter,
  StreamRow,
  applyFilter,
  chapterStep,
  chapterStops,
  filterOptions,
  neighbour,
} from "../lib/stream-plan";
import { SceneStream, StreamSceneSpec } from "./stream/scene-stream";
import { WriteMode, loadWriteMode, saveWriteMode } from "./stream/write-mode";
import { SceneInspector } from "../scenes/scene-inspector";
import { EditorPlaces } from "./editor-place";
import { RightPanel } from "./right-panel";
import { CodexSidePanel, PlanSidePanel } from "./side-panels";
import {
  SIDE_WIDTH_DEFAULT,
  SIDE_WIDTH_STEP,
  WriteLayout,
  clampSideWidth,
  loadWriteLayout,
  saveWriteLayout,
} from "./write-layout";
import { RevisionSidebar } from "../revisions/revision-sidebar";
import { SprintController } from "../sprints/sprint-controller";
import type InkswellPlugin from "../../main";

/**
 * A scroll-to + flash target handed to the Write panel by another panel (Todos,
 * cross-scene Search). `from`/`to` are offsets into the scene BODY (frontmatter
 * stripped), matching the editor's document. `verify` — when set — is the exact
 * body substring the offsets were computed from; if the file has shifted since
 * the scan, the panel re-locates that literal instead of flashing stale offsets.
 */
export interface SceneHighlight {
  from: number;
  to: number;
  verify?: string;
}


/** Picker description + menu icon per shipped marker; custom markers share a fallback. */
const SHIPPED_MARKER_UI: Record<ShippedMarkerId, { descKey: MessageKey; icon: string }> = {
  todo: { descKey: "write.marker.todo", icon: "list-todo" },
  research: { descKey: "write.marker.research", icon: "search" },
  note: { descKey: "write.marker.note", icon: "sticky-note" },
  dialogue: { descKey: "write.marker.dialogue", icon: "message-square" },
  scene: { descKey: "write.marker.scene", icon: "clapperboard" },
};
const CUSTOM_MARKER_UI: { descKey: MessageKey; icon: string } = { descKey: "write.marker.custom", icon: "bookmark" };

function markerUi(def: MarkerDef): { descKey: MessageKey; icon: string } {
  return def.custom ? CUSTOM_MARKER_UI : SHIPPED_MARKER_UI[def.id as ShippedMarkerId] ?? CUSTOM_MARKER_UI;
}

/** Inline formatting toggles offered in the editor's menu (phones have no Mod
 *  key and Obsidian's mobile toolbar doesn't attach to this editor). */
const FORMAT_ACTIONS: { kind: MarkKind; labelKey: MessageKey; icon: string }[] = [
  { kind: "bold", labelKey: "write.menu.bold", icon: "bold" },
  { kind: "italic", labelKey: "write.menu.italic", icon: "italic" },
  { kind: "strike", labelKey: "write.menu.strike", icon: "strikethrough" },
];

/** Quick picker for "Insert a to-do marker…" (command palette + toolbar). */
class TodoPickerModal extends FuzzySuggestModal<MarkerDef> {
  constructor(
    app: App,
    private markers: MarkerDef[],
    private onPick: (marker: MarkerDef) => void
  ) {
    super(app);
    this.setPlaceholder(t("write.marker.pickerPlaceholder"));
  }
  getItems(): MarkerDef[] {
    return this.markers;
  }
  getItemText(m: MarkerDef): string {
    return t("write.marker.pickerItem", { label: m.label, desc: t(markerUi(m).descKey) });
  }
  onChooseItem(m: MarkerDef): void {
    this.onPick(m);
  }
}

/** "Jump to chapter…" in the stream (command palette). */
class ChapterPickerModal extends FuzzySuggestModal<ChapterStop> {
  constructor(
    app: App,
    private stops: ChapterStop[],
    private onPick: (stop: ChapterStop) => void
  ) {
    super(app);
    this.setPlaceholder(t("write.chapter.jumpPlaceholder"));
  }
  getItems(): ChapterStop[] {
    return this.stops;
  }
  getItemText(s: ChapterStop): string {
    return s.title;
  }
  onChooseItem(s: ChapterStop): void {
    this.onPick(s);
  }
}

export class WritePanel implements HoverParent {
  private app: App;
  private plugin: InkswellPlugin;
  /** Page Preview's handle for popovers this editor spawns (HoverParent). */
  hoverPopover: HoverPopover | null = null;
  /** Codex entries for the peek, cached briefly per scene (see peekEntities). */
  private peekCache: { path: string | null; at: number; entities: CodexEntity[] } | null = null;
  private store: ProjectStore;
  private sprints: SprintController;
  private inspector: SceneInspector;
  /** The right-column panel slot: choosable panels behind a switcher. */
  private rightPanels: RightPanel[];
  /** Which right-column panel is showing (remembered per device in `layout`). */
  private activeRightPanel = "scene";
  /** The side column's width, hidden state and panel on this device. */
  private layout: WriteLayout;
  /** Where the writer was in each scene, handed to the next editor built for
   *  it: leaving Write and coming back no longer lands at the top (#77). */
  private places = new EditorPlaces<StateEffect<unknown>>();
  /** Focus mode: only the editor and the toolbar (see {@link toggleFocus}). */
  private focusMode = false;

  private container: HTMLElement | null = null;
  /** Tracks the project the editor is currently bound to, to reset on change. */
  private lastProject: string | null = null;
  private selectedScene: string | null = null;
  /** Collapsed navigator chapter groups (by each run's first scene) — in-memory view
   *  state that survives re-renders, like `activeRightPanel`. */
  private navCollapsed = new Set<string>();
  /** Stable hosts inside the panel, re-rendered in place by {@link update}. */
  private navEl: HTMLElement | null = null;
  private inspectorHost: HTMLElement | null = null;

  private editor: EditorView | null = null;
  /**
   * Editor-local shortcuts as an Obsidian Scope, pushed while the CM editor has
   * focus. Obsidian's hotkey manager captures matching keydowns at the window
   * BEFORE CodeMirror sees them (Mod-B → toggle bold, Mod-Shift-T → undo close
   * tab), so the CM keymap alone never fires for those combos; a pushed Scope
   * takes precedence over the global hotkeys. Built lazily from EDITOR_SHORTCUTS.
   */
  private hotkeyScope: Scope | null = null;
  private hotkeysPushed = false;
  /** Bumped each render; a stale async scene-load checks it and bails. */
  private editorToken = 0;
  private currentFile: TFile | null = null;
  /** Owner of the loaded scene's baselines, autosave, and conflict state. */
  private session: SceneSession | null = null;
  /** The outgoing session's final flush; the next scene load awaits it so a
   *  rebuilt editor can never be seeded from pre-save bytes. */
  private teardown: Promise<unknown> = Promise.resolve();
  /** Conflict banner host inside the editor column (rebuilt per render). */
  private bannerEl: HTMLElement | null = null;
  /** The CM host element (carries the `is-manuscript` typography class). */
  private cmHostEl: HTMLElement | null = null;
  /** Vault modify subscription driving external-change handling. */
  private modifyRef: EventRef | null = null;
  private countEl: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  /** While true, an editor blur does NOT trigger a save. Set when the Insert
   *  dropdown menu is open so opening it (which blurs the editor) can't kick off
   *  a save → store-refresh → panel rebuild that destroys the editor mid-insert.
   *  See {@link openInsertMenu}. */
  private suppressBlurSave = false;
  /** Set around a Split-scene edit: the removed text moved to another scene,
   *  so it must re-baseline the tracker instead of counting as deleted words. */
  private movedEdit = false;
  /** A token to scroll-to + flash once the editor finishes loading (Todos / Search). */
  private pendingHighlight: SceneHighlight | null = null;

  /** One scene at a time, or the whole book as a stream (remembered per device). */
  private writeMode: WriteMode;
  /** The stream page while Stream is showing. The live scene's editor and
   *  session are still this panel's own (`editor`/`session`), as in single-scene
   *  mode; every other scene is a read-only reader inside the stream. */
  private stream: SceneStream | null = null;
  private streamBarEl: HTMLElement | null = null;
  /** In-memory filter (survives re-renders; cleared when the project changes). */
  private streamFilter: StreamFilter | null = null;
  /** Every scene of the book, and the ones the filter keeps (manuscript order). */
  private streamRowsAll: StreamRow[] = [];
  private streamShown: StreamRow[] = [];
  /** The scene at the top of the page (the navigator marks it). */
  private streamInView: string | null = null;
  /** Where the page was when it was last torn down, to come back to it. */
  private streamAnchor: { path: string; within: number; live: string | null } | null = null;

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
    this.writeMode = loadWriteMode(app.vault.getName());
    this.inspector = new SceneInspector(this.app, this.plugin, store);
    const revision = new RevisionSidebar(
      this.app,
      store,
      plugin.activeProject,
      (path, from, to) => this.jumpToRevision(path, from, to),
      () => this.markers()
    );
    // Keep in step with SIDE_PANELS (right-panel.ts), which names these for commands.
    this.rightPanels = [
      this.inspector,
      new CodexSidePanel(this.app, this.plugin),
      new PlanSidePanel(this.app, this.plugin),
      revision,
    ];
    this.layout = loadWriteLayout(app.vault.getName());
    const remembered = this.layout.sidePanel;
    if (remembered && this.rightPanels.some((p) => p.id === remembered)) {
      this.activeRightPanel = remembered;
    }
    // External-change detection for the open scene: every modify of its file is
    // classified by the session (own write ⇒ ignore; clean ⇒ silent reload;
    // dirty ⇒ conflict banner). This is what stops a sync / second-tab edit
    // from being silently clobbered by the next save.
    this.modifyRef = this.app.vault.on("modify", (f) => {
      if (!(f instanceof TFile)) return;
      if (this.session && f.path === this.session.file.path) {
        void this.session.handleExternalModify();
      }
      // The panel beside the editor may show this file (the scene's cast, the
      // planning note). Only the one on screen is told.
      if (this.sidePanelShowing()) this.activePanel().onVaultModify?.(f);
    });
  }

  private activePanel(): RightPanel {
    return this.rightPanels.find((p) => p.id === this.activeRightPanel) ?? this.rightPanels[0];
  }

  /** Whether the side column is on screen right now. */
  private sidePanelShowing(): boolean {
    return (
      !this.layout.sideCollapsed && !this.focusMode && !!this.inspectorHost?.isConnected && !isPhone()
    );
  }

  /**
   * Select a scene for editing (used when navigating in from another panel).
   * Sets the owning project active and pins `lastProject` so the next render
   * keeps the selection instead of clearing it on a perceived project change.
   */
  selectScene(path: string, highlight?: SceneHighlight): void {
    const ctx = this.store.findSceneByPath(path);
    if (!ctx) return;
    this.plugin.activeProject.set(ctx.project.vaultPath);
    this.selectedScene = path;
    this.lastProject = ctx.project.vaultPath;
    this.pendingHighlight = highlight ?? null;
    // A scene the stream's filter hides was asked for (Search, the revision log): show it.
    if (this.streamFilter && !applyFilter(this.streamRows(ctx.project), this.streamFilter).some((r) => r.path === path)) {
      this.streamFilter = null;
    }
  }

  /** Whether a live scene editor is currently mounted (for command availability). */
  hasEditor(): boolean {
    return !!this.editor;
  }

  /** The scene path the editor is currently bound to (for replace coordination). */
  currentScenePath(): string | null {
    return this.currentFile?.path ?? null;
  }

  /**
   * Flush any unsaved editor text to disk NOW. Called before a cross-scene replace
   * so the open scene's latest content is what replace re-reads (never a stale
   * on-disk copy). No-op when nothing is dirty. The editor stays up, so a
   * conflict stays with its banner.
   */
  async flushPendingSave(): Promise<void> {
    await this.session?.flush("editor-alive");
  }

  /**
   * App quit: flush as a teardown — the editor won't outlive the quit, so a
   * scene in conflict gets its editor text backed up instead of lost (view
   * close isn't reliably awaited on quit).
   */
  async flushBeforeQuit(): Promise<void> {
    await this.session?.flush();
  }

  /**
   * An external write landed on `path` (e.g. a find & replace). Route it
   * through the session's content-compare: a clean editor reloads in place
   * (nothing typed, nothing lost); a dirty one raises the conflict banner —
   * the user's words stay in the buffer instead of being silently discarded.
   * (The vault-modify subscription usually gets there first; this direct call
   * makes the replace flow deterministic and is idempotent.)
   */
  handleExternalChange(path: string): void {
    if (this.session && this.session.file.path === path) {
      void this.session.handleExternalModify();
    }
  }

  /**
   * Leaving the Write destination (mode switch, phone navigation): capture and
   * flush the editor NOW, before the host empties the body and orphans the CM6
   * DOM. The capture is synchronous, so the background write can't lose text
   * even though navigation doesn't await it.
   */
  flushForNavigation(): void {
    void this.detachSession("leaving");
    this.destroyStream();
  }

  /**
   * Record where the writer is in the scene whose editor is about to go, so the
   * next editor built for it opens there. `resume` says whether that editor
   * should also take the keyboard back: always after a trip to another
   * destination (you came back to write), after a rebuild only if this editor
   * had it, never when the stream merely moves its live editor elsewhere.
   */
  private rememberPlace(resume: "leaving" | "rebuild" | "handoff"): void {
    const view = this.editor;
    const path = this.session?.file.path ?? this.currentFile?.path;
    // An editor already off the page reports no scroll and no focus: keep what
    // notePlace() recorded while it was still there.
    if (!view || !path || !view.dom.isConnected) return;
    const sel = view.state.selection.main;
    this.places.remember(path, {
      anchor: sel.anchor,
      head: sel.head,
      docLength: view.state.doc.length,
      // In the stream the page scrolls, not the editor (it keeps its own anchor).
      scroll: this.stream ? null : view.scrollSnapshot(),
      focus: resume === "leaving" || (resume === "rebuild" && view.hasFocus),
    });
  }

  /**
   * The host is about to rebuild Write in place (it empties the page before it
   * calls render): record the place now, while the editor can still report its
   * scroll position and focus.
   */
  notePlace(): void {
    this.rememberPlace("rebuild");
  }

  /**
   * Retire the current session + editor: capture the doc synchronously, queue
   * the final save, and tear the editor down. Returns the flush promise —
   * `renderEditor` awaits it before re-reading the file (kills the save→re-seed
   * race), and `dispose` awaits it on view close/quit.
   */
  private detachSession(resume: "leaving" | "rebuild" | "handoff" = "handoff"): Promise<unknown> {
    this.rememberPlace(resume);
    this.popHotkeys();
    const s = this.session;
    if (!s) {
      this.editor?.destroy();
      this.editor = null;
      return Promise.resolve();
    }
    const flushed = s.flush(); // synchronous doc capture — safe to destroy next
    s.dispose();
    this.session = null;
    this.editor?.destroy();
    this.editor = null;
    return flushed;
  }

  /**
   * Collapsed-topbar Insert control: an Obsidian menu with the same things as
   * the inline insert row — the to-do markers, and nothing else. Everything
   * that ACTS on the text lives in the editor's own menu ({@link openEditorMenu}).
   */
  private openInsertMenu(e: MouseEvent): void {
    if (!this.editor) return;
    const menu = new Menu();
    for (const marker of insertableMarkers(this.markers())) {
      menu.addItem((item) =>
        item
          .setTitle(t("write.insert.marker", { name: marker.label }))
          .setIcon(markerUi(marker).icon)
          .onClick(() => {
            if (this.editor) insertPlaceholder(this.editor, marker);
          })
      );
    }
    this.showEditorMenu(menu, e);
  }

  /**
   * The editor's menu: what you can do to the text at the cursor or with the
   * selection. Opened by right-clicking in the editor, and by the toolbar's
   * "⋯" button on touch devices (no right-click, and no Mod key for the
   * formatting shortcuts). One builder, so the two can't drift.
   */
  openEditorMenu(e: MouseEvent): void {
    const view = this.editor;
    if (!view) return;
    const hasSelection = !view.state.selection.main.empty;
    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.cut"))
        .setIcon("scissors")
        .setDisabled(!hasSelection)
        .onClick(() => this.clipboard("cut"))
    );
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.copy"))
        .setIcon("copy")
        .setDisabled(!hasSelection)
        .onClick(() => this.clipboard("copy"))
    );
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.paste"))
        .setIcon("clipboard-paste")
        .onClick(() => this.clipboard("paste"))
    );

    menu.addSeparator();
    for (const { kind, labelKey, icon } of FORMAT_ACTIONS) {
      menu.addItem((item) =>
        item
          .setTitle(t(labelKey))
          .setIcon(icon)
          .onClick(() => this.toggleMark(kind))
      );
    }

    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle(t("peek.lookUp"))
        .setIcon("book-marked")
        .onClick(() => this.plugin.lookUpInCodex())
    );
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.newCodexEntry"))
        .setIcon("book-user")
        .onClick(() => this.quickCodex())
    );
    const head = view.state.selection.main.head;
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.openLink"))
        .setIcon("link")
        .setDisabled(!wikilinkAt(view.state.doc.toString(), head))
        .onClick(() => this.openLinkAtCursor())
    );

    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.splitScene"))
        .setIcon("split")
        .onClick(() => void this.splitScene("cursor"))
    );
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.moveSelection"))
        .setIcon("file-output")
        .setDisabled(!hasSelection)
        .onClick(() => void this.splitScene("selection"))
    );

    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle(t("write.menu.logDecision"))
        .setIcon("flag")
        .onClick(() => this.logDecision())
    );
    this.showEditorMenu(menu, e);
  }

  /**
   * Show a menu that acts on the live editor.
   *
   * Opening a menu blurs the editor, which would normally fire a blur-save →
   * store refresh → panel rebuild and destroy the live editor mid-action. We
   * suppress that one save for the life of the menu (the session's autosave
   * still covers the text); CodeMirror keeps its selection across the blur, so
   * the chosen action still lands at the real caret. The flag clears on hide,
   * after any blur the open caused has already passed.
   */
  private showEditorMenu(menu: Menu, e: MouseEvent): void {
    this.suppressBlurSave = true;
    menu.onHide(() => {
      this.suppressBlurSave = false;
    });
    menu.showAtMouseEvent(e);
  }

  /** Cut / copy / paste for the editor's menu (the keyboard shortcuts are the
   *  browser's own and never come through here). */
  private clipboard(action: "cut" | "copy" | "paste"): void {
    const view = this.editor;
    if (!view) return;
    const failed = () => new Notice(t("write.menu.clipboardFailed"));
    if (action === "paste") {
      void navigator.clipboard.readText().then((text) => {
        if (this.editor !== view || !text) return;
        view.dispatch(view.state.replaceSelection(text), { userEvent: "input.paste", scrollIntoView: true });
        view.focus();
      }, failed);
      return;
    }
    const sel = view.state.selection.main;
    if (sel.empty) return;
    const text = view.state.sliceDoc(sel.from, sel.to);
    void navigator.clipboard.writeText(text).then(() => {
      if (action !== "cut" || this.editor !== view) return;
      // Only once the copy has landed, and only if the text is still what was copied.
      if (view.state.sliceDoc(sel.from, sel.to) !== text) return;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: "" },
        selection: { anchor: sel.from },
        userEvent: "delete.cut",
      });
      view.focus();
    }, failed);
  }

  /** Open the to-do picker and insert the chosen marker into the live editor. */
  promptInsertTodo(): void {
    if (!this.editor) return;
    new TodoPickerModal(this.app, insertableMarkers(this.markers()), (marker) => {
      if (this.editor) insertPlaceholder(this.editor, marker);
    }).open();
  }

  /** The effective to-do markers — resolved per call, never cached (gotcha 17). */
  private markers(): MarkerSet {
    return markerSet(this.plugin.settings.listOverrides.markers);
  }

  /** Toggle bold / italic / strikethrough on the live editor's selection
   *  (commands, the Insert menu; Mod-b / Mod-i come via the editor shortcuts). */
  toggleMark(kind: MarkKind): void {
    if (this.editor) formatSelection(this.editor, kind);
  }

  /** Editor focused: make the editor-local shortcuts win over global hotkeys. */
  private pushHotkeys(): void {
    if (this.hotkeysPushed) return;
    if (!this.hotkeyScope) {
      const scope = new Scope(this.app.scope);
      for (const s of EDITOR_SHORTCUTS) {
        scope.register(s.modifiers, s.key, () => {
          if (this.editor) s.run(this.editor, this.hooks());
          return false; // handled — preventDefault, don't fall through to global hotkeys
        });
      }
      this.hotkeyScope = scope;
    }
    this.app.keymap.pushScope(this.hotkeyScope);
    this.hotkeysPushed = true;
  }

  /** The host callbacks shared by the CM keymap, the pushed Scope, and editor events. */
  private hooks(): EditorShortcutHooks {
    return {
      onLogIssue: () => this.logDecision(),
      onContextMenu: (e) => this.openEditorMenu(e),
      onQuickCodex: () => this.quickCodex(),
      onOpenLink: (linktext) => this.openLink(linktext),
      onHoverLink: (e, el, linktext) => this.hoverLink(e, el, linktext),
      onPeek: (e, view) => this.peekAt(e, view),
      onPeekEnd: () => this.plugin.peek.scheduleClose(),
      getMarkers: () => this.markers(),
    };
  }

  /**
   * Quick Codex: turn the selection (or the word at the cursor) into a codex
   * entry and replace it with a wikilink. The creation pipeline is the Codex
   * panel's (`createEntityForProject`), so scope/folder/template rules are
   * identical. Positions are captured up front and re-located on submit — the
   * document can move while the dialog is open (autosave reload, sync reseed)
   * — and a rebuilt editor means the link is NOT inserted (we say so) rather
   * than landing in the wrong place.
   */
  /**
   * Split scene (#54). "cursor": everything from the cursor to the end moves
   * to a new scene; "selection": just the selected text does. The new scene
   * is inserted right after this one (same act/chapter) and opened.
   *
   * Order is the safety: the new scene is created FIRST, and the text leaves
   * this scene only once that file exists and the editor still shows exactly
   * the text we copied — a failure never loses prose. The removal is an
   * ordinary editor change (undo restores it here; the new scene stays).
   */
  async splitScene(mode: "cursor" | "selection"): Promise<void> {
    const view = this.editor;
    const file = this.currentFile;
    if (!view || !file || view.composing) return;
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    const scene = project?.scenes.find((s) => s.path === file.path);
    if (!project || !scene) return;

    const sel = view.state.selection.main;
    const doc = view.state.doc.toString();
    const range = mode === "selection" ? { from: sel.from, to: sel.to } : { from: sel.head, to: doc.length };
    const text = doc.slice(range.from, range.to);
    if (!text.trim()) {
      new Notice(
        mode === "selection" ? t("write.split.selectFirst") : t("write.split.nothingAfter")
      );
      return;
    }

    const token = this.editorToken;
    this.suppressBlurSave = true;
    let title: string | null;
    try {
      title = await promptForText(this.app, {
        title: mode === "selection" ? t("write.split.titleSelection") : t("write.split.titleCursor"),
        value: "",
        multiline: false,
        cta: t("write.split.create"),
      });
    } finally {
      this.suppressBlurSave = false;
    }
    if (!title?.trim()) return;

    // 1. The new scene, carrying the text (leading blank lines dropped).
    const meta = readSceneMeta(this.app, file);
    const seed: Partial<SceneMeta> = {};
    if (meta.act) seed.act = meta.act;
    if (meta.chapter) seed.chapter = meta.chapter;
    const created = await createScene(this.app, this.store, this.plugin.settings, project, {
      title,
      afterTitle: scene.title,
      meta: seed,
      body: text.replace(/^\s*\n/, ""),
    });
    if (!created) return; // createScene already said why (name taken / write failed)

    // 2. Remove it here — only if this is still the same editor showing the same text.
    if (this.editor !== view || token !== this.editorToken || view.state.doc.sliceString(range.from, range.to) !== text) {
      new Notice(t("write.split.changedMeanwhile", { name: created.basename }));
      return;
    }
    this.movedEdit = true;
    view.dispatch({ changes: { from: range.from, to: range.to, insert: "" }, userEvent: "delete.split" });
    this.movedEdit = false; // consumed by onEditorChange; never leak to the next edit
    await this.session?.save();

    // 3. Continue in the new scene.
    new Notice(tp("write.split.moved", countWords(text), { name: created.basename }));
    this.selectedScene = created.path;
    this.rerender();
  }

  quickCodex(): void {
    const view = this.editor;
    const file = this.currentFile;
    if (!view || !file) return;
    if (view.composing) return; // mid-IME: the "selection" isn't settled yet
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    if (selectionInsideWikilink(doc, from, to)) {
      new Notice(t("write.codex.alreadyLink"));
      return;
    }
    const seed = seedFromSelection(doc, from, to);
    const token = this.editorToken;
    const s = this.plugin.settings;
    const categories = allCategories(s.customCategories, s.categoryOverrides);
    const projects = this.store.getProjects();
    const activePath = this.plugin.activeProject.get();
    const active = activePath ? this.store.getProject(activePath) ?? null : null;

    // The dialog blurs the editor; without this the blur-save → store notify
    // → rebuild would destroy the very editor we're about to insert into.
    this.suppressBlurSave = true;
    const modal = new QuickCodexModal(this.app, {
      seed,
      categories,
      defaultCategoryId: this.plugin.lastQuickCodexType ?? "character",
      entities: getCodexEntities(this.app),
      scopeHint: describeCreateScope(defaultScopeForProject(active, projects)),
      onSubmit: async ({ name, categoryId, addAlias }) => {
        const def = categories.find((c) => c.id === categoryId);
        if (!def) return;
        this.plugin.lastQuickCodexType = def.id;
        const existing = findExistingEntity(getCodexEntities(this.app), name);
        let target: TFile | null = null;
        if (existing) {
          const f = this.app.vault.getAbstractFileByPath(existing.path);
          target = f instanceof TFile ? f : null;
        } else {
          target = await tryFileOp(
            () => createEntityForProject(this.app, s, projects, active, def, name),
            t("write.codex.createFailed", { category: categoryDisplayLabel(def) })
          );
        }
        if (!target) return;
        const entryFile = target;
        if (addAlias && seed) {
          const alias = seed.core.split(/\r?\n/)[0].trim();
          this.plugin.selfWrites.mark(entryFile.path);
          await tryFileOp(
            () =>
              this.app.fileManager.processFrontMatter(entryFile, (fm: Record<string, unknown>) => {
                const cur = Array.isArray(fm["aliases"])
                  ? fm["aliases"].filter((x): x is string => typeof x === "string")
                  : [];
                if (!cur.some((a) => a.toLowerCase() === alias.toLowerCase())) {
                  fm["aliases"] = [...cur, alias];
                }
              }),
            t("write.codex.aliasFailed")
          );
        }
        if (this.editor !== view || token !== this.editorToken) {
          new Notice(t("write.codex.editorChanged", { name: entryFile.basename }));
          return;
        }
        const now = view.state.doc.toString();
        const range = seed ? relocate(now, seed) : null;
        if (range && seed) {
          const insert = buildReplacement(seed, entryFile.basename);
          view.dispatch({
            changes: { from: range.from, to: range.to, insert },
            selection: { anchor: range.from + insert.length },
            userEvent: "input.link",
            scrollIntoView: true,
          });
        } else {
          const head = view.state.selection.main.head;
          const insert = buildLinkText(entryFile.basename, "");
          view.dispatch({
            changes: { from: head, insert },
            selection: { anchor: head + insert.length },
            userEvent: "input.link",
            scrollIntoView: true,
          });
        }
      },
    });
    const restore = modal.onClose.bind(modal);
    modal.onClose = () => {
      restore();
      this.suppressBlurSave = false;
      if (this.editor === view) view.focus();
    };
    modal.open();
  }

  /**
   * Follow a wikilink from the open scene. Routing keeps the writer inside
   * Inkswell where that makes sense: a codex entry opens in the Codex panel, a
   * scene of any project opens in this editor, anything else opens as a
   * markdown tab. An unresolved link is reported, never auto-created (a new
   * note beside the scene is the wrong place for a codex entry).
   */
  openLink(linktext: string): void {
    const file = this.currentFile;
    if (!file) return;
    const hash = linktext.indexOf("#");
    const linkpath = (hash === -1 ? linktext : linktext.slice(0, hash)).trim();
    const target = linkpath
      ? this.app.metadataCache.getFirstLinkpathDest(linkpath, file.path)
      : file; // `[[#Heading]]` — same note
    if (!target) {
      new Notice(t("write.link.noNote", { name: linkpath }));
      return;
    }
    if (getCodexEntities(this.app).some((e) => e.path === target.path)) {
      this.plugin.openCodexEntry(target.path);
      return;
    }
    if (this.store.findSceneByPath(target.path)) {
      if (target.path !== this.currentScenePath()) {
        this.selectScene(target.path);
        this.rerender();
      }
      return;
    }
    void this.app.workspace.openLinkText(linktext, file.path, "tab");
  }

  /** Open the wikilink under the cursor (Insert menu / command — the phone path,
   *  where Mod-click doesn't exist). */
  openLinkAtCursor(): void {
    if (!this.editor) return;
    const linktext = linkAtCursor(this.editor);
    if (!linktext) {
      new Notice(t("write.link.noneAtCursor"));
      return;
    }
    this.openLink(linktext);
  }

  /** Hand a hovered link to Obsidian's Page Preview (source registered in main.ts).
   *  A link to a Codex entry gets the Codex peek instead (see peekAt). */
  private hoverLink(e: MouseEvent, el: HTMLElement, linktext: string): void {
    if (!this.currentFile) return;
    if (this.codexEntityForLink(linktext)) return;
    this.app.workspace.trigger("hover-link", {
      event: e,
      source: "inkswell-write",
      hoverParent: this,
      targetEl: el,
      linktext,
      sourcePath: this.currentFile.path,
    });
  }

  /** Codex entries visible from the open scene, re-read at most every few
   *  seconds (the peek asks on every Ctrl/Cmd-move). */
  private peekEntities(): CodexEntity[] {
    const path = this.currentFile?.path ?? null;
    const now = Date.now();
    const cache = this.peekCache;
    if (cache && cache.path === path && now - cache.at < 3000) return cache.entities;
    const entities = entitiesForScene(this.plugin, path);
    this.peekCache = { path, at: now, entities };
    return entities;
  }

  /** The Codex entry a wikilink in the open scene points at, if it is one. */
  private codexEntityForLink(linktext: string): CodexEntity | null {
    if (!this.currentFile) return null;
    const linkpath = linktext.split("#")[0].split("|")[0].trim();
    if (!linkpath) return null;
    const dest = this.app.metadataCache.getFirstLinkpathDest(linkpath, this.currentFile.path);
    if (!dest) return null;
    return this.peekEntities().find((e) => e.path === dest.path) ?? null;
  }

  /** The Codex entry named at document position `pos` (a link, or a plain name
   *  or alias), with the range it covers. */
  private entityAt(view: EditorView, pos: number): { entity: CodexEntity; from: number; to: number } | null {
    const line = view.state.doc.lineAt(pos);
    const link = wikilinkAt(line.text, pos - line.from);
    if (link) {
      const entity = this.codexEntityForLink(link.linktext);
      if (entity) return { entity, from: line.from + link.from, to: line.from + link.to };
    }
    const hit = mentionAt(line.text, pos - line.from, this.peekEntities());
    return hit ? { entity: hit.entity, from: line.from + hit.from, to: line.from + hit.to } : null;
  }

  /** Ctrl/Cmd-move over the prose: peek at the Codex entry under the pointer. */
  private peekAt(e: MouseEvent, view: EditorView): void {
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    const hit = pos === null ? null : this.entityAt(view, pos);
    if (!hit) {
      this.plugin.peek.scheduleClose();
      return;
    }
    const rect = this.rangeRect(view, hit.from, hit.to);
    if (rect) this.plugin.peek.show(hit.entity, rect, { entities: this.peekEntities(), sticky: false });
  }

  /** Viewport rect of a document range (its first line), or null off-screen. */
  private rangeRect(view: EditorView, from: number, to: number): DOMRect | null {
    const a = view.coordsAtPos(from);
    const b = view.coordsAtPos(to, -1);
    if (!a) return null;
    const right = b && b.top === a.top ? b.right : a.right;
    return new DOMRect(a.left, a.top, Math.max(1, right - a.left), a.bottom - a.top);
  }

  /** Look up in Codex: peek at the name under the cursor. False when there's
   *  no editor or no name there (the caller then offers a search). */
  lookUpAtCursor(): boolean {
    const view = this.editor;
    if (!view) return false;
    const hit = this.entityAt(view, view.state.selection.main.head);
    if (!hit) return false;
    const rect = this.rangeRect(view, hit.from, hit.to);
    if (!rect) return false;
    this.plugin.peek.show(hit.entity, rect, { entities: this.peekEntities(), sticky: true });
    return true;
  }

  /** Where a looked-up card should appear: at the cursor when Write has one. */
  cursorRect(): DOMRect | null {
    const view = this.editor;
    if (!view) return null;
    const head = view.state.selection.main.head;
    return this.rangeRect(view, head, head);
  }

  /** Editor blurred / torn down: restore normal hotkey handling. */
  private popHotkeys(): void {
    if (!this.hotkeysPushed || !this.hotkeyScope) return;
    this.app.keymap.popScope(this.hotkeyScope);
    this.hotkeysPushed = false;
  }

  render(container: HTMLElement): void {
    // Retire the outgoing session before we rebuild the DOM: the doc is captured
    // synchronously and the final write is chained into `teardown`, which the
    // next scene load awaits before reading the file.
    this.teardown = this.detachSession("rebuild");
    this.destroyStream();

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
        text: t("write.empty.noProject"),
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
      this.streamFilter = null;
      this.streamAnchor = null;
    }

    // Stream: settle which scene is live before the navigator highlights it —
    // the selected one when the filter keeps it, else the first one shown. A
    // scene the store hasn't caught up with yet (just created or split off)
    // stays wanted: the editor waits where it was and the next refresh moves
    // it there (updateStream).
    const streaming = this.streamActive();
    if (streaming) {
      this.streamRowsAll = this.streamRows(project);
      this.streamShown = applyFilter(this.streamRowsAll, this.streamFilter);
      const sel = this.selectedScene;
      const pending =
        !!sel &&
        !this.streamRowsAll.some((r) => r.path === sel) &&
        this.app.vault.getAbstractFileByPath(sel) instanceof TFile;
      if (!pending && !this.streamShown.some((r) => r.path === sel)) {
        this.selectedScene = this.streamShown[0]?.path ?? null;
      }
    }

    this.renderNextUp(container, project);

    const main = container.createDiv({ cls: "inkswell-write__main" });
    // Tap-to-dismiss backdrop for the phone navigator drawer (CSS-hidden until
    // the drawer is open on a phone).
    const backdrop = main.createDiv({ cls: "inkswell-write__backdrop" });
    backdrop.onclick = () => container.removeClass("nav-open");
    this.renderNavigator(main, project);
    if (streaming) this.renderStream(main);
    else this.renderEditor(main);
    // The divider between the editor and the side column (drag to resize).
    this.wireResizer(main.createDiv({ cls: "inkswell-write__resizer" }), main);
    this.inspectorHost = main.createDiv({ cls: "inkswell-write__inspector" });
    this.applyLayout();
    this.renderRightColumn();
  }

  // --- Side column: width, hidden state, panel -------------------------------

  /** Push the remembered layout onto the page (a class + one CSS variable). */
  private applyLayout(): void {
    const c = this.container;
    if (!c) return;
    c.toggleClass("is-side-collapsed", this.layout.sideCollapsed);
    c.toggleClass("is-nav-collapsed", this.layout.navCollapsed);
    c.toggleClass("is-nextup-folded", this.layout.nextUpFolded);
    const w = this.layout.sideWidth;
    // An empty value removes the variable, so the stylesheet's default applies.
    c.setCssProps({ "--inkswell-write-side-w": w === null ? "" : `${w}px` });
    // Focus reaches outside this panel (the rail, the project header), so its
    // class sits on the host. The host clears it when it shows anything else.
    c.closest(".inkswell-host")?.toggleClass("is-write-focus", this.focusMode);
  }

  /** Whether Write is in focus mode (the host clears the class on leaving Write). */
  isFocusMode(): boolean {
    return this.focusMode;
  }

  /**
   * Focus mode: only the editor and the toolbar. Hides the rail, the project
   * header, the scene list, the side column and "Next up" in one go, without
   * touching what each is set to, so leaving focus puts everything back. Not
   * remembered across restarts: a writer should never open Inkswell to find
   * the navigation gone.
   */
  toggleFocus(): void {
    this.focusMode = !this.focusMode;
    this.syncSidePanel();
  }

  /** Show or hide the scene list: a drawer on phones, a remembered column elsewhere. */
  toggleSceneList(): void {
    const c = this.container;
    if (!c) return;
    if (this.focusMode) {
      // Asking for the list (by command; its button is hidden) leaves focus.
      this.focusMode = false;
      if (!isPhone()) this.layout.navCollapsed = false;
      this.saveLayout();
      this.syncSidePanel();
      if (isPhone()) c.addClass("nav-open");
      return;
    }
    if (isPhone()) {
      c.toggleClass("nav-open", !c.hasClass("nav-open"));
      return;
    }
    this.layout.navCollapsed = !this.layout.navCollapsed;
    this.saveLayout();
    this.applyLayout();
    this.renderTopbar();
  }

  /** Fold the "Next up" note into its toolbar button, or bring its row back. */
  private setNextUpFolded(folded: boolean): void {
    this.layout.nextUpFolded = folded;
    this.saveLayout();
    this.applyLayout();
    this.renderTopbar();
  }

  /** The "Next up" note as it reads right now (the field's text when it's on
   *  the page: a note just typed may not have reached the store yet). */
  private nextUpText(): string {
    const input = this.container?.querySelector<HTMLInputElement>(".inkswell-write__nextupinput");
    if (input) return input.value.trim();
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    return (project?.inkswell?.nextUp ?? this.plugin.tracker.getNextUp()).trim();
  }

  private saveLayout(): void {
    saveWriteLayout(this.app.vault.getName(), this.layout);
  }

  /** Whether Write has a side column on this device (phones show scene details
   *  above the editor instead). */
  canUseSidePanel(): boolean {
    return !isPhone();
  }

  /** Show or hide the side column (topbar button, command). The editor keeps
   *  its text, cursor and focus: only the columns around it change. */
  toggleSidePanel(): void {
    // In focus mode everything is hidden: asking for the column (by command;
    // its button is hidden) leaves focus and shows it.
    if (this.focusMode) {
      this.focusMode = false;
      this.layout.sideCollapsed = false;
    } else {
      this.layout.sideCollapsed = !this.layout.sideCollapsed;
    }
    this.saveLayout();
    this.syncSidePanel();
  }

  /** Bring a panel up beside the editor, un-hiding the column if needed. */
  showSidePanel(id: string): void {
    if (!this.rightPanels.some((p) => p.id === id)) return;
    this.activeRightPanel = id;
    this.layout.sidePanel = id;
    this.layout.sideCollapsed = false;
    this.focusMode = false; // asking for a panel is asking to leave focus
    this.saveLayout();
    this.syncSidePanel();
  }

  private syncSidePanel(): void {
    if (!this.container?.isConnected) return;
    this.applyLayout();
    this.renderTopbar();
    this.renderRightColumn();
  }

  /**
   * Make `handle` resize the side column: drag, double-click to reset, or
   * focus it and use the arrow keys. The width is a CSS variable on the panel,
   * so a drag re-lays-out without rebuilding anything (the editor re-measures
   * itself). Saved when the drag ends.
   */
  private wireResizer(handle: HTMLElement, main: HTMLElement): void {
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", t("write.side.resize"));
    handle.tabIndex = 0;

    const current = () => this.inspectorHost?.offsetWidth || SIDE_WIDTH_DEFAULT;
    // What the editor and the side column share: the row minus the scene list.
    const available = () => main.clientWidth - (this.navEl?.offsetWidth ?? 0);
    const setWidth = (width: number | null, save: boolean) => {
      this.layout.sideWidth = width === null ? null : clampSideWidth(width, available());
      this.applyLayout();
      if (save) this.saveLayout();
    };

    let drag: { x: number; width: number } | null = null;
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      // Keep the caret in the editor, and don't start a text selection.
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, width: current() };
      handle.addClass("is-dragging");
    });
    handle.addEventListener("pointermove", (e) => {
      // The column is on the right: dragging left makes it wider.
      if (drag) setWidth(drag.width + (drag.x - e.clientX), false);
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      handle.removeClass("is-dragging");
      this.saveLayout();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("dblclick", () => setWidth(null, true));
    handle.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") setWidth(current() + SIDE_WIDTH_STEP, true);
      else if (e.key === "ArrowRight") setWidth(current() - SIDE_WIDTH_STEP, true);
      else if (e.key === "Home") setWidth(null, true);
      else return;
      e.preventDefault();
    });
  }

  /**
   * Absorb a store/tracker refresh WITHOUT tearing down the live editor —
   * re-renders the topbar, scene navigator, and inspector in place so the CM6
   * editor keeps its undo history, scroll position, and cursor. Returns false
   * when the refresh can't be absorbed (project switched, the selected scene
   * changed or no longer resolves, or the panel isn't mounted) — the host then
   * falls back to a full render.
   */
  update(): boolean {
    if (!this.container || !this.container.isConnected) return false;
    if (this.stream) return this.updateStream();
    if (!this.editor || !this.currentFile) return false;
    // A pending scene switch (selectScene / nav click) needs the full path so
    // the new scene loads into the editor.
    if (this.currentFile.path !== this.selectedScene) return false;

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project || project.vaultPath !== this.lastProject) return false;
    // The scene must still be part of the project at the same path (a rename or
    // removal invalidates the editor binding — rebuild).
    if (!project.scenes.some((s) => s.path === this.selectedScene)) return false;

    // Soft-path rule: this fast path can fire while a field OUTSIDE the CM6
    // editor is focused (an Inspector field's own save triggers the notify that
    // lands here), so the rebuilt columns are wrapped in preserveFocus — the
    // Inspector's tagged fields keep caret + uncommitted text across the
    // rebuild instead of being recreated from (older) frontmatter. The nav and
    // right-column scrollers keep their position too (#48).
    preserveUi(this.container, () => {
      this.renderTopbar();
      if (this.navEl) {
        this.navEl.empty();
        this.renderNavRows(this.navEl, project);
      }
      if (this.inspectorHost) this.renderRightColumn();
    });
    // A highlight requested for the already-open scene (Todos → same scene).
    if (this.pendingHighlight) {
      this.applyPendingHighlight(this.editor.state.doc.toString());
    }
    return true;
  }

  /**
   * Render the right-column panel slot: a segmented switcher (only when more than
   * one panel) over the active panel's content. Called from both render() and the
   * in-place update() so the choice survives a fast-path refresh.
   */
  private renderRightColumn(): void {
    const col = this.inspectorHost;
    if (!col) return;
    col.empty();
    // Hidden (by the writer, or by the phone layout): draw nothing, so a panel
    // nobody can see costs nothing on a refresh.
    if (this.layout.sideCollapsed || this.focusMode || isPhone()) return;
    if (this.rightPanels.length > 1) {
      const bar = col.createDiv({ cls: "inkswell-write__insptabs" });
      const seg = bar.createDiv({ cls: "inkswell-viewswitch" });
      for (const p of this.rightPanels) {
        const btn = seg.createEl("button", { cls: "inkswell-viewswitch__btn", text: p.label });
        btn.toggleClass("is-active", p.id === this.activeRightPanel);
        btn.setAttribute("aria-label", t("write.side.panelLabel", { name: p.label }));
        btn.onclick = () => {
          this.activeRightPanel = p.id;
          this.layout.sidePanel = p.id;
          this.saveLayout();
          this.renderRightColumn();
        };
      }
    }
    const content = col.createDiv({ cls: "inkswell-write__inspcontent" });
    const panel = this.activePanel();
    // Keyed by panel + scene: switching either starts at the top.
    tagScroller(content, `write-right:${panel.id}:${this.currentFile?.path ?? ""}`);
    panel.render(content, this.currentFile);
  }

  /**
   * Jump to a revision item from the Revision panel. A marker in the already-open
   * scene flashes in place (no reload); anything else navigates to its scene
   * (markers carry offsets to highlight; decisions just open the scene).
   */
  private jumpToRevision(path: string, from?: number, to?: number): void {
    const highlight = from != null && to != null ? { from, to } : undefined;
    if (path === this.currentScenePath()) {
      if (highlight && this.editor) {
        this.pendingHighlight = highlight;
        this.applyPendingHighlight(this.editor.state.doc.toString());
      }
      return;
    }
    this.selectScene(path, highlight);
    this.rerender();
  }

  private renderTopbar(): void {
    if (!this.container) return;
    let bar = this.container.querySelector<HTMLElement>(".inkswell-write__topbar");
    if (!bar) bar = this.container.createDiv({ cls: "inkswell-write__topbar" });
    bar.empty();

    // Show / hide the scene list. On phones it's a drawer over the editor
    // (open for one pick, never remembered); elsewhere it's a column whose
    // hidden state is kept per device. mousedown is swallowed so the caret
    // stays in the editor.
    const navShown = !this.layout.navCollapsed;
    const navToggle = bar.createEl("button", { cls: "clickable-icon inkswell-write__navtoggle" });
    setIcon(navToggle, "panel-left");
    if (isPhone()) {
      navToggle.setAttribute("aria-label", t("write.nav.toggle"));
    } else {
      navToggle.toggleClass("is-active", navShown);
      navToggle.setAttribute("aria-label", t(navShown ? "write.nav.hide" : "write.nav.show"));
      navToggle.setAttribute("aria-pressed", String(navShown));
    }
    navToggle.onmousedown = (e) => e.preventDefault();
    navToggle.onclick = () => this.toggleSceneList();

    // Scene | Stream. Not on phones; hideable like the other optional extras.
    if (this.canStream()) {
      const seg = bar.createDiv({ cls: "inkswell-viewswitch inkswell-write__mode" });
      const modes: { mode: WriteMode; labelKey: MessageKey; hintKey: MessageKey }[] = [
        { mode: "scene", labelKey: "write.mode.scene", hintKey: "write.mode.sceneHint" },
        { mode: "stream", labelKey: "write.mode.stream", hintKey: "write.mode.streamHint" },
      ];
      for (const m of modes) {
        const btn = seg.createEl("button", { cls: "inkswell-viewswitch__btn", text: t(m.labelKey) });
        btn.toggleClass("is-active", this.writeMode === m.mode);
        btn.setAttribute("aria-label", t(m.hintKey));
        btn.onclick = () => this.setWriteMode(m.mode);
      }
      attachHideMenu(seg, this.plugin, "stream", { title: t("write.hide.stream.title"), hidden: t("write.hide.stream.hidden") });
    }

    // Sprint group — part of the optional "tracking" feature. A sprint already
    // running still shows its controls so it can be ended, hidden or not.
    const active = this.sprints.getActive();
    if (active || featureEnabled(this.plugin.settings.disabledFeatures, "tracking")) {
      const sprintGroup = bar.createDiv({ cls: "inkswell-write__group" });
      if (active) {
        sprintGroup.createSpan({
          cls: "inkswell-stats__muted",
          text: t("write.sprint.status", { words: active.words, seconds: this.sprints.remainingSec() }),
        });
        const end = sprintGroup.createEl("button", { text: t("write.sprint.end") });
        end.onclick = () => this.sprints.finish();
      } else {
        const sprint = sprintGroup.createEl("button", { text: t("write.sprint.start") });
        sprint.onclick = () => this.plugin.startSprint();
        attachHideMenu(sprint, this.plugin, "tracking", { title: t("write.hide.tracking.title"), hidden: t("write.hide.tracking.hidden") });
      }
    }

    // Prompt group — separated from the sprint controls by a divider; the chosen
    // prompt fills the remaining space (ellipsis-truncated) and reopens on click.
    // Optional feature: hidden when "Writing prompts" is toggled off.
    if (featureEnabled(this.plugin.settings.disabledFeatures, "prompts")) {
      const promptGroup = bar.createDiv({
        cls: "inkswell-write__group inkswell-write__group--prompt",
      });
      const promptBtn = promptGroup.createEl("button", { text: t("write.prompt.button") });
      promptBtn.onclick = () => this.openPromptModal();
      // Right-click to hide (turn back on under Customize → Features).
      attachHideMenu(promptBtn, this.plugin, "prompts", { title: t("write.hide.prompts.title"), hidden: t("write.hide.prompts.hidden") });
      const promptEl = promptGroup.createSpan({
        cls: "inkswell-write__prompt",
        text: this.promptText,
      });
      if (this.promptText) promptEl.onclick = () => this.openPromptModal();
    }

    // To-do-insert controls — only useful with a scene open. Lets you drop a
    // [TODO:…]/[RESEARCH:…]/… marker (or one of the writer's own) and keep drafting.
    // Two presentations, toggled purely by CSS container-query on the topbar width:
    // a full inline button row when there's room, and a single "Insert" dropdown
    // once the bar gets too narrow for the row (tablet/phone, or a narrow pane).
    // Markers ONLY: everything that acts on the text is in the editor's menu
    // (right-click; the "⋯" button below on touch devices).
    if (this.selectedScene) {
      const insertGroup = bar.createDiv({
        cls: "inkswell-write__group inkswell-write__group--insert",
      });
      insertGroup.createSpan({ cls: "inkswell-stats__muted", text: t("write.insert.inline") });
      for (const marker of insertableMarkers(this.markers())) {
        const btn = insertGroup.createEl("button", { text: marker.label });
        // Insert WITHOUT stealing focus from the editor. If the button took focus,
        // the editor would blur → blur-save → store refresh → the host rebuilds the
        // Write panel, destroying the live editor mid-insert (cursor resets to 0,
        // the next clicks misfire). preventDefault on mousedown keeps the caret in
        // the editor so every click inserts where the cursor actually is.
        btn.onmousedown = (e) => e.preventDefault();
        btn.onclick = () => {
          if (this.editor) insertPlaceholder(this.editor, marker);
        };
      }

      // Collapsed form: a single dropdown holding the same markers. Hidden by CSS
      // on a wide bar, shown when the container query collapses the inline row.
      const menuBtn = bar.createEl("button", { cls: "inkswell-write__insertmenu" });
      menuBtn.createSpan({ text: t("write.insert.label") });
      setIcon(menuBtn.createSpan({ cls: "inkswell-write__caret" }), "chevron-down");
      menuBtn.setAttribute("aria-label", t("write.insert.menu"));
      menuBtn.onmousedown = (e) => e.preventDefault();
      menuBtn.onclick = (e) => this.openInsertMenu(e);

      // Touch devices have no right-click: the editor's menu gets a button
      // (CSS shows it only there).
      const actions = bar.createEl("button", { cls: "clickable-icon inkswell-write__actionsmenu" });
      setIcon(actions, "more-horizontal");
      actions.setAttribute("aria-label", t("write.menu.label"));
      actions.onmousedown = (e) => e.preventDefault();
      actions.onclick = (e) => this.openEditorMenu(e);
    }

    this.countEl = bar.createSpan({ cls: "inkswell-write__count" });
    this.updateCount();

    // "Next up", folded: a button that brings the note's row back. It carries
    // the note as its tooltip and a dot when there is one.
    if (this.layout.nextUpFolded) {
      const note = this.nextUpText();
      const nextUp = bar.createEl("button", { cls: "clickable-icon inkswell-write__nextupbtn" });
      setIcon(nextUp, "sticky-note");
      nextUp.toggleClass("has-note", !!note);
      nextUp.setAttribute("aria-label", note ? t("write.nextUp.showNote", { note }) : t("write.nextUp.show"));
      nextUp.onmousedown = (e) => e.preventDefault();
      nextUp.onclick = () => this.setNextUpFolded(false);
    }

    // Focus: only the editor and this toolbar.
    const focus = bar.createEl("button", { cls: "clickable-icon inkswell-write__focustoggle" });
    setIcon(focus, this.focusMode ? "minimize-2" : "maximize-2");
    focus.toggleClass("is-active", this.focusMode);
    focus.setAttribute("aria-label", t(this.focusMode ? "write.focus.leave" : "write.focus.enter"));
    focus.setAttribute("aria-pressed", String(this.focusMode));
    focus.onmousedown = (e) => e.preventDefault();
    focus.onclick = () => this.toggleFocus();

    // Show / hide the side column (CSS hides the button on phones, which have
    // no side column). mousedown is swallowed so the caret stays in the editor.
    const shown = !this.layout.sideCollapsed;
    const side = bar.createEl("button", { cls: "clickable-icon inkswell-write__sidetoggle" });
    setIcon(side, "panel-right");
    side.toggleClass("is-active", shown);
    side.setAttribute("aria-label", t(shown ? "write.side.hide" : "write.side.show"));
    side.setAttribute("aria-pressed", String(shown));
    side.onmousedown = (e) => e.preventDefault();
    side.onclick = () => this.toggleSidePanel();
    // Keep the topbar first in the container.
    this.container.prepend(bar);
  }

  private renderNavigator(parent: HTMLElement, project: Project): void {
    this.navEl = parent.createDiv({ cls: "inkswell-write__nav" });
    tagScroller(this.navEl, "write-nav");
    this.renderNavRows(this.navEl, project);
  }

  /**
   * Scene list, grouped by each scene's `chapter` string in manuscript order —
   * contiguous runs become collapsible groups (the Tree keeps chapters
   * contiguous), so long drafts can be narrowed to the chapter in hand.
   * Chapterless scenes render ungrouped, and a project with no chapters at all
   * keeps the plain flat list. Collapse state is in-memory (`navCollapsed`), so
   * it survives the per-save re-renders; deliberately NOT auto-expanded for the
   * selected scene — every notify re-renders, so auto-expanding would make it
   * impossible to collapse the chapter you're writing in.
   */
  private renderNavRows(nav: HTMLElement, project: Project): void {
    // The outline's chapter runs (not raw chapter strings), so two same-named
    // chapters side by side stay two groups (#58). Chapterless scenes render
    // ungrouped, one row each.
    type Row = { scene: Project["scenes"][number]; file: TFile | null };
    const rows: Row[] = project.scenes.map((scene) => {
      const f = scene.path && this.app.vault.getAbstractFileByPath(scene.path);
      return { scene, file: f instanceof TFile ? f : null };
    });
    const { runs } = chapterRuns(
      rows.map(({ scene, file }) => ({
        title: scene.title,
        chapter: file ? readSceneMeta(this.app, file).chapter : undefined,
      })),
      project.inkswell?.chapters
    );
    const runAt = new Map(runs.map((r) => [r.indices[0], r] as const));
    for (let i = 0; i < rows.length; i++) {
      const run = runAt.get(i);
      if (!run) {
        this.navSceneRow(nav, project, rows[i].scene, rows[i].file);
        continue;
      }
      const members = run.indices.map((k) => rows[k]);
      i = run.indices[run.indices.length - 1];
      // A one-scene chapter collapses to a single row carrying the chapter name:
      // a header plus one child says nothing the row can't say itself (#40).
      if (members.length === 1) {
        this.navSceneRow(nav, project, members[0].scene, members[0].file, run.title);
        continue;
      }
      // Collapse state is per chapter run: keyed by its first scene, so
      // collapsing one "Alice" doesn't fold every chapter named Alice.
      const key = members[0].scene.title;
      const holdsSelection = members.some((m) => m.scene.path === this.selectedScene);
      // Stream: the chapter name jumps to the chapter's first scene on the page.
      const firstShown = (): string | null =>
        members.map((m) => m.scene.path).find((p): p is string => !!p && !!this.stream?.has(p)) ?? null;
      this.navGroupHead(nav, project, run.title, key, holdsSelection, firstShown);
      if (this.navCollapsed.has(key)) continue;
      for (const { scene, file } of members) this.navSceneRow(nav, project, scene, file);
    }

    // Start the next scene without leaving Write (#47): appended at the end of
    // the manuscript; a row's menu offers "New scene after this" for elsewhere.
    const add = nav.createEl("button", { cls: "inkswell-write__addscene", text: t("write.nav.newScene") });
    add.setAttribute("aria-label", t("write.nav.newSceneHint"));
    add.onclick = () => this.newSceneFromWrite(project);
  }

  /** Create a scene (optionally after `after`, inheriting its act/chapter) and open it here. */
  private newSceneFromWrite(project: Project, after?: { title: string; file: TFile }): void {
    // Keep the chapter run intact: a scene inserted mid-chapter belongs to it.
    // Only set keys are passed — an undefined key in the patch would clear a
    // value the scene template provides.
    const seed: Partial<SceneMeta> = {};
    if (after) {
      const { act, chapter } = readSceneMeta(this.app, after.file);
      if (act) seed.act = act;
      if (chapter) seed.chapter = chapter;
    }
    promptNewScene(this.app, this.store, this.plugin.settings, project, {
      afterTitle: after?.title,
      meta: seed,
      onCreated: (file) => {
        this.selectedScene = file.path;
        this.container?.removeClass("nav-open");
        this.rerender();
      },
    });
  }

  /** Collapsible chapter header in the navigator; `key` identifies the run. */
  private navGroupHead(
    nav: HTMLElement,
    project: Project,
    chapter: string,
    key: string,
    holdsSelection: boolean,
    /** Stream: the chapter's first scene on the page (null when filtered out). */
    firstShown?: () => string | null
  ): void {
    const collapsed = this.navCollapsed.has(key);
    const head = nav.createDiv({ cls: "inkswell-write__navhead" });
    const chev = head.createSpan({ cls: "inkswell-write__navchev" });
    setIcon(chev, collapsed ? "chevron-right" : "chevron-down");
    head.createSpan({ cls: "inkswell-write__navheadname", text: chapter });
    // Hint that the open scene is hidden inside this collapsed group.
    if (collapsed && holdsSelection) head.addClass("has-active");
    const toggle = (): void => {
      if (collapsed) this.navCollapsed.delete(key);
      else this.navCollapsed.add(key);
      // Rebuild just the list — no reason to touch the live editor.
      if (this.navEl) {
        this.navEl.empty();
        this.renderNavRows(this.navEl, project);
      }
    };
    const target = this.stream ? firstShown?.() ?? null : null;
    if (target) {
      // Stream: the name jumps there, the chevron still folds the list.
      head.setAttribute("aria-label", t("write.nav.jumpTo", { chapter }));
      chev.onclick = (e) => {
        e.stopPropagation();
        toggle();
      };
      head.onclick = () => this.stream?.scrollToScene(target);
    } else {
      head.onclick = toggle;
    }
  }

  private navSceneRow(
    nav: HTMLElement,
    project: Project,
    scene: Project["scenes"][number],
    file: TFile | null,
    /** Set when this row stands in for a whole one-scene chapter. */
    chapterLabel?: string
  ): void {
    const row = nav.createDiv({ cls: "inkswell-write__scene" });
    if (scene.path === this.selectedScene) row.addClass("is-active");
    if (scene.path) row.dataset.scenePath = scene.path;
    if (this.stream && scene.path === this.streamInView) row.addClass("is-inview");
    if (chapterLabel) {
      row.addClass("is-chapter-row");
      row.createSpan({ cls: "inkswell-write__scenechapter", text: chapterLabel });
    }
    row.createSpan({ cls: "inkswell-scene__title", text: scene.title });
    if (file) {
      const meta = readSceneMeta(this.app, file);
      if (meta.status) {
        row.createSpan({ cls: `inkswell-status inkswell-status--${meta.status}`, text: meta.status[0].toUpperCase() });
      }
      // Same scene context menu as Board/Beats/Home — right-click on desktop,
      // "⋯" on touch. Appended last so the menu button sits after the status.
      attachRowMenu(row, row, () => {
        const menu = new Menu();
        menu.addItem((i) =>
          i
            .setTitle(t("write.nav.newSceneAfter"))
            .setIcon("file-plus")
            .onClick(() => this.newSceneFromWrite(project, { title: scene.title, file }))
        );
        menu.addSeparator();
        addSceneMenuItems(menu, this.app, project, scene.title, file, {
          includeOpen: true,
          plugin: this.plugin,
          // Rename changes the file path; selectedScene is path-keyed, so re-pin
          // it to keep the editor on this scene (else we'd drop to the empty
          // state). The store-driven re-render then shows the new title.
          onRenamed: (newPath) => {
            if (this.selectedScene === scene.path) this.selectedScene = newPath;
          },
        });
        return menu;
      });
    }
    // Ctrl/Cmd- or middle-click: open in a regular tab and leave Write's
    // selection alone (the handler stops the event before onclick runs).
    openSceneOnModClick(row, this.app, scene.path);
    row.onclick = () => {
      if (!scene.path) return;
      if (this.stream) {
        this.streamGoTo(scene.path);
        return;
      }
      // Re-clicking the open scene must NOT rebuild the editor — the old
      // save-then-immediately-re-read path could show pre-save text and invert
      // the dirty check (retyping then blurring destroyed the original words).
      if (scene.path === this.selectedScene) {
        this.container?.removeClass("nav-open");
        return;
      }
      this.selectedScene = scene.path;
      // Close the phone drawer on selection (no-op when it's a static column).
      this.container?.removeClass("nav-open");
      this.rerender();
    };
  }

  private renderEditor(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__editor" });
    const file =
      this.selectedScene && this.app.vault.getAbstractFileByPath(this.selectedScene);
    // Invalidate any in-flight scene-load from a prior render before we branch.
    const token = ++this.editorToken;
    if (!(file instanceof TFile)) {
      this.currentFile = null;
      this.emptyState(wrap, t("write.editor.selectScene"));
      return;
    }
    this.currentFile = file;

    const head = wrap.createDiv({ cls: "inkswell-write__editorhead" });
    head.createSpan({ cls: "inkswell-write__editortitle", text: file.basename });

    // On phones the Inspector column is hidden, so surface the scene's metadata in
    // a collapsed disclosure above the editor (reusing the same Inspector renderer).
    if (isPhone()) {
      const details = wrap.createEl("details", { cls: "inkswell-write__scenemeta" });
      details.createEl("summary", { text: t("write.side.panel.scene") });
      this.inspector.render(details.createDiv(), file);
    }

    // Conflict banner slot — populated by the session's state callback whenever
    // the scene changed on disk under unsaved edits. Above the CM host so it
    // can't be missed; the in-place update() never touches it.
    this.bannerEl = wrap.createDiv({ cls: "inkswell-write__conflict" });

    // Await the OUTGOING session's flush, then load + build the editor seeded
    // with the body. Awaiting the flush first means the read below can never
    // return pre-save bytes (the old fire-and-forget save → immediate re-read
    // race showed stale text and inverted the dirty check). Seeding the initial
    // state (vs. dispatching after) keeps the undo history clean. The token
    // guards against a stale load landing after another scene switch.
    const host = wrap.createDiv({ cls: "inkswell-write__cm" });
    host.toggleClass("is-manuscript", this.editorPrefs().manuscript);
    this.cmHostEl = host;
    this.mountEditor(host, file, token, {
      onFailed: () => this.emptyState(wrap, t("write.editor.readFailed")),
    });
  }

  /**
   * Load `file` into a session and build the live editor in `host` — the one
   * write path for both single-scene Write and the stream's live scene. The
   * outgoing session's flush (`teardown`) is awaited first, and `token` drops
   * a load that a newer render or scene switch has overtaken.
   */
  private mountEditor(
    host: HTMLElement,
    file: TFile,
    token: number,
    opts: {
      /** Stream: arrow keys at the scene's edges move into its neighbours. */
      stream?: boolean;
      /** Where to put the caret once the editor is up (and focus it). */
      cursor?: number | "start" | "end" | null;
      onMounted?: () => void;
      onFailed?: () => void;
    } = {}
  ): void {
    const handoff = this.teardown;
    void (async () => {
      await handoff.catch(() => {});
      let session: SceneSession;
      try {
        session = await SceneSession.load({
          app: this.app,
          file,
          // Null once this session is no longer the panel's (or the editor is
          // gone): an orphaned session then acts only on its flush-time capture.
          getDoc: () =>
            this.session === session && this.editor
              ? this.editor.state.doc.toString()
              : null,
          onStateChange: () => this.renderConflictBanner(),
          onReloaded: (body) => {
            if (this.session !== session || !this.editor) return;
            // In-place reseed: the editor instance (scroll, focus) survives;
            // the reload becomes one undo step.
            this.editor.dispatch({
              changes: { from: 0, to: this.editor.state.doc.length, insert: body },
            });
            this.updateCount();
          },
        });
      } catch (e) {
        console.error("[Inkswell] Failed to load scene", e);
        if (token === this.editorToken) opts.onFailed?.();
        return;
      }
      if (token !== this.editorToken) {
        session.dispose();
        return;
      }
      this.session = session;
      // Every way a scene goes live (Scene, Stream, a fast-path swap) lands here.
      this.plugin.currentScene.set(session.file.path);
      // Back where the writer was in this scene, unless the caller placed the
      // cursor itself or a jump target (the revision log, Search) is about to scroll.
      let resumeFocus = false;
      const restore =
        opts.cursor == null && !this.pendingHighlight
          ? (docLength: number) => {
              const place = this.places.recall(file.path, docLength);
              if (!place) return null;
              resumeFocus = place.focus;
              // The stream's page keeps its own scroll anchor; the editor in it
              // doesn't scroll. Elsewhere: the exact spot, or the cursor's line
              // when the text changed since.
              const scrollTo = opts.stream
                ? undefined
                : place.scroll ?? EditorView.scrollIntoView(place.head, { y: "center" });
              return { anchor: place.anchor, head: place.head, scrollTo };
            }
          : undefined;
      this.editor = createSceneEditor({
        parent: host,
        doc: session.loadedBody,
        restore,
        onChange: () => this.onEditorChange(),
        onFocus: () => this.pushHotkeys(),
        onBlur: () => {
          this.popHotkeys();
          // The Insert dropdown suppresses this save while open (see openInsertMenu).
          if (!this.suppressBlurSave) void this.session?.save();
        },
        ...this.hooks(),
        // Read live so a Settings toggle applies to the next keystroke.
        getTypography: () => {
          const s = this.plugin.settings;
          return { dashes: s.smartDashes, quotes: s.smartQuotes, ellipsis: s.smartEllipsis };
        },
        getPrefs: () => this.editorPrefs(),
        getLinkCandidates: () => this.linkCandidates(),
        onBoundary: opts.stream ? (dir, x) => this.streamBoundary(dir, x) : undefined,
      });
      opts.onMounted?.();
      this.renderConflictBanner();
      this.updateCount();
      // Prime the tracker baseline for this scene so the first word typed in a
      // not-yet-seen file isn't lost to first-sight baselining.
      this.reportLiveCount();
      if (opts.cursor != null) this.placeCursor(opts.cursor);
      else if (resumeFocus) this.resumeFocus(this.editor);
      this.applyPendingHighlight(session.loadedBody);
    })();
  }

  /**
   * Give the keyboard back to a rebuilt editor so the writer can carry on
   * typing. Not on phones and tablets (focus raises the soft keyboard over the
   * page), and never out of a field the writer has since moved into.
   */
  private resumeFocus(view: EditorView): void {
    if (isMobileApp()) return;
    const ae = view.dom.doc.activeElement;
    if (ae?.instanceOf(HTMLElement) && ae !== view.dom.doc.body) {
      if (ae.isContentEditable || ae.instanceOf(HTMLInputElement) || ae.instanceOf(HTMLTextAreaElement)) return;
      if (ae.instanceOf(HTMLSelectElement)) return;
    }
    view.focus();
  }

  /** Put the live editor's caret at `cursor` and focus it. */
  private placeCursor(cursor: number | "start" | "end"): void {
    const view = this.editor;
    if (!view) return;
    const len = view.state.doc.length;
    const pos = cursor === "start" ? 0 : cursor === "end" ? len : Math.max(0, Math.min(cursor, len));
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    view.focus();
  }

  /** Show/refresh the conflict banner from the session's state. */
  private renderConflictBanner(): void {
    const banner = this.bannerEl;
    if (!banner || !banner.isConnected) return;
    banner.empty();
    const session = this.session;
    if (!session || session.state !== "conflict") {
      banner.removeClass("is-visible");
      return;
    }
    banner.addClass("is-visible");
    banner.createSpan({
      cls: "inkswell-write__conflicttext",
      text: t("write.conflict.text"),
    });
    const actions = banner.createDiv({ cls: "inkswell-write__conflictactions" });
    const loadDisk = actions.createEl("button", { text: t("write.conflict.loadDisk") });
    loadDisk.onclick = () =>
      void session
        .resolveReloadFromDisk()
        .then((backup) => {
          if (backup) new Notice(t("write.conflict.unsavedBackedUp", { path: backup }));
        })
        .catch(() => new Notice(t("write.conflict.resolveFailed")));
    const keepMine = actions.createEl("button", { cls: "mod-cta", text: t("write.conflict.keepMine") });
    keepMine.onclick = () =>
      void session
        .resolveKeepMine()
        .then((backup) => {
          if (backup) new Notice(t("write.conflict.diskBackedUp", { path: backup }));
        })
        .catch(() => new Notice(t("write.conflict.resolveFailed")));
    banner.createDiv({
      cls: "inkswell-stats__muted",
      text: t("write.conflict.note"),
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
    let from = hl.from;
    let to = hl.to;
    if (hl.verify != null) {
      // Search hit: the offsets are only trustworthy while the body is unchanged.
      // If the exact literal isn't still at [from,to), re-locate it (nearest
      // occurrence to the original offset); flashRange clamps if it's gone.
      if (body.slice(hl.from, hl.to) !== hl.verify) {
        const at = nearestIndexOf(body, hl.verify, hl.from);
        if (at !== -1) {
          from = at;
          to = at + hl.verify.length;
        }
      }
    } else {
      // Placeholder/Todos target: re-scan to confirm the exact token by offset.
      const match = scanPlaceholders(body, this.markers()).find((m) => m.from === hl.from);
      if (match) {
        from = match.from;
        to = match.to;
      }
    }
    flashRange(this.editor, from, to);
  }

  /**
   * What `[[` can complete to, in the order the popup prefers: codex entries
   * visible from the active project (their names, then each alias as its own
   * row), the project's other scenes, then every other markdown note. Read
   * when the popup opens, never cached — new entries and renames show up at
   * once.
   */
  private linkCandidates(): LinkCandidate[] {
    const s = this.plugin.settings;
    const projects = this.store.getProjects();
    const activePath = this.plugin.activeProject.get();
    const active = activePath ? this.store.getProject(activePath) ?? null : null;
    const entities = getCodexEntities(this.app);
    const ctx = active ? scopeContextForProject(active, projects) : null;
    const visible = ctx ? filterToScope(entities, ctx) : entities;
    const out: LinkCandidate[] = [];
    const seen = new Set<string>();
    for (const e of visible) {
      const detail = categoryDisplayName(e.category, s.customCategories, s.categoryOverrides);
      const pinned = isPinnedIn(e, ctx);
      out.push({ name: e.name, kind: "codex", detail, pinned });
      seen.add(e.name.toLowerCase());
      for (const alias of e.aliases) {
        if (alias.trim()) out.push({ name: e.name, kind: "codex", alias: alias.trim(), detail, pinned });
      }
    }
    const current = this.currentScenePath();
    for (const scene of active?.scenes ?? []) {
      if (!scene.path || scene.path === current) continue;
      const base = scene.path.slice(scene.path.lastIndexOf("/") + 1).replace(/\.md$/, "");
      if (seen.has(base.toLowerCase())) continue;
      out.push({ name: base, kind: "scene", detail: t("write.link.sceneDetail") });
      seen.add(base.toLowerCase());
    }
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path === current || seen.has(f.basename.toLowerCase())) continue;
      out.push({ name: f.basename, kind: "note" });
      seen.add(f.basename.toLowerCase());
    }
    return out;
  }

  /** Current Write-editor preferences from Settings. */
  private editorPrefs(): EditorPrefs {
    const s = this.plugin.settings;
    return {
      typewriter: s.typewriterMode,
      manuscript: s.manuscriptTypography,
      milestoneWords: s.milestoneWords,
    };
  }

  /**
   * Push changed editor preferences onto the LIVE editor (Settings toggles, the
   * typewriter command). No rebuild — undo history, scroll, and focus survive.
   */
  applyEditorPrefs(): void {
    const prefs = this.editorPrefs();
    this.cmHostEl?.toggleClass("is-manuscript", prefs.manuscript);
    if (this.editor) {
      setTypewriter(this.editor, prefs.typewriter, !!this.stream);
      refreshMilestones(this.editor);
      refreshMarkers(this.editor);
    }
    this.stream?.applyPrefs();
  }

  private updateCount(): void {
    if (!this.countEl) return;
    const parts: string[] = [];
    if (this.editor) parts.push(tp("common.words", countWords(this.editor.state.doc.toString())));
    // Mobile layouts have no status bar, so today's progress toward the daily
    // goal would otherwise only be visible in Track (#47).
    const goal = this.plugin.todayTarget();
    if (
      Platform.isMobile &&
      goal > 0 &&
      featureEnabled(this.plugin.settings.disabledFeatures, "tracking")
    ) {
      parts.push(t("write.count.today", { today: this.plugin.tracker.todayWords(), goal }));
    }
    this.countEl.setText(parts.join(" · "));
  }

  /** A live document edit: refresh the visible count, feed the live word count
   *  to the tracker, and (re)arm the session's autosave — typed text reaches
   *  disk within ~2s even if the editor is never blurred again. */
  private onEditorChange(): void {
    // A Split-scene edit relocated prose to another scene: move the baseline,
    // don't log the removal as deleted words (#54).
    if (this.movedEdit && this.editor && this.currentFile) {
      this.movedEdit = false;
      this.plugin.tracker.noteMovedContent(
        this.currentFile.path,
        (this.session?.loadedFrontmatter ?? "") + this.editor.state.doc.toString()
      );
      this.updateCount();
      this.session?.noteChange();
      return;
    }
    // Report first so the count's "today" figure includes this edit.
    this.reportLiveCount();
    this.updateCount();
    this.session?.noteChange();
  }

  /** Report the editor's current word count to the tracker for the active scene. */
  private reportLiveCount(): void {
    if (!this.editor || !this.currentFile) return;
    const body = this.editor.state.doc.toString();
    this.plugin.tracker.noteLiveContent(
      this.currentFile.path,
      (this.session?.loadedFrontmatter ?? "") + body
    );
  }

  private emptyState(parent: HTMLElement, text: string): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__empty" });
    renderEmptyState(wrap, text);
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
      },
      // The effective bank: shipped prompts minus hidden, plus the writer's own.
      writingPrompts(this.plugin.settings.listOverrides.prompts)
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
   * "Tell tomorrow-you what's next": a single rolling breadcrumb, shown at the top
   * of Write so re-entry is fast. Light-touch — empty by default. Stored in the
   * draft's index note (`inkswell.nextUp`) so it follows the vault between
   * devices (#47); a pre-1.19 device-local value shows until the first save.
   */
  private renderNextUp(container: HTMLElement, project: Project): void {
    const card = container.createDiv({ cls: "inkswell-write__nextup" });
    card.createSpan({ cls: "inkswell-stats__muted", text: t("write.nextUp.label") });
    const input = card.createEl("input", { type: "text", cls: "inkswell-write__nextupinput" });
    tagField(input, "write:next-up");
    input.value = project.inkswell?.nextUp ?? this.plugin.tracker.getNextUp();
    input.placeholder = t("write.nextUp.placeholder");
    input.onchange = () => void this.saveNextUp(project, input.value);
    // Fold the row into a toolbar button (the row stays in the page, hidden by
    // CSS, so folding never rebuilds the editor below it).
    const fold = card.createEl("button", { cls: "clickable-icon inkswell-write__nextupfold" });
    setIcon(fold, "chevron-up");
    fold.setAttribute("aria-label", t("write.nextUp.fold"));
    fold.onclick = () => this.setNextUpFolded(true);
  }

  private async saveNextUp(project: Project, text: string): Promise<void> {
    const index = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(index instanceof TFile)) return;
    this.plugin.selfWrites.mark(index.path);
    const result = await tryFileOp(
      () => updateNextUp(this.app, index, text),
      t("write.nextUp.saveFailed")
    );
    // Migrated: retire the legacy device-local copy.
    if (result !== null && this.plugin.tracker.getNextUp()) this.plugin.tracker.setNextUp("");
  }

  /**
   * Log a revision decision for the scene being written (the editor's menu,
   * Mod-Shift-L, the "Log a revision decision" command). Selected text
   * pre-fills the dialog, as it does from a regular note.
   */
  logDecision(): void {
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project) return;
    const scene =
      this.selectedScene != null
        ? this.store.findSceneByPath(this.selectedScene)?.scene.title ?? null
        : null;
    const sel = this.editor?.state.selection.main;
    const text = sel && !sel.empty ? this.editor?.state.sliceDoc(sel.from, sel.to) ?? "" : "";
    new RevisionModal(this.app, project, scene, text).open();
  }

  // --- Stream ----------------------------------------------------------------------

  /** Whether this device and the feature toggles allow the stream at all. */
  canStream(): boolean {
    return !isPhone() && featureEnabled(this.plugin.settings.disabledFeatures, "stream");
  }

  /** Whether the stream is what Write shows right now (for command availability). */
  isStreaming(): boolean {
    return !!this.stream;
  }

  private streamActive(): boolean {
    return this.writeMode === "stream" && this.canStream();
  }

  /** Switch between one scene at a time and the stream (command / topbar). */
  toggleStream(): void {
    this.setWriteMode(this.writeMode === "stream" ? "scene" : "stream");
  }

  private setWriteMode(mode: WriteMode): void {
    if (mode === this.writeMode) return;
    this.writeMode = mode;
    saveWriteMode(this.app.vault.getName(), mode);
    // The live scene carries over both ways: it's `selectedScene` either way.
    if (this.container?.isConnected) this.rerender();
  }

  /** The book's scenes with what the stream filters and groups by. Missing files are left out. */
  private streamRows(project: Project): StreamRow[] {
    const files = project.scenes.map((s) => {
      const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      return f instanceof TFile ? f : null;
    });
    const metas = files.map((f) => (f ? readSceneMeta(this.app, f) : null));
    // The navigator's chapter runs, so the stream groups exactly as it does.
    const { runs } = chapterRuns(
      project.scenes.map((s, i) => ({ title: s.title, chapter: metas[i]?.chapter })),
      project.inkswell?.chapters
    );
    const runAt = new Map<number, { id: string; title: string }>();
    for (const r of runs) for (const i of r.indices) runAt.set(i, { id: r.id, title: r.title });
    const rows: StreamRow[] = [];
    project.scenes.forEach((s, i) => {
      const m = metas[i];
      if (!s.path || !files[i] || !m) return;
      rows.push({
        path: s.path,
        title: s.title,
        run: runAt.get(i) ?? null,
        pov: m.pov,
        plotlines: m.plotlines,
        characters: m.characters,
        status: m.status,
      });
    });
    return rows;
  }

  private streamSpecs(shown: StreamRow[]): StreamSceneSpec[] {
    const o = this.plugin.settings.listOverrides["scene.status"];
    return shown.map((r, i) => ({
      path: r.path,
      title: r.title,
      // A chapter heading where a chapter starts on the page (also mid-chapter
      // when a filter left out its first scenes).
      chapterHead: r.run && shown[i - 1]?.run?.id !== r.run.id ? r.run.title : null,
      status: r.status ? { id: r.status, label: statusLabel(r.status as SceneStatus, o) } : null,
    }));
  }

  /** The stream column: its bar (jump, filter) over the page, with the live editor in place. */
  private renderStream(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "inkswell-write__editor inkswell-write__editor--stream" });
    this.streamBarEl = wrap.createDiv({ cls: "inkswell-stream__bar" });
    this.renderStreamBar(this.streamBarEl);
    const token = ++this.editorToken;
    const stream = new SceneStream(wrap, {
      app: this.app,
      markers: () => this.markers(),
      manuscript: () => this.editorPrefs().manuscript,
      onActivate: (path, pos) => this.activateStreamScene(path, pos),
      onInView: (path) => this.markInView(path),
    });
    this.stream = stream;

    // The live scene: the selected one; while that's still pending, the one
    // that was live before (the page doesn't move), else the first shown.
    const onPage = (p: string | null | undefined): p is string =>
      !!p && this.streamShown.some((r) => r.path === p);
    const livePath = onPage(this.selectedScene)
      ? this.selectedScene
      : onPage(this.streamAnchor?.live)
        ? this.streamAnchor?.live
        : this.streamShown[0]?.path;
    const f = livePath ? this.app.vault.getAbstractFileByPath(livePath) : null;
    if (this.streamShown.length === 0 || !(f instanceof TFile)) {
      this.currentFile = null;
      stream.showEmpty(
        this.streamFilter ? t("stream.empty.noMatch") : t("stream.empty.noScenes")
      );
      return;
    }
    stream.setScenes(this.streamSpecs(this.streamShown));
    this.currentFile = f;
    // Back where the page was when only the panel around it changed (a
    // trip to another destination, a settings change); else at the live scene.
    const a = this.streamAnchor;
    if (a && a.live === f.path && stream.has(a.path)) stream.scrollToScene(a.path, a.within);
    else stream.scrollToScene(f.path);
    this.mountStreamEditor(f, token, null);
  }

  /** Jump-to-chapter, the filter, and how many scenes are showing. */
  private renderStreamBar(bar: HTMLElement): void {
    bar.empty();
    const rows = this.streamRowsAll;
    const shown = this.streamShown;

    const stops = chapterStops(shown);
    if (stops.length > 1) {
      const jump = bar.createEl("select", { cls: "dropdown inkswell-stream__jump" });
      tagField(jump, "stream:jump");
      jump.setAttribute("aria-label", t("stream.jump.label"));
      jump.createEl("option", { text: t("write.chapter.jumpPlaceholder"), value: "" });
      for (const s of stops) jump.createEl("option", { text: s.title, value: s.path });
      jump.onchange = () => {
        const path = jump.value;
        jump.value = "";
        if (path) this.stream?.scrollToScene(path);
      };
    }

    const fields: { field: StreamField; labelKey: MessageKey }[] = [
      { field: "chapter", labelKey: "stream.filter.chapter" },
      { field: "pov", labelKey: "stream.filter.pov" },
      { field: "plotline", labelKey: "stream.filter.plotline" },
      { field: "character", labelKey: "stream.filter.character" },
      { field: "status", labelKey: "stream.filter.status" },
    ];
    const usable = fields.filter((f) => filterOptions(rows, f.field).length > 0);
    if (usable.length) {
      const field = bar.createEl("select", { cls: "dropdown" });
      tagField(field, "stream:field");
      field.setAttribute("aria-label", t("stream.filter.label"));
      field.createEl("option", { text: t("stream.filter.all"), value: "" });
      for (const f of usable) field.createEl("option", { text: t(f.labelKey), value: f.field });
      field.value = this.streamFilter?.field ?? "";
      field.onchange = () => {
        const chosen = usable.find((f) => f.field === field.value)?.field;
        const first = chosen ? filterOptions(rows, chosen)[0] : undefined;
        this.setStreamFilter(chosen && first ? { field: chosen, value: first.value } : null);
      };
    }
    const filter = this.streamFilter;
    if (filter) {
      const value = bar.createEl("select", { cls: "dropdown" });
      tagField(value, "stream:value");
      value.setAttribute("aria-label", t("stream.filter.value"));
      const o = this.plugin.settings.listOverrides["scene.status"];
      for (const opt of filterOptions(rows, filter.field)) {
        const label = filter.field === "status" ? statusLabel(opt.value as SceneStatus, o) : opt.label;
        value.createEl("option", { text: label, value: opt.value });
      }
      value.value = filter.value;
      value.onchange = () => this.setStreamFilter({ field: filter.field, value: value.value });
    }

    bar.createSpan({
      cls: "inkswell-stream__count",
      text: filter
        ? t("stream.count.filtered", { shown: formatNumber(shown.length), total: formatNumber(rows.length) })
        : tp("common.scenes", rows.length),
    });
  }

  private setStreamFilter(filter: StreamFilter | null): void {
    this.streamFilter = filter;
    this.streamAnchor = null; // a different page: start at the live scene
    this.rerender();
  }

  /** Build the live editor inside `file`'s scene on the page. */
  private mountStreamEditor(file: TFile, token: number, cursor: number | "start" | "end" | null): void {
    const slot = this.stream?.openLive(file.path);
    if (!slot) return;
    this.bannerEl = slot.banner;
    this.cmHostEl = slot.host;
    this.mountEditor(slot.host, file, token, {
      stream: true,
      cursor,
      onMounted: () => this.stream?.liveReady(file.path),
      onFailed: () => {
        this.stream?.cancelLive(file.path);
        new Notice(t("stream.readFailed", { name: file.basename }));
      },
    });
  }

  /**
   * Move the live editor to `path` (a click in its text, its title, an arrow
   * key across a scene edge, the navigator). The outgoing scene becomes a
   * reader of the editor's final text before the editor goes, and its save
   * runs exactly as a scene switch does in single-scene Write.
   */
  private activateStreamScene(path: string, cursor: number | "start" | "end" | null): void {
    const stream = this.stream;
    if (!stream?.has(path)) return;
    if (this.currentFile?.path === path) {
      if (cursor != null) this.placeCursor(cursor);
      return;
    }
    // A conflict waits for the writer to pick a version in its banner. Moving
    // on would file the editor's text under "Inkswell conflicts" and leave a
    // reader showing it in place of the file's.
    if (this.session?.state === "conflict") {
      new Notice(
        t("stream.conflictFirst", { name: this.currentFile?.basename ?? t("stream.thisScene") })
      );
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const text = this.editor ? this.editor.state.doc.toString() : null;
    this.teardown = stream.retireLive(this.currentFile?.path ?? null, text, () => this.detachSession());
    this.selectedScene = path;
    this.currentFile = file;
    this.mountStreamEditor(file, ++this.editorToken, cursor);
    // The panels around the page follow the live scene.
    const project = this.store.getProject(this.lastProject ?? "");
    if (this.container) {
      preserveUi(this.container, () => {
        this.renderTopbar();
        if (this.navEl && project) {
          this.navEl.empty();
          this.renderNavRows(this.navEl, project);
        }
        this.renderRightColumn();
      });
    }
  }

  /** Navigator click in the stream: scroll there and make it the live scene. */
  private streamGoTo(path: string): void {
    this.container?.removeClass("nav-open");
    if (!this.stream?.has(path)) {
      // Filtered out: show the whole book again, at that scene.
      this.streamFilter = null;
      this.streamAnchor = null;
      this.selectedScene = path;
      this.rerender();
      return;
    }
    this.stream.scrollToScene(path);
    this.activateStreamScene(path, "start");
  }

  /** An arrow key ran off the live scene's edge: continue in the neighbour. */
  private streamBoundary(dir: "prev" | "next", x: number | null): boolean {
    const stream = this.stream;
    const cur = this.currentFile?.path;
    if (!stream || !cur) return false;
    const target = neighbour(this.streamShown, cur, dir === "next" ? 1 : -1);
    if (!target) return false;
    const pos = x === null ? null : stream.edgePos(target, x, dir === "next" ? "first" : "last");
    this.activateStreamScene(target, pos ?? (dir === "next" ? "start" : "end"));
    return true;
  }

  /** The navigator marks the scene at the top of the page. */
  private markInView(path: string | null): void {
    this.streamInView = path;
    this.navEl?.querySelectorAll<HTMLElement>(".inkswell-write__scene").forEach((el) => {
      el.toggleClass("is-inview", !!path && el.dataset.scenePath === path);
    });
  }

  /** Scroll the stream to the next / previous chapter start (commands). */
  jumpChapter(dir: 1 | -1): void {
    // Where the page is now (measured, not the observer's last report).
    const from = this.stream?.anchor()?.path ?? this.currentFile?.path;
    if (!this.stream || !from) return;
    const target = chapterStep(this.streamShown, from, dir);
    if (target) this.stream.scrollToScene(target);
    else new Notice(dir === 1 ? t("stream.chapter.last") : t("stream.chapter.first"));
  }

  /** Pick a chapter to scroll the stream to (command). */
  promptJumpToChapter(): void {
    const stops = chapterStops(this.streamShown);
    if (!this.stream || stops.length === 0) {
      new Notice(t("stream.chapter.none"));
      return;
    }
    new ChapterPickerModal(this.app, stops, (s) => this.stream?.scrollToScene(s.path)).open();
  }

  /**
   * Absorb a store refresh with the stream showing: the page reconciles its
   * scenes in place (the live editor and every drawn scene survive), and the
   * panels around it re-render. Returns false — full rebuild — when the
   * project changed or the live scene left the page (renamed, removed,
   * filtered out).
   */
  private updateStream(): boolean {
    const stream = this.stream;
    if (!stream || !this.container || !this.streamActive()) return false;
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project || project.vaultPath !== this.lastProject) return false;
    const rows = this.streamRows(project);
    const shown = applyFilter(rows, this.streamFilter);
    const live = this.currentFile?.path ?? null;
    if (!live || !shown.some((r) => r.path === live)) return false;
    this.streamRowsAll = rows;
    this.streamShown = shown;
    stream.setScenes(this.streamSpecs(shown));
    preserveUi(this.container, () => {
      this.renderTopbar();
      if (this.navEl) {
        this.navEl.empty();
        this.renderNavRows(this.navEl, project);
      }
      if (this.inspectorHost) this.renderRightColumn();
      if (this.streamBarEl) this.renderStreamBar(this.streamBarEl);
    });
    // Another panel asked for a scene (Search, the revision log): move the editor there.
    const wanted = this.selectedScene;
    if (wanted && wanted !== live && stream.has(wanted)) {
      stream.scrollToScene(wanted);
      this.activateStreamScene(wanted, null);
    } else if (this.pendingHighlight && this.editor) {
      this.applyPendingHighlight(this.editor.state.doc.toString());
    }
    return true;
  }

  /** Tear the page down (its readers; the live editor goes with detachSession),
   *  remembering where it was. */
  private destroyStream(): void {
    if (!this.stream) return;
    const a = this.stream.anchor();
    this.streamAnchor = a ? { ...a, live: this.currentFile?.path ?? null } : null;
    this.stream.destroy();
    this.stream = null;
    this.streamBarEl = null;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  /** Tear down, AWAITING the final save — the host awaits this in onClose, and
   *  the plugin's quit-time flush awaits it so an in-flight write isn't cut off. */
  async dispose(): Promise<void> {
    const flushed = this.detachSession();
    this.destroyStream();
    for (const p of this.rightPanels) p.dispose?.();
    this.hoverPopover = null;
    this.unsub?.();
    this.unsub = null;
    if (this.modifyRef) {
      this.app.vault.offref(this.modifyRef);
      this.modifyRef = null;
    }
    await flushed;
  }
}
