/**
 * Customize → Writing prompts: hide shipped prompts you're tired of, reword them,
 * and add your own (with a phase and category so the Write toolbar's filters
 * still work; `{pov}` is substituted like in the shipped ones).
 */

import { PROMPT_CATEGORIES, PromptCategory, PromptExtra, PromptPhase, WRITING_PROMPTS } from "../../ideation/prompts";
import { SPEC_PROMPTS } from "../../settings/overridable-lists";
import { taggedSelect } from "../../views/panel-kit";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

const PHASE_LABEL: Record<PromptPhase, string> = { draft: "Drafting", revise: "Revising" };

export const writingPromptsSection: CustomizeSection = {
  id: "writing-prompts",

  describe(plugin) {
    const o = plugin.settings.listOverrides.prompts;
    const mine = o?.added?.length ?? 0;
    const hidden = o?.hidden?.length ?? 0;
    return `${WRITING_PROMPTS.length} built-in${mine ? ` · ${mine} yours` : ""}${hidden ? ` · ${hidden} hidden` : ""}`;
  },

  render(host, ctx) {
    renderOverrideEditor<PromptExtra>(host, ctx, {
      listId: "prompts",
      spec: SPEC_PROMPTS,
      shipped: WRITING_PROMPTS.map((p) => ({ id: p.id, label: p.text, phase: p.phase, category: p.category })),
      allowAdd: true,
      noun: "prompt",
      intro:
        "The prompts behind the Write toolbar's Prompt button. Hide the ones you never want to see " +
        "again, reword any, or add your own — write {pov} where the scene's POV character's name " +
        "should go. Each prompt has a phase (drafting or revising) and a category the button filters " +
        "on — change either on any prompt, including the built-in ones.",
      newItemExtra: () => ({ phase: "draft", category: "structure" }),
      renderExtra(el, it, patch) {
        const phase = taggedSelect(el, `customize:prompts:phase:${it.id}`, { cls: "dropdown" });
        for (const p of ["draft", "revise"] as PromptPhase[]) phase.createEl("option", { text: PHASE_LABEL[p], value: p });
        phase.value = it.extra.phase;
        phase.setAttribute("aria-label", "Phase");
        phase.onchange = () => patch({ phase: phase.value as PromptPhase });

        const cat = taggedSelect(el, `customize:prompts:category:${it.id}`, { cls: "dropdown" });
        for (const c of PROMPT_CATEGORIES) cat.createEl("option", { text: c.label, value: c.id });
        cat.value = it.extra.category;
        cat.setAttribute("aria-label", "Category");
        cat.onchange = () => patch({ category: cat.value as PromptCategory });
      },
    });
  },
};
