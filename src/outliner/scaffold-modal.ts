/**
 * Confirmation dialog for "Scaffold structure": shows exactly what the run will
 * do — the planned Act › Chapter › Scene tree (structure mode) or the list of
 * scene stubs to create (scenes-only mode) — before anything is written. The
 * preview renders straight from the {@link ScaffoldAnalysis} the execute path
 * consumes, so the dialog can't promise something the run won't do.
 */

import { App } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { ScaffoldAnalysis } from "./scaffold";

class ScaffoldConfirmModal extends FormModal {
  protected cta = "Scaffold";

  constructor(
    app: App,
    private analysis: ScaffoldAnalysis,
    private templateLabel: string,
    private resolve: (ok: boolean) => void
  ) {
    super(app);
  }

  protected renderForm(contentEl: HTMLElement): void {
    const a = this.analysis;
    contentEl.createEl("h3", { text: "Scaffold structure" });

    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text: a.structured
        ? `This will build the full ${this.templateLabel} structure — new files are created in "${a.folder}":`
        : "This project already has acts or chapters, so your outline won't be touched — " +
          "only the missing placeholder scenes are created:",
    });

    const box = contentEl.createDiv({ cls: "inkswell-scaffold-preview" });
    if (a.structured) this.renderTree(box);
    else this.renderSceneList(box);

    contentEl.createEl("p", { cls: "inkswell-stats__muted", text: this.summary() });
  }

  /** Structure mode: Act → chapter rows, each with its beat-named scene. */
  private renderTree(box: HTMLElement): void {
    let lastAct = "";
    for (const item of this.analysis.items) {
      if ((item.actTitle ?? "") !== lastAct) {
        lastAct = item.actTitle ?? "";
        box.createDiv({ cls: "inkswell-scaffold-preview__act", text: lastAct });
      }
      const row = box.createDiv({ cls: "inkswell-scaffold-preview__row" });
      row.createSpan({ text: `${item.chapterTitle} — ${item.title}` });
      if (item.exists) {
        row.createSpan({ cls: "inkswell-scaffold-preview__note", text: "file exists — adopted" });
      }
    }
  }

  /** Scenes-only mode: just the stubs that will be created. */
  private renderSceneList(box: HTMLElement): void {
    const skipped = this.analysis.items.filter((i) => i.exists).length;
    for (const item of this.analysis.items) {
      if (item.exists) continue;
      box.createDiv({ cls: "inkswell-scaffold-preview__row", text: item.title });
    }
    if (skipped > 0) {
      box.createDiv({
        cls: "inkswell-scaffold-preview__note",
        text: `${skipped} scene${skipped === 1 ? "" : "s"} already exist and will be skipped.`,
      });
    }
  }

  private summary(): string {
    const a = this.analysis;
    const parts = [`${a.newScenes} new scene${a.newScenes === 1 ? "" : "s"}`];
    if (a.structured && a.plan) {
      parts.push(`${a.plan.chapters.length} chapters`, `${a.plan.acts.length} acts`);
    }
    if (a.willLink > 0) parts.push(`${a.willLink} beats linked to their scenes`);
    return parts.join(" · ");
  }

  protected submit(): void {
    this.resolve(true);
  }

  onClose(): void {
    super.onClose();
    this.resolve(false); // resolve(true) already ran on submit; extra calls are no-ops
  }
}

/** Show the preview dialog; resolves true only when the user confirms. */
export function confirmScaffold(
  app: App,
  analysis: ScaffoldAnalysis,
  templateLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const once = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    new ScaffoldConfirmModal(app, analysis, templateLabel, once).open();
  });
}
