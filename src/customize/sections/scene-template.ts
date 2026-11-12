/**
 * Customize → Scene template: what a new scene starts with — the body of the
 * vault-wide `<base>/Templates/Scene.md`, edited in place. A project's own
 * `longform.sceneTemplate` (if set) wins over this note; it's noted, not edited.
 */

import { readTemplateBody, writeTemplateBody } from "../../codex/codex-template-io";
import { t } from "../../i18n";
import { resolveActive } from "../../projects/active-project";
import {
  ensureSceneTemplate,
  resolveVaultSceneTemplate,
  sceneTemplatePath,
} from "../../scenes/scene-template-io";
import type { CustomizeSection, SectionCtx } from "../section";
import { renderTemplateBodyEditor } from "../template-body-editor";

export const sceneTemplateSection: CustomizeSection = {
  id: "scene-template",

  describe(plugin, app) {
    return resolveVaultSceneTemplate(app, plugin.settings)
      ? t("customize.sceneTemplate.using")
      : t("customize.sceneTemplate.default");
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    const { app, plugin } = ctx;
    host.createEl("p", {
      cls: "inkswell-stats__muted",
      text: t("customize.sceneTemplate.intro"),
    });

    const active = resolveActive(plugin.store.getProjects(), plugin.activeProject.get());
    const draft = active?.draft;
    const own = draft && draft.format === "scenes" ? draft.sceneTemplate?.trim() : undefined;
    if (own) {
      host.createDiv({
        cls: "inkswell-stats__muted inkswell-customize__hidden-note",
        text: t("customize.sceneTemplate.projectOwn", { template: own }),
      });
    }

    ctx.cards.section(
      host,
      "scene-template:body",
      t("customize.sceneTemplate.card"),
      (body) => {
        renderTemplateBodyEditor(body, ctx, {
          file: resolveVaultSceneTemplate(app, plugin.settings),
          create: () => ensureSceneTemplate(app, plugin.settings),
          fieldKey: "customize:scene:body",
          hint: t("customize.sceneTemplate.hint"),
          noneText: t("customize.sceneTemplate.none", { path: sceneTemplatePath(plugin.settings) }),
          read: (f) => readTemplateBody(app, f),
          write: (f, text) => writeTemplateBody(app, f, text),
        });
      },
      { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" }
    );
  },
};
