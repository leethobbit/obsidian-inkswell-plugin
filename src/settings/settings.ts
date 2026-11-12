/**
 * Typed plugin settings + the settings tab.
 *
 * Settings persist via Obsidian's plugin data (`.obsidian/plugins/inkswell/data.json`).
 * Per-project config (compile workflows, goals, revisions) does NOT live here —
 * it belongs in the project index's `inkswell` frontmatter.
 */

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinition, SettingDefinitionItem } from "obsidian";
import type InkswellPlugin from "../../main";
import { OutputFormat } from "../compile/types";
import { WeekStart } from "../goals/goals";
import type { WritingChallenge } from "../goals/challenge";
import type { RailLayout } from "../views/nav-model";
import { WORD_CATEGORIES, WordCategory } from "../tracking/types";
import { CategoryDef, CategoryOverrides } from "../codex/types";
import { BeatTemplateDef } from "../outliner/custom-templates";
import { deviceFlaggedAsPhone } from "../lib/platform";
import type { ListOverrides } from "./overridable-lists";
import { resetHelpState } from "../help/hint";
import { WelcomeModal } from "../help/welcome-modal";
import { MessageKey, PSEUDO_LOCALE, t } from "../i18n";
import { LOCALE_INFO, LOCALES } from "../i18n/locales";

