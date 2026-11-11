/**
 * Customize → Revision checklists: the four tiers of the revision method
 * (Story · Chapter · Scene · Prose). Rename, reorder, hide shipped checkpoints,
 * add your own. Ids are stored keys — a hidden checkpoint's ticks stay in your
 * notes and simply stop counting; removing a custom one leaves its ticks behind
 * as inert data.
 */

import { t } from "../../i18n";
import {
  CHAPTER_CHECKPOINTS,
  PAGE_CHECK_IDS,
  PAGE_GROUPS,
  SCENE_CHECKPOINTS,
  STORY_CHECKPOINTS,
} from "../../revisions/audit";
import {
  SPEC_AUDIT_CHAPTER,
  SPEC_AUDIT_PAGE,
  SPEC_AUDIT_SCENE,
  SPEC_AUDIT_STORY,
} from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection, SectionCtx } from "../section";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };
const TIERS = ["audit.story", "audit.chapter", "audit.scene", "audit.page"] as const;

export const revisionChecklistsSection: CustomizeSection = {
  id: "revision-checklists",

  describe(plugin) {
    const o = plugin.settings.listOverrides;
    const touched = TIERS.filter((k) => !!o[k]).length;
    return touched === 0
      ? t("customize.revision.defaults", {
          story: STORY_CHECKPOINTS.length,
          chapter: CHAPTER_CHECKPOINTS.length,
          scene: SCENE_CHECKPOINTS.length,
          prose: PAGE_CHECK_IDS.length,
        })
      : t("customize.revision.touched", { count: touched, total: TIERS.length });
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    host.createEl("p", { cls: "inkswell-stats__muted", text: t("customize.revision.intro") });

    ctx.cards.section(host, "revision-checklists:story", t("customize.revision.story"), (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.story",
        spec: SPEC_AUDIT_STORY,
        shipped: STORY_CHECKPOINTS,
        allowAdd: true,
        noun: "checkpoint",
      });
    }, CARD);

    ctx.cards.section(host, "revision-checklists:chapter", t("customize.revision.chapter"), (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.chapter",
        spec: SPEC_AUDIT_CHAPTER,
        shipped: CHAPTER_CHECKPOINTS,
        allowAdd: true,
        noun: "checkpoint",
      });
    }, CARD);

    ctx.cards.section(host, "revision-checklists:scene", t("customize.revision.scene"), (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "audit.scene",
        spec: SPEC_AUDIT_SCENE,
        shipped: SCENE_CHECKPOINTS,
        allowAdd: true,
        noun: "checkpoint",
      });
    }, CARD);

    ctx.cards.section(host, "revision-checklists:page", t("customize.revision.prose"), (body) => {
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
