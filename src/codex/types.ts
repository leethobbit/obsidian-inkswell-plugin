/**
 * Codex model. A codex entity is just a vault note carrying a `codex`
 * frontmatter key whose value is its category (e.g. `codex: character`). Profile
 * fields live in the note's frontmatter/body — Obsidian-native, no database.
 */

export type CodexCategory =
  | "character"
  | "location"
  | "world"
  | "faction"
  | "item"
  | "event"
  | "concept";

export const CODEX_CATEGORIES: {
  id: CodexCategory;
  label: string;
  plural: string;
  icon: string;
}[] = [
  { id: "character", label: "Character", plural: "Characters", icon: "user" },
  { id: "location", label: "Location", plural: "Locations", icon: "map-pin" },
  { id: "world", label: "World", plural: "Worlds", icon: "globe" },
  { id: "faction", label: "Faction", plural: "Factions", icon: "users" },
  { id: "item", label: "Item", plural: "Items", icon: "package" },
  { id: "event", label: "Event", plural: "Events", icon: "calendar" },
  { id: "concept", label: "Concept", plural: "Concepts", icon: "sparkles" },
];

export function isCodexCategory(v: unknown): v is CodexCategory {
  return CODEX_CATEGORIES.some((c) => c.id === v);
}

export function categoryLabel(id: CodexCategory): string {
  return CODEX_CATEGORIES.find((c) => c.id === id)?.label ?? id;
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
