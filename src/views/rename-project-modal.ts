/**
 * "Rename project" dialog: new title + whether to move the folder/index/plan
 * note along with it (default on — a working title → real title rename means
 * the files too). Validation runs live against the pure planner so a taken
 * title or path is called out before the button is pressed.
 */

import { App, Modal, Setting } from "obsidian";
import { Project } from "../projects/types";
import {
  ProjectRenamePlan,
  RenameOptions,
  describeBlock,
  isRenameBlock,
  planProjectRename,
} from "../projects/rename-plan";

export class RenameProjectModal extends Modal {
  private title: string;
  private renameFiles = true;
  private result: ProjectRenamePlan | null = null;
  private status!: HTMLElement;
  private cta!: HTMLButtonElement;

  constructor(
    app: App,
    private drafts: Project[],
    private base: Project,
    private planOpts: Omit<RenameOptions, "renameFiles">,
    private cb: (plan: ProjectRenamePlan | null) => void
  ) {
    super(app);
    this.title = base.draft.title;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Rename project" });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        this.drafts.length > 1
          ? `Renames all ${this.drafts.length} drafts of "${this.base.draft.title}".`
          : "Updates the title everywhere Inkswell records it.",
    });

    new Setting(contentEl).setName("Title").addText((t) => {
      t.setValue(this.title).onChange((v) => {
        this.title = v;
        this.validate();
      });
      window.setTimeout(() => {
        t.inputEl.focus();
        t.inputEl.select();
      }, 0);
      t.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") this.submit();
      };
    });

    new Setting(contentEl)
      .setName("Also rename the folder and notes")
      .setDesc(
        "Moves the project folder, index note, and planning note to match the new title. Scenes, codex entries, and the cover keep working either way."
      )
      .addToggle((tg) =>
        tg.setValue(this.renameFiles).onChange((v) => {
          this.renameFiles = v;
          this.validate();
        })
      );

    this.status = contentEl.createEl("p", { cls: "inkswell-stats__muted" });

    new Setting(contentEl)
      .addButton((b) => {
        this.cta = b.setButtonText("Rename").setCta().onClick(() => this.submit()).buttonEl;
      })
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    this.validate();
  }

  private compute(): ProjectRenamePlan | null {
    const res = planProjectRename(this.drafts, this.base, this.title, {
      ...this.planOpts,
      renameFiles: this.renameFiles,
    });
    if (isRenameBlock(res)) {
      this.status.setText(res.kind === "unchanged" ? "" : describeBlock(res));
      return null;
    }
    const moves = (res.folderMove ? 1 : 0) + res.fileMoves.length;
    this.status.setText(
      moves
        ? `Will move ${moves} ${moves === 1 ? "item" : "items"}${res.folderMove ? ` → ${res.folderMove.to}` : ""}.`
        : "No files move — only the title changes."
    );
    return res;
  }

  private validate(): void {
    this.cta.disabled = this.compute() === null;
  }

  private submit(): void {
    const plan = this.compute();
    if (!plan) return;
    this.result = plan;
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    this.cb(this.result);
  }
}
