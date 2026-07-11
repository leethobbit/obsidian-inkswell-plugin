/**
 * Codex model. A codex entity is just a vault note carrying a `codex`
 * frontmatter key whose value is its category (e.g. `codex: character`). Profile
 * fields live in the note's frontmatter/body — Obsidian-native, no database.
 *
 * Categories are the seven built-ins below plus user-defined custom types
 * (persisted in settings as `customCategories`). Merge them with
 * {@link allCategories} at render/call time — never cache the merged list at
 * module load, or settings changes won't propagate.
 */

/** The seven permanent built-in categories (never removable or renamable). */
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

/** Built-ins first, then the user's custom types in stored order. */
export function allCategories(customs: CategoryDef[] = []): CategoryDef[] {
  return [...CODEX_CATEGORIES, ...customs];
}

export function categoryLabel(id: string, customs: CategoryDef[] = []): string {
  return allCategories(customs).find((c) => c.id === id)?.label ?? id;
}

/** Legal shape for a custom category id (also keeps the `codex:` YAML line safe). */
const ID_RE = /^[a-z][a-z0-9-]*$/;

/**
 * Derive a category id slug from a display label: lowercase, spaces/underscores
 * to dashes, everything else outside [a-z0-9-] stripped. May return "" (caller
 * rejects).
 */
export function slugifyCategoryId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sanitize the persisted custom-category list (data.json is hand-editable, and
 * settings load does no per-field validation). Drops malformed entries, ids that
 * aren't slugs, and id/label collisions with built-ins or earlier customs
 * (first wins) — label collisions would cross-wire template-note resolution,
 * which is by label.
 */
export function normalizeCustomCategories(raw: unknown): CategoryDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryDef[] = [];
  const takenIds = new Set<string>(CODEX_CATEGORIES.map((c) => c.id));
  const takenLabels = new Set<string>(CODEX_CATEGORIES.map((c) => c.label.toLowerCase()));
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec["id"] === "string" ? rec["id"].trim().toLowerCase() : "";
    const label = typeof rec["label"] === "string" ? rec["label"].trim() : "";
    if (!ID_RE.test(id) || !label) continue;
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
 */
export const SCOPE_PROJECT_KEY = "codex-project";
export const SCOPE_SERIES_KEY = "codex-series";

/**
 * An entity's visibility scope. `project` is a project index-note basename (the
 * target of a `[[wikilink]]`), `series` is a series name. Both unset = global.
 */
export interface EntityScope {
  /** Index-note basename of the single book this entity belongs to. */
  project?: string;
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
