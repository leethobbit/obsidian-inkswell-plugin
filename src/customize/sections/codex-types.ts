/**
 * Customize → Codex types & fields (the flagship section).
 *
 * List page: every type (built-in + custom) with entry counts and where its
 * fields come from. Type page: three cards —
 *   Display  — name / plural / icon (via CategoryModal: explicit Save matters,
 *              because the label is also the template-note lookup key),
 *   Fields   — the list editor over the type's `codex-fields`, written straight
 *              back to the template note (created on first edit),
 *   Starter  — the template note's body, edited in place.
 *
 * Cache-lag rule (AGENTS.md gotcha 18): after writing `codex-fields` we render
 * from the spec we wrote (`pending`), not from the metadata cache, until the
 * cache reports the note re-indexed.
 */

import { Menu, Notice, setIcon } from "obsidian";
import {
  deleteCustomCategory,
  openCategoryEditor,
  saveBuiltinOverride,
} from "../../codex/category-actions";
import { resolveProfileFields } from "../../codex/codex-profile";
import {
  CodexSettings,
  generateCodexTemplates,
  getCodexEntities,
  resolveCodexTemplate,
} from "../../codex/codex-store";
import { ensureCodexTemplate, readTemplateBody, writeTemplateBody } from "../../codex/codex-template-io";
import {
  FIELDS_KEY,
  RESERVED_FIELD_KEYS,
  defaultFieldLabel,
  fieldLabel,
  knownFieldsCatalog,
} from "../../codex/profile-schema";
import {
  CategoryDef,
  allCategories,
  categoryDisplayLabel,
  categoryDisplayPlural,
  defaultBuiltinDef,
  isBuiltinCategory,
} from "../../codex/types";
import { fillTemplate } from "../../i18n/dom";
import { t, tp } from "../../i18n";
import { tryFileOp } from "../../lib/notify";
import { attachRowMenu } from "../../lib/row-menu";
import { openScene } from "../../scenes/scene-actions";
import { resolveTemplateFolder } from "../../settings/folders";
import { FIELD_KINDS } from "../field-spec";
import { renderFieldSpecEditor } from "../field-spec-editor";
import type { CustomizeSection, SectionCtx } from "../section";
import { renderTemplateBodyEditor } from "../template-body-editor";

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

export const codexTypesSection: CustomizeSection = {
  id: "codex-types",

  describe(plugin) {
    const custom = plugin.settings.customCategories.length;
    const renamed = Object.keys(plugin.settings.categoryOverrides).length;
    const parts = [tp("customize.summary.builtIn", 7)];
    if (custom > 0) parts.push(tp("customize.summary.custom", custom));
    if (renamed > 0) parts.push(tp("customize.summary.renamed", renamed));
    return parts.join(" · ");
  },

  render(host, ctx) {
    if (ctx.target) renderType(host, ctx, ctx.target);
    else renderList(host, ctx);
  },
};

function categories(ctx: SectionCtx): CategoryDef[] {
  const s = ctx.plugin.settings;
  return allCategories(s.customCategories, s.categoryOverrides);
}

// ---------------------------------------------------------------------------
// List page
// ---------------------------------------------------------------------------

