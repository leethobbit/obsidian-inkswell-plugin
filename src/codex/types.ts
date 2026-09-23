/**
 * Codex model. A codex entity is just a vault note carrying a `codex`
 * frontmatter key whose value is its category (e.g. `codex: character`). Profile
 * fields live in the note's frontmatter/body — Obsidian-native, no database.
 *
 * Categories are the seven built-ins below plus user-defined custom types
 * (persisted in settings as `customCategories`). A built-in's DISPLAY (label,
 * plural, icon) can be overridden per user (`categoryOverrides`); its id never
 * changes, so notes are untouched by a rename. Merge them with
 * {@link allCategories} at render/call time — never cache the merged list at
 * module load, or settings changes won't propagate.
 */

import { SLUG_RE, slugify } from "../lib/slug";

/** The seven permanent built-in categories (never removable; ids never change). */
export type BuiltinCodexCategory =
  | "character"
  | "location"
  | "world"
  | "faction"
  | "item"
  | "event"
  | "concept";

/**
 * A category id as stored in a note's `codex:` key — a built-in literal or a
 * user-defined custom-type slug.
 */
export type CodexCategory = string;

/** One category definition — the shape shared by built-ins and stored customs. */
export interface CategoryDef {
  /** Slug written into notes' `codex:` frontmatter (immutable once in use). */
  id: string;
  /** Display name; also the category's template note basename (`<Label>.md`). */
  label: string;
  plural: string;
  /** Lucide icon name. */
  icon: string;
}

/** The display fields of a built-in a user may override (all optional). */
export type CategoryOverride = Partial<Pick<CategoryDef, "label" | "plural" | "icon">>;
/** Per-built-in display overrides, keyed by built-in id. */
export type CategoryOverrides = Partial<Record<BuiltinCodexCategory, CategoryOverride>>;

export const CODEX_CATEGORIES: (CategoryDef & { id: BuiltinCodexCategory })[] = [
  { id: "character", label: "Character", plural: "Characters", icon: "user" },
  { id: "location", label: "Location", plural: "Locations", icon: "map-pin" },
  { id: "world", label: "World", plural: "Worlds", icon: "globe" },
  { id: "faction", label: "Faction", plural: "Factions", icon: "users" },
  { id: "item", label: "Item", plural: "Items", icon: "package" },
  { id: "event", label: "Event", plural: "Events", icon: "calendar" },
  { id: "concept", label: "Concept", plural: "Concepts", icon: "sparkles" },
];

export function isBuiltinCategory(v: unknown): v is BuiltinCodexCategory {
  return CODEX_CATEGORIES.some((c) => c.id === v);
}

/** A built-in's shipped (un-overridden) definition, or undefined for customs. */
export function defaultBuiltinDef(id: string): CategoryDef | undefined {
  return CODEX_CATEGORIES.find((c) => c.id === id);
}

/** The seven built-ins with the user's display overrides applied (ids fixed). */
export function builtinCategories(overrides: CategoryOverrides = {}): CategoryDef[] {
  return CODEX_CATEGORIES.map((c) => {
    const o = overrides[c.id];
    if (!o) return c;
    return {
      id: c.id,
      label: o.label?.trim() || c.label,
      plural: o.plural?.trim() || c.plural,
      icon: o.icon?.trim() || c.icon,
    };
  });
}

/** Built-ins (with overrides) first, then the user's custom types in stored order. */
export function allCategories(
  customs: CategoryDef[] = [],
  overrides: CategoryOverrides = {}
): CategoryDef[] {
  return [...builtinCategories(overrides), ...customs];
}

export function categoryLabel(
  id: string,
  customs: CategoryDef[] = [],
  overrides: CategoryOverrides = {}
): string {
  return allCategories(customs, overrides).find((c) => c.id === id)?.label ?? id;
}

/**
 * Derive a category id slug from a display label: lowercase, spaces/underscores
 * to dashes, everything else outside [a-z0-9-] stripped. May return "" (caller
 * rejects).
 */
export function slugifyCategoryId(label: string): string {
  return slugify(label);
}

/**
 * Sanitize the persisted built-in display overrides. Unknown ids and non-string
 * / blank fields are dropped, as are values equal to the shipped default. A
 * label is dropped when it (case-insensitively) equals another built-in's
 * SHIPPED label or an override accepted earlier in built-in order — so shipped
 * names are always a safe fallback and two built-ins can never share a name.
 * An override that ends up empty is omitted. Customs are normalized AFTER
 * this, against {@link builtinCategories} of the result.
 */
