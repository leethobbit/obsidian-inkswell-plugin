/**
 * A small editable row-list renderer reused by the Publish trackers (budget,
 * cover comps, marketing, ARCs). Each row is an object with an `id`; columns are
 * typed (text/number/checkbox/select/date). Edits and add/remove call `onChange`
 * with the full new row array, which the caller persists.
 */

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
  onChange: (rows: TrackerRow[]) => void;
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
    del.onclick = () => cfg.onChange(cfg.rows.filter((r) => r.id !== row.id));
  }

  const add = host.createEl("button", { text: cfg.addLabel ?? "+ Add" });
  add.onclick = () => cfg.onChange([...cfg.rows, cfg.newRow()]);
}

function renderCell(parent: HTMLElement, col: ColDef, row: TrackerRow, cfg: TrackerConfig): void {
  const commit = (value: unknown) => {
    const next = cfg.rows.map((r) => (r.id === row.id ? { ...r, [col.key]: value } : r));
    cfg.onChange(next);
  };

  if (col.type === "checkbox") {
    const label = parent.createEl("label", { cls: "inkswell-tracker__cell inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!row[col.key];
    cb.onchange = () => commit(cb.checked);
    label.createSpan({ text: col.label });
    return;
  }

  if (col.type === "select") {
    const sel = parent.createEl("select", { cls: "dropdown inkswell-tracker__cell" });
    for (const o of col.options ?? []) sel.createEl("option", { text: o.label, value: o.value });
    sel.value = String(row[col.key] ?? col.options?.[0]?.value ?? "");
    sel.onchange = () => commit(sel.value);
    return;
  }

  const input = parent.createEl("input", { cls: "inkswell-tracker__cell" });
  input.type = col.type === "number" ? "number" : col.type === "date" ? "date" : "text";
  input.placeholder = col.placeholder ?? col.label;
  const cur = row[col.key];
  input.value = cur == null ? "" : String(cur);
  input.onchange = () =>
    commit(col.type === "number" ? (input.value ? Number(input.value) : undefined) : input.value);
}
