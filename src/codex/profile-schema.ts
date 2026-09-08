/**
 * Structured profile field schema, per codex category. Pure (no Obsidian
 * imports) so it can be unit-tested: defines which frontmatter keys each
 * category exposes as editable fields, their type, and link constraints.
 *
 * Storage: every field maps to a flat top-level frontmatter key on the entity
 * note (Obsidian-native, Dataview/Bases-queryable). The note body stays freeform
 * prose. Keys not in a category's schema are preserved on write (never clobbered).
 */

import { BuiltinCodexCategory, isBuiltinCategory } from "./types";

export type ProfileFieldType =
  | "text" // single-line string
  | "textarea" // multi-line string
  | "list" // array of plain strings (e.g. aliases)
  | "links"; // wikilink(s) to other codex entities

export interface ProfileField {
  /** Frontmatter key (camelCase, matches scene-meta convention). */
  key: string;
  label: string;
  type: ProfileFieldType;
  placeholder?: string;
  /** For `links`: restrict the picker to this category (undefined = any). */
  linkCategory?: string;
  /** For `links`: single value stored as a string (default = array). */
  single?: boolean;
}

/** Shared first field: alternative names (matches Obsidian's `aliases`). */
const ALIASES: ProfileField = {
  key: "aliases",
  label: "Aliases",
  type: "list",
  placeholder: "Alternative name",
};

/**
 * Category-specific fields (excluding the shared `aliases`, which is prepended
 * by {@link profileFields}). Mirrors the field sets picked in ROADMAP v0.12.0.
 */
const CATEGORY_FIELDS: Record<BuiltinCodexCategory, ProfileField[]> = {
  character: [
    { key: "role", label: "Role", type: "text", placeholder: "Protagonist, mentor…" },
    {
      key: "function",
      label: "Narrative function",
      type: "text",
      placeholder: "e.g. Stands in the hero's way",
    },
    {
      key: "memorableTrait",
      label: "Memorable trait",
      type: "text",
      placeholder: "A distinctive 'thing'",
    },
    { key: "age", label: "Age", type: "text" },
    { key: "gender", label: "Gender", type: "text" },
    { key: "occupation", label: "Occupation", type: "text" },
    { key: "traits", label: "Traits", type: "textarea", placeholder: "Defining qualities" },
    { key: "motivation", label: "Motivation", type: "textarea", placeholder: "What they want" },
    { key: "flaw", label: "Flaw", type: "text" },
    { key: "appearance", label: "Appearance", type: "textarea" },
    { key: "backstory", label: "Backstory", type: "textarea" },
    { key: "arc", label: "Arc", type: "textarea", placeholder: "How they change" },
    {
      key: "relationships",
      label: "Relationships",
      type: "links",
      linkCategory: "character",
    },
  ],
  location: [
    { key: "type", label: "Type", type: "text", placeholder: "City, fortress, forest…" },
    { key: "parent", label: "World", type: "links", linkCategory: "world", single: true },
    { key: "region", label: "Region", type: "text" },
    { key: "climate", label: "Climate", type: "text" },
    { key: "population", label: "Population", type: "text" },
    { key: "atmosphere", label: "Atmosphere", type: "textarea" },
    { key: "significance", label: "Significance", type: "textarea" },
    { key: "history", label: "History", type: "textarea" },
  ],
  world: [
    { key: "geography", label: "Geography", type: "textarea" },
    { key: "culture", label: "Culture", type: "textarea" },
    { key: "politics", label: "Politics", type: "textarea" },
    { key: "magicTech", label: "Magic / Tech", type: "textarea" },
    { key: "religion", label: "Religion", type: "textarea" },
    { key: "economy", label: "Economy", type: "textarea" },
    { key: "history", label: "History", type: "textarea" },
  ],
  faction: [
    { key: "type", label: "Type", type: "text", placeholder: "Guild, kingdom, cult…" },
    { key: "leadership", label: "Leadership", type: "links", linkCategory: "character" },
    { key: "size", label: "Size", type: "text" },
    { key: "territory", label: "Territory", type: "links", linkCategory: "location" },
    { key: "goal", label: "Goal", type: "textarea" },
    { key: "allies", label: "Allies", type: "links", linkCategory: "faction" },
    { key: "enemies", label: "Enemies", type: "links", linkCategory: "faction" },
  ],
  item: [
    { key: "type", label: "Type", type: "text", placeholder: "Weapon, relic, document…" },
    { key: "owner", label: "Owner", type: "links", linkCategory: "character", single: true },
    { key: "significance", label: "Significance", type: "textarea" },
  ],
  event: [
    { key: "date", label: "Date", type: "text", placeholder: "In-world date" },
    { key: "participants", label: "Participants", type: "links", linkCategory: "character" },
    { key: "outcome", label: "Outcome", type: "textarea" },
  ],
  concept: [
    { key: "type", label: "Type", type: "text", placeholder: "Magic, tech, religion…" },
    { key: "rules", label: "Rules", type: "textarea" },
    { key: "limitations", label: "Limitations", type: "textarea" },
    { key: "significance", label: "Significance", type: "textarea" },
  ],
};

