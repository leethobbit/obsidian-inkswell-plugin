/**
 * Customize → Scene statuses: rename, hide, and reorder the six statuses. The
 * STORED values never change (frozen 1.x enum, cross-tool), so nothing here can
 * add or remove one — see the storage decision in SCHEMA.md §B.
 */

import { t, tp } from "../../i18n";
import { SCENE_STATUSES, sceneStatuses, statusLabel } from "../../scenes/scene-meta";
import { SPEC_SCENE_STATUS } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const sceneStatusesSection: CustomizeSection = {
  id: "scene-statuses",

  describe(plugin) {
    const o = plugin.settings.listOverrides["scene.status"];
    if (!o) return t("customize.statuses.defaults");
    const hidden = sceneStatuses(o).filter((s) => s.hidden).length;
    const renamed = Object.keys(o.labels ?? {}).length;
    const parts: string[] = [];
    if (renamed) parts.push(tp("customize.summary.renamed", renamed));
    if (hidden) parts.push(tp("customize.summary.hidden", hidden));
    if (o.order?.length) parts.push(t("customize.summary.reordered"));
    return parts.join(" · ") || t("customize.summary.customized");
  },

  render(host, ctx) {
    renderOverrideEditor(host, ctx, {
      listId: "scene.status",
      spec: SPEC_SCENE_STATUS,
      shipped: SCENE_STATUSES.map((s) => ({ id: s, label: statusLabel(s) })),
      allowAdd: false,
      noun: "status",
      intro: t("customize.statuses.intro"),
    });
  },
};
