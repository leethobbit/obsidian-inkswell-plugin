/**
 * Customize → Scene statuses: rename, hide, and reorder the six statuses. The
 * STORED values never change (frozen 1.x enum, cross-tool), so nothing here can
 * add or remove one — see the storage decision in SCHEMA.md §B.
 */

import { SCENE_STATUSES, sceneStatuses, statusLabel } from "../../scenes/scene-meta";
import { SPEC_SCENE_STATUS } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const sceneStatusesSection: CustomizeSection = {
  id: "scene-statuses",

  describe(plugin) {
    const o = plugin.settings.listOverrides["scene.status"];
    if (!o) return "Idea → Final (defaults)";
    const hidden = sceneStatuses(o).filter((s) => s.hidden).length;
    const renamed = Object.keys(o.labels ?? {}).length;
    const parts: string[] = [];
    if (renamed) parts.push(`${renamed} renamed`);
    if (hidden) parts.push(`${hidden} hidden`);
    if (o.order?.length) parts.push("reordered");
    return parts.join(" · ") || "Customized";
  },

  render(host, ctx) {
    renderOverrideEditor(host, ctx, {
      listId: "scene.status",
      spec: SPEC_SCENE_STATUS,
      shipped: SCENE_STATUSES.map((s) => ({ id: s, label: statusLabel(s) })),
      allowAdd: false,
      noun: "status",
      intro:
        "Rename a status to match your process (“Draft 1”, “Polish”, “Locked”), hide the ones " +
        "you don't use, and set the order the Board and pickers show them in. Scenes keep their " +
        "stored value either way, so this is safe to change mid-book; a scene on a hidden status " +
        "still shows it, marked hidden. New statuses can't be added in this version.",
    });
  },
};
