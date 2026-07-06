/**
 * Prompt for a project's total word target and persist it under the index
 * note's `inkswell.goals.target` frontmatter.
 */

import { App, Notice, Setting, TFile } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { persistInkswellData } from "../projects/index-writer";
import { Project } from "../projects/types";

export class TargetModal extends FormModal {
  private project: Project;
  private value: number;
  private deadline: string;
  private daysPerWeek: number;

  constructor(app: App, project: Project) {
    super(app);
    this.project = project;
    this.value = project.inkswell?.goals?.target ?? 0;
    this.deadline = project.inkswell?.goals?.deadline ?? "";
    this.daysPerWeek = project.inkswell?.goals?.daysPerWeek ?? 7;
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: `Word target: ${this.project.draft.title}` });

    new Setting(contentEl)
      .setName("Target words")
      .setDesc("Total word count goal for this project (0 to clear).")
      .addText((t) =>
        t.setValue(`${this.value}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.value = Number.isFinite(n) && n > 0 ? n : 0;
        })
      );

    new Setting(contentEl)
      .setName("Deadline")
      .setDesc("Optional finish date — drives the pace calculator on Track.")
      .addText((t) => {
        t.inputEl.type = "date";
        t.setValue(this.deadline).onChange((v) => (this.deadline = v));
      });

    new Setting(contentEl)
      .setName("Writing days per week")
      .setDesc("How many days a week you write (1–7), for the pace calculation.")
      .addText((t) => {
        t.inputEl.type = "number";
        t.setValue(`${this.daysPerWeek}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.daysPerWeek = Number.isFinite(n) && n >= 1 && n <= 7 ? n : 7;
        });
      });
  }

  protected async submit(): Promise<boolean> {
    const file = this.app.vault.getAbstractFileByPath(this.project.vaultPath);
    if (!(file instanceof TFile)) {
      new Notice("Project index not found.");
      return false;
    }
    const ok = await tryFileOp(
      () =>
        persistInkswellData(this.app, file, {
          goals: {
            ...this.project.inkswell?.goals,
            target: this.value || undefined,
            deadline: this.deadline || undefined,
            daysPerWeek: this.daysPerWeek === 7 ? undefined : this.daysPerWeek,
          },
        }),
      "Couldn't save the word target."
    );
    if (ok === null) return false; // failure already surfaced; keep the dialog open
    new Notice(this.value ? `Target set to ${this.value} words.` : "Target cleared.");
    return true;
  }
}