export interface InkswellSettings {
  /** Default output format offered in the compile dialog. */
  defaultCompileFormat: OutputFormat;
  /** Where a scene clicked in a sidebar companion opens: Inkswell's Write, or
   *  a regular Obsidian tab. Ctrl/Cmd-click always opens a new tab. */
  companionSceneTarget: "write" | "tab";
  /** Settings → Interface language: "auto" follows Obsidian (reviewed catalogs only), else a locale code. */
  interfaceLanguage: string;
  /** Show word counts in the explorer. */
  showWordCounts: boolean;
  /** Home: whether the ideas inbox section is expanded (UI state, not a Settings row). */
  homeIdeasOpen: boolean;
  /** Home: whether the Archived section is expanded (UI state; collapsed by default). */
  homeArchivedOpen: boolean;
  /**
   * Archived books leave their series shelf and the focused view's series strip
   * too (they wait under their series name in Home's Archived section). Off =
   * they stay on the shelf, dimmed. A display preference — no note changes.
   */
  hideArchivedInSeries: boolean;
  /** Mirror this device's writing history to a vault note and merge other devices' (#44). */
  syncWritingHistory: boolean;
  /** Heading level used by the "prepend title" compile step. */
  sceneHeadingLevel: number;
  /** Daily word goal shown in the status bar / stats. */
  dailyWordGoal: number;
  /** Weekly word goal (start of week→today). */
  weeklyWordGoal: number;
  /** Monthly word goal (1st→today). */
  monthlyWordGoal: number;
  /** Habit: target writing days per week. */
  habitDaysPerWeek: number;
  /** Habit: minimum words for a day to count toward the habit. */
  habitMinWords: number;
  /** Default sprint length in minutes. */
  defaultSprintMinutes: number;
  /** Default sprint word goal (0 = no goal). */
  defaultSprintWordGoal: number;
  /** Minimum words for a day to count toward a writing streak. */
  streakThreshold: number;
  /**
   * Word categories EXCLUDED from goals/streaks/sprints (scene/planning/codex/
   * other). Only project notes are ever tracked; this narrows further. Excluded
   * categories are still logged per day, so re-including one retroactively
   * restores every word written since category tracking shipped.
   */
  excludedFromGoals: WordCategory[];
  /** The one running writing challenge (a date window + word target), or null.
   *  Edited from Track, never from this tab. */
  challenge: WritingChallenge | null;
  /** Story bible dialog: the last picked sections + codex types (null = all types).
   *  UI memory, not a Settings-tab row. */
  storyBible: { sections: string[]; codexTypes: string[] | null };
  /** The writer's rail arrangement (#55), or null for the shipped one. Edited by
   *  dragging the rail / its item menu — never a Settings-tab row. */
  railLayout: RailLayout | null;
  /** Home's shelf order (#57, #67): series names, first shelf first, plus the
   *  reserved `STANDALONE_SHELF` entry for the Standalone shelf. Series not
   *  listed follow alphabetically; an unlisted Standalone is last. Edited from a
   *  shelf's menu (Reorder shelves…) — never a Settings-tab row. Syncs. */
  seriesOrder: string[];
  /** The one-time "goals now count project words by category" notice was shown. */
  categoryNoticeSeen: boolean;
  /**
   * One-time migration flag: existing codex baselines were recomputed under the
   * frontmatter-included counting rule (profile prose counts). Without this, an
   * old body-only baseline would emit a phantom delta the size of the whole
   * profile on the note's next edit.
   */
  codexCountMigrated: boolean;
  /**
   * One-time migration flag: all baselines were recomputed under the CJK-aware
   * counting rule (each Han/kana/Hangul grapheme = one word). Without this, a
   * CJK manuscript's next edit would emit a phantom delta the size of the
   * whole file. English counts are identical under both rules.
   */
  cjkCountMigrated: boolean;
  /** First day of the week for weekly goals, habit tracking, and the heatmap. */
  weekStart: WeekStart;
  /** Parent folder new projects + the shared codex scaffold under ("" = vault root). */
  baseFolder: string;
  /** Codex subfolder name, used both for the shared codex and per-project codex. */
  codexFolder: string;
  /** When true, book-scoped codex co-locates in its project folder; series/global go shared. */
  coLocateCodex: boolean;
  /** The one-time welcome modal has been shown (set after first launch). */
  welcomeSeen: boolean;
  /** Show the dismissible "How this works" tips at the top of panels. */
  showHelpHints: boolean;
  /** Hint keys the user has dismissed (e.g. "plan/beats", "codex"). */
  dismissedHints: string[];
  /**
   * Optional feature ids the user has hidden (see src/features.ts). A feature is
   * ON unless listed here, so new optional features default on. Hiding only gates
   * rendering/commands — stored data is never touched, so re-enabling is lossless.
   */
  disabledFeatures: string[];
  /**
   * User-defined codex types, merged after the seven built-ins wherever
   * categories are listed (via allCategories — computed at render time, never
   * cached). Normalized on load (normalizeCustomCategories); built-ins are never
   * editable. Deleting one leaves its notes intact — entries show as
   * "Uncategorized" in the Codex panel.
   */
  customCategories: CategoryDef[];
  /**
   * Display overrides for the seven built-in codex types (label / plural /
   * icon), keyed by built-in id. Ids never change, so a rename touches no notes;
   * the type's shipped template note keeps resolving as a fallback. Normalized
   * on load (normalizeCategoryOverrides). Absent key = shipped display.
   */
  categoryOverrides: CategoryOverrides;
  /**
   * User-defined beat-sheet templates, merged after the built-ins wherever
   * templates are listed (via allTemplateMeta — computed at render time, never
   * cached). Normalized on load (normalizeCustomBeatTemplates); built-ins are
   * never editable. Deleting one leaves every project's sheet intact — the
   * Beats panel shows a missing-template notice with all notes editable.
   */
  customBeatTemplates: BeatTemplateDef[];
  /** Write editor: typing `--` gives an en dash, a third `-` an em dash. Off by default. */
  smartDashes: boolean;
  /** Write editor: straight quotes/apostrophes typed become curly. Off by default. */
  smartQuotes: boolean;
  /** Write editor: `...` typed becomes an ellipsis. Off by default. */
  smartEllipsis: boolean;
  /** Write editor: keep the caret line vertically centered while typing. Off by default. */
  typewriterMode: boolean;
  /** Write editor: book-style paragraph indents and centered headings (CSS only). Off by default. */
  manuscriptTypography: boolean;
  /** Write editor: gutter tag where the scene's running count passes each multiple of N. 0 = off. */
  milestoneWords: number;
  /**
   * Ignore Obsidian's "this is a phone" classification and use the full
   * (tablet/desktop) layout — for tablets Obsidian misdetects (#41). Only
   * offered in Settings while the device IS flagged as a phone; a no-op elsewhere.
   */
  forceTabletLayout: boolean;
  /**
   * Customize's overrides for the shipped lists (revision checkpoints, the
   * publishing checklist, writing prompts, scene statuses): lossless hide /
   * rename / reorder / add, one optional entry per list id. Normalized on load
   * (`normalizeListOverrides`). Absent key = shipped list verbatim.
   */
  listOverrides: ListOverrides;
  /** Writer's legal name: the built-in Word manuscript's title page (and the
   *  default byline / header surname). A preference, so it lives here, not in
   *  any book's frontmatter. */
  authorName: string;
  /** Contact block under the name on the title page, one item per line. */
  authorContact: string;
}

export const DEFAULT_SETTINGS: InkswellSettings = {
  defaultCompileFormat: "md",
  companionSceneTarget: "write",
  interfaceLanguage: "auto",
  authorName: "",
  authorContact: "",
  showWordCounts: true,
  homeIdeasOpen: true,
  homeArchivedOpen: false,
  hideArchivedInSeries: false,
  syncWritingHistory: false,
  sceneHeadingLevel: 1,
  dailyWordGoal: 500,
  weeklyWordGoal: 3500,
  monthlyWordGoal: 15000,
  habitDaysPerWeek: 5,
  habitMinWords: 100,
  defaultSprintMinutes: 15,
  defaultSprintWordGoal: 0,
  streakThreshold: 1,
  excludedFromGoals: ["planning", "codex", "other"],
  challenge: null,
  storyBible: { sections: ["overview", "beats", "outline", "codex"], codexTypes: null },
  railLayout: null,
  seriesOrder: [],
  categoryNoticeSeen: false,
  codexCountMigrated: false,
  cjkCountMigrated: false,
  weekStart: "monday",
  baseFolder: "Writing",
  codexFolder: "Codex",
  coLocateCodex: true,
  welcomeSeen: false,
  showHelpHints: true,
  dismissedHints: [],
  disabledFeatures: [],
  customCategories: [],
  categoryOverrides: {},
  customBeatTemplates: [],
  smartDashes: false,
  smartQuotes: false,
  smartEllipsis: false,
  typewriterMode: false,
  manuscriptTypography: false,
  milestoneWords: 0,
  forceTabletLayout: false,
  listOverrides: {},
};

