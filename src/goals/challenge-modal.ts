/**
 * Set up, edit, or clear the one writing challenge (a date window + word
 * target). Stored in settings (`settings.challenge`), not frontmatter: a
 * challenge counts every goal-counted word in the window, whichever project
 * it went to, so it belongs to the vault, not a book.
 */

import { App, Notice, Setting } from "obsidian";
import { formatNumber, t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { WritingChallenge, normalizeChallenge, novemberPreset } from "./challenge";

export class ChallengeModal extends FormModal {
  private draft: WritingChallenge;
  private readonly editing: boolean;

  constructor(
    app: App,
    existing: WritingChallenge | null,
    /** Persist the new value (null = clear) and refresh what shows it. */
    private save: (next: WritingChallenge | null) => Promise<void>
  ) {
    super(app);
    this.editing = !!existing;
    this.draft = { ...(existing ?? novemberPreset()) };
    this.cta = null; // own button row: Save · Clear (when editing) · Cancel
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", {
      text: this.editing ? t("goal.challenge.titleEdit") : t("goal.challenge.titleNew"),
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("goal.challenge.intro"),
    });

    new Setting(contentEl).setName(t("goal.challenge.name")).addText((text) =>
      text.setValue(this.draft.name).onChange((v) => (this.draft.name = v))
    );
    new Setting(contentEl).setName(t("goal.challenge.start")).addText((text) => {
      text.inputEl.type = "date";
      text.setValue(this.draft.start).onChange((v) => (this.draft.start = v));
    });
    new Setting(contentEl)
      .setName(t("goal.challenge.end"))
      .setDesc(t("goal.challenge.endDesc"))
      .addText((text) => {
        text.inputEl.type = "date";
        text.setValue(this.draft.end).onChange((v) => (this.draft.end = v));
      });
    new Setting(contentEl).setName(t("goal.challenge.target")).addText((text) => {
      text.inputEl.type = "number";
      text.inputEl.min = "1";
      text.setValue(String(this.draft.target)).onChange((v) => (this.draft.target = Number(v)));
    });

    const buttons = new Setting(contentEl);
    buttons.addButton((b) => b.setButtonText(t("common.save")).setCta().onClick(() => void this.trySubmit()));
    if (this.editing) {
      buttons.addButton((b) => {
        b.setButtonText(t("goal.challenge.clear")).onClick(async () => {
          await this.save(null);
          new Notice(t("goal.challenge.cleared"));
          this.close();
        });
        // Destructive styling via the class directly — setWarning() is deprecated
        // and setDestructive() is above our minAppVersion (see scene-actions.ts).
        b.buttonEl.addClass("mod-warning");
      });
    }
    buttons.addButton((b) => b.setButtonText(t("common.cancel")).onClick(() => this.close()));
  }

  protected async submit(): Promise<boolean> {
    const valid = normalizeChallenge(this.draft);
    if (!valid) {
      new Notice(t("goal.challenge.invalid"));
      return false;
    }
    await this.save(valid);
    // Start/end stay ISO day keys, as before (formatDate would change them).
    new Notice(
      t("goal.challenge.set", { target: formatNumber(valid.target), start: valid.start, end: valid.end })
    );
    return true;
  }
}
