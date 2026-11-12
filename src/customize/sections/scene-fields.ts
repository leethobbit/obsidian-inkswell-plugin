/**
 * Customize → Scene inspector fields. Two cards:
 *   Layout       — rename, hide, and reorder the inspector rows (built-in fields
 *                  plus the "Your fields" block as one movable row). Display
 *                  only: hiding never touches what scenes store (#47, #49).
 *   Your fields  — the writer's own fields (#52), written to the scene template
 *                  note's `scene-fields` (created on first edit), in the same
 *                  format and editor as a codex type's fields.
 */

import { fillTemplate } from "../../i18n/dom";
import { t, tp } from "../../i18n";
import { openScene } from "../../scenes/scene-actions";
import { inspectorFields, shippedInspectorFields } from "../../scenes/scene-meta";
import { SCENE_FIELDS_KEY, SCENE_RESERVED_KEYS } from "../../scenes/scene-fields";
import {
  ensureSceneTemplate,
  resolveSceneFields,
  resolveVaultSceneTemplate,
} from "../../scenes/scene-template-io";
import { humanizeKey } from "../../codex/profile-schema";
import { SPEC_SCENE_FIELDS } from "../../settings/overridable-lists";
import { FieldKind } from "../field-spec";
import { renderFieldSpecEditor } from "../field-spec-editor";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

/** Scenes have no portrait, so no image kind. */
const SCENE_FIELD_KINDS: FieldKind[] = ["text", "textarea", "number", "date", "list", "links", "link"];

export const sceneFieldsSection: CustomizeSection = {
  id: "scene-fields",

  describe(plugin, app) {
    const own = resolveSceneFields(app, plugin.settings).length;
    const o = plugin.settings.listOverrides["scene.fields"];
    const parts: string[] = [];
    if (own) parts.push(tp("customize.sceneFields.own", own));
    if (o) {
      const hidden = inspectorFields(o).filter((f) => f.hidden).length;
      const renamed = Object.keys(o.labels ?? {}).length;
      if (renamed) parts.push(tp("customize.summary.renamed", renamed));
      if (hidden) parts.push(tp("customize.summary.hidden", hidden));
      if (o.order?.length) parts.push(t("customize.summary.reordered"));
    }
    return parts.join(" · ") || t("customize.sceneFields.defaults");
  },

  render(host, ctx) {
    const { app, plugin } = ctx;

    ctx.cards.section(host, "scene-fields:layout", t("customize.sceneFields.card.layout"), (body) => {
      renderOverrideEditor(body, ctx, {
        listId: "scene.fields",
        spec: SPEC_SCENE_FIELDS,
        shipped: shippedInspectorFields(),
        allowAdd: false,
        noun: "field",
        intro: t("customize.sceneFields.layoutIntro"),
      });
    }, CARD);

    ctx.cards.section(host, "scene-fields:own", t("customize.sceneFields.card.own"), (body) => {
      const template = resolveVaultSceneTemplate(app, plugin.settings);
      const src = body.createDiv({ cls: "inkswell-stats__muted inkswell-customize__fieldsrc" });
      src.appendText(`${t("customize.sceneFields.ownIntro")} `);
      if (template) {
        fillTemplate(src, t("customize.sceneFields.storedIn"), {
          link: (parent) => {
            const link = parent.createEl("a", { text: template.path });
            link.onclick = (e) => {
              e.preventDefault();
              openScene(app, template);
            };
          },
        });
      } else {
        src.appendText(t("customize.sceneFields.firstCreates"));
      }

      renderFieldSpecEditor(body, ctx, {
        keyPrefix: "customize:scene-fields",
        template,
        fields: resolveSceneFields(app, plugin.settings),
        ensureTemplate: () => ensureSceneTemplate(app, plugin.settings),
        specKey: SCENE_FIELDS_KEY,
        reserved: SCENE_RESERVED_KEYS,
        defaultLabel: humanizeKey,
        kinds: SCENE_FIELD_KINDS,
        emptyText: t("customize.sceneFields.empty"),
        reset: {
          label: t("customize.sceneFields.reset"),
          confirm: template
            ? t("customize.sceneFields.resetConfirm", { key: SCENE_FIELDS_KEY, template: template.basename })
            : t("customize.sceneFields.resetConfirmNoTemplate", { key: SCENE_FIELDS_KEY }),
        },
        add: { labelDesc: t("customize.sceneFields.labelDesc") },
      });
    }, CARD);
  },
};
