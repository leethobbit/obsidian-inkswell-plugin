/**
 * Set up, edit, or clear the one writing challenge (a date window + word
 * target). Stored in settings (`settings.challenge`), not frontmatter: a
 * challenge counts every goal-counted word in the window, whichever project
 * it went to, so it belongs to the vault, not a book.
 */

import { App, Notice, Setting } from "obsidian";
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
    contentEl.createEl("h3", { text: this.editing ? "Edit writing challenge" : "Set up a writing challenge" });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Counts every word you write in the date range toward the target, in any project — " +
        "the same words your daily goal counts.",
    });

    new Setting(contentEl).setName("Name").addText((t) =>
      t.setValue(this.draft.name).onChange((v) => (this.draft.name = v))
    );
    new Setting(contentEl).setName("Start").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.draft.start).onChange((v) => (this.draft.start = v));
    });
    new Setting(contentEl).setName("End").setDesc("Inclusive.").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.draft.end).onChange((v) => (this.draft.end = v));
    });
    new Setting(contentEl).setName("Target words").addText((t) => {
      t.inputEl.type = "number";
      t.inputEl.min = "1";
      t.setValue(String(this.draft.target)).onChange((v) => (this.draft.target = Number(v)));
    });

    const buttons = new Setting(contentEl);
    buttons.addButton((b) => b.setButtonText("Save").setCta().onClick(() => void this.trySubmit()));
    if (this.editing) {
      buttons.addButton((b) => {
        b.setButtonText("Clear challenge").onClick(async () => {
          await this.save(null);
          new Notice("Writing challenge cleared.");
          this.close();
        });
        // Destructive styling via the class directly — setWarning() is deprecated
        // and setDestructive() is above our minAppVersion (see scene-actions.ts).
        b.buttonEl.addClass("mod-warning");
      });
    }
    buttons.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  protected async submit(): Promise<boolean> {
    const valid = normalizeChallenge(this.draft);
    if (!valid) {
      new Notice("Check the dates (end on or after start, at most 400 days) and a target above 0.");
      return false;
    }
    await this.save(valid);
    new Notice(`Challenge set: ${valid.target.toLocaleString()} words, ${valid.start} to ${valid.end}.`);
    return true;
  }
}