/**
 * The pointer to the in-app Customize destination — the ONE row Settings keeps
 * for shape-of-the-tool customization. Settings is for preferences; anything
 * that reshapes Inkswell (types, fields, templates, structures, checklists,
 * prompts, features) is a Customize section, never a Settings row.
 */
const CUSTOMIZE_ROW = {
  nameKey: "settings.customize.name",
  descKey: "settings.customize.desc",
} as const satisfies { nameKey: MessageKey; descKey: MessageKey };

/** One row, both render paths (gotcha 12). */
const HIDE_ARCHIVED_ROW = {
  nameKey: "settings.hideArchived.name",
  descKey: "settings.hideArchived.desc",
} as const satisfies { nameKey: MessageKey; descKey: MessageKey };

/** Copy for the one platform-conditional row (shared by both renderers). */
const LAYOUT_TOGGLE = {
  nameKey: "settings.forceTablet.name",
  descKey: "settings.forceTablet.desc",
} as const satisfies { nameKey: MessageKey; descKey: MessageKey };

/** Milestone spacing: 0 = off; anything else at least 100 words (a tag per few words is noise). */
function normalizeMilestoneWords(raw: unknown): number {
  const n = clampInt(
    typeof raw === "number" || typeof raw === "string" ? `${raw}` : "",
    0,
    10000,
    0
  );
  return n > 0 && n < 100 ? 100 : n;
}

/** The boolean Write-editor preferences (all default off). */
type WriteEditorToggleKey =
  | "smartDashes"
  | "smartQuotes"
  | "smartEllipsis"
  | "typewriterMode"
  | "manuscriptTypography";

/**
 * Settings-tab copy for the Write-editor toggles — one table feeding BOTH the
 * declarative definitions and the imperative fallback, so the two renderers
 * can't drift (gotcha #12). Every toggle saves then calls
 * `plugin.applyEditorPrefs()`, which pushes the change onto a live editor
 * without rebuilding it.
 */
const WRITE_EDITOR_TOGGLES: {
  key: WriteEditorToggleKey;
  nameKey: MessageKey;
  descKey: MessageKey;
}[] = [
  {
    key: "typewriterMode",
    nameKey: "settings.typewriterMode.name",
    descKey: "settings.typewriterMode.desc",
  },
  {
    key: "manuscriptTypography",
    nameKey: "settings.manuscriptTypography.name",
    descKey: "settings.manuscriptTypography.desc",
  },
  {
    key: "smartDashes",
    nameKey: "settings.smartDashes.name",
    descKey: "settings.smartDashes.desc",
  },
  {
    key: "smartQuotes",
    nameKey: "settings.smartQuotes.name",
    descKey: "settings.smartQuotes.desc",
  },
  {
    key: "smartEllipsis",
    nameKey: "settings.smartEllipsis.name",
    descKey: "settings.smartEllipsis.desc",
  },
];

/** Settings-tab copy for the goal category toggles (keys; resolved at render). */
const CATEGORY_LABELS: Record<WordCategory, { nameKey: MessageKey; descKey: MessageKey }> = {
  scene: { nameKey: "settings.counts.scene.name", descKey: "settings.counts.scene.desc" },
  planning: { nameKey: "settings.counts.planning.name", descKey: "settings.counts.planning.desc" },
  codex: { nameKey: "settings.counts.codex.name", descKey: "settings.counts.codex.desc" },
  other: { nameKey: "settings.counts.other.name", descKey: "settings.counts.other.desc" },
};

/** Clamp bounds for the numeric fields — shared by the imperative tab
 *  (`clampInt`) and the declarative `setControlValue` router so the two
 *  rendering paths can't disagree on what a valid value is. */
const NUMERIC_BOUNDS: Partial<
  Record<keyof InkswellSettings, { lo: number; hi: number; fallback: number }>
> = {
  sceneHeadingLevel: { lo: 1, hi: 6, fallback: 1 },
  dailyWordGoal: { lo: 0, hi: 100000, fallback: 500 },
  weeklyWordGoal: { lo: 0, hi: 1000000, fallback: 3500 },
  monthlyWordGoal: { lo: 0, hi: 10000000, fallback: 15000 },
  habitDaysPerWeek: { lo: 1, hi: 7, fallback: 5 },
  habitMinWords: { lo: 1, hi: 100000, fallback: 100 },
  defaultSprintMinutes: { lo: 1, hi: 600, fallback: 15 },
  defaultSprintWordGoal: { lo: 0, hi: 100000, fallback: 0 },
  streakThreshold: { lo: 1, hi: 100000, fallback: 1 },
  milestoneWords: { lo: 0, hi: 10000, fallback: 0 },
};

