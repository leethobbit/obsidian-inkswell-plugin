/**
 * Customize → Scene template: what a new scene starts with — the body of the
 * vault-wide `<base>/Templates/Scene.md`, edited in place. A project's own
 * `longform.sceneTemplate` (if set) wins over this note; it's noted, not edited.
 */

import { readTemplateBody, writeTemplateBody } from "../../codex/codex-template-io";
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
    return resolveVaultSceneTemplate(app, plugin.settings) ? "Using Templates/Scene.md" : "Default (empty scene)";
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    const { app, plugin } = ctx;
    host.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "Every scene Inkswell creates starts from this note: its frontmatter and body are " +
        "copied in and {{title}} becomes the scene's name. Without one, new scenes start empty.",
    });

    const active = resolveActive(plugin.store.getProjects(), plugin.activeProject.get());
    const draft = active?.draft;
    const own = draft && draft.format === "scenes" ? draft.sceneTemplate?.trim() : undefined;
    if (own) {
      host.createDiv({
        cls: "inkswell-stats__muted inkswell-customize__hidden-note",
        text: `The active project uses its own template instead: ${own} (the sceneTemplate key on its index note).`,
      });
    }

    ctx.cards.section(
      host,
      "scene-template:body",
      "Starter content",
      (body) => {
        renderTemplateBodyEditor(body, ctx, {
          file: resolveVaultSceneTemplate(app, plugin.settings),
          create: () => ensureSceneTemplate(app, plugin.settings),
          fieldKey: "customize:scene:body",
          hint:
            "{{title}} becomes the scene's name. A status: key here sets the default status " +
            "(otherwise new scenes get status: idea); a synopsis Inkswell seeds itself always wins.",
          noneText: `No template note yet (${sceneTemplatePath(plugin.settings)}) — new scenes start empty.`,
          read: (f) => readTemplateBody(app, f),
          write: (f, text) => writeTemplateBody(app, f, text),
        });
      },
      { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" }
    );
  },
};
