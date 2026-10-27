/**
 * The fields editor behind Customize → Codex types (`codex-fields` on a type's
 * template note) and Customize → Scene inspector fields (`scene-fields` on the
 * scene template, #52): a reorderable list of label / kind / link-restriction
 * rows, an "Add field…" dialog, and a reset. The caller supplies what differs —
 * which note, which spec key, which keys are reserved, the copy.
 *
 * Cache-lag rule (AGENTS.md gotcha 18): after a write we render from the rows we
 * wrote (`pending`), not the metadata cache, until the cache reports the note
 * re-indexed.
 */

import { App, Notice, Setting, TFile } from "obsidian";
import { awaitCacheUpdate, writeTemplateFields } from "../codex/codex-template-io";
import { PLACE_PARENT_TYPES } from "../codex/places";
import { ProfileField } from "../codex/profile-schema";
import { allCategories } from "../codex/types";
import { FormModal } from "../lib/form-modal";
import { renderListEditor } from "../lib/list-editor";
import { tryFileOp } from "../lib/notify";
import { confirmDelete } from "../scenes/scene-actions";
import { taggedInput, taggedSelect } from "../views/panel-kit";
import {
  FIELD_KIND_LABELS,
  FieldKind,
  FieldRow,
  isValidNewKey,
  keyFromLabel,
  rowsFromFields,
  rowsToSpec,
} from "./field-spec";
import type { SectionCtx } from "./section";

/** The rows we just wrote per template path, rendered until the cache catches up. */
const pending = new Map<string, FieldRow[]>();

export interface FieldSpecEditorOptions {
  /** Prefix for focus tags and the list editor's keys. */
  keyPrefix: string;
  /** The template note holding the spec, or null when none exists yet. */
  template: TFile | null;
  /** The resolved fields shown when nothing is pending. */
  fields: readonly ProfileField[];
  /** Create the template note on first edit. */
  ensureTemplate: () => Promise<TFile>;
  /** Frontmatter key holding the spec (`codex-fields` / `scene-fields`). */
  specKey: string;
  /** Keys that may not become fields. */
  reserved: ReadonlySet<string>;
  /** The label a key gets when none is written (labels equal to it aren't stored). */
  defaultLabel: (key: string) => string;
  /** Kinds offered, in dropdown order. */
  kinds: readonly FieldKind[];
  emptyText: string;
  /** Shown only when a template exists. */
  reset: { label: string; confirm: string };
  add: {
    /** Description under the Label input. */
    labelDesc: string;
    /** Optional menu of ready-made fields (codex built-ins). */
    catalog?: (taken: ReadonlySet<string>) => { value: string; label: string; field: ProfileField }[];
  };
}

