/**
 * "Rename project" dialog: new title + whether to move the folder/index/plan
 * note along with it (default on — a working title → real title rename means
 * the files too). Validation runs live against the pure planner so a taken
 * title or path is called out before the button is pressed.
 */

import { App, Modal, Setting } from "obsidian";
import { t, tp } from "../i18n";
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
    contentEl.createEl("h3", { text: t("view.renameProject.heading") });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        this.drafts.length > 1
          ? t("view.renameProject.allDrafts", { count: this.drafts.length, title: this.base.draft.title })
          : t("view.renameProject.oneDraft"),
    });

    new Setting(contentEl).setName(t("view.renameProject.title")).addText((text) => {
      text.setValue(this.title).onChange((v) => {
        this.title = v;
        this.validate();
      });
      window.setTimeout(() => {
        text.inputEl.focus();
        text.inputEl.select();
      }, 0);
      text.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") this.submit();
      };
    });

    new Setting(contentEl)
      .setName(t("view.renameProject.renameFiles"))
      .setDesc(t("view.renameProject.renameFilesDesc"))
      .addToggle((tg) =>
        tg.setValue(this.renameFiles).onChange((v) => {
          this.renameFiles = v;
          this.validate();
        })
      );

    this.status = contentEl.createEl("p", { cls: "inkswell-stats__muted" });

    new Setting(contentEl)
      .addButton((b) => {
        this.cta = b.setButtonText(t("common.rename")).setCta().onClick(() => this.submit()).buttonEl;
      })
      .addButton((b) => b.setButtonText(t("common.cancel")).onClick(() => this.close()));
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
        ? res.folderMove
          ? tp("view.renameProject.willMoveTo", moves, { path: res.folderMove.to })
          : tp("view.renameProject.willMove", moves)
        : t("view.renameProject.noMoves")
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
