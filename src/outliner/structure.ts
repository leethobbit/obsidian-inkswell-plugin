/**
 * Acts & chapters as config objects (pure, Obsidian-free, unit-tested).
 *
 * Scenes carry free-text `act`/`chapter` strings (frozen 1.0 keys, StoryLine-
 * compatible) — those stay the membership + display key. This module adds a thin
 * config layer stored under `inkswell.chapters` / `inkswell.acts`: a per-group
 * word target and the ability to plan a group before any scene uses it.
 *
 * A chapter is a RUN of consecutive scenes carrying its `title` (see
 * `chapterRuns` in outline.ts), not every scene with that title — so two
 * chapters may share a name (#58). A chapter's `firstScene` anchors which run is
 * which; its stable `id` carries config across a rename. The canonical list/order
 * of *populated* chapters is always re-derived from scene/manuscript order —
 * never stored — so this layer never fights the scene data. Two runtime states:
 *   - active  = a run of scenes carries `title` (order from manuscript)
 *   - planned = a config entry no run claims (order from array)
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
  /** Chapters only: title of the scene that opens this chapter. Lets two
   *  chapters share a name, even side by side (#58). Written by the outline for
   *  every populated chapter; absent on planned (empty) ones. An anchor whose
   *  scene is gone or carries another chapter string is ignored. */
  firstScene?: string;
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
 * Title-keyed (one group per distinct label) — fine for acts, NOT the chapter
 * model: chapters may share a title, so chapter surfaces use `chapterRuns` /
 * `buildOutline` (outline.ts). Kept for callers that want label buckets.
 *
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
 * entries appended). Callers persist the result via `persistOutline`.
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
    ...(existing?.firstScene ? { firstScene: existing.firstScene } : {}),
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
 * Persist a populated chapter's current id as a config entry, anchored at its
 * `firstScene`, so state keyed on it (e.g. its revision checklist) stays with
 * THAT chapter. `chapterRuns` derives `c:<title>` / `c:<title>~<n>` for an
 * unconfigured run by occurrence order, so a same-named chapter appearing
 * earlier in the manuscript (#58) would otherwise shift the ids and move the
 * state onto the wrong chapter. (Renames through the Tree keep ids either way.)
 * Returns a new array, or `null` when an entry with that id already exists.
 */
export function pinChapterConfig(
  configured: StructureGroup[] | undefined,
  chapter: { id: string; title: string; firstScene?: string }
): StructureGroup[] | null {
  const list = (configured ?? []).filter((g) => g && typeof g.title === "string");
  if (list.some((g) => g.id === chapter.id)) return null;
  return [
    ...list,
    {
      id: chapter.id,
      title: chapter.title,
      ...(chapter.firstScene ? { firstScene: chapter.firstScene } : {}),
    },
  ];
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

/**
 * Rewrite chapter `firstScene` anchors after a scene rename. Returns a new
 * array, or `null` when no anchor named `oldTitle` (so the caller can skip a
 * redundant write). Mirrors `renameSceneInBeats`.
 */
export function renameSceneInChapters(
  configured: StructureGroup[] | undefined,
  oldTitle: string,
  newTitle: string
): StructureGroup[] | null {
  if (!Array.isArray(configured) || oldTitle === newTitle) return null;
  if (!configured.some((g) => g?.firstScene === oldTitle)) return null;
  return configured.map((g) => (g?.firstScene === oldTitle ? { ...g, firstScene: newTitle } : g));
}

/**
 * A scene is leaving the manuscript: a chapter it opened passes its anchor to
 * the scene that followed it (`order` is the manuscript BEFORE the removal), so
 * the chapter keeps its scenes instead of merging into a same-named chapter
 * just before it. When the follower belongs to another chapter, the anchor fails
 * the label check at build time and is ignored — no worse than having none.
 * Returns a new array, or `null` when nothing changed.
 */
export function passChapterAnchors(
  configured: StructureGroup[] | undefined,
  order: ReadonlyArray<{ title: string }>,
  removedTitle: string
): StructureGroup[] | null {
  if (!Array.isArray(configured)) return null;
  if (!configured.some((g) => g?.firstScene === removedTitle)) return null;
  const at = order.findIndex((s) => s.title === removedTitle);
  const next = at >= 0 ? order[at + 1]?.title : undefined;
  return configured.map((g) => {
    if (g?.firstScene !== removedTitle) return g;
    const copy: StructureGroup = { ...g };
    if (next) copy.firstScene = next;
    else delete copy.firstScene;
    return copy;
  });
}