export class InkswellSettingTab extends PluginSettingTab {
  private plugin: InkswellPlugin;

  constructor(app: App, plugin: InkswellPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * THE tab, on Obsidian 1.13+ (and the late-1.12 builds that shipped the
   * definitions renderer): when this returns a non-empty array the app renders
   * the whole tab declaratively from it and **never calls display()** — the
   * imperative `display()`/`rerender()` below is the fallback renderer for
   * older installs only. Controls route through get/setControlValue; feature
   * and goal-category toggles aren't direct settings fields, so they use
   * virtual keys (`feature:<id>`, `counts:<category>`) resolved below.
   *
   * Definitions are captured by `update()` (once at addSettingTab) — they do
   * NOT re-evaluate on their own. After any mutation that changes the tab's
   * structure (custom codex types, custom beat templates), call
   * {@link refreshTab}, which re-captures on the declarative path and
   * re-renders on the imperative one.
   *
   * KEEP IN LOCKSTEP with display(): same names, descriptions, and controls.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const items: SettingDefinitionItem[] = [
      {
        name: t(CUSTOMIZE_ROW.nameKey),
        desc: t(CUSTOMIZE_ROW.descKey),
        action: () => this.openCustomize(),
      },
      ...(hasTranslations()
        ? [
            {
              name: t("settings.interfaceLanguage.name"),
              desc: t("settings.interfaceLanguage.desc"),
              control: {
                type: "dropdown" as const,
                key: "interfaceLanguage",
                options: languageOptions(),
                defaultValue: "auto",
              },
            },
          ]
        : []),
      {
        name: t("settings.defaultCompileFormat.name"),
        desc: t("settings.defaultCompileFormat.desc"),
        control: {
          type: "dropdown",
          key: "defaultCompileFormat",
          options: compileFormatOptions(),
          defaultValue: "md",
        },
      },
      {
        name: t("settings.companionSceneTarget.name"),
        desc: t("settings.companionSceneTarget.desc"),
        control: {
          type: "dropdown",
          key: "companionSceneTarget",
          options: companionTargetOptions(),
          defaultValue: "write",
        },
      },
      {
        name: t("settings.showWordCounts.name"),
        desc: t("settings.showWordCounts.desc"),
        control: { type: "toggle", key: "showWordCounts", defaultValue: true },
      },
      {
        name: t(HIDE_ARCHIVED_ROW.nameKey),
        desc: t(HIDE_ARCHIVED_ROW.descKey),
        control: { type: "toggle", key: "hideArchivedInSeries", defaultValue: false },
      },
      {
        name: t("settings.syncHistory.name"),
        desc: t("settings.syncHistory.desc"),
        control: { type: "toggle", key: "syncWritingHistory", defaultValue: false },
      },
      {
        name: t("settings.sceneHeadingLevel.name"),
        desc: t("settings.sceneHeadingLevel.desc"),
        control: { type: "slider", key: "sceneHeadingLevel", min: 1, max: 6, step: 1 },
      },
    ];

    items.push(
      {
        type: "group",
        heading: t("settings.manuscript.heading"),
        items: [
          {
            name: t("settings.authorName.name"),
            desc: t("settings.authorName.desc"),
            control: { type: "text", key: "authorName", defaultValue: "" },
          },
          {
            name: t("settings.authorContact.name"),
            desc: t("settings.authorContact.desc"),
            control: { type: "textarea", key: "authorContact", defaultValue: "", rows: 4 },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.writeEditor.heading"),
        items: [
          ...WRITE_EDITOR_TOGGLES.map((o) => ({
            name: t(o.nameKey),
            desc: t(o.descKey),
            control: { type: "toggle" as const, key: o.key, defaultValue: false },
          })),
          numberDef(t("settings.milestoneWords.name"), t("settings.milestoneWords.desc"), "milestoneWords"),
        ],
      },
      {
        type: "group",
        heading: t("settings.goals.heading"),
        items: [
          {
            name: t("settings.weekStart.name"),
            desc: t("settings.weekStart.desc"),
            control: {
              type: "dropdown",
              key: "weekStart",
              options: { monday: t("settings.weekStart.monday"), sunday: t("settings.weekStart.sunday") },
              defaultValue: "monday",
            },
          },
          numberDef(t("settings.dailyWordGoal.name"), t("settings.dailyWordGoal.desc"), "dailyWordGoal"),
          numberDef(t("settings.weeklyWordGoal.name"), t("settings.weeklyWordGoal.desc"), "weeklyWordGoal"),
          numberDef(t("settings.monthlyWordGoal.name"), t("settings.monthlyWordGoal.desc"), "monthlyWordGoal"),
          numberDef(t("settings.habitDaysPerWeek.name"), t("settings.habitDaysPerWeek.desc"), "habitDaysPerWeek"),
          numberDef(t("settings.habitMinWords.name"), t("settings.habitMinWords.desc"), "habitMinWords"),
          numberDef(t("settings.defaultSprintMinutes.name"), t("settings.defaultSprintMinutes.desc"), "defaultSprintMinutes"),
          numberDef(t("settings.defaultSprintWordGoal.name"), t("settings.defaultSprintWordGoal.desc"), "defaultSprintWordGoal"),
          numberDef(t("settings.streakThreshold.name"), t("settings.streakThreshold.desc"), "streakThreshold"),
        ],
      },
      {
        type: "group",
        heading: t("settings.counts.heading"),
        items: WORD_CATEGORIES.map((cat) => ({
          name: t(CATEGORY_LABELS[cat].nameKey),
          desc: t(CATEGORY_LABELS[cat].descKey),
          control: { type: "toggle" as const, key: `counts:${cat}` },
        })),
      },
      {
        type: "group",
        heading: t("settings.folders.heading"),
        items: [
          {
            name: t("settings.baseFolder.name"),
            desc: t("settings.baseFolder.desc"),
            control: { type: "folder", key: "baseFolder", placeholder: t("settings.baseFolder.placeholder") },
          },
          {
            name: t("settings.codexFolder.name"),
            desc: t("settings.codexFolder.desc"),
            control: { type: "text", key: "codexFolder", defaultValue: "Codex" },
          },
          {
            name: t("settings.coLocateCodex.name"),
            desc: t("settings.coLocateCodex.desc"),
            control: { type: "toggle", key: "coLocateCodex", defaultValue: true },
          },
        ],
      },
    );
    // The only platform-conditional row: offered ONLY where it can do anything
    // (Obsidian flagged this device as a phone). Desktop and correctly detected
    // tablets never see it — one fewer toggle for everyone it doesn't concern.
    if (deviceFlaggedAsPhone()) {
      items.push({
        type: "group",
        heading: t("settings.layout.heading"),
        items: [
          {
            name: t(LAYOUT_TOGGLE.nameKey),
            desc: t(LAYOUT_TOGGLE.descKey),
            control: { type: "toggle", key: "forceTabletLayout", defaultValue: false },
          },
        ],
      });
    }
    items.push(
      {
        type: "group",
        heading: t("settings.help.heading"),
        items: [
          {
            name: t("settings.showHints.name"),
            desc: t("settings.showHints.desc"),
            control: { type: "toggle", key: "showHelpHints", defaultValue: true },
          },
          {
            name: t("settings.resetTips.name"),
            desc: t("settings.resetTips.desc"),
            action: () => void this.resetTips(),
          },
        ],
      }
    );
    return items;
  }

  /** Resolve a definition key — virtual (`feature:`/`counts:`) or a settings field. */
  getControlValue(key: string): unknown {
    if (key.startsWith("counts:")) {
      return !this.plugin.settings.excludedFromGoals.includes(key.slice(7) as WordCategory);
    }
    return this.plugin.settings[key as keyof InkswellSettings];
  }

  /** Persist a definition-driven edit with the SAME clamping and side effects
   *  as the imperative tab (the two paths must never disagree). */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const s = this.plugin.settings;
    if (key === "forceTabletLayout") {
      await this.plugin.setForceTabletLayout(!!value); // saves + swaps layout itself
      return;
    }
    if (key.startsWith("counts:")) {
      const cat = key.slice(7) as WordCategory;
      const excluded = new Set(s.excludedFromGoals);
      if (value) excluded.delete(cat);
      else excluded.add(cat);
      s.excludedFromGoals = [...excluded];
      await this.plugin.saveSettings();
      this.plugin.refreshStatus();
      this.plugin.refreshView();
      return;
    }
    const editorToggle = WRITE_EDITOR_TOGGLES.find((o) => o.key === key);
    if (editorToggle) {
      s[editorToggle.key] = !!value;
      await this.plugin.saveSettings();
      this.plugin.applyEditorPrefs();
      return;
    }
    switch (key) {
      case "defaultCompileFormat":
        s.defaultCompileFormat = value as OutputFormat;
        break;
      case "companionSceneTarget":
        s.companionSceneTarget = value === "tab" ? "tab" : "write";
        break;
      case "interfaceLanguage":
        s.interfaceLanguage = normalizeInterfaceLanguage(value);
        await this.plugin.saveSettings();
        this.plugin.applyInterfaceLanguage();
        return;
      case "authorName":
        s.authorName = typeof value === "string" ? value.trim() : "";
        break;
      case "authorContact":
        s.authorContact = typeof value === "string" ? value : "";
        break;
      case "showWordCounts":
        s.showWordCounts = !!value;
        break;
      case "hideArchivedInSeries":
        s.hideArchivedInSeries = !!value;
        break;
      case "syncWritingHistory":
        s.syncWritingHistory = !!value;
        break;
      case "weekStart":
        s.weekStart = value === "sunday" ? "sunday" : "monday";
        break;
      case "baseFolder":
        s.baseFolder = trimSlashes(typeof value === "string" ? value : "");
        break;
      case "codexFolder":
        s.codexFolder = (typeof value === "string" ? value : "").trim() || "Codex";
        break;
      case "coLocateCodex":
        s.coLocateCodex = !!value;
        break;
      case "showHelpHints":
        s.showHelpHints = !!value;
        break;
      case "milestoneWords":
        s.milestoneWords = normalizeMilestoneWords(value);
        break;
      default: {
        const bounds = NUMERIC_BOUNDS[key as keyof InkswellSettings];
        if (!bounds) return; // unknown key — never write blind
        // Number controls hand us a number; anything else falls back via clamp.
        const raw = typeof value === "number" || typeof value === "string" ? `${value}` : "";
        (s as unknown as Record<string, number>)[key] = clampInt(
          raw,
          bounds.lo,
          bounds.hi,
          bounds.fallback
        );
        break;
      }
    }
    await this.plugin.saveSettings();
    if (key === "showWordCounts" || key === "showHelpHints" || key === "hideArchivedInSeries") {
      this.plugin.refreshExplorer();
    }
    if (key === "syncWritingHistory") this.plugin.logSync.setEnabled(s.syncWritingHistory);
    if (key === "dailyWordGoal") this.plugin.refreshStatus();
    if (key === "milestoneWords") this.plugin.applyEditorPrefs();
  }

  /** The "Manuscript" section (imperative fallback). Same rows as the
   *  declarative group — keep them in lockstep. */
  private renderManuscript(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.manuscript.heading")).setHeading();
    new Setting(containerEl)
      .setName(t("settings.authorName.name"))
      .setDesc(t("settings.authorName.desc"))
      .addText((c) =>
        c.setValue(this.plugin.settings.authorName).onChange(async (v) => {
          this.plugin.settings.authorName = v.trim();
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName(t("settings.authorContact.name"))
      .setDesc(t("settings.authorContact.desc"))
      .addTextArea((c) => {
        c.inputEl.rows = 4;
        c.setValue(this.plugin.settings.authorContact).onChange(async (v) => {
          this.plugin.settings.authorContact = v;
          await this.plugin.saveSettings();
        });
      });
  }

  /** The "Write editor" section (imperative fallback): editor toggles.
   *  Same table as the declarative group — keep them in lockstep. */
  private renderWriteEditor(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.writeEditor.heading")).setHeading();
    for (const o of WRITE_EDITOR_TOGGLES) {
      new Setting(containerEl)
        .setName(t(o.nameKey))
        .setDesc(t(o.descKey))
        .addToggle((c) =>
          c.setValue(this.plugin.settings[o.key]).onChange(async (v) => {
            this.plugin.settings[o.key] = v;
            await this.plugin.saveSettings();
            this.plugin.applyEditorPrefs();
          })
        );
    }
    new Setting(containerEl)
      .setName(t("settings.milestoneWords.name"))
      .setDesc(t("settings.milestoneWords.desc"))
      .addText((c) =>
        c.setValue(`${this.plugin.settings.milestoneWords}`).onChange(async (v) => {
          this.plugin.settings.milestoneWords = normalizeMilestoneWords(v);
          await this.plugin.saveSettings();
          this.plugin.applyEditorPrefs();
        })
      );
  }

  /**
   * Hand off to the in-app Customize destination. The settings modal is closed
   * first (else it sits over the view). `app.setting` is untyped in the public
   * API, hence the guarded lookup.
   */
  private openCustomize(): void {
    const setting = (this.app as unknown as { setting?: { close?: unknown } }).setting;
    if (setting && typeof setting.close === "function") (setting.close as () => void).call(setting);
    void this.plugin.openCustomize();
  }

  /** Reset dismissed tips + replay the welcome modal (shared by tab and search). */
  private async resetTips(): Promise<void> {
    await resetHelpState(this.plugin);
    this.plugin.refreshExplorer();
    new Notice(t("settings.resetTips.done"));
    new WelcomeModal(this.app, this.plugin).open();
  }

  display(): void {
    this.rerender();
  }

  /** Full tab (re)build. Internal callers use this, not the deprecated `display`. */
  private rerender(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t(CUSTOMIZE_ROW.nameKey))
      .setDesc(t(CUSTOMIZE_ROW.descKey))
      .addButton((b) => b.setButtonText(t("settings.customize.button")).setCta().onClick(() => this.openCustomize()));

    if (hasTranslations()) {
      new Setting(containerEl)
        .setName(t("settings.interfaceLanguage.name"))
        .setDesc(t("settings.interfaceLanguage.desc"))
        .addDropdown((d) =>
          d
            .addOptions(languageOptions())
            .setValue(this.plugin.settings.interfaceLanguage)
            .onChange(async (v) => {
              this.plugin.settings.interfaceLanguage = normalizeInterfaceLanguage(v);
              await this.plugin.saveSettings();
              this.plugin.applyInterfaceLanguage();
              this.rerender();
            })
        );
    }

    new Setting(containerEl)
      .setName(t("settings.defaultCompileFormat.name"))
      .setDesc(t("settings.defaultCompileFormat.desc"))
      .addDropdown((d) =>
        d
          .addOptions(compileFormatOptions())
          .setValue(this.plugin.settings.defaultCompileFormat)
          .onChange(async (v) => {
            this.plugin.settings.defaultCompileFormat = v as OutputFormat;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.companionSceneTarget.name"))
      .setDesc(t("settings.companionSceneTarget.desc"))
      .addDropdown((d) =>
        d
          .addOptions(companionTargetOptions())
          .setValue(this.plugin.settings.companionSceneTarget)
          .onChange(async (v) => {
            this.plugin.settings.companionSceneTarget = v === "tab" ? "tab" : "write";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.showWordCounts.name"))
      .setDesc(t("settings.showWordCounts.desc"))
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showWordCounts).onChange(async (v) => {
          this.plugin.settings.showWordCounts = v;
          await this.plugin.saveSettings();
          this.plugin.refreshExplorer();
        })
      );

    new Setting(containerEl)
      .setName(t(HIDE_ARCHIVED_ROW.nameKey))
      .setDesc(t(HIDE_ARCHIVED_ROW.descKey))
      .addToggle((t) =>
        t.setValue(this.plugin.settings.hideArchivedInSeries).onChange(async (v) => {
          this.plugin.settings.hideArchivedInSeries = v;
          await this.plugin.saveSettings();
          this.plugin.refreshExplorer();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.sceneHeadingLevel.name"))
      .setDesc(t("settings.sceneHeadingLevel.desc"))
      .addSlider((s) =>
        s
          .setLimits(1, 6, 1)
          .setValue(this.plugin.settings.sceneHeadingLevel)
          .onChange(async (v) => {
            this.plugin.settings.sceneHeadingLevel = v;
            await this.plugin.saveSettings();
          })
      );

    this.renderManuscript(containerEl);
    this.renderWriteEditor(containerEl);

    new Setting(containerEl).setName(t("settings.goals.heading")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.weekStart.name"))
      .setDesc(t("settings.weekStart.desc"))
      .addDropdown((d) =>
        d
          .addOption("monday", t("settings.weekStart.monday"))
          .addOption("sunday", t("settings.weekStart.sunday"))
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (v) => {
            this.plugin.settings.weekStart = v === "sunday" ? "sunday" : "monday";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.dailyWordGoal.name"))
      .setDesc(t("settings.dailyWordGoal.desc"))
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.dailyWordGoal}`)
          .onChange(async (v) => {
            this.plugin.settings.dailyWordGoal = clampInt(v, 0, 100000, 500);
            await this.plugin.saveSettings();
            this.plugin.refreshStatus();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.weeklyWordGoal.name"))
      .setDesc(t("settings.weeklyWordGoal.desc"))
      .addText((t) =>
        t.setValue(`${this.plugin.settings.weeklyWordGoal}`).onChange(async (v) => {
          this.plugin.settings.weeklyWordGoal = clampInt(v, 0, 1000000, 3500);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.monthlyWordGoal.name"))
      .setDesc(t("settings.monthlyWordGoal.desc"))
      .addText((t) =>
        t.setValue(`${this.plugin.settings.monthlyWordGoal}`).onChange(async (v) => {
          this.plugin.settings.monthlyWordGoal = clampInt(v, 0, 10000000, 15000);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.habitDaysPerWeek.name"))
      .setDesc(t("settings.habitDaysPerWeek.desc"))
      .addText((t) =>
        t.setValue(`${this.plugin.settings.habitDaysPerWeek}`).onChange(async (v) => {
          this.plugin.settings.habitDaysPerWeek = clampInt(v, 1, 7, 5);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.habitMinWords.name"))
      .setDesc(t("settings.habitMinWords.desc"))
      .addText((t) =>
        t.setValue(`${this.plugin.settings.habitMinWords}`).onChange(async (v) => {
          this.plugin.settings.habitMinWords = clampInt(v, 1, 100000, 100);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.defaultSprintMinutes.name"))
      .setDesc(t("settings.defaultSprintMinutes.desc"))
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.defaultSprintMinutes}`)
          .onChange(async (v) => {
            this.plugin.settings.defaultSprintMinutes = clampInt(v, 1, 600, 15);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.defaultSprintWordGoal.name"))
      .setDesc(t("settings.defaultSprintWordGoal.desc"))
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.defaultSprintWordGoal}`)
          .onChange(async (v) => {
            this.plugin.settings.defaultSprintWordGoal = clampInt(v, 0, 100000, 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.streakThreshold.name"))
      .setDesc(t("settings.streakThreshold.desc"))
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.streakThreshold}`)
          .onChange(async (v) => {
            this.plugin.settings.streakThreshold = clampInt(v, 1, 100000, 1);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName(t("settings.counts.heading")).setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.counts.intro"),
    });
    for (const cat of WORD_CATEGORIES) {
      const label = CATEGORY_LABELS[cat];
      new Setting(containerEl)
        .setName(t(label.nameKey))
        .setDesc(t(label.descKey))
        .addToggle((t) =>
          t
            .setValue(!this.plugin.settings.excludedFromGoals.includes(cat))
            .onChange(async (counts) => {
              const excluded = new Set(this.plugin.settings.excludedFromGoals);
              if (counts) excluded.delete(cat);
              else excluded.add(cat);
              this.plugin.settings.excludedFromGoals = [...excluded];
              await this.plugin.saveSettings();
              // Re-project immediately — these numbers are otherwise only
              // recomputed on the next edit or panel rebuild.
              this.plugin.refreshStatus();
              this.plugin.refreshView();
            })
        );
    }

    new Setting(containerEl).setName(t("settings.folders.heading")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.baseFolder.name"))
      .setDesc(t("settings.baseFolder.desc"))
      .addText((c) =>
        c
          .setPlaceholder(t("settings.baseFolder.placeholder"))
          .setValue(this.plugin.settings.baseFolder)
          .onChange(async (v) => {
            this.plugin.settings.baseFolder = trimSlashes(v);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.codexFolder.name"))
      .setDesc(t("settings.codexFolder.desc"))
      .addText((t) =>
        t
          .setValue(this.plugin.settings.codexFolder)
          .onChange(async (v) => {
            this.plugin.settings.codexFolder = v.trim() || "Codex";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.coLocateCodex.name"))
      .setDesc(t("settings.coLocateCodex.desc"))
      .addToggle((t) =>
        t.setValue(this.plugin.settings.coLocateCodex).onChange(async (v) => {
          this.plugin.settings.coLocateCodex = v;
          await this.plugin.saveSettings();
        })
      );

    // Mirrors the conditional "Layout" group in getSettingDefinitions().
    if (deviceFlaggedAsPhone()) {
      new Setting(containerEl).setName(t("settings.layout.heading")).setHeading();
      new Setting(containerEl)
        .setName(t(LAYOUT_TOGGLE.nameKey))
        .setDesc(t(LAYOUT_TOGGLE.descKey))
        .addToggle((t) =>
          t
            .setValue(this.plugin.settings.forceTabletLayout)
            .onChange((v) => void this.plugin.setForceTabletLayout(v))
        );
    }

    new Setting(containerEl).setName(t("settings.help.heading")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.showHints.name"))
      .setDesc(t("settings.showHints.desc"))
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showHelpHints).onChange(async (v) => {
          this.plugin.settings.showHelpHints = v;
          await this.plugin.saveSettings();
          this.plugin.refreshExplorer();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.resetTips.name"))
      .setDesc(t("settings.resetTips.desc"))
      .addButton((b) => b.setButtonText(t("common.reset")).onClick(() => void this.resetTips()));
  }
}

/** A number-control definition backed by a NUMERIC_BOUNDS entry. */
/** Default-compile-format choices, shared by both settings renderers. */
function compileFormatOptions(): Record<OutputFormat, string> {
  return {
    md: t("settings.compileFormat.md"),
    html: t("settings.compileFormat.html"),
    docx: t("settings.compileFormat.docx"),
    pandoc: t("settings.compileFormat.pandoc"),
  };
}

function numberDef(
  name: string,
  desc: string,
  key: keyof InkswellSettings
): SettingDefinition {
  const bounds = NUMERIC_BOUNDS[key];
  return {
    name,
    desc,
    control: {
      type: "number",
      key,
      min: bounds?.lo,
      max: bounds?.hi,
      defaultValue: bounds?.fallback,
    },
  };
}

/** Trim leading/trailing slashes and surrounding whitespace from a folder path. */
function trimSlashes(s: string): string {
  return s.trim().replace(/^\/+|\/+$/g, "");
}

function clampInt(raw: string, lo: number, hi: number, fallback: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

/** Options for "Open scenes from the sidebar in" (both render paths). */
/** The language picker only appears once a catalog besides English ships. */
function hasTranslations(): boolean {
  return Object.keys(LOCALES).length > 1;
}

/** "auto" or a registered locale code; anything else (a removed locale) → "auto".
 *  The pseudo-locale (testing aid, never listed) survives so a reload keeps it. */
export function normalizeInterfaceLanguage(value: unknown): string {
  return typeof value === "string" &&
    (value === "auto" || value === PSEUDO_LOCALE || Object.prototype.hasOwnProperty.call(LOCALES, value))
    ? value
    : "auto";
}

/** Same as Obsidian, then every shipped language by its own name; drafts say so. */
function languageOptions(): Record<string, string> {
  const out: Record<string, string> = { auto: t("settings.interfaceLanguage.auto") };
  const codes = Object.keys(LOCALE_INFO).sort((a, b) => LOCALE_INFO[a].name.localeCompare(LOCALE_INFO[b].name));
  for (const code of codes) {
    const info = LOCALE_INFO[code];
    out[code] = info.reviewed ? info.name : t("settings.interfaceLanguage.draft", { name: info.name });
  }
  return out;
}

function companionTargetOptions(): Record<string, string> {
  return {
    write: t("settings.companionSceneTarget.write"),
    tab: t("settings.companionSceneTarget.tab"),
  };
}