export function renderFieldSpecEditor(body: HTMLElement, ctx: SectionCtx, opts: FieldSpecEditorOptions): void {
  const { app, plugin } = ctx;
  const { template } = opts;
  const held = template ? pending.get(template.path) : undefined;
  const rows = held ?? rowsFromFields([...opts.fields]);

  const save = async (next: FieldRow[]): Promise<void> => {
    const file = template ?? (await tryFileOp(() => opts.ensureTemplate(), "Couldn't create the template note."));
    if (!file) return;
    ctx.markSelfWrite(file.path);
    const written = await tryFileOp(
      () => writeTemplateFields(app, file, rowsToSpec(next, opts.defaultLabel), opts.specKey, opts.reserved),
      "Couldn't save the fields."
    );
    if (written === null) return;
    pending.set(file.path, next);
    ctx.rerender();
    void awaitCacheUpdate(app, file).then(() => {
      if (pending.get(file.path) === next) pending.delete(file.path);
      ctx.rerender();
    });
  };
  const update = (index: number, patch: Partial<FieldRow>): void => {
    void save(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const types = () => allCategories(plugin.settings.customCategories, plugin.settings.categoryOverrides);
  const prefix = opts.keyPrefix;

  renderListEditor<FieldRow>(body, {
    items: rows,
    keyPrefix: prefix,
    dragType: "inkswell/customize-fields",
    emptyText: opts.emptyText,
    renderRow(el, row, index) {
      const label = taggedInput(el, `${prefix}:label:${row.key}`, { type: "text" });
      label.value = row.label;
      label.placeholder = "Label";
      label.setAttribute("aria-label", `Label for ${row.key}`);
      label.onchange = () => update(index, { label: label.value });

      el.createSpan({ cls: "inkswell-customize__key", text: row.key });

      const kind = taggedSelect(el, `${prefix}:kind:${row.key}`, { cls: "dropdown" });
      const kinds = opts.kinds.includes(row.kind) ? opts.kinds : [...opts.kinds, row.kind];
      for (const k of kinds) kind.createEl("option", { text: FIELD_KIND_LABELS[k], value: k });
      kind.value = row.kind;
      kind.setAttribute("aria-label", `Type of ${row.key}`);
      kind.onchange = () => {
        const next = kind.value as FieldKind;
        const patch: Partial<FieldRow> = { kind: next };
        if (next !== "links" && next !== "link") patch.linkCategory = undefined;
        if (next !== "links") patch.labeled = undefined;
        update(index, patch);
      };

      if (row.kind === "links" || row.kind === "link") {
        const restrict = taggedSelect(el, `${prefix}:cat:${row.key}`, { cls: "dropdown" });
        restrict.createEl("option", { text: "Any type", value: "" });
        const all = types();
        for (const c of all) restrict.createEl("option", { text: c.label, value: c.id });
        // Several types, comma-joined: the place-nesting pair is always offered
        // (#66 — a place inside a World or another Location), and any other
        // stored combination gets an option so it round-trips untouched.
        const labelOf = (id: string) => all.find((c) => c.id === id)?.label ?? id;
        const combos = new Set([PLACE_PARENT_TYPES]);
        if (row.linkCategory?.includes(",")) combos.add(row.linkCategory);
        for (const combo of combos) {
          restrict.createEl("option", { text: combo.split(",").map(labelOf).join(" or "), value: combo });
        }
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
          existingKeys: rows.map((r) => r.key),
          reserved: opts.reserved,
          kinds: opts.kinds,
          labelDesc: opts.add.labelDesc,
          catalog: opts.add.catalog,
          onAdd: (row) => void save([...rows, row]),
        }).open(),
    },
    reset: template
      ? {
          label: opts.reset.label,
          action: () =>
            void confirmDelete(app, opts.reset.confirm).then(async (ok) => {
              if (!ok) return;
              ctx.markSelfWrite(template.path);
              const done = await tryFileOp(
                () => writeTemplateFields(app, template, [], opts.specKey, opts.reserved),
                "Couldn't reset the fields."
              );
              if (done === null) return;
              pending.delete(template.path);
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
  existingKeys: string[];
  reserved: ReadonlySet<string>;
  kinds: readonly FieldKind[];
  labelDesc: string;
  catalog?: FieldSpecEditorOptions["add"]["catalog"];
  onAdd: (row: FieldRow) => void;
}

class AddFieldModal extends FormModal {
  private label = "";
  private kind: FieldKind = "text";
  /** Catalog value of a ready-made field picked from the menu ("" = none). */
  private picked = "";
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
      .setDesc(this.opts.labelDesc)
      .addText((t) =>
        t.setPlaceholder("e.g. Birth date").onChange((v) => {
          this.label = v;
          this.refreshKeyLine();
        })
      );
    this.keyLine = contentEl.createDiv({ cls: "setting-item-description" });
    this.refreshKeyLine();
    new Setting(contentEl).setName("Kind").addDropdown((d) => {
      for (const k of this.opts.kinds) d.addOption(k, FIELD_KIND_LABELS[k]);
      d.setValue(this.kind).onChange((v) => (this.kind = v as FieldKind));
    });

    const options = this.opts.catalog?.(new Set(this.opts.existingKeys)) ?? [];
    if (options.length > 0) {
      new Setting(contentEl)
        .setName("Or add one of Inkswell's built-in fields")
        .setDesc("Keeps its label and picker — a bestiary can borrow Relationships, for example.")
        .addDropdown((d) => {
          d.addOption("", "—");
          for (const o of options) d.addOption(o.value, o.label);
          d.setValue("").onChange((v) => (this.picked = v));
        });
    }
  }

  private refreshKeyLine(): void {
    if (!this.keyLine) return;
    const key = keyFromLabel(this.label);
    // A non-blank label that derives no key starts with a digit or symbol —
    // say so live rather than on submit.
    this.keyLine.setText(
      key ? `Stored as ${key}` : this.label.trim() ? "Start the label with a letter." : ""
    );
  }

  protected submit(): boolean {
    if (this.picked) {
      const hit = this.opts.catalog?.(new Set(this.opts.existingKeys)).find((o) => o.value === this.picked);
      if (hit) {
        this.opts.onAdd(rowsFromFields([hit.field])[0]);
        return true;
      }
    }
    const key = keyFromLabel(this.label);
    const check = isValidNewKey(key, this.opts.existingKeys, this.label, this.opts.reserved);
    if (!check.ok) {
      new Notice(check.reason);
      return false;
    }
    this.opts.onAdd({ id: key, key, label: this.label.trim(), kind: this.kind });
    return true;
  }
}
