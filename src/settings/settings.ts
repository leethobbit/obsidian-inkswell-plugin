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
import { WORD_CATEGORIES, WordCategory } from "../tracking/types";
import { CategoryDef, CategoryOverrides } from "../codex/types";
import { BeatTemplateDef } from "../outliner/custom-templates";
import { deviceFlaggedAsPhone } from "../lib/platform";
import type { ListOverrides } from "./overridable-lists";
import { resetHelpState } from "../help/hint";
import { WelcomeModal } from "../help/welcome-modal";

export interface InkswellSettings {
  /** Default output format offered in the compile dialog. */
  defaultCompileFormat: OutputFormat;
  /** Show word counts in the explorer. */
  showWordCounts: boolean;
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
}

export const DEFAULT_SETTINGS: InkswellSettings = {
  defaultCompileFormat: "md",
  showWordCounts: true,
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
  name: "Customize Inkswell",
  desc:
    "Codex types and fields, starter templates, beat structures, scene statuses, writing " +
    "prompts, checklists, and which features are shown — all edited inside Inkswell.",
};

/** Copy for the one platform-conditional row (shared by both renderers). */
const LAYOUT_TOGGLE = {
  name: "Use the full layout on this device",
  desc:
    "Obsidian classifies this screen as phone-sized, so Inkswell shows its phone layout and " +
    "keeps Plan and Publish behind a “needs a larger screen” notice. Turn this on if you're on a tablet.",
};

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
  name: string;
  desc: string;
}[] = [
  {
    key: "typewriterMode",
    name: "Typewriter mode",
    desc:
      "Keep the line you're typing on vertically centered in the Write editor, so your eyes stay in one place. " +
      "Mouse clicks don't recenter. Also available as the command “Toggle typewriter mode (Write editor)”.",
  },
  {
    key: "manuscriptTypography",
    name: "Manuscript typography",
    desc:
      "Book-style layout in the Write editor: paragraphs get a first-line indent (except the first paragraph " +
      "after a heading or scene break), and headings are centered. Purely visual — your text is unchanged. " +
      "The font follows Obsidian's Appearance → Text font.",
  },
  {
    key: "smartDashes",
    name: "Smart dashes",
    desc:
      "In the Write editor, typing -- becomes an en dash (–) and a third - makes an em dash (—). " +
      "A line of dashes (---) is left alone. Applies only to Inkswell's Write editor, not Obsidian's notes.",
  },
  {
    key: "smartQuotes",
    name: "Smart quotes",
    desc:
      "Straight quotes typed in the Write editor become curly quotes (“ ” and ‘ ’); apostrophes become ’. " +
      "Skipped inside code and links.",
  },
  {
    key: "smartEllipsis",
    name: "Smart ellipsis",
    desc: "Three periods typed in the Write editor become an ellipsis (…).",
  },
];

