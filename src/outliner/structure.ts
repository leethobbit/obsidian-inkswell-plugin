/**
 * Acts & chapters as config objects (pure, Obsidian-free, unit-tested).
 *
 * Scenes carry free-text `act`/`chapter` strings (frozen 1.0 keys, StoryLine-
 * compatible) — those stay the membership + display key. This module adds a thin
 * config layer stored under `inkswell.chapters` / `inkswell.acts`: a per-group
 * word target and the ability to plan a group before any scene uses it.
 *
 * A group is identified for MEMBERSHIP by its `title` (matching the scene string).
 * Its stable `id` only carries config across a rename. The canonical list/order
 * of *populated* groups is always re-derived from scene/manuscript order — never
 * stored — so this layer never fights the scene data. Two runtime states:
 *   - active  = ≥1 scene's string equals `title` (order from manuscript)
 *   - planned = a config entry whose `title` matches no scene (order from array)
 * A planned group auto-activates once a scene takes its title (membership derives).
 */

export type StructureKind = "act" | "chapter";

export interface StructureGroup {
  /** Stable id, minted once; lets config survive a rename. */
  id: string;
  /** Label matching scene `act`/`chapter` strings (membership + display key). */
  title: string;
  /** Optional per-group word-count target. */
  targetWords?: number;
  /** Chapters only: the id of the act this chapter belongs to (the explicit
   *  chapter→act link). Absent = not in any act. Ignored on act entries. */
  actId?: string;
}

/** Split of a kind's groups into manuscript-ordered active vs array-ordered planned. */
export interface MergedGroups {
  active: StructureGroup[];
  planned: StructureGroup[];
}

/** Hand-rolled stable id (mirrors newPublishingId): `sg-<time>-<rand>` base36. */
export function newStructureId(): string {
  return `sg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Distinct non-blank labels in first-appearance order (manuscript order when fed
 * scene labels in scene order). Mirrors the Board/compile grouping convention.
 */
export function distinctInOrder(labels: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = (raw ?? "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/**
 * Merge derived scene labels with the stored config array into display groups:
 *   - `active`: one per derived title (manuscript order), attaching a matching
 *     config entry's `id`/`targetWords` (a synthetic transient id otherwise).
 *   - `planned`: config entries whose title matches no derived title, in array order.
 * Title match is case-sensitive exact — same as scene-string grouping.
 */
export function mergeGroups(
  derivedTitles: string[],
  configured: StructureGroup[] | undefined
): MergedGroups {
  const byTitle = new Map<string, StructureGroup>();
  for (const g of configured ?? []) {
    if (g && typeof g.title === "string") byTitle.set(g.title, g);
  }
  const derivedSet = new Set(derivedTitles);

  const active: StructureGroup[] = derivedTitles.map((title, i) => {
    const cfg = byTitle.get(title);
    return {
      id: cfg?.id ?? `derived-${i}`,
      title,
      ...(cfg?.targetWords ? { targetWords: cfg.targetWords } : {}),
    };
  });

  const planned: StructureGroup[] = (configured ?? []).filter(
    (g) => g && typeof g.title === "string" && !derivedSet.has(g.title)
  );

  return { active, planned };
}

/**
 * Add or replace a config entry, matching an existing one by `id` (preferred) or
 * `title`. Mints an id when absent. Returns a new array (order preserved; new
 * entries appended). Callers persist the result via `persistStructure`.
 */
export function upsertGroup(
  configured: StructureGroup[] | undefined,
  group: { id?: string; title: string; targetWords?: number; actId?: string }
): StructureGroup[] {
  const list = [...(configured ?? [])];
  const idx = list.findIndex(
    (g) => (group.id && g.id === group.id) || g.title === group.title
  );
  const existing = idx >= 0 ? list[idx] : undefined;
  // Preserve fields the caller didn't specify (e.g. setting a target must not
  // drop an existing chapter's actId, and vice-versa).
  const targetWords = group.targetWords ?? existing?.targetWords;
  const actId = group.actId ?? existing?.actId;
  const next: StructureGroup = {
    id: group.id ?? existing?.id ?? newStructureId(),
    title: group.title,
    ...(targetWords ? { targetWords } : {}),
    ...(actId ? { actId } : {}),
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  return list;
}

/** Drop a config entry by id. Returns a new array. */
export function removeGroup(
  configured: StructureGroup[] | undefined,
  id: string
): StructureGroup[] {
  return (configured ?? []).filter((g) => g.id !== id);
}

/**
 * Rewrite a config entry's title (chapter/act rename). Returns a new array, or
 * `null` when nothing changed (no entry with `oldTitle`, or titles equal) so the
 * caller can skip a redundant write. Mirrors `renameSceneInBeats`.
 */
export function renameGroupConfig(
  configured: StructureGroup[] | undefined,
  oldTitle: string,
  newTitle: string
): StructureGroup[] | null {
  if (!configured || oldTitle === newTitle) return null;
  let changed = false;
  const next = configured.map((g) => {
    if (g.title === oldTitle) {
      changed = true;
      return { ...g, title: newTitle };
    }
    return g;
  });
  return changed ? next : null;
}

/**
 * Bucket per-scene word counts by group label into `{ words, scenes }`. Blank
 * labels fall into the `""` bucket. Pure — the caller resolves labels + counts.
 */
export function sumGroupWords(
  entries: Array<{ label?: string | null; words: number }>
): Map<string, { words: number; scenes: number }> {
  const out = new Map<string, { words: number; scenes: number }>();
  for (const { label, words } of entries) {
    const key = (label ?? "").trim();
    const cur = out.get(key) ?? { words: 0, scenes: 0 };
    cur.words += words;
    cur.scenes += 1;
    out.set(key, cur);
  }
  return out;
}
