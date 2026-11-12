/**
 * Customize → Writing prompts: hide shipped prompts you're tired of, reword them,
 * and add your own (with a phase and category so the Write toolbar's filters
 * still work; `{pov}` is substituted like in the shipped ones).
 */

import { MessageKey, t, tp } from "../../i18n";
import {
  PROMPT_CATEGORIES,
  PromptCategory,
  PromptExtra,
  PromptPhase,
  WRITING_PROMPTS,
  shippedPromptText,
} from "../../ideation/prompts";
import { SPEC_PROMPTS } from "../../settings/overridable-lists";
import { taggedSelect } from "../../views/panel-kit";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

const PHASE_LABEL: Record<PromptPhase, MessageKey> = {
  draft: "customize.prompts.phase.draft",
  revise: "customize.prompts.phase.revise",
};

export const writingPromptsSection: CustomizeSection = {
  id: "writing-prompts",

  describe(plugin) {
    const o = plugin.settings.listOverrides.prompts;
    const mine = o?.added?.length ?? 0;
    const hidden = o?.hidden?.length ?? 0;
    const parts = [tp("customize.summary.builtIn", WRITING_PROMPTS.length)];
    if (mine) parts.push(tp("customize.summary.yours", mine));
    if (hidden) parts.push(tp("customize.summary.hidden", hidden));
    return parts.join(" · ");
  },

  render(host, ctx) {
    renderOverrideEditor<PromptExtra>(host, ctx, {
      listId: "prompts",
      spec: SPEC_PROMPTS,
      // Display only: the translated shipped text. The spec (SPEC_PROMPTS) keeps
      // the English source, so nothing translated is ever stored or normalized.
      shipped: WRITING_PROMPTS.map((p) => ({
        id: p.id,
        label: shippedPromptText(p.id, p.text),
        phase: p.phase,
        category: p.category,
      })),
      allowAdd: true,
      noun: "prompt",
      intro: t("customize.prompts.intro"),
      newItemExtra: () => ({ phase: "draft", category: "structure" }),
      renderExtra(el, it, patch) {
        const phase = taggedSelect(el, `customize:prompts:phase:${it.id}`, { cls: "dropdown" });
        for (const p of ["draft", "revise"] as PromptPhase[]) phase.createEl("option", { text: t(PHASE_LABEL[p]), value: p });
        phase.value = it.extra.phase;
        phase.setAttribute("aria-label", t("customize.prompts.phaseAria"));
        phase.onchange = () => patch({ phase: phase.value as PromptPhase });

        const cat = taggedSelect(el, `customize:prompts:category:${it.id}`, { cls: "dropdown" });
        for (const c of PROMPT_CATEGORIES) cat.createEl("option", { text: c.label, value: c.id });
        cat.value = it.extra.category;
        cat.setAttribute("aria-label", t("customize.prompts.categoryAria"));
        cat.onchange = () => patch({ category: cat.value as PromptCategory });
      },
    });
  },
};
