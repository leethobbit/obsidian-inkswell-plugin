/**
 * "Edit scene" modal: edit a scene's metadata (status, POV, act, etc.) from a
 * right-click menu without navigating to Write. Reuses the shared scene-meta form
 * (so it stays in lockstep with the Scene Inspector); fields autosave on change,
 * writing frontmatter only.
 */

import { App, Modal, Setting, TFile } from "obsidian";
import { renderSceneMetaFields } from "./scene-meta-form";

export class EditSceneModal extends Modal {
  private file: TFile;

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Edit scene — ${this.file.basename}` });
    // Reuse the inspector classes so the field rows pick up existing styles.
    const form = contentEl.createDiv({ cls: "inkswell-inspector inkswell-edit-scene" });
    renderSceneMetaFields(form, this.app, this.file);

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("Done").setCta().onClick(() => this.close())
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
