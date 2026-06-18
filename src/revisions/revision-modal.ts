/**
 * Capture a revision decision while drafting. Pre-fills with the editor selection
 * (if any) and lets you anchor it to the current scene or the whole project.
 */

import { App, Modal, Notice, Setting } from "obsidian";
import { Project } from "../projects/types";
import { decisionsOf, persistRevisions, upsertDecision } from "./revisions";
import { RevisionDecision, newRevisionId } from "./types";

export class RevisionModal extends Modal {
  private project: Project;
  private sceneTitle: string | null;
  private text: string;
  private anchorToScene: boolean;

  constructor(
    app: App,
    project: Project,
    sceneTitle: string | null,
    initialText = ""
  ) {
    super(app);
    this.project = project;
    this.sceneTitle = sceneTitle;
    this.text = initialText.trim();
    this.anchorToScene = sceneTitle !== null;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Log a revision decision" });
    contentEl.createEl("p", {
      cls: "inkswell-revision__hint",
      text: "Note the change and keep writing forward — apply it later during revision.",
    });

    new Setting(contentEl)
      .setName("Decision")
      .setDesc('e.g. "From now on, the brother is dead."')
      .addTextArea((t) => {
        t.setValue(this.text).onChange((v) => (this.text = v));
        t.inputEl.rows = 3;
        t.inputEl.addClass("inkswell-revision__input");
        window.setTimeout(() => t.inputEl.focus(), 0);
      });

    if (this.sceneTitle) {
      new Setting(contentEl)
        .setName("Anchor")
        .setDesc("Tie this decision to the current scene, or make it project-wide.")
        .addDropdown((d) =>
          d
            .addOption("scene", `This scene: ${this.sceneTitle}`)
            .addOption("global", "Whole project")
            .setValue(this.anchorToScene ? "scene" : "global")
            .onChange((v) => (this.anchorToScene = v === "scene"))
        );
    }

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Log decision")
        .setCta()
        .onClick(() => this.save())
    );
  }

  private async save(): Promise<void> {
    const text = this.text.trim();
    if (!text) {
      new Notice("Enter a decision first.");
      return;
    }
    const decision: RevisionDecision = {
      id: newRevisionId(),
      text,
      scene: this.anchorToScene ? this.sceneTitle : null,
      status: "pending",
      created: new Date().toISOString(),
    };
    await persistRevisions(
      this.app,
      this.project,
      upsertDecision(decisionsOf(this.project), decision)
    );
    new Notice("Revision decision logged.");
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
