/**
 * "Export story bible" dialog (#50): pick what goes in — alpha readers and
 * editors want different things (spoilers) — then write one note and open it.
 * The picks are remembered in `settings.storyBible`.
 */

import { App, Notice, Setting } from "obsidian";
import { featureEnabled } from "../features";
import { MessageKey, formatNumber, t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { Project, isMultiScene } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { STORY_BIBLE_SECTIONS, StoryBibleSection, assembleStoryBible } from "./story-bible";
import { allCategories, categoryDisplayPlural } from "../codex/types";
import { UNCATEGORIZED, codexGroups, gatherStoryBible, writeStoryBible } from "./story-bible-io";
import type InkswellPlugin from "../../main";

export class StoryBibleModal extends FormModal {
  private sections: Set<StoryBibleSection>;
  private types: Set<string>;
  private readonly available: { id: StoryBibleSection; labelKey: MessageKey }[];
  private readonly groups: { id: string; label: string; count: number }[];

  constructor(
    app: App,
    private plugin: InkswellPlugin,
    private project: Project
  ) {
    super(app);
    this.cta = t("plan.bible.export");
    const disabled = plugin.settings.disabledFeatures;
    const s = plugin.settings;
    const cats = allCategories(s.customCategories, s.categoryOverrides);
    this.groups = codexGroups(plugin, project).map((g) => {
      const def = cats.find((c) => c.id === g.id);
      return { id: g.id, label: def ? categoryDisplayPlural(def) : g.label, count: g.entities.length };
    });
    this.available = STORY_BIBLE_SECTIONS.filter((s) => {
      if (s.id === "beats") return featureEnabled(disabled, "beats");
      if (s.id === "outline") return isMultiScene(project.draft);
      if (s.id === "codex") return this.groups.length > 0;
      return true;
    });
    const remembered = plugin.settings.storyBible;
    this.sections = new Set(
      remembered.sections.filter((s): s is StoryBibleSection =>
        this.available.some((a) => a.id === s)
      )
    );
    this.types = new Set(
      remembered.codexTypes === null
        ? this.groups.map((g) => g.id)
        : remembered.codexTypes.filter((type) => this.groups.some((g) => g.id === type))
    );
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("plan.bible.title", { title: this.project.draft.title }) });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("plan.bible.intro"),
    });

    const typeRows: Setting[] = [];
    for (const s of this.available) {
      new Setting(contentEl).setName(t(s.labelKey)).addToggle((toggle) =>
        toggle.setValue(this.sections.has(s.id)).onChange((on) => {
          if (on) this.sections.add(s.id);
          else this.sections.delete(s.id);
          if (s.id === "codex") for (const r of typeRows) r.setDisabled(!on);
        })
      );
      if (s.id === "codex") {
        for (const g of this.groups) {
          const row = new Setting(contentEl)
            .setName(
              t("plan.bible.codexType", {
                // The group label is vault text (it heads the note's section); only
                // the orphan bucket has a UI name of its own.
                label: g.id === UNCATEGORIZED ? t("plan.bible.uncategorized") : g.label,
                count: formatNumber(g.count),
              })
            )
            .addToggle((toggle) =>
              toggle.setValue(this.types.has(g.id)).onChange((on) => {
                if (on) this.types.add(g.id);
                else this.types.delete(g.id);
              })
            );
          row.settingEl.addClass("inkswell-storybible__type");
          row.setDisabled(!this.sections.has("codex"));
          typeRows.push(row);
        }
      }
    }
  }

  protected async submit(): Promise<boolean> {
    if (this.sections.size === 0) {
      new Notice(t("plan.bible.pickSection"));
      return false;
    }
    const allTypes = this.groups.every((g) => this.types.has(g.id));
    this.plugin.settings.storyBible = {
      sections: STORY_BIBLE_SECTIONS.map((s) => s.id).filter((id) => this.sections.has(id)),
      codexTypes: allTypes ? null : [...this.types],
    };
    void this.plugin.saveSettings();

    const file = await tryFileOp(async () => {
      const input = await gatherStoryBible(this.plugin, this.project, [...this.types]);
      return writeStoryBible(this.app, this.project, assembleStoryBible(input, this.sections));
    }, t("plan.bible.writeFailed"));
    if (file === null) return false; // failed (already reported) or the writer declined
    new Notice(t("plan.bible.written", { path: file.path }));
    openScene(this.app, file);
    return true;
  }
}
