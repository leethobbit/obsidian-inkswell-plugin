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
import { t } from "../i18n";

/** The kinds a writer picks from (single link is its own kind for clarity). */
export type FieldKind = "text" | "textarea" | "number" | "date" | "list" | "image" | "links" | "link";

/** Display label per kind. Getters: each read translates (never at import). */
export const FIELD_KIND_LABELS: Readonly<Record<FieldKind, string>> = {
  get text() {
    return t("customize.fieldKind.text");
  },
  get textarea() {
    return t("customize.fieldKind.textarea");
  },
  get number() {
    return t("customize.fieldKind.number");
  },
  get date() {
    return t("customize.fieldKind.date");
  },
  get list() {
    return t("customize.fieldKind.list");
  },
  get image() {
    return t("customize.fieldKind.image");
  },
  get links() {
    return t("customize.fieldKind.links");
  },
  get link() {
    return t("customize.fieldKind.link");
  },
};

/** Dropdown order. Kept in sync with FIELD_KIND_LABELS by a test. */
export const FIELD_KINDS: FieldKind[] = ["text", "textarea", "number", "date", "list", "image", "links", "link"];

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
 *  that key — a codex `category`'s rule, or the caller's own (scene fields) —
 *  so shipped fields stay compact in the note. */
export function rowsToSpec(
  rows: readonly FieldRow[],
  category: string | ((key: string) => string)
): FieldSpec[] {
  const defaultLabel =
    typeof category === "function" ? category : (key: string) => defaultFieldLabel(category, key);
  return rows.map((row) => {
    const spec: FieldSpec = { key: row.key, type: rowTypeHint(row) };
    if (row.label.trim() && row.label.trim() !== defaultLabel(row.key)) {
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

/** Whether `key` may become a new field alongside `existing` keys. `label` is
 *  the text the key was derived from, so a label that yields NO key ("5 stars",
 *  "2024" — keys must start with a letter) gets a reason that says so. */
export function isValidNewKey(
  key: string,
  existing: readonly string[],
  label = "",
  reserved: ReadonlySet<string> = RESERVED_FIELD_KEYS
): { ok: true } | { ok: false; reason: string } {
  const k = key.trim();
  if (!k) {
    return {
      ok: false,
      reason: label.trim() ? t("customize.fields.startWithLetter") : t("customize.fields.enterLabel"),
    };
  }
  if (reserved.has(k)) return { ok: false, reason: t("customize.fields.reserved", { key: k }) };
  if (existing.includes(k)) return { ok: false, reason: t("customize.fields.duplicate", { key: k }) };
  if (!KEY_RE.test(k)) return { ok: false, reason: t("customize.fields.badKey") };
  return { ok: true };
}
