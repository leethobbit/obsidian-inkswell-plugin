/**
 * Prompt for a project's total word target and persist it under the index
 * note's `inkswell.goals.target` frontmatter.
 */

import { App, Notice, Setting, TFile } from "obsidian";
import { t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { persistGoalsPatch } from "../projects/index-writer";
import { Project } from "../projects/types";

export class TargetModal extends FormModal {
  private project: Project;
  private value: number;
  private deadline: string;
  private daysPerWeek: number;

  constructor(
    app: App,
    project: Project,
    /** Marks the write as the app's own so the host soft-refreshes in place. */
    private markWrite: (path: string) => void = () => {}
  ) {
    super(app);
    this.project = project;
    this.value = project.inkswell?.goals?.target ?? 0;
    this.deadline = project.inkswell?.goals?.deadline ?? "";
    this.daysPerWeek = project.inkswell?.goals?.daysPerWeek ?? 7;
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("goal.target.title", { title: this.project.draft.title }) });

    new Setting(contentEl)
      .setName(t("goal.target.words"))
      .setDesc(t("goal.target.wordsDesc"))
      .addText((text) =>
        text.setValue(`${this.value}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.value = Number.isFinite(n) && n > 0 ? n : 0;
        })
      );

    new Setting(contentEl)
      .setName(t("goal.target.deadline"))
      .setDesc(t("goal.target.deadlineDesc"))
      .addText((text) => {
        text.inputEl.type = "date";
        text.setValue(this.deadline).onChange((v) => (this.deadline = v));
      });

    new Setting(contentEl)
      .setName(t("goal.target.daysPerWeek"))
      .setDesc(t("goal.target.daysPerWeekDesc"))
      .addText((text) => {
        text.inputEl.type = "number";
        text.setValue(`${this.daysPerWeek}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.daysPerWeek = Number.isFinite(n) && n >= 1 && n <= 7 ? n : 7;
        });
      });
  }

  protected async submit(): Promise<boolean> {
    const file = this.app.vault.getAbstractFileByPath(this.project.vaultPath);
    if (!(file instanceof TFile)) {
      new Notice(t("goal.target.indexMissing"));
      return false;
    }
    // Field-level patch against the CURRENT stored goals (this modal edits all
    // three fields, so all three are in the patch; undefined clears a field).
    this.markWrite(file.path);
    const ok = await tryFileOp(
      () =>
        persistGoalsPatch(this.app, file, {
          target: this.value || undefined,
          deadline: this.deadline || undefined,
          daysPerWeek: this.daysPerWeek === 7 ? undefined : this.daysPerWeek,
        }),
      t("goal.target.saveFailed")
    );
    if (ok === null) return false; // failure already surfaced; keep the dialog open
    new Notice(this.value ? t("goal.target.set", { count: this.value }) : t("goal.target.cleared"));
    return true;
  }
}
