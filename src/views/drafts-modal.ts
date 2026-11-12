/**
 * "New draft" dialog. Collects the new draft's name and — only the first time a
 * project is split into drafts (when the original has no `draftTitle` yet) — a name
 * for the existing draft too, so both read clearly in the switcher. Rename and
 * delete reuse the shared `promptText` / `confirmDelete` helpers instead.
 */

import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";

export interface NewDraftResult {
  newName: string;
  /** Name for the original draft (only meaningful on first split). */
  originalName: string;
}

export class NewDraftModal extends Modal {
  private newName = "";
  private originalName = "Draft 1"; // i18n-ignore: vault text (stored draft title)
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
    contentEl.createEl("h3", { text: t("drafts.new.heading", { title: this.opts.title }) });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text: t("drafts.new.intro"),
    });

    new Setting(contentEl).setName(t("drafts.new.name")).addText((text) => {
      text.setPlaceholder(t("drafts.new.namePlaceholder")).onChange((v) => (this.newName = v));
      window.setTimeout(() => text.inputEl.focus(), 0);
      text.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") this.submit();
      };
    });

    if (this.opts.isFirstSplit) {
      new Setting(contentEl)
        .setName(t("drafts.new.currentName"))
        .setDesc(t("drafts.new.currentNameDesc"))
        .addText((text) =>
          text.setValue(this.originalName).onChange((v) => (this.originalName = v))
        );
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText(t("drafts.new.create")).setCta().onClick(() => this.submit()))
      .addButton((b) => b.setButtonText(t("common.cancel")).onClick(() => this.close()));
  }

  private submit(): void {
    if (!this.newName.trim()) return;
    this.result = {
      newName: this.newName.trim(),
      originalName: this.originalName.trim() || "Draft 1", // i18n-ignore: vault text (stored draft title)
    };
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    this.cb(this.result);
  }
}
