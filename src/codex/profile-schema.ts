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
  | "number" // numeric value, stored as a bare YAML number (Bases/Dataview-sortable)
  | "list" // array of plain strings (e.g. aliases)
  | "links" // wikilink(s) to other codex entities
  | "image"; // vault path (or wikilink) to an image, shown as the entry's portrait

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
  /**
   * For multi `links`: each link may carry a free-text label ("sister",
   * "rival") stored as the wikilink alias — `[[Anna|sister]]`. No extra key;
   * `linkTarget` still yields the name, so scope/mentions/appears-in are unaffected.
   */
  labeled?: boolean;
}

/** Shared first field: alternative names (matches Obsidian's `aliases`). */
const ALIASES: ProfileField = {
  key: "aliases",
  label: "Aliases",
  type: "list",
  placeholder: "Alternative name",
};

/**
 * Shared second field on every shipped set: the entry's portrait / picture.
 * Rendered at the top of the Codex detail pane, not in the field list. A
 * `codex-fields` template drops it like any other field unless listed.
 */
const IMAGE: ProfileField = { key: "image", label: "Image", type: "image" };

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
      labeled: true,
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

/** The category's default (shipped) fields, excluding the shared `aliases`:
 *  the portrait first, then the category's own set. */
function defaultCategoryFields(category: string): ProfileField[] {
  return [IMAGE, ...(isBuiltinCategory(category) ? CATEGORY_FIELDS[category] : GENERIC_FIELDS)];
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

/** One requested field: a frontmatter key plus an optional type hint and label. */
export interface FieldSpec {
  key: string;
  /** Raw type hint as written (`text`, `textarea`, `number`, `list`, `links`, `links:character`, `links:character:labeled`, `link`, `link:world`). */
  type?: string;
  /** Display label override (the map value's object form: `{ type, label }`).
   *  Absent → a built-in field's shipped label, else derived from the key. */
  label?: string;
}

/** Keys a template may not turn into panel fields (app-managed, or always present). */
export const RESERVED_FIELD_KEYS = new Set([
  "codex",
  "codex-series",
  "codex-project",
  FIELDS_KEY,
  ALIASES.key,
]);

/**
 * Parse a template's `codex-fields` value. Accepts a list of keys
 * (`[species, birthday]`) or a key → type map (`species: text`,
 * `history: textarea`, `allies: links:faction`, `owner: link:character`). A map
 * value may also be an object `{ type, label }` — the form the Customize editor
 * writes when a field carries its own display label.
 * Reserved keys, blanks, duplicates, and non-string entries are skipped.
 * Returns null when the value is absent or not one of those shapes — callers
 * then use the shipped fields — and [] for an empty list (also = shipped).
 */
export function parseFieldSpec(raw: unknown): FieldSpec[] | null {
  if (raw === undefined || raw === null) return null;
  const out: FieldSpec[] = [];
  const seen = new Set<string>();
  const push = (keyRaw: unknown, hintRaw?: unknown): void => {
    if (typeof keyRaw !== "string") return;
    const key = keyRaw.trim();
    if (!key || RESERVED_FIELD_KEYS.has(key) || seen.has(key)) return;
    seen.add(key);
    const spec: FieldSpec = { key };
    if (typeof hintRaw === "string") {
      if (hintRaw.trim()) spec.type = hintRaw.trim();
    } else if (hintRaw && typeof hintRaw === "object" && !Array.isArray(hintRaw)) {
      const rec = hintRaw as Record<string, unknown>;
      const t = rec["type"];
      const l = rec["label"];
      if (typeof t === "string" && t.trim()) spec.type = t.trim();
      if (typeof l === "string" && l.trim()) spec.label = l.trim();
    }
    out.push(spec);
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
  if (entry.label) base.label = entry.label;
  if (!entry.type) return base;
  const hint = parseTypeHint(entry.type);
  if (!hint) return base;
  const next: ProfileField = { key: base.key, label: base.label, type: hint.type };
  if (base.placeholder && hint.type !== "links") next.placeholder = base.placeholder;
  if (hint.type === "links") {
    if (hint.linkCategory) next.linkCategory = hint.linkCategory;
    if (hint.single) next.single = true;
    if (hint.labeled) next.labeled = true;
  }
  return next;
}

/** The shipped label for `key` in `category` (own set, generic set, then any
 *  built-in's), or undefined when no shipped field uses that key. */
export function knownFieldLabel(category: string, key: string): string | undefined {
  return findKnownField(category, key)?.label;
}

/** The label a field gets with NO explicit label: shipped if known, else derived. */
export function defaultFieldLabel(category: string, key: string): string {
  return knownFieldLabel(category, key) ?? humanizeKey(key);
}

/** Every shipped field (the portrait, each built-in's set, the generic set) with
 *  the category it ships in — the "add a built-in field" menu in Customize. */
export function knownFieldsCatalog(): { field: ProfileField; source: string }[] {
  const out: { field: ProfileField; source: string }[] = [{ field: IMAGE, source: "all" }];
  for (const [cat, fields] of Object.entries(CATEGORY_FIELDS)) {
    for (const field of fields) out.push({ field, source: cat });
  }
  for (const field of GENERIC_FIELDS) out.push({ field, source: "generic" });
  return out;
}

/** The type hint that reproduces `field` through {@link parseTypeHint}. */
export function fieldTypeHint(field: ProfileField): string {
  if (field.type !== "links") return field.type;
  const cat = field.linkCategory ? `:${field.linkCategory}` : "";
  if (field.single) return `link${cat}`;
  return `links${cat}${field.labeled ? ":labeled" : ""}`;
}

/**
 * The spec entry that reproduces `field` for `category` through
 * {@link resolveSpecField}. Always carries a type hint; carries a label only
 * when it differs from the default (so shipped fields serialize compactly).
 */
export function fieldToSpec(field: ProfileField, category: string): FieldSpec {
  const spec: FieldSpec = { key: field.key, type: fieldTypeHint(field) };
  if (field.label !== defaultFieldLabel(category, field.key)) spec.label = field.label;
  return spec;
}

/** One serialized `codex-fields` entry value: a bare hint, `{type,label}`, or null. */
export type FieldSpecValue = string | { type?: string; label?: string } | null;

/**
 * The canonical `codex-fields` frontmatter value for `spec`: the key → hint map
 * (`{ type, label }` objects where a label is set; null for "no hint"), which
 * {@link parseFieldSpec} reads back to the same normalized spec. Keys that are
 * all digits would be reordered by JS objects, so such a spec is emitted as the
 * order-safe list-of-one-key-maps form instead. Reserved/blank/duplicate keys are
 * dropped first, matching the parser.
 */
export function serializeFieldSpec(
  spec: readonly FieldSpec[]
): Record<string, FieldSpecValue> | Record<string, FieldSpecValue>[] {
  const entries: [string, FieldSpecValue][] = [];
  const seen = new Set<string>();
  for (const s of spec) {
    const key = s.key.trim();
    if (!key || RESERVED_FIELD_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    const type = s.type?.trim() || undefined;
    const label = s.label?.trim() || undefined;
    let value: FieldSpecValue = null;
    if (label) value = type ? { type, label } : { label };
    else if (type) value = type;
    entries.push([key, value]);
  }
  if (entries.some(([k]) => /^\d+$/.test(k))) {
    return entries.map(([k, v]) => ({ [k]: v }));
  }
  return Object.fromEntries(entries);
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

/**
 * `text` | `textarea` | `number` | `list` | `links[:cat][:labeled]` | `link[:cat]`
 * (single) → field shape; null if unknown. A trailing `labeled` segment on
 * `links` lets each link carry an alias-stored label (ignored for single `link`,
 * which has no chip to label). `number` also accepts `int`/`integer`/`float`/
 * `decimal`/`numeric` as written by hand; Customize normalizes them to `number`.
 */
export function parseTypeHint(
  raw: string
): { type: ProfileFieldType; linkCategory?: string; single?: boolean; labeled?: boolean } | null {
  const [head, ...rest] = raw.trim().toLowerCase().split(":").map((s) => s.trim());
  let labeled = false;
  if (rest.length > 0 && rest[rest.length - 1] === "labeled") {
    labeled = true;
    rest.pop();
  }
  const linkCategory = rest.join(":").trim() || undefined;
  switch (head) {
    case "text":
    case "string":
      return { type: "text" };
    case "textarea":
    case "multiline":
    case "prose":
      return { type: "textarea" };
    case "number":
    case "numeric":
    case "int":
    case "integer":
    case "float":
    case "decimal":
      return { type: "number" };
    case "list":
    case "tags":
      return { type: "list" };
    case "image":
    case "picture":
    case "portrait":
      return { type: "image" };
    case "links":
      return labeled ? { type: "links", linkCategory, labeled: true } : { type: "links", linkCategory };
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

/** A profile value is a string (text/textarea/image/single link), a number
 *  (`number` — written as a bare YAML number), or string[] (list/links). */
export type ProfileValue = string | string[] | number;
export type Profile = Record<string, ProfileValue | undefined>;

/** True if a field's value is empty and should be cleared from frontmatter. */
export function isEmptyValue(value: ProfileValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return !Number.isFinite(value); // 0 is a value
  return String(value).trim() === "";
}

/** Whether a field stores an array (`list`, or non-single `links`). */
export function isArrayField(field: ProfileField): boolean {
  return field.type === "list" || (field.type === "links" && !field.single);
}

/** A finite number from a YAML number or a numeric string; null otherwise
 *  (`Number(" ")` is 0, so the blank check comes first). */
function toFiniteNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce a raw frontmatter value into the shape expected by a field. Array
 * fields keep strings and stringify bare numbers (a hand-typed `- 42` is a
 * chip, not a vanished entry). A `number` field reads a YAML number or a
 * numeric string as a number and anything else as "" (shown empty; the stored
 * value is left alone until the user edits the field).
 */
export function coerceValue(field: ProfileField, raw: unknown): ProfileValue {
  if (isArrayField(field)) {
    const items = Array.isArray(raw) ? raw : [raw];
    return items.flatMap((x) => {
      if (typeof x === "string") return x.trim() !== "" || Array.isArray(raw) ? [x] : [];
      if (typeof x === "number" && Number.isFinite(x)) return [String(x)];
      return [];
    });
  }
  if (field.type === "number") return toFiniteNumber(raw) ?? "";
  return raw === undefined || raw === null ? "" : String(raw);
}
