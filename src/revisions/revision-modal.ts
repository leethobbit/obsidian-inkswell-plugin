/**
 * Capture (or edit) a revision decision. When logging, pre-fills with the editor
 * selection (if any) and anchors to the current scene or the whole project. When
 * an existing decision is passed, it edits in place — its id, created timestamp,
 * and applied/pending status are preserved (upsertDecision keys by id).
 */

import { App, Modal, Notice, Setting } from "obsidian";
import { Project } from "../projects/types";
import { decisionsOf, persistRevisions, upsertDecision } from "./revisions";
import {
  REVISION_PRIORITIES,
  REVISION_TYPES,
  RevisionDecision,
  RevisionPriority,
  RevisionType,
  newRevisionId,
} from "./types";

export class RevisionModal extends Modal {
  private project: Project;
  private sceneTitle: string | null;
  private text: string;
  private anchorToScene: boolean;
  private type: RevisionType = "continuity";
  private priority: RevisionPriority | "" = "";
  /** The decision being edited, or null when logging a new one. */
  private existing: RevisionDecision | null;

  constructor(
    app: App,
    project: Project,
    sceneTitle: string | null,
    initialText = "",
    existing: RevisionDecision | null = null
  ) {
    super(app);
    this.project = project;
    this.existing = existing;
    if (existing) {
      // Edit mode: seed every field from the decision; its anchor scene drives
      // the anchor dropdown (null = project-wide, which stays project-wide).
      this.sceneTitle = existing.scene;
      this.text = existing.text;
      this.anchorToScene = existing.scene !== null;
      this.type = existing.type ?? "continuity";
      this.priority = existing.priority ?? "";
    } else {
      this.sceneTitle = sceneTitle;
      this.text = initialText.trim();
      this.anchorToScene = sceneTitle !== null;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", {
      text: this.existing ? "Edit revision decision" : "Log a revision decision",
    });
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

    new Setting(contentEl)
      .setName("Type")
      .setDesc("Continuity decisions read 'from now on…'; others are issues to fix later.")
      .addDropdown((d) => {
        for (const t of REVISION_TYPES) d.addOption(t.id, t.label);
        d.setValue(this.type).onChange((v) => (this.type = v as RevisionType));
      });

    new Setting(contentEl).setName("Priority").addDropdown((d) => {
      d.addOption("", "— none —");
      for (const p of REVISION_PRIORITIES) d.addOption(p.id, p.label);
      d.setValue(this.priority).onChange((v) => (this.priority = v as RevisionPriority | ""));
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
        .setButtonText(this.existing ? "Save changes" : "Log decision")
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
      id: this.existing?.id ?? newRevisionId(),
      text,
      scene: this.anchorToScene ? this.sceneTitle : null,
      status: this.existing?.status ?? "pending",
      created: this.existing?.created ?? new Date().toISOString(),
      type: this.type,
      priority: this.priority || undefined,
    };
    await persistRevisions(
      this.app,
      this.project,
      upsertDecision(decisionsOf(this.project), decision)
    );
    new Notice(this.existing ? "Revision decision updated." : "Revision decision logged.");
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
