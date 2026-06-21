/**
 * Writing-prompt generator dialog. Opened from the "Prompt" button in the Write
 * topbar. Filter by phase/category, cycle prompts with "New prompt", and commit
 * the one you like with "Use this prompt" — which closes the modal and hands the
 * chosen text (plus the filter selections, so the next open resumes here) back to
 * the caller for display in the topbar.
 */

import { App, Modal } from "obsidian";
import {
  PROMPT_CATEGORIES,
  PromptCategory,
  PromptPhase,
  pickPrompt,
} from "./prompts";

export interface PromptModalResult {
  text: string;
  phase: PromptPhase;
  category: PromptCategory | null;
}

export interface PromptModalInit {
  phase: PromptPhase;
  category: PromptCategory | null;
  /** Active scene's POV, if known — fills `{pov}` prompts. */
  pov: string | null;
  /** Previously chosen prompt, to seed the dialog on reopen. */
  text?: string;
}

export class PromptModal extends Modal {
  private phase: PromptPhase;
  private category: PromptCategory | null;
  private pov: string | null;
  private text: string;
  private onUse: (result: PromptModalResult) => void;

  private textEl: HTMLElement | null = null;

  constructor(app: App, init: PromptModalInit, onUse: (result: PromptModalResult) => void) {
    super(app);
    this.phase = init.phase;
    this.category = init.category;
    this.pov = init.pov;
    this.text = init.text ?? "";
    this.onUse = onUse;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("inkswell-prompt-modal");
    contentEl.createEl("h3", { text: "Writing prompt" });

    // Filters: phase (draft/revise) + category.
    const filters = contentEl.createDiv({ cls: "inkswell-prompt-card__filters" });
    const phaseSel = filters.createEl("select", { cls: "dropdown" });
    for (const [val, label] of [
      ["draft", "Drafting"],
      ["revise", "Revising"],
    ] as const) {
      const o = phaseSel.createEl("option", { text: label, value: val });
      if (val === this.phase) o.selected = true;
    }
    phaseSel.onchange = () => {
      this.phase = phaseSel.value as PromptPhase;
      this.repick();
    };

    const catSel = filters.createEl("select", { cls: "dropdown" });
    catSel.createEl("option", { text: "Any category", value: "" });
    for (const c of PROMPT_CATEGORIES) {
      const o = catSel.createEl("option", { text: c.label, value: c.id });
      if (c.id === this.category) o.selected = true;
    }
    catSel.onchange = () => {
      this.category = (catSel.value || null) as PromptCategory | null;
      this.repick();
    };

    this.textEl = contentEl.createDiv({ cls: "inkswell-prompt-card__text" });
    if (this.text) this.renderText();
    else this.repick();

    const btns = contentEl.createDiv({ cls: "inkswell-prompt-modal__buttons" });
    const newBtn = btns.createEl("button", { text: "New prompt" });
    newBtn.onclick = () => this.repick();
    const useBtn = btns.createEl("button", { text: "Use this prompt", cls: "mod-cta" });
    useBtn.onclick = () => {
      if (!this.text) return;
      this.onUse({ text: this.text, phase: this.phase, category: this.category });
      this.close();
    };
  }

  /** Re-pick a prompt for the current phase/category, avoiding an immediate repeat. */
  private repick(): void {
    const picked = pickPrompt({
      phase: this.phase,
      category: this.category,
      pov: this.pov,
      exclude: this.text,
    });
    this.text = picked ? picked.text : "";
    this.renderText();
  }

  private renderText(): void {
    if (this.textEl) this.textEl.setText(this.text || "No prompts match this filter.");
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
