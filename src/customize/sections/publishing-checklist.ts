/**
 * Customize → Publishing checklist: phases and tasks of the self-publishing
 * checklist. Rename and reorder, hide what doesn't apply to your route (a trad
 * deal, a serial), add phases and tasks of your own. Ticks live per project in
 * the index note keyed by task id, so hiding never loses them.
 */

import { PUBLISHING_CHECKLIST, PublishingExtra } from "../../publishing/checklist-def";
import { SPEC_PUBLISHING } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const publishingChecklistSection: CustomizeSection = {
  id: "publishing-checklist",

  describe(plugin) {
    const o = plugin.settings.listOverrides.publishing;
    const total = PUBLISHING_CHECKLIST.reduce((n, p) => n + p.tasks.length, 0);
    if (!o) return `${PUBLISHING_CHECKLIST.length} phases · ${total} tasks (defaults)`;
    const mine = o.added?.length ?? 0;
    const hidden = (o.hidden?.length ?? 0) + (o.hiddenGroups?.length ?? 0);
    return [`${mine} yours`, hidden ? `${hidden} hidden` : ""].filter(Boolean).join(" · ") || "Customized";
  },

  render(host, ctx) {
    renderOverrideEditor<PublishingExtra>(host, ctx, {
      listId: "publishing",
      spec: SPEC_PUBLISHING,
      shipped: PUBLISHING_CHECKLIST.flatMap((p) =>
        p.tasks.map((t) => ({
          id: t.id,
          label: t.label,
          group: p.id,
          ...(t.optional ? { optional: true } : {}),
          ...(t.deepLink ? { deepLink: t.deepLink } : {}),
        }))
      ),
      shippedGroups: PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, label: p.label })),
      allowAdd: true,
      allowAddGroup: true,
      noun: "task",
      intro:
        "Publish → Checklist, phase by phase. Hide phases or tasks that don't apply to your " +
        "route, rename any, reorder, and add your own. Ticks are stored per project under the " +
        "task's id, so nothing you've already checked is lost when you hide or rename.",
      renderExtra(el, it, patch) {
        const wrap = el.createEl("label", { cls: "inkswell-customize__check" });
        const cb = wrap.createEl("input", { type: "checkbox" });
        cb.checked = !!it.extra.optional;
        cb.onchange = () => patch({ optional: cb.checked });
        wrap.appendText(" Optional");
      },
    });
  },
};
