/**
 * Typed plugin settings + the settings tab.
 *
 * Settings persist via Obsidian's plugin data (`.obsidian/plugins/inkswell/data.json`).
 * Per-project config (compile workflows, goals, revisions) does NOT live here —
 * it belongs in the project index's `inkswell` frontmatter.
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import type InkswellPlugin from "../../main";
import { OutputFormat } from "../compile/types";

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
  /** Minimum words for a day to count toward a writing streak. */
  streakThreshold: number;
  /** Vault folder where new codex entities are created. */
  codexFolder: string;
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
  streakThreshold: 1,
  codexFolder: "Codex",
};

export class InkswellSettingTab extends PluginSettingTab {
  private plugin: InkswellPlugin;

  constructor(app: App, plugin: InkswellPlugin) {
    super(app, plugin);
    this.plugin = plugin;
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
          .setDynamicTooltip()
          .setValue(this.plugin.settings.sceneHeadingLevel)
          .onChange(async (v) => {
            this.plugin.settings.sceneHeadingLevel = v;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Goals & sprints" });

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

    containerEl.createEl("h3", { text: "Codex" });

    new Setting(containerEl)
      .setName("Codex folder")
      .setDesc("Vault folder where new codex entities (characters, locations…) are created.")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.codexFolder)
          .onChange(async (v) => {
            this.plugin.settings.codexFolder = v.trim() || "Codex";
            await this.plugin.saveSettings();
          })
      );
  }
}

function clampInt(raw: string, lo: number, hi: number, fallback: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