function renderList(host: HTMLElement, ctx: SectionCtx): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;
  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text: t("customize.codex.intro"),
  });

  const counts = new Map<string, number>();
  for (const e of getCodexEntities(app)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);

  const list = host.createDiv({ cls: "inkswell-customize__items" });
  for (const cat of categories(ctx)) {
    const row = list.createDiv({ cls: "inkswell-customize__item" });
    row.setAttribute("role", "button");
    setIcon(row.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
    const text = row.createDiv({ cls: "inkswell-customize__text" });
    text.createDiv({ cls: "inkswell-customize__name", text: categoryDisplayLabel(cat) });
    const shipped = defaultBuiltinDef(cat.id);
    const descVars = { plural: categoryDisplayPlural(cat), id: cat.id };
    text.createDiv({
      cls: "inkswell-customize__desc",
      text: !shipped
        ? t("customize.codex.rowDescCustom", descVars)
        : shipped.label !== cat.label
          ? t("customize.codex.rowDescRenamed", { ...descVars, shipped: categoryDisplayLabel(shipped) })
          : t("customize.codex.rowDesc", descVars),
    });
    const chips = row.createDiv({ cls: "inkswell-customize__chips" });
    const n = counts.get(cat.id) ?? 0;
    chips.createSpan({ cls: "inkswell-chip", text: tp("customize.codex.entries", n) });
    const { template } = resolveProfileFields(app, settings, cat.id);
    chips.createSpan({
      cls: "inkswell-chip",
      text: template
        ? t("customize.codex.fieldsFrom", { name: template.basename })
        : t("customize.codex.fieldsShipped"),
    });
    row.onclick = () => ctx.setTarget(cat.id);
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle(t("customize.codex.editDisplay"))
          .setIcon("pencil")
          .onClick(() => openCategoryEditor(app, plugin, cat, () => ctx.rerender()))
      );
      if (!isBuiltinCategory(cat.id)) {
        menu.addSeparator();
        menu.addItem((i) =>
          i
            .setTitle(t("customize.codex.deleteType"))
            .setIcon("trash")
            .onClick(() =>
              void deleteCustomCategory(app, plugin, cat).then((done) => {
                if (done) ctx.rerender();
              })
            )
        );
      }
      return menu;
    });
  }

  const foot = host.createDiv({ cls: "inkswell-customize__foot" });
  const add = foot.createEl("button", { cls: "mod-cta", text: t("customize.codex.newType") });
  add.type = "button";
  add.onclick = () => openCategoryEditor(app, plugin, null, (def) => ctx.setTarget(def.id));
  const gen = foot.createEl("button", { text: t("customize.codex.generate") });
  gen.type = "button";
  gen.setAttribute("aria-label", t("customize.codex.generateAria"));
  gen.onclick = async () => {
    const folder = resolveTemplateFolder(settings) || t("customize.codex.vaultRoot");
    const created = await tryFileOp(
      () => generateCodexTemplates(app, settings),
      t("customize.codex.generateFailed")
    );
    if (created === null) return;
    new Notice(
      created.length > 0
        ? tp("customize.codex.generated", created.length, { folder })
        : t("customize.codex.generatedNone")
    );
    ctx.rerender();
  };
}

// ---------------------------------------------------------------------------
// Type page
// ---------------------------------------------------------------------------

function renderType(host: HTMLElement, ctx: SectionCtx, id: string): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;

  const back = host.createEl("a", { cls: "inkswell-customize__back", text: t("customize.codex.back") });
  back.onclick = (e) => {
    e.preventDefault();
    ctx.setTarget(null);
  };

  const cat = categories(ctx).find((c) => c.id === id);
  if (!cat) {
    host.createDiv({ cls: "inkswell-stats__muted", text: t("customize.codex.gone") });
    return;
  }

  const head = host.createDiv({ cls: "inkswell-customize__typehead" });
  setIcon(head.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
  head.createEl("h4", { text: categoryDisplayLabel(cat) });
  head.createSpan({ cls: "inkswell-stats__muted", text: t("customize.codex.idLine", { id: cat.id }) });

  ctx.cards.section(
    host,
    "codex-types:display",
    t("customize.codex.card.display"),
    (body) => renderDisplay(body, ctx, cat),
    CARD
  );
  ctx.cards.section(
    host,
    "codex-types:fields",
    t("customize.codex.card.fields"),
    (body) => renderFields(body, ctx, cat),
    CARD
  );
  ctx.cards.section(
    host,
    "codex-types:starter",
    t("customize.codex.card.starter"),
    (body) => {
      renderTemplateBodyEditor(body, ctx, {
        file: resolveCodexTemplate(app, settings, cat),
        create: () => ensureCodexTemplate(app, settings, cat),
        fieldKey: `customize:codex:body:${cat.id}`,
        hint: t("customize.codex.starterHint"),
        // Known limitation: lowercasing the plural mid-sentence is an English-only trick.
        noneText: t("customize.codex.starterNone", { plural: categoryDisplayPlural(cat).toLowerCase() }),
        read: (f) => readTemplateBody(app, f),
        write: (f, body) => writeTemplateBody(app, f, body),
      });
    },
    CARD
  );
}

