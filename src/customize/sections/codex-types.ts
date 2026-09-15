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

import { App, Menu, Notice, Setting, setIcon } from "obsidian";
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
import {
  awaitCacheUpdate,
  ensureCodexTemplate,
  readTemplateBody,
  writeTemplateBody,
  writeTemplateFields,
} from "../../codex/codex-template-io";
import { ProfileField, knownFieldsCatalog } from "../../codex/profile-schema";
import {
  CategoryDef,
  allCategories,
  defaultBuiltinDef,
  isBuiltinCategory,
} from "../../codex/types";
import { FormModal } from "../../lib/form-modal";
import { renderListEditor } from "../../lib/list-editor";
import { tryFileOp } from "../../lib/notify";
import { attachRowMenu } from "../../lib/row-menu";
import { confirmDelete, openScene } from "../../scenes/scene-actions";
import { resolveTemplateFolder } from "../../settings/folders";
import { taggedInput, taggedSelect } from "../../views/panel-kit";
import {
  FIELD_KINDS,
  FIELD_KIND_LABELS,
  FieldKind,
  FieldRow,
  isValidNewKey,
  keyFromLabel,
  rowsFromFields,
  rowsToSpec,
} from "../field-spec";
import type { CustomizeSection, SectionCtx } from "../section";
import { renderTemplateBodyEditor } from "../template-body-editor";

/** The spec we just wrote, rendered until the metadata cache catches up. */
let pending: { path: string; rows: FieldRow[] } | null = null;

const CARD = { detailsCls: "inkswell-customize__card", bodyCls: "inkswell-customize__cardbody" };

