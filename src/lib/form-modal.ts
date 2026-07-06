/**
 * House dialog scaffold. Encodes the behavior every Inkswell form dialog must
 * share (the standard set by the rename/prompt dialog): the first text input
 * autofocuses (and selects) on open, Enter in any single-line input submits —
 * fully consumed so it can't reach Obsidian's modal scope or the trigger button
 * and double-fire — submit is idempotent, and a CTA + Cancel row is appended
 * unless the subclass renders its own buttons. Escape/backdrop close still
 * cancels via Obsidian's Modal.
 *
 * Enter inside a <textarea> is deliberately NOT a submit (it inserts the
 * newline the user asked for).
 */

import { App, Modal, Setting } from "obsidian";

export abstract class FormModal extends Modal {
  private submitted = false;

  /** CTA label for the appended button row; null = subclass renders its own
   *  buttons (call {@link trySubmit} from them). */
  protected cta: string | null = "Save";

  constructor(app: App) {
    super(app);
  }

  /** Build the dialog body (heading, Settings/inputs). Runs once per open. */
  protected abstract renderForm(contentEl: HTMLElement): void;

  /**
   * The primary action. Runs at most once per dialog (Enter + a click can't
   * double-fire). Return false to keep the dialog open and re-arm submit
   * (validation failure / recoverable error — surface a Notice yourself).
   */
  protected abstract submit(): boolean | void | Promise<boolean | void>;

  onOpen(): void {
    this.renderForm(this.contentEl);
    if (this.cta) {
      new Setting(this.contentEl)
        .addButton((b) =>
          b.setButtonText(this.cta as string).setCta().onClick(() => void this.trySubmit())
        )
        .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
    this.wireInputs();
  }

  protected async trySubmit(): Promise<void> {
    if (this.submitted) return; // idempotent — a double Enter/click can't re-run
    this.submitted = true;
    const result = await this.submit();
    if (result === false) {
      this.submitted = false; // stay open; let the user correct and retry
      return;
    }
    this.close();
  }

  private wireInputs(): void {
    const inputs = Array.from(this.contentEl.querySelectorAll<HTMLInputElement>("input"));
    for (const input of inputs) {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        void this.trySubmit();
      });
    }
    const first = this.contentEl.querySelector<HTMLElement>("input, textarea");
    if (first) {
      window.setTimeout(() => {
        first.focus();
        // instanceOf, not instanceof: cross-window safe (popout windows have
        // their own HTMLInputElement realm) — per obsidianmd/prefer-instanceof.
        if (first.instanceOf(HTMLInputElement)) first.select();
      }, 0);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