function renderDisplay(body: HTMLElement, ctx: SectionCtx, cat: CategoryDef): void {
  const { app, plugin } = ctx;
  const shipped = defaultBuiltinDef(cat.id);
  const kv = body.createDiv({ cls: "inkswell-customize__kv" });
  // Key and value are direct grid cells (no wrapper row — `display: contents`
  // is only partially supported by the review bot's baseline).
  const line = (k: string, v: string): void => {
    kv.createSpan({ cls: "inkswell-customize__kvkey", text: k });
    kv.createSpan({ text: v });
  };
  line(t("customize.codex.display.name"), categoryDisplayLabel(cat));
  line(t("customize.codex.display.plural"), categoryDisplayPlural(cat));
  line(t("customize.codex.display.icon"), cat.icon);
  const overridden =
    shipped && (shipped.label !== cat.label || shipped.plural !== cat.plural || shipped.icon !== cat.icon);
  if (overridden && shipped) {
    body.createDiv({
      cls: "inkswell-stats__muted",
      text: t("customize.codex.display.shipped", {
        label: categoryDisplayLabel(shipped),
        plural: categoryDisplayPlural(shipped),
        icon: shipped.icon,
        id: cat.id,
      }),
    });
  }
  const actions = body.createDiv({ cls: "inkswell-customize__actions" });
  const edit = actions.createEl("button", { text: t("customize.codex.display.edit") });
  edit.type = "button";
  edit.onclick = () => openCategoryEditor(app, plugin, cat, () => ctx.rerender());
  if (overridden && shipped && isBuiltinCategory(cat.id)) {
    const reset = actions.createEl("button", { text: t("customize.codex.display.reset") });
    reset.type = "button";
    const builtinId = cat.id;
    reset.onclick = () =>
      void saveBuiltinOverride(plugin, builtinId, shipped).then(() => ctx.rerender());
  }
}

function renderFields(body: HTMLElement, ctx: SectionCtx, cat: CategoryDef): void {
  const { app, plugin } = ctx;
  const settings: CodexSettings = plugin.settings;
  const { fields, template } = resolveProfileFields(app, settings, cat.id);

  const src = body.createDiv({ cls: "inkswell-stats__muted inkswell-customize__fieldsrc" });
  if (template) {
    fillTemplate(src, t("customize.codex.fieldsSource"), {
      link: (parent) => {
        const link = parent.createEl("a", { text: template.path });
        link.onclick = (e) => {
          e.preventDefault();
          openScene(app, template);
        };
      },
    });
  } else {
    src.setText(t("customize.codex.fieldsSourceShipped"));
  }

  const typeLabels: Record<string, string> = Object.fromEntries(
    categories(ctx).map((c) => [c.id, categoryDisplayLabel(c)])
  );
  renderFieldSpecEditor(body, ctx, {
    keyPrefix: `customize:fields:${cat.id}`,
    template,
    fields,
    ensureTemplate: () => ensureCodexTemplate(app, settings, cat),
    specKey: FIELDS_KEY,
    reserved: RESERVED_FIELD_KEYS,
    defaultLabel: (key) => defaultFieldLabel(cat.id, key),
    kinds: FIELD_KINDS,
    emptyText: t("customize.codex.fieldsEmpty"),
    reset: {
      label: t("customize.codex.fieldsReset"),
      confirm: template
        ? t("customize.codex.fieldsResetConfirm", { type: categoryDisplayLabel(cat), template: template.basename })
        : t("customize.codex.fieldsResetConfirmNoTemplate", { type: categoryDisplayLabel(cat) }),
    },
    add: {
      labelDesc: t("customize.codex.fieldsLabelDesc"),
      catalog: (taken) =>
        knownFieldsCatalog()
          .filter(({ field }) => !taken.has(field.key))
          .map(({ field, source }) => ({
            value: `${source}|${field.key}`,
            // Display only: the picked field is added from `field` (stored English label).
            label:
              source === "all"
                ? fieldLabel(field)
                : source === "generic"
                  ? t("customize.codex.builtinField.generic", { label: fieldLabel(field) })
                  : t("customize.codex.builtinField.type", {
                      label: fieldLabel(field),
                      type: typeLabels[source] ?? source,
                    }),
            field,
          })),
    },
  });
}
