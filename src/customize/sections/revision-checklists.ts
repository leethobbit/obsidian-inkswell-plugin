/**
 * Customize → Revision checklists: the three tiers of the revision method
 * (Story · Scene · Prose). Rename, reorder, hide shipped checkpoints, add your
 * own. Ids are stored keys — a hidden checkpoint's ticks stay in your notes and
 * simply stop counting; removing a custom one leaves its ticks behind as inert
 * data.
 */

import { PAGE_GROUPS, SCENE_CHECKPOINTS, STORY_CHECKPOINTS } from "../../revisions/audit";
import { SPEC_AUDIT_PAGE, SPEC_AUDIT_SCENE, SPEC_AUDIT_STORY } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection, SectionCtx } from "../section";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

export const revisionChecklistsSection: CustomizeSection = {
  id: "revision-checklists",

  describe(plugin) {
    const o = plugin.settings.listOverrides;
    const touched = ["audit.story", "audit.scene", "audit.page"].filter(
      (k) => !!o[k as keyof typeof o]
    ).length;
    return touched === 0 ? "Story 18 · Scene 14 · Prose 32 (defaults)" : `${touched} of 3 tiers customized`;
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    host.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "The revision audit's three passes, macro to micro. Hiding a checkpoint keeps any ticks " +
        "already in your notes; renaming keeps the same stored key. Add your own where the method " +
        "misses something you always check.",
    });

    ctx.cards.section(host, "revision-checklists:story", "Story-level", (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.story",
        spec: SPEC_AUDIT_STORY,
        shipped: STORY_CHECKPOINTS,
        allowAdd: true,
        noun: "checkpoint",
      });
    }, CARD);

    ctx.cards.section(host, "revision-checklists:scene", "Scene-level (per scene)", (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.scene",
        spec: SPEC_AUDIT_SCENE,
        shipped: SCENE_CHECKPOINTS,
        allowAdd: true,
        noun: "checkpoint",
      });
    }, CARD);

    ctx.cards.section(host, "revision-checklists:page", "Prose-level", (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.page",
        spec: SPEC_AUDIT_PAGE,
        shipped: PAGE_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id }))),
        shippedGroups: PAGE_GROUPS.map((g) => ({ id: g.id, label: g.label })),
        allowAdd: true,
        allowAddGroup: true,
        noun: "checkpoint",
      });
    }, CARD);
  },
};
