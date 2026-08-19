/**
 * Typed plugin settings + the settings tab.
 *
 * Settings persist via Obsidian's plugin data (`.obsidian/plugins/inkswell/data.json`).
 * Per-project config (compile workflows, goals, revisions) does NOT live here —
 * it belongs in the project index's `inkswell` frontmatter.
 */

import { App, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type { SettingDefinition, SettingDefinitionItem } from "obsidian";
import { tryFileOp } from "../lib/notify";
import type InkswellPlugin from "../../main";
import { OutputFormat } from "../compile/types";
import { WeekStart } from "../goals/goals";
import { WORD_CATEGORIES, WordCategory } from "../tracking/types";
import { FeatureGroup, FeatureId, OPTIONAL_FEATURES, featureEnabled } from "../features";
import { generateCodexTemplates, getCodexEntities } from "../codex/codex-store";
import { CategoryDef, allCategories } from "../codex/types";
import { CategoryModal } from "../codex/category-modal";
import { BeatTemplateDef, allTemplateMeta } from "../outliner/custom-templates";
import { BeatTemplateModal } from "../outliner/beat-template-modal";
import { confirmDelete } from "../scenes/scene-actions";
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
   * User-defined beat-sheet templates, merged after the built-ins wherever
   * templates are listed (via allTemplateMeta — computed at render time, never
   * cached). Normalized on load (normalizeCustomBeatTemplates); built-ins are
   * never editable. Deleting one leaves every project's sheet intact — the
   * Beats panel shows a missing-template notice with all notes editable.
   */
  customBeatTemplates: BeatTemplateDef[];
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
  weekStart: "monday",
  baseFolder: "Writing",
  codexFolder: "Codex",
  coLocateCodex: true,
  welcomeSeen: false,
  showHelpHints: true,
  dismissedHints: [],
  disabledFeatures: [],
  customCategories: [],
  customBeatTemplates: [],
};

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
    const s = this.plugin.settings;
    const items: SettingDefinitionItem[] = [
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

    // Features — one group per feature area, mirroring the tab's sub-headings.
    let group: { type: "group"; heading: string; items: SettingDefinition[] } | null = null;
    let lastGroup: FeatureGroup | null = null;
    for (const f of OPTIONAL_FEATURES) {
      if (f.group !== lastGroup) {
        group = { type: "group", heading: f.group, items: [] };
        items.push(group);
        lastGroup = f.group;
      }
      group?.items.push({
        name: f.label,
        desc: f.desc,
        control: { type: "toggle", key: `feature:${f.id}`, defaultValue: true },
      });
    }

    items.push(
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
      {
        type: "list",
        heading: "Custom Codex types",
        emptyState:
          "Add your own codex types (creatures, spells, ships…) next to the built-in seven.",
        items: s.customCategories.map((cat) => ({
          name: cat.label,
          desc: `${cat.plural} · codex: ${cat.id}`,
          action: () => this.openCategoryModal(cat),
        })),
        onDelete: (i) => {
          const cat = this.plugin.settings.customCategories[i];
          if (cat) void this.deleteCategory(cat);
        },
        addItem: { name: "Add custom type", action: () => this.openCategoryModal(null) },
      },
      {
        type: "list",
        heading: "Beat sheet templates",
        emptyState:
          "Add your own beat structures next to the built-in eight in Plan → Beats.",
        items: s.customBeatTemplates.map((tpl) => ({
          name: tpl.name,
          desc: `${tpl.beats.length} beats · template: ${tpl.id}`,
          action: () => this.openBeatTemplateModal(tpl),
        })),
        onDelete: (i) => {
          const tpl = this.plugin.settings.customBeatTemplates[i];
          if (tpl) void this.deleteBeatTemplate(tpl);
        },
        addItem: { name: "Add beat template", action: () => this.openBeatTemplateModal(null) },
      },
      {
        type: "group",
        heading: "Templates",
        items: [
          {
            name: "Generate starter templates",
            desc:
              "Create an editable note for each codex type — plus Scene.md for new scenes. " +
              "New entries and scenes are scaffolded from the matching note's frontmatter and body.",
            action: () => void this.generateTemplates(),
          },
        ],
      },
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
    if (key.startsWith("feature:")) {
      return featureEnabled(this.plugin.settings.disabledFeatures, key.slice(8) as FeatureId);
    }
    if (key.startsWith("counts:")) {
      return !this.plugin.settings.excludedFromGoals.includes(key.slice(7) as WordCategory);
    }
    return this.plugin.settings[key as keyof InkswellSettings];
  }

  /** Persist a definition-driven edit with the SAME clamping and side effects
   *  as the imperative tab (the two paths must never disagree). */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const s = this.plugin.settings;
    if (key.startsWith("feature:")) {
      await this.plugin.setFeatureEnabled(key.slice(8) as FeatureId, !!value);
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

  /**
   * Re-render the tab after a mutation that changes its structure (custom
   * codex types / beat templates added, edited, or deleted). On the
   * declarative path (1.13+, where display() is never called) `update()`
   * re-captures getSettingDefinitions() and re-renders; on older installs the
   * imperative rebuild does it. Without the update() call the definitions stay
   * as captured at plugin load, so new rows never appear and deleted ones
   * linger until the plugin reloads.
   */
  private refreshTab(): void {
    // SettingTab.update() ships with the declarative renderer (typed @since
    // 1.13.0; present on the late-1.12 builds that render declaratively too).
    // Looked up untyped because the API-floor linter can't model progressive
    // enhancement — installs without it take the imperative rebuild instead,
    // so no minAppVersion user loses anything. See AGENTS.md gotcha 12.
    const update = (this as unknown as { update?: unknown }).update;
    if (typeof update === "function") (update as () => void).call(this);
    else this.rerender();
  }

  /** Delete a custom codex type after confirmation (shared by the imperative
   *  trash button and the declarative list's delete affordance). */
  private async deleteCategory(cat: CategoryDef): Promise<void> {
    const n = getCodexEntities(this.app).filter((e) => e.category === cat.id).length;
    const msg =
      n > 0
        ? `Delete the "${cat.label}" type? ${n} existing entr${n === 1 ? "y" : "ies"} ` +
          "will show under Uncategorized — the notes themselves are not touched."
        : `Delete the "${cat.label}" type?`;
    if (!(await confirmDelete(this.app, msg))) return;
    this.plugin.settings.customCategories = this.plugin.settings.customCategories.filter(
      (c) => c.id !== cat.id
    );
    await this.plugin.saveSettings();
    this.plugin.refreshView();
    this.refreshTab();
  }

  /** Delete a custom beat template after confirmation (shared by the imperative
   *  trash button and the declarative list's delete affordance). */
  private async deleteBeatTemplate(tpl: BeatTemplateDef): Promise<void> {
    const msg =
      `Delete the "${tpl.name}" template? Projects using it keep every beat ` +
      "note — they show a missing-template notice until you re-create it " +
      "(same name) or pick another template.";
    if (!(await confirmDelete(this.app, msg))) return;
    this.plugin.settings.customBeatTemplates = this.plugin.settings.customBeatTemplates.filter(
      (t) => t.id !== tpl.id
    );
    await this.plugin.saveSettings();
    this.plugin.refreshView();
    this.refreshTab();
  }

  /**
   * The "Custom codex types" section: the user's own categories alongside the
   * seven built-ins. Add/edit go through CategoryModal; deleting a type never
   * touches notes — its entries show as "Uncategorized" in the Codex panel.
   */
  private renderCustomCategories(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Custom Codex types").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Add your own codex types (creatures, spells, ships…) next to the built-in " +
        "seven. Entries get a generic profile — Aliases, Type, Description, " +
        "Significance, Related entries. Built-in types can't be edited or removed. " +
        "For bespoke fields, edit the type's template note (below) — extra " +
        "frontmatter you add there is kept on every entry.",
    });

    for (const cat of this.plugin.settings.customCategories) {
      const row = new Setting(containerEl)
        .setName(cat.label)
        .setDesc(`${cat.plural} · codex: ${cat.id}`)
        .addButton((b) =>
          b.setButtonText("Edit").onClick(() => this.openCategoryModal(cat))
        )
        .addExtraButton((b) =>
          b
            .setIcon("trash")
            .setTooltip("Delete")
            .onClick(() => void this.deleteCategory(cat))
        );
      const iconEl = createSpan({ cls: "inkswell-settings__caticon" });
      setIcon(iconEl, cat.icon);
      row.nameEl.prepend(iconEl);
    }

    new Setting(containerEl).addButton((b) =>
      b
        .setButtonText("Add custom type")
        .setCta()
        .onClick(() => this.openCategoryModal(null))
    );
  }

  /** Add-or-edit a custom codex type (shared by the tab and settings search). */
  private openCategoryModal(existing: CategoryDef | null): void {
    // Ids/labels a new or edited type may not collide with (excludes itself).
    const others = allCategories(this.plugin.settings.customCategories).filter(
      (c) => c.id !== existing?.id
    );
    new CategoryModal(this.app, {
      existing,
      takenIds: others.map((c) => c.id),
      takenLabels: others.map((c) => c.label.toLowerCase()),
      onSubmit: async (def: CategoryDef): Promise<void> => {
        const list = this.plugin.settings.customCategories;
        const i = list.findIndex((c) => c.id === def.id);
        if (i >= 0) list[i] = def;
        else list.push(def);
        await this.plugin.saveSettings();
        this.plugin.refreshView();
        this.refreshTab();
      },
    }).open();
  }

  /**
   * The "Beat sheet templates" section: the user's own beat structures alongside
   * the built-in eight. Add/edit go through BeatTemplateModal; deleting one
   * never touches project notes — sheets using it show a missing-template
   * notice in Plan → Beats with every saved note intact.
   */
  private renderBeatTemplates(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Beat sheet templates").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Add your own beat structures next to the built-in eight in Plan → Beats. " +
        "Built-in templates can't be edited or removed. Deleting a custom template " +
        "never touches your notes — projects using it show a missing-template notice " +
        "with everything intact until you re-create it or pick another.",
    });

    for (const tpl of this.plugin.settings.customBeatTemplates) {
      new Setting(containerEl)
        .setName(tpl.name)
        .setDesc(`${tpl.beats.length} beats · template: ${tpl.id}`)
        .addButton((b) => b.setButtonText("Edit").onClick(() => this.openBeatTemplateModal(tpl)))
        .addExtraButton((b) =>
          b
            .setIcon("trash")
            .setTooltip("Delete")
            .onClick(() => void this.deleteBeatTemplate(tpl))
        );
    }

    new Setting(containerEl).addButton((b) =>
      b
        .setButtonText("Add beat template")
        .setCta()
        .onClick(() => this.openBeatTemplateModal(null))
    );
  }

  /** Add-or-edit a custom beat template (shared by the tab and settings search). */
  private openBeatTemplateModal(existing: BeatTemplateDef | null): void {
    new BeatTemplateModal(this.app, {
      existing,
      takenIds: allTemplateMeta(this.plugin.settings.customBeatTemplates)
        .map((m) => m.id)
        .filter((id) => id !== existing?.id),
      onSubmit: async (def: BeatTemplateDef): Promise<void> => {
        const list = this.plugin.settings.customBeatTemplates;
        const i = list.findIndex((t) => t.id === def.id);
        if (i >= 0) list[i] = def;
        else list.push(def);
        await this.plugin.saveSettings();
        this.plugin.refreshView();
        this.refreshTab();
      },
    }).open();
  }

  /** Generate the starter template notes (shared by the tab and settings search). */
  private async generateTemplates(): Promise<void> {
    const templateFolder = resolveTemplateFolder(this.plugin.settings) || "(vault root)";
    const created = await tryFileOp(
      () =>
        generateCodexTemplates(
          this.app,
          this.plugin.settings,
          this.plugin.settings.customCategories
        ),
      "Couldn't generate the starter templates."
    );
    if (created === null) return;
    new Notice(
      created.length > 0
        ? `Created ${created.length} template${created.length === 1 ? "" : "s"} in "${templateFolder}".`
        : "Templates already exist — nothing to create."
    );
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

    this.renderCustomCategories(containerEl);
    this.renderBeatTemplates(containerEl);

    new Setting(containerEl).setName("Templates").setHeading();

    const templateFolder = resolveTemplateFolder(this.plugin.settings) || "(vault root)";
    new Setting(containerEl)
      .setName("Generate starter templates")
      .setDesc(
        `Create an editable note for each codex type — plus Scene.md for new scenes — in ` +
          `"${templateFolder}". New entries and scenes are scaffolded from the matching ` +
          "note's frontmatter and body — add your own tags, fields, or sections (use " +
          "{{title}} for the new note's name). Inkswell still sets codex:, scope, and a " +
          "default scene status automatically. Delete a template to return to the default."
      )
      .addButton((b) =>
        b.setButtonText("Generate starter templates").onClick(() => void this.generateTemplates())
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
