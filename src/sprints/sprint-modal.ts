/**
 * Dialog to start a writing sprint: choose duration (minutes) and an optional
 * word goal.
 */

import { App, Setting } from "obsidian";
import { t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { SprintController } from "./sprint-controller";

export class SprintModal extends FormModal {
  private sprints: SprintController;
  private minutes: number;
  private goal: number;
  protected cta = t("sprint.modal.start");

  constructor(
    app: App,
    sprints: SprintController,
    defaultMinutes: number,
    defaultGoal = 0
  ) {
    super(app);
    this.sprints = sprints;
    this.minutes = defaultMinutes;
    this.goal = defaultGoal;
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("sprint.modal.title") });

    new Setting(contentEl).setName(t("sprint.modal.duration")).addText((text) =>
      text.setValue(`${this.minutes}`).onChange((v) => {
        const n = Math.floor(Number(v));
        if (Number.isFinite(n) && n > 0) this.minutes = n;
      })
    );

    new Setting(contentEl)
      .setName(t("sprint.modal.goal"))
      .setDesc(t("sprint.modal.goalDesc"))
      .addText((text) =>
        text.setValue(`${this.goal}`).onChange((v) => {
          const n = Math.floor(Number(v));
          this.goal = Number.isFinite(n) && n > 0 ? n : 0;
        })
      );
  }

  protected submit(): void {
    this.sprints.start(this.minutes, this.goal > 0 ? this.goal : null);
  }
}
