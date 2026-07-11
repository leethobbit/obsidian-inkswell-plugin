/**
 * "Edit scene" modal: edit a scene's metadata (status, POV, act, etc.) from a
 * right-click menu without navigating to Write. Reuses the shared scene-meta form
 * (so it stays in lockstep with the Scene Inspector); fields autosave on change,
 * writing frontmatter only.
 */

import { App, Modal, Setting, TFile } from "obsidian";
import { Project } from "../projects/types";
import { openScene } from "./scene-actions";
import { renderSceneMetaFields } from "./scene-meta-form";
import type InkswellPlugin from "../../main";

export class EditSceneModal extends Modal {
  private file: TFile;
  private project: Project | null;
  private plugin: InkswellPlugin | null;

  constructor(
    app: App,
    file: TFile,
    project: Project | null = null,
    plugin: InkswellPlugin | null = null
  ) {
    super(app);
    this.file = file;
    this.project = project;
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Edit scene — ${this.file.basename}` });
    // Reuse the inspector classes so the field rows pick up existing styles.
    const form = contentEl.createDiv({ cls: "inkswell-inspector inkswell-edit-scene" });
    renderSceneMetaFields(
      form,
      this.app,
      this.file,
      this.project,
      this.plugin?.settings.disabledFeatures ?? [],
      (path) => this.plugin?.selfWrites.mark(path)
    );

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Open in tab").onClick(() => {
          this.close();
          openScene(this.app, this.file);
        })
      )
      .then((s) => {
        // Cross-panel jump to the in-plugin Write editor (only when wired).
        if (this.plugin) {
          s.addButton((b) =>
            b.setButtonText("Open in Write").onClick(() => {
              this.close();
              this.plugin?.openSceneInWrite(this.file.path);
            })
          );
        }
      })
      .addButton((b) => b.setButtonText("Done").setCta().onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
