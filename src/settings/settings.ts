/**
 * Typed plugin settings + the settings tab.
 *
 * Settings persist via Obsidian's plugin data (`.obsidian/plugins/inkswell/data.json`).
 * Per-project config (compile workflows, goals, revisions) does NOT live here —
 * it belongs in the project index's `inkswell` frontmatter.
 */

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { tryFileOp } from "../lib/notify";
import type InkswellPlugin from "../../main";
import { OutputFormat } from "../compile/types";
import { FeatureGroup, OPTIONAL_FEATURES, featureEnabled } from "../features";
import { generateCodexTemplates } from "../codex/codex-store";
import { resolveTemplateFolder } from "./folders";
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
  /** Weekly word goal (Mon→today). */
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
  baseFolder: "Writing",
  codexFolder: "Codex",
  coLocateCodex: true,
  welcomeSeen: false,
  showHelpHints: true,
  dismissedHints: [],
  disabledFeatures: [],
};

export class InkswellSettingTab extends PluginSettingTab {
  private plugin: InkswellPlugin;

  constructor(app: App, plugin: InkswellPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * The "Features" section: a toggle per optional surface, grouped by area.
   * Hiding is lossless (only rendering/commands are gated) — the intro says so.
   */
  private renderFeatures(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Features").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Hide surfaces you don't use to keep Inkswell lean. Hiding only hides — " +
        "your notes and data are kept, and turning a feature back on restores everything. " +
        "You can also right-click an optional tab in the app to hide it.",
    });

    let lastGroup: FeatureGroup | null = null;
    for (const f of OPTIONAL_FEATURES) {
      if (f.group !== lastGroup) {
        new Setting(containerEl).setName(f.group).setHeading();
        lastGroup = f.group;
      }
      new Setting(containerEl)
        .setName(f.label)
        .setDesc(f.desc)
        .addToggle((t) =>
          t
            .setValue(featureEnabled(this.plugin.settings.disabledFeatures, f.id))
            .onChange((v) => void this.plugin.setFeatureEnabled(f.id, v))
        );
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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

    this.renderFeatures(containerEl);

    new Setting(containerEl).setName("Goals & sprints").setHeading();

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
      .setDesc("Target words per week (Monday→today).")
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

    new Setting(containerEl).setName("Codex templates").setHeading();

    const templateFolder = resolveTemplateFolder(this.plugin.settings) || "(vault root)";
    new Setting(containerEl)
      .setName("Generate starter templates")
      .setDesc(
        `Create an editable note for each codex type in "${templateFolder}". New entries ` +
          "are scaffolded from the matching note's frontmatter and body — add your own " +
          "tags, fields, or sections (use {{title}} for the entry name). Inkswell still " +
          "sets codex: and scope automatically; don't add a codex: key. Delete a template " +
          "to return to the default."
      )
      .addButton((b) =>
        b.setButtonText("Generate starter templates").onClick(async () => {
          const created = await tryFileOp(
            () => generateCodexTemplates(this.app, this.plugin.settings),
            "Couldn't generate the starter templates."
          );
          if (created === null) return;
          new Notice(
            created.length > 0
              ? `Created ${created.length} template${created.length === 1 ? "" : "s"} in "${templateFolder}".`
              : "Templates already exist — nothing to create."
          );
        })
      );

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
      .addButton((b) =>
        b.setButtonText("Reset").onClick(async () => {
          await resetHelpState(this.plugin);
          this.plugin.refreshExplorer();
          new Notice("Tips reset.");
          new WelcomeModal(this.app, this.plugin).open();
        })
      );
  }
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
