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

import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { runCompile } from "./src/compile/engine";
import { initLocale } from "./src/i18n/detect";
import { t, tp } from "./src/i18n";
import { Series, normalizeSeriesOrder } from "./src/series/series";
import { setSeriesArchived, setStoryArchived } from "./src/projects/archive-actions";
import { resolveCompileConfig } from "./src/compile/config";
import { TargetModal } from "./src/goals/target-modal";
import { Idea, newIdeaId } from "./src/ideation/types";
import { baseDraftFor } from "./src/projects/stories";
import { backupPluginData, keepDataCopy, listBackups } from "./src/lib/data-backup";
import { StoredData, isPlainObject, isUsableData } from "./src/lib/stored-data";
import { RestoreSettingsModal } from "./src/settings/restore-settings-modal";
import { MarkKind } from "./src/lib/inline-format";
import { PHONE_BODY_CLASS, isPhone, setForceTabletLayout } from "./src/lib/platform";
import { countWords } from "./src/lib/wordcount";
import { markerSet } from "./src/lib/placeholders";
import { openScene, promptText } from "./src/scenes/scene-actions";
import { tryFileOp } from "./src/lib/notify";
import { joinPath, sanitizeSegment } from "./src/settings/folders";
import { ActiveProject, resolveActive } from "./src/projects/active-project";
import { NewProjectModal, NewProjectPreset } from "./src/projects/new-project-modal";
import { seriesForPicker } from "./src/series/series-modal";
import { executeProjectRename } from "./src/projects/rename-project";
import { RenameProjectModal } from "./src/views/rename-project-modal";
import { groupIntoStories, storyArchived, storyDrafts } from "./src/projects/stories";
import { ProjectStats } from "./src/projects/project-stats";
import { ProjectStore } from "./src/projects/project-store";
import { SelfWriteRegistry } from "./src/lib/self-write";
import { Project, isMultiScene } from "./src/projects/types";
import { promptNewScene } from "./src/outliner/create-scene";
import { sortProjectByChapter } from "./src/outliner/sort-actions";
import { RevisionModal } from "./src/revisions/revision-modal";
import { FeatureId, featureEnabled } from "./src/features";
import { getCodexEntities } from "./src/codex/codex-store";
import {
  builtinCategories,
  normalizeCategoryOverrides,
  normalizeCustomCategories,
} from "./src/codex/types";
import { normalizeCustomBeatTemplates } from "./src/outliner/custom-templates";
import {
  DEFAULT_SETTINGS,
  InkswellSettings,
  InkswellSettingTab,
  normalizeInterfaceLanguage,
} from "./src/settings/settings";
import { normalizeListOverrides } from "./src/settings/overridable-lists";
import { ChallengeModal } from "./src/goals/challenge-modal";
import { StoryBibleModal } from "./src/plan/story-bible-modal";
import { isDefaultRailLayout, resolveRailLayout } from "./src/views/nav-model";
import {
  ChallengeProgress,
  challengeProgress,
  normalizeChallenge,
  todayTarget,
  windowKeys,
} from "./src/goals/challenge";
import { WelcomeModal } from "./src/help/welcome-modal";
import { SprintController } from "./src/sprints/sprint-controller";
import { SprintModal } from "./src/sprints/sprint-modal";
import { buildClassifierIndex, classifyPath } from "./src/tracking/classify";
import { deviceIdentity } from "./src/tracking/device";
import { LOG_KEY } from "./src/tracking/device-log";
import { LogSync } from "./src/tracking/log-sync";
import {
  WordCategory,
  WritingLogData,
  dateKey,
  emptyLog,
  projectedDayWords,
} from "./src/tracking/types";
import { WritingTracker } from "./src/tracking/writing-tracker";
import { StatusBar } from "./src/views/status-bar";
import { CodexLookupModal } from "./src/codex/lookup-modal";
import { Peek, entitiesForScene } from "./src/codex/peek";
import { CodexCompanionView } from "./src/companions/codex-companion";
import { CompanionView } from "./src/companions/companion-view";
import { CompanionPickerModal, openCompanion } from "./src/companions/open";
import { PlanCompanionView } from "./src/companions/plan-companion";
import { COMPANIONS, CompanionId } from "./src/companions/registry";
import { ScenesCompanionView } from "./src/companions/scenes-companion";
import { TodosCompanionView } from "./src/companions/todos-companion";
import { TrackCompanionView } from "./src/companions/track-companion";
import { CurrentScene } from "./src/scenes/current-scene";
import { SIDE_PANELS } from "./src/views/right-panel";
import type { SceneHighlight } from "./src/views/write-panel";
import {
  InkswellMode,
  InkswellView,
  VIEW_TYPE_INKSWELL,
} from "./src/views/inkswell-view";

/** Settings that describe this device, not the vault — kept on external sync. */
const DEVICE_LOCAL_SETTINGS = ["forceTabletLayout", "codexCountMigrated", "cjkCountMigrated"] as const;

/** Defaults merged with stored settings, shapes validated. data.json is
 *  hand-editable and synced, so nothing in it is trusted as-is. */
function readSettings(stored: Partial<InkswellSettings> | undefined): InkswellSettings {
  const settings: InkswellSettings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
  // Drop malformed/colliding custom codex types and beat templates before
  // anything renders them.
  settings.categoryOverrides = normalizeCategoryOverrides(settings.categoryOverrides);
  settings.customCategories = normalizeCustomCategories(
    settings.customCategories,
    builtinCategories(settings.categoryOverrides)
  );
  settings.customBeatTemplates = normalizeCustomBeatTemplates(settings.customBeatTemplates);
  settings.listOverrides = normalizeListOverrides(settings.listOverrides);
  settings.challenge = normalizeChallenge(settings.challenge);
  if (settings.railLayout) {
    const rail = resolveRailLayout(settings.railLayout);
    settings.railLayout = isDefaultRailLayout(rail) ? null : rail;
  }
  settings.seriesOrder = normalizeSeriesOrder(settings.seriesOrder);
  settings.authorName = typeof settings.authorName === "string" ? settings.authorName : "";
  settings.authorContact = typeof settings.authorContact === "string" ? settings.authorContact : "";
  if (!["md", "html", "docx", "pandoc"].includes(settings.defaultCompileFormat)) {
    settings.defaultCompileFormat = "md";
  }
  if (settings.companionSceneTarget !== "tab") settings.companionSceneTarget = "write";
  settings.interfaceLanguage = normalizeInterfaceLanguage(settings.interfaceLanguage);
  return settings;
}

