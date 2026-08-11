/**
 * A small editable row-list renderer reused by the Publish trackers (budget,
 * cover comps, marketing, ARCs). Each row is an object with a stable `id`;
 * columns are typed (text/number/checkbox/select/date). Edits are reported as
 * per-row OPS (`onEdit`/`onAdd`/`onRemove` by row id), never as a whole new
 * array — the caller applies each op against the CURRENT stored rows inside
 * its persist mutator, so cells edited from the same rendered grid can't
 * overwrite each other (the stale-snapshot data-loss class).
 */

import { tagField } from "../../lib/focus-preserve";

export type ColType = "text" | "number" | "checkbox" | "select" | "date";

export interface ColDef {
  key: string;
  label: string;
  type: ColType;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface TrackerRow {
  id: string;
  [key: string]: unknown;
}

export interface TrackerConfig {
  columns: ColDef[];
  rows: TrackerRow[];
  newRow: () => TrackerRow;
  /** One cell changed. Apply as a by-id patch against current rows. */
  onEdit: (rowId: string, key: string, value: unknown) => void;
  /** A new row was added. Append (if its id is absent) to current rows. */
  onAdd: (row: TrackerRow) => void;
  /** A row was removed. Filter by id from current rows. */
  onRemove: (rowId: string) => void;
  /** tagField key prefix for this grid's cells (e.g. "pub:budget") so
   *  preserveFocus can carry a focused cell across a rebuild. */
  keyPrefix: string;
  addLabel?: string;
  emptyText?: string;
}

export function renderTrackerSection(host: HTMLElement, cfg: TrackerConfig): void {
  if (cfg.rows.length === 0 && cfg.emptyText) {
    host.createDiv({ cls: "inkswell-stats__muted", text: cfg.emptyText });
  }

  for (const row of cfg.rows) {
    const el = host.createDiv({ cls: "inkswell-tracker__row" });
    for (const col of cfg.columns) renderCell(el, col, row, cfg);
    const del = el.createSpan({ cls: "inkswell-chip__x", text: "×" });
    del.setAttribute("aria-label", "Remove row");
    del.onclick = () => cfg.onRemove(row.id);
  }

  const add = host.createEl("button", { text: cfg.addLabel ?? "+ Add" });
  add.onclick = () => cfg.onAdd(cfg.newRow());
}

function renderCell(parent: HTMLElement, col: ColDef, row: TrackerRow, cfg: TrackerConfig): void {
  const commit = (value: unknown) => cfg.onEdit(row.id, col.key, value);
  const key = `${cfg.keyPrefix}:${row.id}:${col.key}`;

  if (col.type === "checkbox") {
    const label = parent.createEl("label", { cls: "inkswell-tracker__cell inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    tagField(cb, key);
    cb.checked = !!row[col.key];
    cb.onchange = () => commit(cb.checked);
    label.createSpan({ text: col.label });
    return;
  }

  if (col.type === "select") {
    const sel = parent.createEl("select", { cls: "dropdown inkswell-tracker__cell" });
    tagField(sel, key);
    for (const o of col.options ?? []) sel.createEl("option", { text: o.label, value: o.value });
    sel.value = String(row[col.key] ?? col.options?.[0]?.value ?? "");
    sel.onchange = () => commit(sel.value);
    return;
  }

  const input = parent.createEl("input", { cls: "inkswell-tracker__cell" });
  tagField(input, key);
  input.type = col.type === "number" ? "number" : col.type === "date" ? "date" : "text";
  input.placeholder = col.placeholder ?? col.label;
  const cur = row[col.key];
  input.value = cur == null ? "" : String(cur);
  input.onchange = () =>
    commit(col.type === "number" ? (input.value ? Number(input.value) : undefined) : input.value);
}
