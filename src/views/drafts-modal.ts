/**
 * "New draft" dialog. Collects the new draft's name and — only the first time a
 * project is split into drafts (when the original has no `draftTitle` yet) — a name
 * for the existing draft too, so both read clearly in the switcher. Rename and
 * delete reuse the shared `promptText` / `confirmDelete` helpers instead.
 */

import { App, Modal, Setting } from "obsidian";

export interface NewDraftResult {
  newName: string;
  /** Name for the original draft (only meaningful on first split). */
  originalName: string;
}

export class NewDraftModal extends Modal {
  private newName = "";
  private originalName = "Draft 1";
  private result: NewDraftResult | null = null;

  constructor(
    app: App,
    private opts: { title: string; isFirstSplit: boolean },
    private cb: (result: NewDraftResult | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `New draft of "${this.opts.title}"` });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text: "Copies the manuscript and all planning so you can revise the copy freely. The original is untouched.",
    });

    new Setting(contentEl).setName("New draft name").addText((t) => {
      t.setPlaceholder("Editor pass").onChange((v) => (this.newName = v));
      window.setTimeout(() => t.inputEl.focus(), 0);
      t.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") this.submit();
      };
    });

    if (this.opts.isFirstSplit) {
      new Setting(contentEl)
        .setName("Name for the current draft")
        .setDesc("Your existing manuscript becomes a named draft.")
        .addText((t) =>
          t.setValue(this.originalName).onChange((v) => (this.originalName = v))
        );
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Create draft").setCta().onClick(() => this.submit()))
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  private submit(): void {
    if (!this.newName.trim()) return;
    this.result = {
      newName: this.newName.trim(),
      originalName: this.originalName.trim() || "Draft 1",
    };
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    this.cb(this.result);
  }
}