/**
 * Fields for user-defined custom categories (and for entities whose category is
 * no longer recognized — "Uncategorized" entries stay fully editable). Kept
 * generic on purpose: bespoke per-type fields are B2; until then, extra
 * frontmatter baked into a type's template note persists on every entry
 * (writeProfile only manages schema keys).
 */
const GENERIC_FIELDS: ProfileField[] = [
  { key: "type", label: "Type", type: "text", placeholder: "What kind of entry this is" },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "significance",
    label: "Significance",
    type: "textarea",
    placeholder: "Why it matters to the story",
  },
  { key: "related", label: "Related entries", type: "links" },
];

/** The category's default (shipped) fields, excluding the shared `aliases`. */
function defaultCategoryFields(category: string): ProfileField[] {
  return isBuiltinCategory(category) ? CATEGORY_FIELDS[category] : GENERIC_FIELDS;
}

/**
 * Full ordered field list for a category: aliases first, then either the fields
 * a template's `codex-fields` spec asks for (see {@link parseFieldSpec}) or, with
 * no spec, the category's shipped fields.
 */
export function profileFields(category: string, spec?: FieldSpec[] | null): ProfileField[] {
  if (!spec || spec.length === 0) return [ALIASES, ...defaultCategoryFields(category)];
  const out: ProfileField[] = [ALIASES];
  const seen = new Set<string>([ALIASES.key]);
  for (const entry of spec) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    out.push(resolveSpecField(category, entry));
  }
  return out;
}

// ---------------------------------------------------------------------------------
// Template-driven field lists (`codex-fields` in a type's template note)
// ---------------------------------------------------------------------------------

/**
 * Frontmatter key on a codex TEMPLATE note that picks which fields the Codex
 * panel shows for that type (in that order), replacing the shipped set. Never
 * written to entity notes — `createEntity` strips it from the scaffold.
 */
export const FIELDS_KEY = "codex-fields";

/** One requested field: a frontmatter key plus an optional type hint. */
export interface FieldSpec {
  key: string;
  /** Raw type hint as written (`text`, `textarea`, `list`, `links`, `links:character`, `link`, `link:world`). */
  type?: string;
}

/** Keys a template may not turn into panel fields (app-managed, or always present). */
const RESERVED_FIELD_KEYS = new Set([
  "codex",
  "codex-series",
  "codex-project",
  FIELDS_KEY,
  ALIASES.key,
]);

/**
 * Parse a template's `codex-fields` value. Accepts a list of keys
 * (`[species, birthday]`) or a key → type map (`species: text`,
 * `history: textarea`, `allies: links:faction`, `owner: link:character`).
 * Reserved keys, blanks, duplicates, and non-string entries are skipped.
 * Returns null when the value is absent or not one of those shapes — callers
 * then use the shipped fields — and [] for an empty list (also = shipped).
 */
