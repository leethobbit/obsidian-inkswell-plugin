/**
 * Customize → Scene inspector fields: rename, hide, and reorder the metadata
 * rows the Scene Inspector and Edit-scene dialog show. Each row is wired to a
 * fixed scene frontmatter key, so nothing here adds a field — and hiding one
 * never touches the values scenes already store (#47, #49).
 */

import { INSPECTOR_FIELDS, inspectorFields } from "../../scenes/scene-meta";
import { SPEC_SCENE_FIELDS } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const sceneFieldsSection: CustomizeSection = {
  id: "scene-fields",

  describe(plugin) {
    const o = plugin.settings.listOverrides["scene.fields"];
    if (!o) return "All fields (defaults)";
    const hidden = inspectorFields(o).filter((f) => f.hidden).length;
    const renamed = Object.keys(o.labels ?? {}).length;
    const parts: string[] = [];
    if (renamed) parts.push(`${renamed} renamed`);
    if (hidden) parts.push(`${hidden} hidden`);
    if (o.order?.length) parts.push("reordered");
    return parts.join(" · ") || "Customized";
  },

  render(host, ctx) {
    renderOverrideEditor(host, ctx, {
      listId: "scene.fields",
      spec: SPEC_SCENE_FIELDS,
      shipped: INSPECTOR_FIELDS,
      allowAdd: false,
      noun: "field",
      intro:
        "Choose which fields the scene inspector shows and in what order. Hide the ones you " +
        "don't use, or move Notes up if you draft against an outline. Hiding a field only hides " +
        "it here — scenes keep whatever they already store, and unhiding brings it straight back.",
    });
  },
};