export const codexTypesSection: CustomizeSection = {
  id: "codex-types",

  describe(plugin) {
    const custom = plugin.settings.customCategories.length;
    const renamed = Object.keys(plugin.settings.categoryOverrides).length;
    const parts = ["7 built-in"];
    if (custom > 0) parts.push(`${custom} custom`);
    if (renamed > 0) parts.push(`${renamed} renamed`);
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
    text:
      "Each codex type has a display (name, plural, icon), the fields its entries show in " +
      "the Codex panel, and the starter content a new entry begins with. Fields and starter " +
      "content live in an ordinary template note — editing here edits that note.",
  });

  const counts = new Map<string, number>();
  for (const e of getCodexEntities(app)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);

  const list = host.createDiv({ cls: "inkswell-customize__items" });
  for (const cat of categories(ctx)) {
    const row = list.createDiv({ cls: "inkswell-customize__item" });
    row.setAttribute("role", "button");
    setIcon(row.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
    const text = row.createDiv({ cls: "inkswell-customize__text" });
    text.createDiv({ cls: "inkswell-customize__name", text: cat.label });
    const shipped = defaultBuiltinDef(cat.id);
    const renamed = shipped && shipped.label !== cat.label ? ` · renamed from ${shipped.label}` : "";
    text.createDiv({
      cls: "inkswell-customize__desc",
      text: `${cat.plural} · codex: ${cat.id}${renamed}${shipped ? "" : " · custom"}`,
    });
    const chips = row.createDiv({ cls: "inkswell-customize__chips" });
    const n = counts.get(cat.id) ?? 0;
    chips.createSpan({ cls: "inkswell-chip", text: `${n} entr${n === 1 ? "y" : "ies"}` });
    const { template } = resolveProfileFields(app, settings, cat.id);
    chips.createSpan({
      cls: "inkswell-chip",
      text: template ? `Fields: ${template.basename}` : "Fields: shipped",
    });
    row.onclick = () => ctx.setTarget(cat.id);
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle("Edit display…")
          .setIcon("pencil")
          .onClick(() => openCategoryEditor(app, plugin, cat, () => ctx.rerender()))
      );
      if (!isBuiltinCategory(cat.id)) {
        menu.addSeparator();
        menu.addItem((i) =>
          i
            .setTitle("Delete type…")
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
  const add = foot.createEl("button", { cls: "mod-cta", text: "New type…" });
  add.type = "button";
  add.onclick = () => openCategoryEditor(app, plugin, null, (def) => ctx.setTarget(def.id));
  const gen = foot.createEl("button", { text: "Generate all starter templates" });
  gen.type = "button";
  gen.setAttribute(
    "aria-label",
    "Create a template note for every type that lacks one (plus Scene.md and a README)"
  );
  gen.onclick = async () => {
    const folder = resolveTemplateFolder(settings) || "(vault root)";
    const created = await tryFileOp(
      () => generateCodexTemplates(app, settings),
      "Couldn't generate the starter templates."
    );
    if (created === null) return;
    new Notice(
      created.length > 0
        ? `Created ${created.length} template${created.length === 1 ? "" : "s"} in "${folder}".`
        : "Templates already exist — nothing to create."
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

  const back = host.createEl("a", { cls: "inkswell-customize__back", text: "‹ Codex types" });
  back.onclick = (e) => {
    e.preventDefault();
    ctx.setTarget(null);
  };

  const cat = categories(ctx).find((c) => c.id === id);
  if (!cat) {
    host.createDiv({ cls: "inkswell-stats__muted", text: "That type no longer exists." });
    return;
  }

  const head = host.createDiv({ cls: "inkswell-customize__typehead" });
  setIcon(head.createSpan({ cls: "inkswell-customize__icon" }), cat.icon);
  head.createEl("h4", { text: cat.label });
  head.createSpan({ cls: "inkswell-stats__muted", text: `codex: ${cat.id}` });

  ctx.cards.section(host, "codex-types:display", "Display", (body) => renderDisplay(body, ctx, cat), CARD);
  ctx.cards.section(host, "codex-types:fields", "Fields", (body) => renderFields(body, ctx, cat), CARD);
  ctx.cards.section(
    host,
    "codex-types:starter",
    "Starter content",
    (body) => {
      renderTemplateBodyEditor(body, ctx, {
        file: resolveCodexTemplate(app, settings, cat),
        create: () => ensureCodexTemplate(app, settings, cat),
        fieldKey: `customize:codex:body:${cat.id}`,
        hint:
          "This is what a new entry starts with. {{title}} becomes the entry's name. " +
          "Inkswell adds codex: and the project/series scope itself — don't add a codex: key.",
        noneText: `No template note yet — new ${cat.plural.toLowerCase()} start with a heading only.`,
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
  const line = (k: string, v: string): void => {
    const r = kv.createDiv({ cls: "inkswell-customize__kvrow" });
    r.createSpan({ cls: "inkswell-customize__kvkey", text: k });
    r.createSpan({ text: v });
  };
  line("Name", cat.label);
  line("Plural", cat.plural);
  line("Icon", cat.icon);
  const overridden =
    shipped && (shipped.label !== cat.label || shipped.plural !== cat.plural || shipped.icon !== cat.icon);
  if (overridden && shipped) {
    body.createDiv({
      cls: "inkswell-stats__muted",
      text: `Shipped as ${shipped.label} / ${shipped.plural} / ${shipped.icon}. Entries keep codex: ${cat.id}.`,
    });
  }
  const actions = body.createDiv({ cls: "inkswell-customize__actions" });
  const edit = actions.createEl("button", { text: "Edit…" });
  edit.type = "button";
  edit.onclick = () => openCategoryEditor(app, plugin, cat, () => ctx.rerender());
  if (overridden && shipped && isBuiltinCategory(cat.id)) {
    const reset = actions.createEl("button", { text: "Reset to default" });
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
  const rows =
    pending && template && pending.path === template.path ? pending.rows : rowsFromFields(fields);

  const src = body.createDiv({ cls: "inkswell-stats__muted inkswell-customize__fieldsrc" });
  if (template) {
    src.appendText("Fields from ");
    const link = src.createEl("a", { text: template.path });
    link.onclick = (e) => {
      e.preventDefault();
      openScene(app, template);
    };
    src.appendText(". Aliases always comes first.");
  } else {
    src.setText(
      "Using Inkswell's shipped fields. Your first change creates a template note for this " +
        "type and records the fields there. Aliases always comes first."
    );
  }

  const save = async (next: FieldRow[]): Promise<void> => {
    const file =
      template ??
      (await tryFileOp(
        () => ensureCodexTemplate(app, settings, cat),
        "Couldn't create the template note."
      ));
    if (!file) return;
    ctx.markSelfWrite(file.path);
    const written = await tryFileOp(
      () => writeTemplateFields(app, file, rowsToSpec(next, cat.id)),
      "Couldn't save the fields."
    );
    if (written === null) return;
    pending = { path: file.path, rows: next };
    ctx.rerender();
    void awaitCacheUpdate(app, file).then(() => {
      if (pending?.path === file.path) pending = null;
      ctx.rerender();
    });
  };
  const update = (index: number, patch: Partial<FieldRow>): void => {
    void save(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const prefix = `customize:fields:${cat.id}`;

  renderListEditor<FieldRow>(body, {
    items: rows,
    keyPrefix: prefix,
    dragType: "inkswell/customize-fields",
    emptyText: "No fields yet — add one below.",
    renderRow(el, row, index) {
      const label = taggedInput(el, `${prefix}:label:${row.key}`, { type: "text" });
      label.value = row.label;
      label.placeholder = "Label";
      label.setAttribute("aria-label", `Label for ${row.key}`);
      label.onchange = () => update(index, { label: label.value });

      el.createSpan({ cls: "inkswell-customize__key", text: row.key });

      const kind = taggedSelect(el, `${prefix}:kind:${row.key}`, { cls: "dropdown" });
      for (const k of FIELD_KINDS) kind.createEl("option", { text: FIELD_KIND_LABELS[k], value: k });
      kind.value = row.kind;
      kind.setAttribute("aria-label", `Type of ${row.key}`);
      kind.onchange = () => {
        const next = kind.value as FieldKind;
        const patch: Partial<FieldRow> = { kind: next };
        if (next !== "links" && next !== "link") {
          patch.linkCategory = undefined;
          patch.labeled = undefined;
        }
        if (next !== "links") patch.labeled = undefined;
        update(index, patch);
      };

      if (row.kind === "links" || row.kind === "link") {
        const restrict = taggedSelect(el, `${prefix}:cat:${row.key}`, { cls: "dropdown" });
        restrict.createEl("option", { text: "Any type", value: "" });
        for (const c of categories(ctx)) restrict.createEl("option", { text: c.label, value: c.id });
        restrict.value = row.linkCategory ?? "";
        restrict.setAttribute("aria-label", `Restrict ${row.key} to a type`);
        restrict.onchange = () => update(index, { linkCategory: restrict.value || undefined });
      }
      if (row.kind === "links") {
        const wrap = el.createEl("label", { cls: "inkswell-customize__check" });
        const cb = wrap.createEl("input", { type: "checkbox" });
        cb.checked = !!row.labeled;
        cb.onchange = () => update(index, { labeled: cb.checked || undefined });
        wrap.appendText(" Per-link labels");
      }
    },
    onReorder: (next) => save(next),
    onRemove: (item) => save(rows.filter((r) => r.id !== item.id)),
    add: {
      label: "Add field…",
      action: () =>
        new AddFieldModal(app, {
          category: cat.id,
          existingKeys: rows.map((r) => r.key),
          typeLabels: Object.fromEntries(categories(ctx).map((c) => [c.id, c.label])),
          onAdd: (row) => void save([...rows, row]),
        }).open(),
    },
    reset: template
      ? {
          label: "Reset to shipped fields",
          action: () =>
            void confirmDelete(
              app,
              `Use Inkswell's shipped fields for ${cat.label}? This removes the codex-fields ` +
                `property from ${template.basename} — existing entries keep their frontmatter.`
            ).then(async (ok) => {
              if (!ok) return;
              ctx.markSelfWrite(template.path);
              const done = await tryFileOp(
                () => writeTemplateFields(app, template, []),
                "Couldn't reset the fields."
              );
              if (done === null) return;
              pending = null;
              ctx.rerender();
              void awaitCacheUpdate(app, template).then(() => ctx.rerender());
            }),
        }
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// Add-field dialog
// ---------------------------------------------------------------------------

interface AddFieldOptions {
  category: string;
  existingKeys: string[];
  /** Type id → label, for the "add a built-in field" menu's source annotation. */
  typeLabels: Record<string, string>;
  onAdd: (row: FieldRow) => void;
}

class AddFieldModal extends FormModal {
  private label = "";
  private kind: FieldKind = "text";
  /** `source|key` of a shipped field picked from the menu ("" = none). */
  private builtin = "";
  private keyLine: HTMLElement | null = null;

  constructor(
    app: App,
    private opts: AddFieldOptions
  ) {
    super(app);
    this.cta = "Add";
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Add field" });
    new Setting(contentEl)
      .setName("Label")
      .setDesc("What the Codex panel shows. The stored key is derived from it.")
      .addText((t) =>
        t.setPlaceholder("e.g. Birth date").onChange((v) => {
          this.label = v;
          this.refreshKeyLine();
        })
      );
    this.keyLine = contentEl.createDiv({ cls: "setting-item-description" });
    this.refreshKeyLine();
    new Setting(contentEl)
      .setName("Kind")
      .addDropdown((d) => {
        for (const k of FIELD_KINDS) d.addOption(k, FIELD_KIND_LABELS[k]);
        d.setValue(this.kind).onChange((v) => (this.kind = v as FieldKind));
      });

    const taken = new Set(this.opts.existingKeys);
    const options = knownFieldsCatalog().filter(({ field }) => !taken.has(field.key));
    if (options.length > 0) {
      new Setting(contentEl)
        .setName("Or add one of Inkswell's built-in fields")
        .setDesc("Keeps its label and picker — a bestiary can borrow Relationships, for example.")
        .addDropdown((d) => {
          d.addOption("", "—");
          for (const { field, source } of options) {
            const where =
              source === "all" ? "" : source === "generic" ? " (custom types)" : ` (${this.opts.typeLabels[source] ?? source})`;
            d.addOption(`${source}|${field.key}`, `${field.label}${where}`);
          }
          d.setValue("").onChange((v) => (this.builtin = v));
        });
    }
  }

  private refreshKeyLine(): void {
    if (!this.keyLine) return;
    const key = keyFromLabel(this.label);
    this.keyLine.setText(key ? `Stored as ${key}` : "");
  }

  protected submit(): boolean {
    if (this.builtin) {
      const [, key] = this.builtin.split("|");
      const hit = knownFieldsCatalog().find(({ field }) => field.key === key);
      if (hit) {
        const row = rowsFromFields([hit.field as ProfileField])[0];
        this.opts.onAdd(row);
        return true;
      }
    }
    const key = keyFromLabel(this.label);
    const check = isValidNewKey(key, this.opts.existingKeys);
    if (!check.ok) {
      new Notice(check.reason);
      return false;
    }
    this.opts.onAdd({ id: key, key, label: this.label.trim(), kind: this.kind });
    return true;
  }
}