/** Settings-tab copy for the goal category toggles. */
const CATEGORY_LABELS: Record<WordCategory, { name: string; desc: string }> = {
  scene: {
    name: "Manuscript scenes",
    desc: "Scene files and single-note projects — the manuscript itself.",
  },
  planning: {
    name: "Planning notes",
    desc: "Each project's planning note (synopsis, plot groundwork, act sketch).",
  },
  codex: {
    name: "Codex notes",
    desc: "Notes with a codex key (characters, places, lore), wherever they live.",
  },
  other: {
    name: "Other project notes",
    desc: "The project index note and any other notes inside a project's folder.",
  },
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

const MILESTONE_DESC =
  "Put a small tag in the Write editor's margin on the line where the scene's running word count " +
  "passes each multiple of this number (e.g. 500 → tags at 500, 1k, 1.5k…). 0 = off; minimum 100.";

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
        name: CUSTOMIZE_ROW.name,
        desc: CUSTOMIZE_ROW.desc,
        action: () => this.openCustomize(),
      },
      {
        name: "Default compile format",
        desc: "Format pre-selected when you open the compile dialog.",
        control: {
          type: "dropdown",
          key: "defaultCompileFormat",
          options: { md: "Markdown", html: "HTML", pandoc: "Pandoc (docx/pdf/epub)" },
          defaultValue: "md",
        },
      },
      {
        name: "Show word counts",
        desc: "Display per-scene and per-project word counts in the explorer.",
        control: { type: "toggle", key: "showWordCounts", defaultValue: true },
      },
      {
        name: "Scene heading level",
        desc: "Heading level (1–6) for the optional 'prepend title' compile step.",
        control: { type: "slider", key: "sceneHeadingLevel", min: 1, max: 6, step: 1 },
      },
    ];

    items.push(
      {
        type: "group",
        heading: "Write editor",
        items: [
          ...WRITE_EDITOR_TOGGLES.map((o) => ({
            name: o.name,
            desc: o.desc,
            control: { type: "toggle" as const, key: o.key, defaultValue: false },
          })),
          numberDef("Milestone tags every…", MILESTONE_DESC, "milestoneWords"),
        ],
      },
      {
        type: "group",
        heading: "Goals & sprints",
        items: [
          {
            name: "Week starts on",
            desc: "First day of the week for weekly goals, habit tracking, and the heatmap.",
            control: {
              type: "dropdown",
              key: "weekStart",
              options: { monday: "Monday", sunday: "Sunday" },
              defaultValue: "monday",
            },
          },
          numberDef("Daily word goal", "Target words per day, shown in the status bar and stats.", "dailyWordGoal"),
          numberDef("Weekly word goal", "Target words per week (start of week→today).", "weeklyWordGoal"),
          numberDef("Monthly word goal", "Target words per month (1st→today).", "monthlyWordGoal"),
          numberDef("Habit: days per week", "How many days a week you aim to write.", "habitDaysPerWeek"),
          numberDef("Habit: minimum words/day", "Minimum words for a day to count toward the habit.", "habitMinWords"),
          numberDef("Default sprint length", "Default sprint duration in minutes.", "defaultSprintMinutes"),
          numberDef("Default sprint word goal", "Word goal pre-filled in the sprint dialog. 0 = no goal.", "defaultSprintWordGoal"),
          numberDef("Streak threshold", "Minimum words in a day for it to extend your writing streak.", "streakThreshold"),
        ],
      },
      {
        type: "group",
        heading: "What counts toward goals",
        items: WORD_CATEGORIES.map((cat) => ({
          name: CATEGORY_LABELS[cat].name,
          desc: CATEGORY_LABELS[cat].desc,
          control: { type: "toggle" as const, key: `counts:${cat}` },
        })),
      },
      {
        type: "group",
        heading: "Folders",
        items: [
          {
            name: "Base folder",
            desc:
              "Folder new projects and the shared codex scaffold under. Blank = vault root. " +
              "This only sets where new content is created — existing projects and codex " +
              "anywhere in the vault still work.",
            control: { type: "folder", key: "baseFolder", placeholder: "(vault root)" },
          },
          {
            name: "Codex folder name",
            desc: "Subfolder name used for codex notes (shared and per-project).",
            control: { type: "text", key: "codexFolder", defaultValue: "Codex" },
          },
          {
            name: "Co-locate codex with projects",
            desc:
              "Book-scoped entries are created in their project's own codex folder; " +
              "series and global entries go to the shared base codex. Organization only — " +
              "visibility is set per-entry by its Scope field, not by where the note lives.",
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
        heading: "Layout",
        items: [
          {
            name: LAYOUT_TOGGLE.name,
            desc: LAYOUT_TOGGLE.desc,
            control: { type: "toggle", key: "forceTabletLayout", defaultValue: false },
          },
        ],
      });
    }
    items.push(
      {
        type: "group",
        heading: "Help",
        items: [
          {
            name: "Show contextual tips",
            desc:
              'Show the dismissible "How this works" callouts at the top of panels. ' +
              "Tips you dismiss stay hidden until you reset them below.",
            control: { type: "toggle", key: "showHelpHints", defaultValue: true },
          },
          {
            name: "Reset tips & replay welcome",
            desc: "Re-enable every dismissed tip and show the welcome screen again.",
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
      case "showWordCounts":
        s.showWordCounts = !!value;
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
    if (key === "showWordCounts" || key === "showHelpHints") this.plugin.refreshExplorer();
    if (key === "dailyWordGoal") this.plugin.refreshStatus();
    if (key === "milestoneWords") this.plugin.applyEditorPrefs();
  }

  /** The "Write editor" section (imperative fallback): editor toggles.
   *  Same table as the declarative group — keep them in lockstep. */
  private renderWriteEditor(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Write editor").setHeading();
    for (const o of WRITE_EDITOR_TOGGLES) {
      new Setting(containerEl)
        .setName(o.name)
        .setDesc(o.desc)
        .addToggle((t) =>
          t.setValue(this.plugin.settings[o.key]).onChange(async (v) => {
            this.plugin.settings[o.key] = v;
            await this.plugin.saveSettings();
            this.plugin.applyEditorPrefs();
          })
        );
    }
    new Setting(containerEl)
      .setName("Milestone tags every…")
      .setDesc(MILESTONE_DESC)
      .addText((t) =>
        t.setValue(`${this.plugin.settings.milestoneWords}`).onChange(async (v) => {
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
    new Notice("Tips reset.");
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
      .setName(CUSTOMIZE_ROW.name)
      .setDesc(CUSTOMIZE_ROW.desc)
      .addButton((b) => b.setButtonText("Open customize").setCta().onClick(() => this.openCustomize()));

    new Setting(containerEl)
      .setName("Default compile format")
      .setDesc("Format pre-selected when you open the compile dialog.")
      .addDropdown((d) =>
        d
          .addOption("md", "Markdown")
          .addOption("html", "HTML")
          .addOption("pandoc", "Pandoc (docx/pdf/epub)")
          .setValue(this.plugin.settings.defaultCompileFormat)
          .onChange(async (v) => {
            this.plugin.settings.defaultCompileFormat = v as OutputFormat;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show word counts")
      .setDesc("Display per-scene and per-project word counts in the explorer.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showWordCounts).onChange(async (v) => {
          this.plugin.settings.showWordCounts = v;
          await this.plugin.saveSettings();
          this.plugin.refreshExplorer();
        })
      );

    new Setting(containerEl)
      .setName("Scene heading level")
      .setDesc(
        "Heading level (1–6) for the optional 'prepend title' compile step."
      )
      .addSlider((s) =>
        s
          .setLimits(1, 6, 1)
          .setValue(this.plugin.settings.sceneHeadingLevel)
          .onChange(async (v) => {
            this.plugin.settings.sceneHeadingLevel = v;
            await this.plugin.saveSettings();
          })
      );

    this.renderWriteEditor(containerEl);

    new Setting(containerEl).setName("Goals & sprints").setHeading();

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("First day of the week for weekly goals, habit tracking, and the heatmap.")
      .addDropdown((d) =>
        d
          .addOption("monday", "Monday")
          .addOption("sunday", "Sunday")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (v) => {
            this.plugin.settings.weekStart = v === "sunday" ? "sunday" : "monday";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily word goal")
      .setDesc("Target words per day, shown in the status bar and stats.")
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
      .setName("Weekly word goal")
      .setDesc("Target words per week (start of week→today).")
      .addText((t) =>
        t.setValue(`${this.plugin.settings.weeklyWordGoal}`).onChange(async (v) => {
          this.plugin.settings.weeklyWordGoal = clampInt(v, 0, 1000000, 3500);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Monthly word goal")
      .setDesc("Target words per month (1st→today).")
      .addText((t) =>
        t.setValue(`${this.plugin.settings.monthlyWordGoal}`).onChange(async (v) => {
          this.plugin.settings.monthlyWordGoal = clampInt(v, 0, 10000000, 15000);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Habit: days per week")
      .setDesc("How many days a week you aim to write.")
      .addText((t) =>
        t.setValue(`${this.plugin.settings.habitDaysPerWeek}`).onChange(async (v) => {
          this.plugin.settings.habitDaysPerWeek = clampInt(v, 1, 7, 5);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Habit: minimum words/day")
      .setDesc("Minimum words for a day to count toward the habit.")
      .addText((t) =>
        t.setValue(`${this.plugin.settings.habitMinWords}`).onChange(async (v) => {
          this.plugin.settings.habitMinWords = clampInt(v, 1, 100000, 100);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Default sprint length")
      .setDesc("Default sprint duration in minutes.")
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.defaultSprintMinutes}`)
          .onChange(async (v) => {
            this.plugin.settings.defaultSprintMinutes = clampInt(v, 1, 600, 15);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default sprint word goal")
      .setDesc("Word goal pre-filled in the sprint dialog. 0 = no goal.")
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.defaultSprintWordGoal}`)
          .onChange(async (v) => {
            this.plugin.settings.defaultSprintWordGoal = clampInt(v, 0, 100000, 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Streak threshold")
      .setDesc("Minimum words in a day for it to extend your writing streak.")
      .addText((t) =>
        t
          .setValue(`${this.plugin.settings.streakThreshold}`)
          .onChange(async (v) => {
            this.plugin.settings.streakThreshold = clampInt(v, 1, 100000, 1);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("What counts toward goals").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Goals, streaks, and sprints only ever count writing in project notes — " +
        "notes elsewhere in the vault never count. Choose which kinds count. " +
        "Changing a toggle also re-counts words already written since this " +
        "option was introduced; older history always counts.",
    });
    for (const cat of WORD_CATEGORIES) {
      const label = CATEGORY_LABELS[cat];
      new Setting(containerEl)
        .setName(label.name)
        .setDesc(label.desc)
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

    new Setting(containerEl).setName("Folders").setHeading();

    new Setting(containerEl)
      .setName("Base folder")
      .setDesc(
        "Folder new projects and the shared codex scaffold under. Blank = vault root. " +
          "This only sets where new content is created — existing projects and codex " +
          "anywhere in the vault still work."
      )
      .addText((t) =>
        t
          .setPlaceholder("(vault root)")
          .setValue(this.plugin.settings.baseFolder)
          .onChange(async (v) => {
            this.plugin.settings.baseFolder = trimSlashes(v);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Codex folder name")
      .setDesc("Subfolder name used for codex notes (shared and per-project).")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.codexFolder)
          .onChange(async (v) => {
            this.plugin.settings.codexFolder = v.trim() || "Codex";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Co-locate codex with projects")
      .setDesc(
        "Book-scoped entries are created in their project's own codex folder; " +
          "series and global entries go to the shared base codex. Organization only — " +
          "visibility is set per-entry by its Scope field, not by where the note lives."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.coLocateCodex).onChange(async (v) => {
          this.plugin.settings.coLocateCodex = v;
          await this.plugin.saveSettings();
        })
      );

    // Mirrors the conditional "Layout" group in getSettingDefinitions().
    if (deviceFlaggedAsPhone()) {
      new Setting(containerEl).setName("Layout").setHeading();
      new Setting(containerEl)
        .setName(LAYOUT_TOGGLE.name)
        .setDesc(LAYOUT_TOGGLE.desc)
        .addToggle((t) =>
          t
            .setValue(this.plugin.settings.forceTabletLayout)
            .onChange((v) => void this.plugin.setForceTabletLayout(v))
        );
    }

    new Setting(containerEl).setName("Help").setHeading();

    new Setting(containerEl)
      .setName("Show contextual tips")
      .setDesc(
        'Show the dismissible "How this works" callouts at the top of panels. ' +
          "Tips you dismiss stay hidden until you reset them below."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showHelpHints).onChange(async (v) => {
          this.plugin.settings.showHelpHints = v;
          await this.plugin.saveSettings();
          this.plugin.refreshExplorer();
        })
      );

    new Setting(containerEl)
      .setName("Reset tips & replay welcome")
      .setDesc("Re-enable every dismissed tip and show the welcome screen again.")
      .addButton((b) => b.setButtonText("Reset").onClick(() => void this.resetTips()));
  }
}

/** A number-control definition backed by a NUMERIC_BOUNDS entry. */
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