export default class InkswellPlugin extends Plugin {
  settings: InkswellSettings = DEFAULT_SETTINGS;
  writingLog: WritingLogData = emptyLog();
  ideas: Idea[] = [];
  activeProject: ActiveProject = new ActiveProject();
  /** The scene being written (Write, or a scene open in a normal tab); the
   *  sidebar companions follow it. */
  currentScene: CurrentScene = new CurrentScene();
  /** The one Codex peek (Ctrl/Cmd-hover in Write, chips, Look up in Codex). */
  peek!: Peek;
  /** Paths the plugin's own inline forms just wrote — lets the view soften the
   *  store notify those writes produce instead of rebuilding the focused field. */
  selfWrites: SelfWriteRegistry = new SelfWriteRegistry();
  /** Type the last Quick Codex entry was created as — the next dialog defaults
   *  to it. Session-only on purpose (not worth a settings key). */
  lastQuickCodexType: string | null = null;
  store!: ProjectStore;
  stats!: ProjectStats;
  tracker!: WritingTracker;
  sprints!: SprintController;
  logSync!: LogSync;
  private statusBar: StatusBar | null = null;

  async onload(): Promise<void> {
    // UI language first: everything that renders text reads it (Obsidian
    // restarts on its own language change). Resolved again once settings load,
    // in case the writer picked a language in Settings → Interface language.
    initLocale();
    await this.loadPersisted();
    if (this.settings.interfaceLanguage !== "auto") initLocale(this.settings.interfaceLanguage);
    // Phone layout keys on our own body class (not Obsidian's is-phone) so the
    // "use the full layout" override can flip it. Must not outlive the plugin.
    this.applyFormFactor();
    this.register(() => document.body.removeClass(PHONE_BODY_CLASS));
    // Daily rolling backup of data.json (settings, writing log, sprints,
    // ideas) — File Recovery never sees files outside the vault, so this is
    // that data's only safety net. Runs right after load so it captures the
    // pre-session state, before anything this session writes.
    if (this.manifest.dir) void backupPluginData(this.app, this.manifest.dir);

    this.store = new ProjectStore(this.app);
    this.stats = new ProjectStats(this.app);

    // Word-attribution classifier: prebuilt path index (refreshed on every
    // project-list change) + a per-call codex frontmatter check. Codex
    // membership is the `codex:` key, never a folder.
    let classifierIndex = buildClassifierIndex([]);
    const classify = (path: string): WordCategory | null => {
      const file = this.app.vault.getAbstractFileByPath(path);
      const fm =
        file instanceof TFile
          ? this.app.metadataCache.getFileCache(file)?.frontmatter
          : undefined;
      // A device's writing-log note is machine-written churn — never words.
      if (typeof fm?.[LOG_KEY] === "string") return null;
      const codexKey: unknown = fm?.["codex"];
      const isCodex = typeof codexKey === "string" && codexKey.trim() !== "";
      return classifyPath(path, classifierIndex, isCodex);
    };

    this.tracker = new WritingTracker(
      this.app,
      this.writingLog,
      () => void this.persist(),
      classify,
      () => new Set(this.settings.excludedFromGoals)
    );
    this.sprints = new SprintController(this.tracker, this.writingLog, () =>
      void this.persist()
    );
    // Cross-device history (opt-in): mirrors this device's log to a vault note
    // and merges the other devices' notes into the tracker's read view.
    this.logSync = new LogSync({
      app: this.app,
      identity: deviceIdentity(this.app.vault.getName()),
      log: this.writingLog,
      tracker: this.tracker,
      folder: () => joinPath(this.settings.baseFolder, "Writing log"),
      markSelfWrite: (p) => this.selfWrites.mark(p),
    });
    this.addChild(this.store);
    this.addChild(this.tracker);
    this.addChild(this.sprints);
    this.addChild(this.logSync);

    // Fires immediately and on every fingerprint change (scene add/rename,
    // project create, planning-pointer / compile-config edits via index mtime).
    // After each rebuild, warm baselines for in-scope files that never got one
    // — otherwise the first tracked edit of a pre-existing note is swallowed
    // as its baseline and those words never count. Warm-up only reads files
    // WITHOUT a baseline, so steady-state passes are free.
    this.register(
      this.store.subscribe((projects) => {
        classifierIndex = buildClassifierIndex(projects);
        void this.tracker.warmBaselines([
          ...classifierIndex.scenePaths,
          ...classifierIndex.planningPaths,
          ...classifierIndex.indexPaths,
        ]);
      })
    );

    // Persist the active project whenever it changes (survives restart).
    this.register(this.activeProject.subscribe(() => void this.persist()));

    // Quit-time flush: Obsidian awaits these tasks before the window closes, so
    // the Write editor's unsaved prose, an in-flight sprint, the tracker's
    // debounced log save, and the data.json chain all land instead of being
    // abandoned mid-write. (View onClose isn't reliably awaited on quit.)
    this.registerEvent(
      this.app.workspace.on("quit", (tasks) => {
        tasks.add(() => this.flushAllPending());
      })
    );

    this.registerView(
      VIEW_TYPE_INKSWELL,
      (leaf) => new InkswellView(leaf, this, this.store, this.stats, this.tracker)
    );
    // Wikilinks in the Write editor emit `hover-link` so the Page Preview core
    // plugin can show its popover (Mod-hover by default, like source mode).
    this.registerHoverLinkSource("inkswell-write", {
      display: t("app.hoverSource"),
      defaultMod: true,
    });

    // Sidebar companions: one view type each, read-only views beside your
    // writing (never a scene editor — AGENTS.md "Single host view").
    this.peek = new Peek(this.app, this);
    this.register(() => this.peek.close());
    const companionViews: Record<CompanionId, (leaf: WorkspaceLeaf) => CompanionView> = {
      codex: (leaf) => new CodexCompanionView(leaf, this),
      plan: (leaf) => new PlanCompanionView(leaf, this),
      scenes: (leaf) => new ScenesCompanionView(leaf, this),
      track: (leaf) => new TrackCompanionView(leaf, this),
      todos: (leaf) => new TodosCompanionView(leaf, this),
    };
    for (const def of COMPANIONS) this.registerView(def.viewType, companionViews[def.id]);

    this.addRibbonIcon("pen-tool", t("app.ribbon"), () => this.openProjects());

    // Status bar: today's words / sprint countdown; click → stats.
    const statusEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(
      statusEl,
      this.tracker,
      this.sprints,
      () => this.settings.dailyWordGoal,
      () => void this.openStats(),
      () => featureEnabled(this.settings.disabledFeatures, "tracking"),
      () => this.challengeProgress()
    );
    this.register(() => this.statusBar?.destroy());

    this.registerCommands();
    this.addSettingTab(new InkswellSettingTab(this.app, this));

    // One-time welcome, once the workspace is ready (so the modal isn't fighting
    // Obsidian's own startup UI). The modal sets `welcomeSeen` on close.
    this.app.workspace.onLayoutReady(() => {
      this.trackCurrentScene();
      // The metadata cache is populated by now — safe to discover log notes.
      this.logSync.setEnabled(this.settings.syncWritingHistory);

      if (this.recoveredFrom) {
        const { date, kept } = this.recoveredFrom;
        new Notice(
          kept
            ? t("app.recoveredKept", { date, file: kept.split("/").pop() ?? kept })
            : t("app.recovered", { date }),
          0
        );
      }

      if (!this.settings.welcomeSeen) new WelcomeModal(this.app, this).open();

      // Codex counting includes frontmatter (profile prose). One-time: rebuild
      // codex baselines computed under the old body-only rule, then warm any
      // codex notes that never got a baseline (both cache-read only).
      const codexPaths = () =>
        getCodexEntities(this.app).map((e) => e.path);
      if (!this.settings.codexCountMigrated) {
        this.settings.codexCountMigrated = true;
        void this.tracker
          .rebaseline(codexPaths())
          .then(() => this.persist());
      }
      void this.tracker.warmBaselines(codexPaths());

      // Counting became CJK-aware (each Han/kana/Hangul grapheme = one word).
      // One-time: rebuild ALL baselines under the new rule so a CJK note's
      // next edit doesn't emit a phantom whole-file delta. English baselines
      // recompute to the same value. History is left as-is (old text is gone).
      if (!this.settings.cjkCountMigrated) {
        this.settings.cjkCountMigrated = true;
        void this.tracker
          .rebaseline(Object.keys(this.writingLog.baselines))
          .then(() => this.persist());
      }

      // One-time upgrade notice: goals stopped counting non-project notes.
      // Only shown to installs with existing history — fresh installs just get
      // the new behavior. The flag is set either way so this never re-checks.
      if (!this.settings.categoryNoticeSeen) {
        if (Object.keys(this.writingLog.daily).length > 0) {
          new Notice(t("app.categoryNotice"), 10000);
        }
        this.settings.categoryNoticeSeen = true;
        void this.persist();
      }
    });
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open-explorer",
      name: t("app.command.openProjects"),
      callback: () => this.openProjects(),
    });
    this.addCommand({
      id: "new-project",
      name: t("app.command.newProject"),
      callback: () => this.newProject(),
    });
    this.addCommand({
      id: "rename-project",
      name: t("app.command.renameProject"),
      checkCallback: (checking) => {
        const project = resolveActive(this.store.getProjects(), this.activeProject.get());
        if (!project) return false;
        if (!checking) this.renameProject(project);
        return true;
      },
    });
    // Two commands, not one toggle: a command's name can't change, so each says
    // exactly what it does. Both act on the EXPLICIT selection only — never the
    // resolveActive fallback, which would archive whatever happens to be first.
    this.addCommand({
      id: "archive-project",
      name: t("app.command.archiveProject"),
      checkCallback: (checking) => {
        const project = this.store.getProject(this.activeProject.get() ?? "");
        if (!project || storyArchived(this.store.getProjects(), project)) return false;
        if (!checking) void this.archiveProject(project, true);
        return true;
      },
    });
    this.addCommand({
      id: "unarchive-project",
      name: t("app.command.unarchiveProject"),
      checkCallback: (checking) => {
        const project = this.store.getProject(this.activeProject.get() ?? "");
        if (!project || !storyArchived(this.store.getProjects(), project)) return false;
        if (!checking) void this.archiveProject(project, false);
        return true;
      },
    });
    this.addCommand({
      id: "set-up-writing-challenge",
      name: t("app.command.setUpChallenge"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "tracking", () => this.openChallengeModal()),
    });
    this.addCommand({
      id: "export-story-bible",
      name: t("app.command.exportStoryBible"),
      checkCallback: (checking) => {
        const project = resolveActive(this.store.getProjects(), this.activeProject.get());
        if (!project) return false;
        if (!checking) this.openStoryBible(project);
        return true;
      },
    });
    this.addCommand({
      id: "new-scene",
      name: t("app.command.newScene"),
      checkCallback: (checking) => {
        const project = resolveActive(this.store.getProjects(), this.activeProject.get());
        if (!project || !isMultiScene(project.draft)) return false;
        if (!checking) {
          promptNewScene(this.app, this.store, this.settings, project, {
            onCreated: (file) => this.openSceneInWrite(file.path),
          });
        }
        return true;
      },
    });
    this.addCommand({
      id: "sort-scenes-by-chapter",
      name: t("app.command.sortByChapter"),
      checkCallback: (checking) => {
        const project = resolveActive(this.store.getProjects(), this.activeProject.get());
        if (!project || !isMultiScene(project.draft)) return false;
        if (!checking) void sortProjectByChapter(this.app, this, project);
        return true;
      },
    });
    this.addCommand({
      id: "open-beats",
      name: t("app.command.openBeats"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "beats", () => void this.openBeats()),
    });
    this.addCommand({
      id: "open-board",
      name: t("app.command.openBoard"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "board", () => void this.openBoard()),
    });
    this.addCommand({
      id: "open-plot-grid",
      name: t("app.command.openPlotGrid"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "plot-grid", () => void this.openPlotGrid()),
    });
    this.addCommand({
      id: "open-codex",
      name: t("app.command.openCodex"),
      callback: () => this.openCodex(),
    });
    this.addCommand({
      id: "open-write",
      name: t("app.command.openWrite"),
      callback: () => this.openWrite(),
    });
    this.addCommand({
      id: "open-stats",
      name: t("app.command.openStats"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "tracking", () => void this.openStats()),
    });
    this.addCommand({
      id: "open-compile",
      name: t("app.command.openCompile"),
      callback: () => this.openCompile(),
    });
    this.addCommand({
      id: "compile-active-project",
      name: t("app.command.compileActive"),
      callback: () => void this.compileActiveProject(),
    });
    this.addCommand({
      id: "search-scenes",
      name: t("app.command.searchScenes"),
      callback: () => this.openSearch(),
    });
    // Sidebar companions + the Codex peek.
    this.addCommand({
      id: "open-companion",
      name: t("companion.command.pick"),
      callback: () => new CompanionPickerModal(this.app, this).open(),
    });
    for (const def of COMPANIONS) {
      this.addCommand({
        id: `open-companion-${def.id}`,
        name: t("companion.command.open", { name: t(def.labelKey) }),
        checkCallback: (checking) => {
          if (def.feature && !featureEnabled(this.settings.disabledFeatures, def.feature)) return false;
          if (!checking) void this.openCompanion(def.id);
          return true;
        },
      });
    }
    this.addCommand({
      id: "look-up-in-codex",
      name: t("peek.lookUp"),
      callback: () => this.lookUpInCodex(),
    });
    // Write's side column: hide/show it, or bring one panel up beside the
    // editor (also opens Write). No default hotkeys, per house rule.
    this.addCommand({
      id: "toggle-write-side-panel",
      name: t("write.side.command.toggle"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canToggleSidePanel()) return false;
        if (!checking) view.toggleSidePanel();
        return true;
      },
    });
    const layoutCommands: { id: string; name: string; run: (v: InkswellView) => void }[] = [
      { id: "toggle-write-scene-list", name: t("write.nav.command"), run: (v) => v.toggleSceneList() },
      { id: "toggle-write-focus", name: t("write.focus.command"), run: (v) => v.toggleFocus() },
    ];
    for (const { id, name, run } of layoutCommands) {
      this.addCommand({
        id,
        name,
        checkCallback: (checking) => {
          const view = this.inkswellView();
          if (!view || !view.isWriting()) return false;
          if (!checking) run(view);
          return true;
        },
      });
    }
    for (const panel of SIDE_PANELS) {
      this.addCommand({
        id: `write-side-panel-${panel.id}`,
        name: t("write.side.command.show", { name: t(panel.nameKey) }),
        checkCallback: (checking) => {
          if (isPhone()) return false; // no side column on phones
          if (checking) return true;
          // Already in Inkswell: act in place, so the editor keeps the caret.
          // Otherwise open (or reveal) Inkswell on Write first.
          const view = this.app.workspace.getActiveViewOfType(InkswellView);
          if (view) view.showSidePanel(panel.id);
          else void this.openInkswell("write", (v) => v.showSidePanel(panel.id));
          return true;
        },
      });
    }
    this.addCommand({
      id: "insert-todo",
      name: t("app.command.insertTodo"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canInsertTodo()) return false;
        if (!checking) view.insertTodo();
        return true;
      },
    });
    // Formatting toggles for Inkswell's own Write editor. Obsidian's
    // editor:toggle-bold/italic need a MarkdownView and never reach it; Mod-b /
    // Mod-i are bound inside the editor, and these commands exist so the actions
    // are in the palette and rebindable under Settings → Hotkeys (no defaults —
    // they'd collide with the core editor's).
    const formatCommands: { id: string; name: string; kind: MarkKind }[] = [
      { id: "toggle-bold", name: t("app.command.toggleBold"), kind: "bold" },
      { id: "toggle-italic", name: t("app.command.toggleItalic"), kind: "italic" },
      { id: "toggle-strikethrough", name: t("app.command.toggleStrikethrough"), kind: "strike" },
    ];
    for (const { id, name, kind } of formatCommands) {
      this.addCommand({
        id,
        name,
        checkCallback: (checking) => {
          const view = this.inkswellView();
          if (!view || !view.canFormat()) return false;
          if (!checking) view.format(kind);
          return true;
        },
      });
    }
    this.addCommand({
      id: "split-scene",
      name: t("app.command.splitScene"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canFormat()) return false;
        if (!checking) view.splitScene("cursor");
        return true;
      },
    });
    // Write → Stream: the toggle (also opens Write), and chapter jumps while it's showing.
    this.addCommand({
      id: "toggle-scene-stream",
      name: t("app.command.toggleStream"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canToggleStream()) return false;
        if (!checking) view.toggleStream();
        return true;
      },
    });
    const chapterCommands: { id: string; name: string; run: (v: InkswellView) => void }[] = [
      { id: "stream-jump-to-chapter", name: t("app.command.jumpToChapter"), run: (v) => v.promptJumpToChapter() },
      { id: "stream-next-chapter", name: t("app.command.nextChapter"), run: (v) => v.jumpChapter(1) },
      { id: "stream-previous-chapter", name: t("app.command.previousChapter"), run: (v) => v.jumpChapter(-1) },
    ];
    for (const { id, name, run } of chapterCommands) {
      this.addCommand({
        id,
        name,
        checkCallback: (checking) => {
          const view = this.inkswellView();
          if (!view || !view.isStreaming()) return false;
          if (!checking) run(view);
          return true;
        },
      });
    }
    this.addCommand({
      id: "move-selection-to-new-scene",
      name: t("app.command.moveSelection"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canFormat()) return false;
        if (!checking) view.splitScene("selection");
        return true;
      },
    });
    this.addCommand({
      id: "quick-codex",
      name: t("app.command.quickCodex"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canFormat()) return false;
        if (!checking) view.quickCodex();
        return true;
      },
    });
    this.addCommand({
      id: "open-link-at-cursor",
      name: t("app.command.openLink"),
      checkCallback: (checking) => {
        const view = this.inkswellView();
        if (!view || !view.canFormat()) return false;
        if (!checking) view.openLinkAtCursor();
        return true;
      },
    });
    // Flips the persisted setting (so it's meaningful without an open editor)
    // and pushes it onto a live editor. No default hotkey, per house rule.
    this.addCommand({
      id: "toggle-typewriter",
      name: t("app.command.toggleTypewriter"),
      callback: () => {
        this.settings.typewriterMode = !this.settings.typewriterMode;
        void this.saveSettings();
        this.applyEditorPrefs();
        new Notice(this.settings.typewriterMode ? t("app.typewriterOn") : t("app.typewriterOff"));
      },
    });
    // Sprints belong to the "tracking" feature: hidden with it. End/cancel stay
    // reachable while a sprint is actually running so one can't get stranded.
    this.addCommand({
      id: "start-sprint",
      name: t("app.command.startSprint"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "tracking", () => this.startSprint()),
    });
    this.addCommand({
      id: "end-sprint",
      name: t("app.command.endSprint"),
      checkCallback: (checking) => {
        if (!this.sprints.isActive()) return false;
        if (!checking) this.sprints.finish();
        return true;
      },
    });
    this.addCommand({
      id: "cancel-sprint",
      name: t("app.command.cancelSprint"),
      checkCallback: (checking) => {
        if (!this.sprints.isActive()) return false;
        if (!checking) this.sprints.cancel();
        return true;
      },
    });
    this.addCommand({
      id: "set-word-target",
      name: t("app.command.setWordTarget"),
      callback: () =>
        this.withActiveProject((p) =>
          // Goals are story-level: write the BASE draft, like the Home hero
          // card — writing the active copy would silently change nothing the
          // progress views read.
          new TargetModal(
            this.app,
            baseDraftFor(this.store.getProjects(), p),
            (path) => this.selfWrites.mark(path)
          ).open()
        ),
    });
    this.addCommand({
      id: "log-revision",
      name: t("app.command.logRevision"),
      // Works from both writing surfaces: Inkswell's own Write editor (which an
      // `editorCallback` never reaches) and a scene open in a regular tab.
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(InkswellView);
        if (view?.canFormat()) {
          if (!checking) view.logDecision();
          return true;
        }
        const md = this.app.workspace.getActiveViewOfType(MarkdownView);
        const file = md?.file;
        if (!md || !file) return false;
        if (checking) return true;
        const project = this.projectForPath(file.path);
        if (!project) {
          new Notice(t("app.notInProject"));
          return true;
        }
        const scene = project.scenes.find((s) => s.path === file.path)?.title ?? null;
        new RevisionModal(this.app, project, scene, md.editor.getSelection()).open();
        return true;
      },
    });
    // The one way to the revision log (Revise → Revision log): what's left to
    // revise, focused on the active file's project when there is one.
    this.addCommand({
      id: "open-revisions",
      name: t("app.command.openRevisions"),
      callback: () => this.openRevisions(),
    });
    this.addCommand({
      id: "open-analysis",
      name: t("app.command.openAnalysis"),
      checkCallback: (checking) =>
        this.featureCommand(checking, "analysis", () => void this.openAnalysis()),
    });
    this.addCommand({
      id: "open-help",
      name: t("app.command.openHelp"),
      callback: () => this.openHelp(),
    });
    this.addCommand({
      id: "open-customize",
      name: t("app.command.openCustomize"),
      callback: () => void this.openCustomize(),
    });
    // Kept under its old id so users' hotkeys survive; lands on the Features section.
    this.addCommand({
      id: "restore-settings-from-backup",
      name: t("app.command.restoreSettings"),
      callback: () => void this.restoreSettingsFromBackup(),
    });
    this.addCommand({
      id: "manage-features",
      name: t("app.command.manageFeatures"),
      callback: () => void this.openCustomize("features"),
    });
    this.addCommand({
      id: "quick-capture",
      name: t("app.command.quickCapture"),
      callback: () => void this.quickCaptureIdea(),
    });
  }

  /** The project whose index or a scene matches a vault path. */
  private projectForPath(path: string): Project | undefined {
    return this.store
      .getProjects()
      .find((p) => p.vaultPath === path || p.scenes.some((s) => s.path === path));
  }

  /** Set when load had to fall back to a daily backup (#61) — shown once the layout is ready. */
  private recoveredFrom: { date: string; kept: string | null } | null = null;

  async loadPersisted(): Promise<void> {
    const stored = (await this.readStoredData()) as {
      settings?: Partial<InkswellSettings>;
      writingLog?: Partial<WritingLogData>;
      ideas?: Idea[];
      activeProject?: string;
    };
    this.settings = readSettings(stored.settings);
    this.writingLog = Object.assign({}, emptyLog(), stored.writingLog ?? {});
    this.ideas = Array.isArray(stored.ideas) ? stored.ideas : [];
    this.activeProject = new ActiveProject(
      typeof stored.activeProject === "string" ? stored.activeProject : null
    );
  }

  /**
   * data.json as stored. When it can't be read — Obsidian's `loadData()` gives
   * `undefined` for a missing, empty or half-written file, which a sync tool can
   * leave for a moment — retry once, then fall back to the newest readable daily
   * backup, keeping a copy of the unreadable file. Starting from defaults
   * instead would be saved over the writer's settings and history within
   * seconds (#61). A true fresh install has no backups, so it gets defaults.
   */
  private async readStoredData(): Promise<StoredData> {
    const first: unknown = await this.loadData();
    if (isUsableData(first)) return first;
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    const again: unknown = await this.loadData();
    if (isUsableData(again)) return again;
    const dir = this.manifest.dir;
    const backup = dir ? (await listBackups(this.app, dir))[0] : undefined;
    if (!dir || !backup) return isPlainObject(again) ? again : {};
    const kept = await keepDataCopy(this.app, dir, "data-unreadable");
    this.recoveredFrom = { date: backup.date, kept };
    console.warn(`[Inkswell] data.json couldn't be read; loaded the backup of ${backup.date}.`);
    return backup.data;
  }

  /**
   * data.json was changed by something else — in practice Obsidian Sync
   * delivering another device's copy. Adopt its SETTINGS (a challenge, Customize
   * overrides, preferences set elsewhere); without this, this device's next save
   * writes its stale in-memory settings back over them. The writing log, ideas
   * and active project stay this device's own (see gotcha 19).
   *
   * A file that can't be read (a sync mid-write) is IGNORED: adopting it as
   * "no settings" reset every setting to its default, and the next save wrote
   * that over the writer's real ones (#61).
   */
  async onExternalSettingsChange(): Promise<void> {
    const stored: unknown = await this.loadData();
    if (!isUsableData(stored)) {
      console.warn("[Inkswell] data.json changed but couldn't be read; keeping the current settings.");
      return;
    }
    this.adoptSettings(readSettings(stored.settings));
  }

  /** Take `incoming` as the settings (keeping this device's own keys) and re-apply them. */
  private adoptSettings(incoming: InkswellSettings): void {
    // Keys describing THIS device (its layout override, migrations already run
    // against its own baselines) never follow another device's copy.
    for (const key of DEVICE_LOCAL_SETTINGS) {
      (incoming as unknown as Record<string, unknown>)[key] = this.settings[key];
    }
    Object.assign(this.settings, incoming);
    this.applyFormFactor();
    this.applyEditorPrefs();
    this.logSync.setEnabled(this.settings.syncWritingHistory);
    this.statusBar?.render();
    this.refreshView();
  }

  /**
   * Pick a daily backup and restore ITS SETTINGS only (#61) — writing history,
   * ideas and the open project are left as they are. The settings being
   * replaced are kept as a `data-before-restore-…` copy first.
   */
  async restoreSettingsFromBackup(): Promise<void> {
    const dir = this.manifest.dir;
    const backups = dir ? await listBackups(this.app, dir) : [];
    if (!dir || backups.length === 0) {
      new Notice(t("app.noBackups"));
      return;
    }
    new RestoreSettingsModal(this.app, backups, (b) => {
      void (async () => {
        await keepDataCopy(this.app, dir, "data-before-restore");
        this.adoptSettings(readSettings(b.data.settings));
        await this.saveSettings();
        new Notice(t("app.settingsRestored", { date: b.date }));
      })();
    }).open();
  }

  /**
   * The running writing challenge's progress, or null (none set, or tracking
   * hidden). Sums only the window's days from the merged, goal-counted log, so
   * it's cheap enough for the per-keystroke status bar.
   */
  challengeProgress(now: Date = new Date()): ChallengeProgress | null {
    const ch = this.settings.challenge;
    if (!ch || !featureEnabled(this.settings.disabledFeatures, "tracking")) return null;
    const log = this.tracker.getMergedLog();
    const excluded = new Set(this.settings.excludedFromGoals);
    const todayKey = dateKey(now);
    const daily: Record<string, number> = {};
    for (const key of windowKeys(ch.start, ch.end)) {
      if (key > todayKey) break;
      daily[key] = projectedDayWords(log, key, excluded);
    }
    return challengeProgress(daily, ch, now);
  }

  /** Turn cross-device writing history on/off (the Settings toggle's effect, for in-app links). */
  async setSyncWritingHistory(on: boolean): Promise<void> {
    this.settings.syncWritingHistory = on;
    await this.saveSettings();
    this.logSync.setEnabled(on);
    this.refreshView();
  }

  /** Pick sections and write the project's story bible note (#50). */
  openStoryBible(project: Project): void {
    new StoryBibleModal(this.app, this, project).open();
  }

  /** Set up / edit / clear the writing challenge. */
  openChallengeModal(): void {
    new ChallengeModal(this.app, this.settings.challenge, async (next) => {
      this.settings.challenge = next;
      await this.saveSettings();
      this.statusBar?.render();
      this.refreshView();
    }).open();
  }

  /** Today's word target everywhere it's shown: a running challenge's need, else the daily goal. */
  todayTarget(): number {
    return todayTarget(this.settings.dailyWordGoal, this.challengeProgress());
  }

  /** Serializes data.json writes so overlapping persist() calls can't interleave. */
  private persistChain: Promise<void> = Promise.resolve();

  /** Persist settings, the writing log, ideas, and the active project to data.json.
   *  Calls are serialized: a call queues behind any in-flight save and snapshots
   *  state only when it runs, so the last write always carries current state and
   *  two saveData writes never overlap on the file. */
  persist(): Promise<void> {
    // Every data.json save also (debounced) mirrors this device's log note.
    this.logSync?.schedule();
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
      title: t("app.capture.title"),
      value: "",
      multiline: true,
      cta: t("app.capture.cta"),
    });
    if (text) {
      this.addIdea(text);
      new Notice(t("app.capture.done"));
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

  updateIdea(id: string, text: string): void {
    const t = text.trim();
    if (!t) return;
    this.ideas = this.ideas.map((i) => (i.id === id ? { ...i, text: t } : i));
    void this.persist();
    this.refreshExplorer();
  }

  /**
   * Promote an idea to a vault note under `<baseFolder>/Ideas/` (named after its
   * first line, numbered on collision), open it, and drop it from the inbox —
   * the note is now the idea's home.
   */
  async saveIdeaAsNote(idea: Idea): Promise<void> {
    const folder = normalizePath(joinPath(this.settings.baseFolder, "Ideas"));
    const firstLine = (idea.text.split(/\r?\n/)[0] ?? "").trim().slice(0, 60);
    const name = sanitizeSegment(firstLine) || "Idea";
    const file = await tryFileOp(async () => {
      if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
      let path = normalizePath(joinPath(folder, `${name}.md`));
      for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) {
        path = normalizePath(joinPath(folder, `${name} ${n}.md`));
      }
      const body = `---\ncreated: ${idea.created}\n---\n\n${idea.text}\n`;
      return this.app.vault.create(path, body);
    }, t("app.idea.saveFailed"));
    if (!file) return;
    this.removeIdea(idea.id);
    new Notice(t("app.idea.saved", { path: file.path }));
    openScene(this.app, file);
  }

  /** Back-compat alias used by the settings tab. */
  async saveSettings(): Promise<void> {
    await this.persist();
  }

  /**
   * Drain every pending write before the app closes: Write-editor sessions
   * across all Inkswell leaves, the in-flight sprint (recorded, silently), the
   * tracker's debounced log save, and finally the data.json persist chain.
   * Registered as a workspace "quit" task so Obsidian awaits it.
   */
  async flushAllPending(): Promise<void> {
    const flushes: Promise<unknown>[] = [];
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)) {
      if (leaf.view instanceof InkswellView) {
        flushes.push(leaf.view.flushWrites().catch(() => {}));
      }
    }
    if (this.sprints.isActive()) this.sprints.finish({ silent: true });
    this.tracker.flushPendingSave();
    await Promise.all(flushes);
    await this.persist(); // snapshots final state AND drains the chain
    await this.logSync.flush(); // …and the device log note mirrors that final state
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
    this.refreshCompanions();
  }

  /** Re-render every open companion (a feature toggle, a settings change). */
  refreshCompanions(): void {
    for (const def of COMPANIONS) {
      for (const leaf of this.app.workspace.getLeavesOfType(def.viewType)) {
        if (leaf.view instanceof CompanionView) leaf.view.requestRender();
      }
    }
  }

  /**
   * Keep `currentScene` on the scene being written when it's open in a normal
   * Obsidian tab (Write sets it itself), and follow renames and deletes. A
   * non-scene note leaves it alone, so companions keep showing the last scene.
   */
  private trackCurrentScene(): void {
    const follow = (file: TFile | null) => {
      if (file && this.store.findSceneByPath(file.path)) this.currentScene.set(file.path);
    };
    this.registerEvent(this.app.workspace.on("file-open", (file) => follow(file)));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => this.currentScene.renamed(oldPath, file.path))
    );
    this.registerEvent(this.app.vault.on("delete", (file) => this.currentScene.deleted(file.path)));
    follow(this.app.workspace.getActiveFile());
  }

  /** Show a sidebar companion (opening it in its default sidebar if needed). */
  openCompanion(id: CompanionId): Promise<void> {
    return openCompanion(this, id);
  }

  /**
   * Look up in Codex: the entry named under Write's cursor, else a search over
   * the book's Codex; the card opens as a peek you dismiss with Esc.
   */
  lookUpInCodex(): void {
    const view = this.inkswellView();
    if (view?.lookUpAtCursor()) return;
    const entities = entitiesForScene(this, this.currentScene.get());
    new CodexLookupModal(this.app, this, entities, (entity) => {
      const rect = this.inkswellView()?.cursorRect() ?? centeredRect();
      this.peek.show(entity, rect, { entities, sticky: true });
    }).open();
  }

  /** Apply changed Write-editor preferences to any live editor — no rebuild, so
   *  the writer's undo history and scroll position survive a Settings toggle. */
  applyEditorPrefs(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INKSWELL)) {
      if (leaf.view instanceof InkswellView) leaf.view.applyEditorPrefs();
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

  /** Enable/disable an optional feature (lossless — only gates UI) and re-render.
   *  Customize passes `rerender: false`: it is the active view and re-renders
   *  itself in place; a forced rebuild would tear down the toggle being clicked. */
  async setFeatureEnabled(
    id: FeatureId,
    enabled: boolean,
    opts: { rerender?: boolean } = {}
  ): Promise<void> {
    const set = new Set(this.settings.disabledFeatures);
    if (enabled) set.delete(id);
    else set.add(id);
    this.settings.disabledFeatures = [...set];
    await this.saveSettings();
    if (opts.rerender !== false) this.refreshView();
    this.refreshStatus(); // the status-bar counter is part of "tracking"
  }

  /** Open Customize, optionally deep-linked to a section (and a sub-target in it). */
  openCustomize(sectionId?: string, target?: string): Promise<void> {
    return this.openInkswell("customize", (view) => {
      if (sectionId) view.openCustomize(sectionId, target);
    });
  }

  /** Push the layout override into the platform module and mirror the result
   *  onto <body> for the stylesheet. Idempotent; called on load and on toggle. */
  private applyFormFactor(): void {
    setForceTabletLayout(this.settings.forceTabletLayout);
    document.body.toggleClass(PHONE_BODY_CLASS, isPhone());
  }

  /** "Use the full layout on this device" (#41): a tablet Obsidian flags as a
   *  phone opts out of the phone layout. Rebuilds the open view in place. */
  async setForceTabletLayout(on: boolean): Promise<void> {
    this.settings.forceTabletLayout = on;
    await this.saveSettings();
    this.applyFormFactor();
    this.refreshView();
  }

  refreshStatus(): void {
    this.statusBar?.render();
  }

  /** Settings → Interface language changed: re-resolve and redraw what can be
   *  redrawn. Command names (registered at load) follow on the next restart. */
  applyInterfaceLanguage(): void {
    initLocale(this.settings.interfaceLanguage);
    this.refreshView();
    this.refreshStatus();
    new Notice(t("settings.interfaceLanguage.applied"));
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
      new Notice(t("app.compile.noProject"));
      return;
    }
    try {
      const config = resolveCompileConfig(project, this.settings.defaultCompileFormat);
      const result = await runCompile(this.app, project, config, {
        markers: markerSet(this.settings.listOverrides.markers),
        author: { name: this.settings.authorName, contact: this.settings.authorContact },
      });
      const words = countWords(result.wordCountSource);
      new Notice(tp("compile.done", words, { path: result.outputPath }));
    } catch (e) {
      new Notice(t("compile.failed", { error: (e as Error).message }), 8000);
    }
  }

  openHelp(): Promise<void> {
    return this.openInkswell("help");
  }

  /** Open the revision log (markers left in prose + logged decisions). */
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

  /** Open the merged revision worklist (Revise → Revision log), focused on the active
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

  /** Create a new project (optionally preset into a series), make it active, and
   *  land on Plan to start outlining. */
  newProject(preset?: NewProjectPreset): void {
    const series = seriesForPicker(this.store.getProjects(), this.activeProject.get());
    new NewProjectModal(this.app, { folders: this.settings, series, preset }, (file) => {
      this.activeProject.set(file.path);
      this.refreshExplorer();
      void this.openInkswell("plan");
    }).open();
  }

  /**
   * Rename the story `project` belongs to: title on every draft, plus (by
   * default) the folder, index note, planning note, codex scope, and every
   * stored path that would otherwise go stale. Planning is pure
   * (src/projects/rename-plan.ts); this wires the modal to the executor.
   */
  renameProject(project: Project): void {
    const all = this.store.getProjects();
    const base = baseDraftFor(all, project);
    const story = groupIntoStories(all).find((s) => s.drafts.some((d) => d.vaultPath === base.vaultPath));
    const drafts = story ? [base, ...story.drafts.filter((d) => d.vaultPath !== base.vaultPath)] : [base];
    new RenameProjectModal(
      this.app,
      drafts,
      base,
      { exists: (p) => this.app.vault.getAbstractFileByPath(p) !== null, allProjects: all },
      (plan) => {
        if (!plan) return;
        void executeProjectRename(this.app, plan, {
          mark: (p) => this.selfWrites.mark(p),
          remapPaths: (remap) => this.tracker.remapBaselines(remap),
          getActive: () => this.activeProject.get(),
          setActive: (p) => this.activeProject.set(p),
        }).then(() => this.store.refresh());
      }
    ).open();
  }

  /**
   * Archive (or unarchive) the story `project` belongs to — every draft. Out of
   * sight only: it leaves Home and the project picker; nothing else changes.
   * Archiving the story in focus returns to All projects, where it now sits
   * under Archived.
   */
  async archiveProject(project: Project, archived: boolean): Promise<void> {
    const projects = this.store.getProjects();
    const drafts = storyDrafts(project, projects);
    const ok = await setStoryArchived(this.app, projects, project, archived, (p) => this.selfWrites.mark(p));
    if (!ok) return;
    const active = this.activeProject.get();
    if (archived && active && drafts.some((d) => d.vaultPath === active)) this.activeProject.set(null);
    new Notice(
      archived
        ? t("app.archive.archived", { title: project.draft.title })
        : t("app.archive.restored", { title: project.draft.title })
    );
  }

  /** Archive (or unarchive) every book of a series — see {@link archiveProject}. */
  async archiveSeries(series: Series, archived: boolean): Promise<void> {
    const projects = this.store.getProjects();
    const ok = await setSeriesArchived(this.app, projects, series, archived, (p) => this.selfWrites.mark(p));
    if (!ok) return;
    const active = this.activeProject.get();
    const inSeries = series.books.some((b) => storyDrafts(b, projects).some((d) => d.vaultPath === active));
    if (archived && active && inSeries) this.activeProject.set(null);
    new Notice(
      archived
        ? t("app.archive.seriesArchived", { name: series.name })
        : t("app.archive.seriesRestored", { name: series.name })
    );
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
    } else if (!(leaf.view instanceof InkswellView)) {
      // A leaf of our type whose view isn't ours: Obsidian's placeholder left
      // behind when the plugin was disabled and re-enabled. Re-instantiate in place.
      await leaf.setViewState({ type: VIEW_TYPE_INKSWELL, active: true });
    }
    if (leaf.view instanceof InkswellView) {
      leaf.view.setMode(mode, subtab);
      if (after) after(leaf.view);
    }
    void workspace.revealLeaf(leaf);
  }

  /** Reveal the Inkswell tab, switch to Write, and open the given scene there. */
  openSceneInWrite(path: string, highlight?: SceneHighlight): void {
    void this.openInkswell("write", (view) => view.openSceneInWrite(path, highlight));
  }

  /** Reveal the Inkswell tab and show a codex entry in the Codex panel. */
  openCodexEntry(path: string): void {
    void this.openInkswell("codex", (view) => view.openCodexEntry(path));
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
      new Notice(t("app.noProject"));
      return;
    }
    fn(project);
  }
}

/** Where a looked-up card goes when there's no cursor to anchor it: top centre. */
function centeredRect(): DOMRect {
  const w = activeWindow.innerWidth;
  return new DOMRect(Math.max(0, w / 2 - 160), 80, 1, 1);
}
