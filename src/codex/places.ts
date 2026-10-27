/**
 * Nested places (#66): World › Region › City. A location's `parent` names the
 * place it sits inside — a world or another location — so the hierarchy is
 * derived, never stored twice. Pure (no Obsidian import): the Codex panel
 * renders the tree, the breadcrumb, and "Places inside" from these helpers.
 *
 * Names match case-insensitively (a `parent` is a wikilink to a note
 * basename). Hand-edited data can loop (A inside B inside A): a place whose
 * chain of containers comes back to itself is treated as top-level, so every
 * entry stays visible and no walk ever runs forever.
 */

import type { CodexEntity } from "./types";

/** The codex type that nests (its `parent` may name another of its kind). */
export const PLACE_CATEGORY = "location";

/** What a place may sit inside: a link restriction to worlds or locations. */
export const PLACE_PARENT_TYPES = "world,location";

const key = (name: string): string => name.trim().toLowerCase();

/** Entries by lower-cased name; the first of a duplicated name wins. */
function byName(entities: readonly CodexEntity[]): Map<string, CodexEntity> {
  const map = new Map<string, CodexEntity>();
  for (const e of entities) if (!map.has(key(e.name))) map.set(key(e.name), e);
  return map;
}

/** True when following `parent` links up from `start` returns to `start`. */
function inCycle(start: CodexEntity, names: Map<string, CodexEntity>): boolean {
  const seen = new Set<string>([start.path]);
  let cur = start.parent ? names.get(key(start.parent)) : undefined;
  while (cur) {
    if (cur.path === start.path) return true;
    if (seen.has(cur.path)) return false; // a loop above us, not through us
    seen.add(cur.path);
    cur = cur.parent ? names.get(key(cur.parent)) : undefined;
  }
  return false;
}

export interface PlaceTree {
  /** Top-level places: no container among the given places (it's a world, unset,
   *  missing, out of scope — or the place is caught in a loop). Name order. */
  roots: CodexEntity[];
  /** Child places by the container's path, name order. */
  children: Map<string, CodexEntity[]>;
}

/**
 * Arrange `places` (locations, already filtered for scope/type) as a forest:
 * each place hangs under the place its `parent` names when that place is in
 * the list; anything else is a root.
 */
export function buildPlaceTree(places: readonly CodexEntity[]): PlaceTree {
  const names = byName(places);
  const roots: CodexEntity[] = [];
  const children = new Map<string, CodexEntity[]>();
  for (const p of places) {
    const container = p.parent ? names.get(key(p.parent)) : undefined;
    if (!container || container.path === p.path || inCycle(p, names)) {
      roots.push(p);
      continue;
    }
    const list = children.get(container.path) ?? [];
    list.push(p);
    children.set(container.path, list);
  }
  const byNameOrder = (a: CodexEntity, b: CodexEntity) => a.name.localeCompare(b.name);
  roots.sort(byNameOrder);
  for (const list of children.values()) list.sort(byNameOrder);
  return { roots, children };
}

/**
 * The chain of containers above `entity`, outermost first — e.g. for
 * Winterfell: [Westeros, The North]. Follows `parent` through any entries (a
 * place's top container is usually a world) and stops at a loop or a name
 * that matches no entry.
 */
export function placePath(entity: CodexEntity, entities: readonly CodexEntity[]): CodexEntity[] {
  const names = byName(entities);
  const out: CodexEntity[] = [];
  const seen = new Set<string>([entity.path]);
  let cur = entity.parent ? names.get(key(entity.parent)) : undefined;
  while (cur && !seen.has(cur.path)) {
    seen.add(cur.path);
    out.unshift(cur);
    cur = cur.parent ? names.get(key(cur.parent)) : undefined;
  }
  return out;
}

/** Places directly inside `container` (a world or a location), name order. */
export function placesInside(container: CodexEntity, entities: readonly CodexEntity[]): CodexEntity[] {
  const k = key(container.name);
  return entities
    .filter((e) => e.category === PLACE_CATEGORY && e.path !== container.path && e.parent && key(e.parent) === k)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Paths of every place nested anywhere under `place` — what its own "Inside"
 * picker must not offer, or choosing one would make a loop.
 */
export function placeDescendants(place: CodexEntity, entities: readonly CodexEntity[]): Set<string> {
  const out = new Set<string>();
  const queue = [place];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    for (const child of placesInside(cur, entities)) {
      if (out.has(child.path) || child.path === place.path) continue;
      out.add(child.path);
      queue.push(child);
    }
  }
  return out;
}