export function normalizeCategoryOverrides(raw: unknown): CategoryOverrides {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const out: CategoryOverrides = {};
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const taken = new Set<string>();
  for (const c of CODEX_CATEGORIES) {
    const o = rec[c.id];
    if (typeof o !== "object" || o === null) continue;
    const cand = o as Record<string, unknown>;
    const next: CategoryOverride = {};
    const label = str(cand["label"]);
    if (label && label.toLowerCase() !== c.label.toLowerCase()) {
      const lower = label.toLowerCase();
      const clash =
        taken.has(lower) ||
        CODEX_CATEGORIES.some((other) => other.id !== c.id && other.label.toLowerCase() === lower);
      if (!clash) next.label = label;
    }
    const plural = str(cand["plural"]);
    if (plural && plural !== c.plural) next.plural = plural;
    const icon = str(cand["icon"]);
    if (icon && icon !== c.icon) next.icon = icon;
    if (next.label) taken.add(next.label.toLowerCase());
    if (Object.keys(next).length > 0) out[c.id] = next;
  }
  return out;
}

/**
 * Labels a built-in may NOT be renamed to: every other built-in's shipped label
 * (shipped names stay reserved so they're always a safe fallback), every other
 * built-in's current label, and every custom type's label — lowercased.
 */
export function takenLabelsForBuiltin(
  id: BuiltinCodexCategory,
  customs: CategoryDef[],
  overrides: CategoryOverrides
): string[] {
  const out = new Set<string>();
  for (const c of CODEX_CATEGORIES) if (c.id !== id) out.add(c.label.toLowerCase());
  for (const c of builtinCategories(overrides)) if (c.id !== id) out.add(c.label.toLowerCase());
  for (const c of customs) out.add(c.label.toLowerCase());
  return [...out];
}

/**
 * Sanitize the persisted custom-category list (data.json is hand-editable, and
 * settings load does no per-field validation). Drops malformed entries, ids that
 * aren't slugs, and id/label collisions with built-ins or earlier customs
 * (first wins) — label collisions would cross-wire template-note resolution,
 * which is by label. `builtins` is the effective (override-applied) built-in
 * list, so a custom may reuse a shipped name the user has renamed away from.
 */
export function normalizeCustomCategories(
  raw: unknown,
  builtins: CategoryDef[] = CODEX_CATEGORIES
): CategoryDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryDef[] = [];
  const takenIds = new Set<string>(builtins.map((c) => c.id));
  const takenLabels = new Set<string>(builtins.map((c) => c.label.toLowerCase()));
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec["id"] === "string" ? rec["id"].trim().toLowerCase() : "";
    const label = typeof rec["label"] === "string" ? rec["label"].trim() : "";
    if (!SLUG_RE.test(id) || !label) continue;
    if (takenIds.has(id) || takenLabels.has(label.toLowerCase())) continue;
    const plural =
      typeof rec["plural"] === "string" && rec["plural"].trim() ? rec["plural"].trim() : `${label}s`;
    const icon =
      typeof rec["icon"] === "string" && rec["icon"].trim() ? rec["icon"].trim() : "box";
    takenIds.add(id);
    takenLabels.add(label.toLowerCase());
    out.push({ id, label, plural, icon });
  }
  return out;
}

/**
 * Frontmatter keys carrying an entity's scope. An entity scopes to AT MOST one of
 * these (series wins if both are somehow present); neither key = global (shared
 * across every project — the default and back-compatible behavior).
 * `codex-project` holds one `[[wikilink]]` (a single book — the only form before
 * 1.17) or a YAML list of them (several books, since 1.17).
 */
export const SCOPE_PROJECT_KEY = "codex-project";
export const SCOPE_SERIES_KEY = "codex-series";

/**
 * An entity's visibility scope. `projects` are project index-note basenames (the
 * targets of `[[wikilinks]]`), `series` is a series name. Neither set = global.
 * Series and projects are mutually exclusive; series wins.
 */
export interface EntityScope {
  /** Index-note basenames of the book(s) this entity belongs to — one or more. */
  projects?: string[];
  /** Name of the series whose books all share this entity. */
  series?: string;
}

export interface CodexEntity {
  /** Vault path of the entity note. */
  path: string;
  /** Display name (note basename). */
  name: string;
  category: CodexCategory;
  /** Alternative names, matched by auto-detect. */
  aliases: string[];
  /** Parent entity name (for nested locations/worlds), if any. */
  parent?: string;
  /** Project/series this entity is scoped to. Absent = global (shared). */
  scope?: EntityScope;
}
