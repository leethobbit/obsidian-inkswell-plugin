/**
 * The Codex list's ordering and search (pure, Obsidian-free, unit-tested).
 *
 * Pins (#70): an entry pinned in a book lists first in that book's Codex,
 * ahead of the A–Z rest. A pin names a book the way `codex-project` scope does
 * (basename or path form, case-insensitive), and any draft of the story counts,
 * so the check is the scope check against the same {@link ScopeContext}.
 *
 * Search matches an entry's name and aliases, then its Role / Type values —
 * typing "antag" finds the antagonists without a separate role filter.
 */

import { ScopeContext, dedupe, normKey } from "./codex-scope";
import { CodexEntity } from "./types";

/** Is `entity` pinned in the book `ctx` stands for? Never with no book open. */
export function isPinnedIn(entity: CodexEntity, ctx: ScopeContext | null): boolean {
  if (!ctx || !entity.pinned?.length) return false;
  const names = new Set(ctx.projectNames.map(normKey));
  return entity.pinned.some((p) => names.has(normKey(p)));
}

/** Pinned entries first, each side keeping its order (A–Z from the store). */
export function pinnedFirst(entities: readonly CodexEntity[], ctx: ScopeContext | null): CodexEntity[] {
  if (!ctx) return [...entities];
  const pinned: CodexEntity[] = [];
  const rest: CodexEntity[] = [];
  for (const e of entities) (isPinnedIn(e, ctx) ? pinned : rest).push(e);
  return [...pinned, ...rest];
}

/** The pin list with this book added as `key` — unchanged when any draft of it is already named. */
export function withPin(cur: readonly string[], ctx: ScopeContext, key: string): string[] {
  const names = new Set(ctx.projectNames.map(normKey));
  if (cur.some((v) => names.has(normKey(v)))) return [...cur];
  return dedupe([...cur, key]);
}

/** The pin list without this book: every value naming any of its drafts goes. */
export function withoutPin(cur: readonly string[], ctx: ScopeContext): string[] {
  const names = new Set(ctx.projectNames.map(normKey));
  return cur.filter((v) => !names.has(normKey(v)));
}

/**
 * How `entity` matches the search `query` (already trimmed + lowercased):
 * "name" for its name or an alias, the matching Role / Type value when only
 * that matched (the row shows it, so the match is visible), or null.
 */
export function codexSearchMatch(entity: CodexEntity, query: string): "name" | { classifier: string } | null {
  if (!query) return "name";
  if (entity.name.toLowerCase().includes(query)) return "name";
  if (entity.aliases.some((a) => a.toLowerCase().includes(query))) return "name";
  const hit = entity.classifiers?.find((c) => c.toLowerCase().includes(query));
  return hit ? { classifier: hit } : null;
}
