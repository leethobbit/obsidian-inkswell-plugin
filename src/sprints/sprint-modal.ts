/**
 * Dialog to start a writing sprint: choose duration (minutes) and an optional
 * word goal.
 */

import { App, Modal, Setting } from "obsidian";
import { SprintController } from "./sprint-controller";

export class SprintModal extends Modal {
  private sprints: SprintController;
  private minutes: number;
  private goal = 0;

  constructor(app: App, sprints: SprintController, defaultMinutes: number) {
    super(app);
    this.sprints = sprints;
    this.minutes = defaultMinutes;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Start a writing sprint" });

    new Setting(contentEl).setName("Duration (minutes)").addText((t) =>
      t.setValue(`${this.minutes}`).onChange((v) => {
        const n = Math.floor(Number(v));
        if (Number.isFinite(n) && n > 0) this.minutes = n;
      })
    );

    new Setting(contentEl)
      .setName("Word goal (optional)")
      .setDesc("Leave at 0 for no goal.")
      .addText((t) =>
        t.setValue("0").onChange((v) => {
          const n = Math.floor(Number(v));
          this.goal = Number.isFinite(n) && n > 0 ? n : 0;
        })
      );

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Start")
        .setCta()
        .onClick(() => {
          this.sprints.start(this.minutes, this.goal > 0 ? this.goal : null);
          this.close();
        })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