export function parseFieldSpec(raw: unknown): FieldSpec[] | null {
  if (raw === undefined || raw === null) return null;
  const out: FieldSpec[] = [];
  const seen = new Set<string>();
  const push = (keyRaw: unknown, typeRaw?: unknown): void => {
    if (typeof keyRaw !== "string") return;
    const key = keyRaw.trim();
    if (!key || RESERVED_FIELD_KEYS.has(key) || seen.has(key)) return;
    seen.add(key);
    const type = typeof typeRaw === "string" && typeRaw.trim() ? typeRaw.trim() : undefined;
    out.push(type ? { key, type } : { key });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      // Obsidian's property editor may store a one-line `key: type` as a
      // single-key mapping inside the list; accept that too.
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) push(k, v);
      } else push(item);
    }
    return out;
  }
  if (typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) push(k, v);
    return out;
  }
  if (typeof raw === "string") {
    // A bare scalar: treat as a comma-separated list of keys.
    for (const part of raw.split(",")) push(part);
    return out;
  }
  return null;
}

/**
 * Turn one spec entry into a field. A key that names a shipped field (this
 * category's first, then the generic set, then any built-in's) reuses that
 * definition — label, placeholder, link constraints — so `relationships` in a
 * Character template is still a character picker. An explicit type hint wins
 * over the shipped type. Unknown keys become single-line text with a label
 * derived from the key (`birthDate` → "Birth date").
 */
function resolveSpecField(category: string, entry: FieldSpec): ProfileField {
  const known = findKnownField(category, entry.key);
  const base: ProfileField = known
    ? { ...known }
    : { key: entry.key, label: humanizeKey(entry.key), type: "text" };
  if (!entry.type) return base;
  const hint = parseTypeHint(entry.type);
  if (!hint) return base;
  const next: ProfileField = { key: base.key, label: base.label, type: hint.type };
  if (base.placeholder && hint.type !== "links") next.placeholder = base.placeholder;
  if (hint.type === "links") {
    if (hint.linkCategory) next.linkCategory = hint.linkCategory;
    if (hint.single) next.single = true;
  }
  return next;
}

function findKnownField(category: string, key: string): ProfileField | undefined {
  const own = defaultCategoryFields(category).find((f) => f.key === key);
  if (own) return own;
  const generic = GENERIC_FIELDS.find((f) => f.key === key);
  if (generic) return generic;
  for (const fields of Object.values(CATEGORY_FIELDS)) {
    const hit = fields.find((f) => f.key === key);
    if (hit) return hit;
  }
  return undefined;
}

/** `text` | `textarea` | `list` | `links[:cat]` | `link[:cat]` (single) → field shape; null if unknown. */
function parseTypeHint(
  raw: string
): { type: ProfileFieldType; linkCategory?: string; single?: boolean } | null {
  const [head, ...rest] = raw.trim().toLowerCase().split(":");
  const linkCategory = rest.join(":").trim() || undefined;
  switch (head) {
    case "text":
    case "string":
      return { type: "text" };
    case "textarea":
    case "multiline":
    case "prose":
      return { type: "textarea" };
    case "list":
    case "tags":
      return { type: "list" };
    case "links":
      return { type: "links", linkCategory };
    case "link":
      return { type: "links", linkCategory, single: true };
    default:
      return null;
  }
}

/** `birthDate` / `birth_date` / `birth-date` → "Birth date". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-.]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return key;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

/** A profile value is a string (text/textarea/single link) or string[] (list/links). */
export type ProfileValue = string | string[];
export type Profile = Record<string, ProfileValue | undefined>;

/** True if a field's value is empty and should be cleared from frontmatter. */
export function isEmptyValue(value: ProfileValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === "";
}

/** Whether a field stores an array (`list`, or non-single `links`). */
export function isArrayField(field: ProfileField): boolean {
  return field.type === "list" || (field.type === "links" && !field.single);
}

/** Coerce a raw frontmatter value into the shape expected by a field. */
export function coerceValue(field: ProfileField, raw: unknown): ProfileValue {
  if (isArrayField(field)) {
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === "string");
    }
    return typeof raw === "string" && raw.trim() !== "" ? [raw] : [];
  }
  return raw === undefined || raw === null ? "" : String(raw);
}
