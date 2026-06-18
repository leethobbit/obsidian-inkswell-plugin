/**
 * Prompt for a project's total word target and persist it under the index
 * note's `inkswell.goals.target` frontmatter.
 */

import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { persistInkswellData } from "../projects/index-writer";
import { Project } from "../projects/types";

export class TargetModal extends Modal {
  private project: Project;
  private value: number;

  constructor(app: App, project: Project) {
    super(app);
    this.project = project;
    this.value = project.inkswell?.goals?.target ?? 0;
  }

  onOpen(): void {
    const { contentEl } = this;
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

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Save")
        .setCta()
        .onClick(() => this.save())
    );
  }

  private async save(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.project.vaultPath);
    if (!(file instanceof TFile)) {
      new Notice("Project index not found.");
      return;
    }
    await persistInkswellData(this.app, file, {
      goals: { ...this.project.inkswell?.goals, target: this.value || undefined },
    });
    new Notice(this.value ? `Target set to ${this.value} words.` : "Target cleared.");
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
