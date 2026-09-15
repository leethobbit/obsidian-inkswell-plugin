/**
 * The Customize fields editor's row model — PURE (no Obsidian import), tested in
 * tests/codex-field-spec.test.ts. Converts between the panel's `ProfileField`
 * list, editable rows, and the `codex-fields` spec written to the template note.
 */

import {
  FieldSpec,
  ProfileField,
  RESERVED_FIELD_KEYS,
  defaultFieldLabel,
} from "../codex/profile-schema";

/** The six kinds a writer picks from (single link is its own kind for clarity). */
export type FieldKind = "text" | "textarea" | "list" | "image" | "links" | "link";

export const FIELD_KIND_LABELS: Record<FieldKind, string> = {
  text: "Text",
  textarea: "Long text",
  list: "List",
  image: "Image",
  links: "Links",
  link: "Single link",
};

export const FIELD_KINDS: FieldKind[] = ["text", "textarea", "list", "image", "links", "link"];

export interface FieldRow {
  /** = key (the list editor needs an id). */
  id: string;
  key: string;
  label: string;
  kind: FieldKind;
  /** links/link: restrict the picker to this codex type id. */
  linkCategory?: string;
  /** links only: each link carries its own alias-stored label. */
  labeled?: boolean;
}

/** Editable rows for a resolved field list (the always-first Aliases is not a row). */
export function rowsFromFields(fields: readonly ProfileField[]): FieldRow[] {
  return fields
    .filter((f) => f.key !== "aliases")
    .map((f) => {
      const row: FieldRow = {
        id: f.key,
        key: f.key,
        label: f.label,
        kind: f.type === "links" ? (f.single ? "link" : "links") : f.type,
      };
      if (f.type === "links" && f.linkCategory) row.linkCategory = f.linkCategory;
      if (f.type === "links" && !f.single && f.labeled) row.labeled = true;
      return row;
    });
}

/** The type hint a row serializes to (`links:character:labeled`, `link:world`, `textarea`…). */
export function rowTypeHint(row: FieldRow): string {
  const cat = row.linkCategory ? `:${row.linkCategory}` : "";
  if (row.kind === "link") return `link${cat}`;
  if (row.kind === "links") return `links${cat}${row.labeled ? ":labeled" : ""}`;
  return row.kind;
}

/** Rows → spec. A label is written only when it differs from the default for
 *  that key in `category`, so shipped fields stay compact in the note. */
export function rowsToSpec(rows: readonly FieldRow[], category: string): FieldSpec[] {
  return rows.map((row) => {
    const spec: FieldSpec = { key: row.key, type: rowTypeHint(row) };
    if (row.label.trim() && row.label.trim() !== defaultFieldLabel(category, row.key)) {
      spec.label = row.label.trim();
    }
    return spec;
  });
}

/** "Birth date" → `birthDate`; "POV in scene" → `povInScene`; "" when nothing usable. */
export function keyFromLabel(label: string): string {
  const words = label
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return "";
  const key = words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return /^\p{L}/u.test(key) ? key : "";
}

const KEY_RE = /^\p{L}[\p{L}\p{N}_-]*$/u;

/** Whether `key` may become a new field alongside `existing` keys. */
export function isValidNewKey(
  key: string,
  existing: readonly string[]
): { ok: true } | { ok: false; reason: string } {
  const k = key.trim();
  if (!k) return { ok: false, reason: "Enter a label." };
  if (RESERVED_FIELD_KEYS.has(k)) return { ok: false, reason: `"${k}" is managed by Inkswell.` };
  if (existing.includes(k)) return { ok: false, reason: `"${k}" is already a field.` };
  if (!KEY_RE.test(k)) return { ok: false, reason: "Use letters and numbers (no spaces or symbols)." };
  return { ok: true };
}
