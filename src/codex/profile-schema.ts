/**
 * Structured profile field schema, per codex category. Pure (no Obsidian
 * imports) so it can be unit-tested: defines which frontmatter keys each
 * category exposes as editable fields, their type, and link constraints.
 *
 * Storage: every field maps to a flat top-level frontmatter key on the entity
 * note (Obsidian-native, Dataview/Bases-queryable). The note body stays freeform
 * prose. Keys not in a category's schema are preserved on write (never clobbered).
 */

import { CodexCategory } from "./types";

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
  linkCategory?: CodexCategory;
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
const CATEGORY_FIELDS: Record<CodexCategory, ProfileField[]> = {
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

/** Full ordered field list for a category (aliases first, then category fields). */
export function profileFields(category: CodexCategory): ProfileField[] {
  return [ALIASES, ...(CATEGORY_FIELDS[category] ?? [])];
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
