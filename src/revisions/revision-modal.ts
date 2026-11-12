/**
 * Capture (or edit) a revision decision. When logging, pre-fills with the editor
 * selection (if any) and anchors to the current scene or the whole project. When
 * an existing decision is passed, it edits in place — its id, created timestamp,
 * and applied/pending status are preserved (upsertDecision keys by id).
 */

import { App, Modal, Notice, Setting } from "obsidian";
import { t } from "../i18n";
import { Project } from "../projects/types";
import { persistRevisions, upsertDecision } from "./revisions";
import {
  RevisionDecision,
  RevisionPriority,
  RevisionType,
  newRevisionId,
  typeChoices,
} from "./types";

export class RevisionModal extends Modal {
  private project: Project;
  private sceneTitle: string | null;
  private text: string;
  private type: RevisionType = "continuity";
  private priority: RevisionPriority | "" = "";
  /** The decision being edited, or null when logging a new one. */
  private existing: RevisionDecision | null;

  constructor(
    app: App,
    project: Project,
    sceneTitle: string | null,
    initialText = "",
    existing: RevisionDecision | null = null,
    /** Called with the index path just before saving — lets the opening surface
     *  mark the write as its own (selfWrites) so the host softens the notify. */
    private markWrite?: (path: string) => void
  ) {
    super(app);
    this.project = project;
    this.existing = existing;
    if (existing) {
      // Edit mode: seed every field from the decision; its anchor scene drives
      // the anchor dropdown (null = project-wide).
      this.sceneTitle = existing.scene;
      this.text = existing.text;
      this.type = existing.type ?? "continuity";
      this.priority = existing.priority ?? "";
    } else {
      this.sceneTitle = sceneTitle;
      this.text = initialText.trim();
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", {
      text: this.existing ? t("revision.modal.editTitle") : t("revision.modal.logTitle"),
    });
    contentEl.createEl("p", {
      cls: "inkswell-revision__hint",
      text: t("revision.modal.hint"),
    });

    new Setting(contentEl)
      .setName(t("revision.modal.decision"))
      .setDesc(t("revision.modal.decisionDesc"))
      .addTextArea((ta) => {
        ta.setValue(this.text).onChange((v) => (this.text = v));
        ta.inputEl.rows = 3;
        ta.inputEl.addClass("inkswell-revision__input");
        window.setTimeout(() => ta.inputEl.focus(), 0);
      });

    new Setting(contentEl)
      .setName(t("revision.modal.type"))
      .setDesc(
        // The marker syntax stays verbatim in every language: it's matched in prose.
        t("revision.modal.typeDesc", { research: "[RESEARCH: ]", scene: "[SCENE: ]" })
      )
      .addDropdown((d) => {
        // Offered types only — plus this decision's own legacy type when editing,
        // so a saved research/new-scene decision never silently changes type.
        for (const c of typeChoices(this.existing?.type)) d.addOption(c.id, c.label);
        d.setValue(this.type).onChange((v) => (this.type = v as RevisionType));
      });

    // No Priority field: a revision pass is worked in prose order, so a rank
    // never changes behavior — it was a capture-time tax. `this.priority` is
    // still seeded from an existing decision, so editing a legacy entry
    // preserves its saved priority (the badge keeps rendering).

    // Anchor: whole project, or any scene in the book. Shown for multi-scene
    // projects (a single-scene project has nothing to anchor to).
    if (this.project.scenes.length > 0) {
      new Setting(contentEl)
        .setName(t("revision.modal.anchor"))
        .setDesc(t("revision.modal.anchorDesc"))
        .addDropdown((d) => {
          d.addOption("", t("revision.wholeProject"));
          for (const s of this.project.scenes) d.addOption(s.title, s.title);
          d.setValue(this.sceneTitle ?? "").onChange((v) => (this.sceneTitle = v || null));
        });
    }

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText(this.existing ? t("revision.modal.saveChanges") : t("revision.modal.log"))
        .setCta()
        .onClick(() => this.save())
    );
  }

  private async save(): Promise<void> {
    const text = this.text.trim();
    if (!text) {
      new Notice(t("revision.modal.empty"));
      return;
    }
    const decision: RevisionDecision = {
      id: this.existing?.id ?? newRevisionId(),
      text,
      scene: this.sceneTitle,
      status: this.existing?.status ?? "pending",
      created: this.existing?.created ?? new Date().toISOString(),
      type: this.type,
      priority: this.priority || undefined,
    };
    this.markWrite?.(this.project.vaultPath);
    // Upsert by id against the CURRENT stored list — this modal can sit open
    // for a long time, so its construction-time snapshot must never be written.
    await persistRevisions(this.app, this.project, (cur) => upsertDecision(cur, decision));
    new Notice(this.existing ? t("revision.modal.updated") : t("revision.modal.logged"));
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
