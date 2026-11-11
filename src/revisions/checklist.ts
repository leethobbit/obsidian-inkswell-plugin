/**
 * Pure operations on a project's stored revision checklists (no Obsidian
 * imports — unit-testable): the Story- and Prose-level tiers, plus the
 * Chapter-level tier (one state per chapter, keyed by the chapter's stable
 * structure id). Persistence is handled by the AuditPanel via
 * `persistChecklistItem` / `persistChapterChecklistItem` (deltas applied to the
 * CURRENT stored `inkswell.revisionChecklist`). The prose tier's stored key
 * stays "page" for back-compat (see audit.ts).
 *
 * Checkpoint definitions (the item ids + labels) live in `audit.ts`; this module
 * only manages the stored per-item state (done + freeform note).
 */

import { PAGE_CHECK_IDS, STORY_CHECKPOINTS } from "./audit";

export type ChecklistTier = "story" | "page";

export interface ChecklistItem {
  done?: boolean;
  note?: string;
}

/** Per-tier state: item id → its done/note. Only non-empty items are stored. */
export type ChecklistState = Record<string, ChecklistItem>;

export interface RevisionChecklistData {
  story?: ChecklistState;
  page?: ChecklistState;
  /** Chapter id (structure id, e.g. `sg-…` or a derived `c:<title>`) → state. */
  chapter?: Record<string, ChecklistState>;
}

const TIER_IDS: Record<ChecklistTier, string[]> = {
  story: STORY_CHECKPOINTS.map((c) => c.id),
  page: PAGE_CHECK_IDS,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Read a tier's state from the project data (empty object if none). */
export function tierState(
  data: RevisionChecklistData | undefined,
  tier: ChecklistTier
): ChecklistState {
  return data?.[tier] ?? {};
}

/** One chapter's state (empty object if none, or if hand-edited into junk). */
export function chapterState(
  data: RevisionChecklistData | undefined,
  chapterId: string
): ChecklistState {
  const all: unknown = data?.chapter;
  if (!isRecord(all)) return {};
  const state = all[chapterId];
  return isRecord(state) ? (state as ChecklistState) : {};
}

/** Apply a patch to one item of a state, dropping emptied items. New object. */
function patchState(
  state: ChecklistState | undefined,
  id: string,
  patch: Partial<ChecklistItem>
): ChecklistState {
  const out: ChecklistState = { ...(state ?? {}) };
  const next: ChecklistItem = { ...(out[id] ?? {}), ...patch };

  if (!next.done) delete next.done;
  if (!(next.note ?? "").trim()) delete next.note;

  if (Object.keys(next).length === 0) delete out[id];
  else out[id] = next;
  return out;
}

/**
 * Immutably set one checklist item, returning new checklist data. Empty items
 * (no done, blank note) are dropped so cleared checks don't linger in frontmatter.
 */
export function setChecklistItem(
  data: RevisionChecklistData | undefined,
  tier: ChecklistTier,
  id: string,
  patch: Partial<ChecklistItem>
): RevisionChecklistData {
  const base: RevisionChecklistData = { ...(data ?? {}) };
  const state = patchState(base[tier], id, patch);
  if (Object.keys(state).length === 0) delete base[tier];
  else base[tier] = state;
  return base;
}

/**
 * Immutably set one item of one chapter's checklist. An emptied chapter is
 * dropped, and so is the whole `chapter` map once no chapter has state.
 */
export function setChapterChecklistItem(
  data: RevisionChecklistData | undefined,
  chapterId: string,
  id: string,
  patch: Partial<ChecklistItem>
): RevisionChecklistData {
  const base: RevisionChecklistData = { ...(data ?? {}) };
  const chapters: Record<string, ChecklistState> = isRecord(base.chapter) ? { ...base.chapter } : {};
  const state = patchState(chapterState(base, chapterId), id, patch);
  if (Object.keys(state).length === 0) delete chapters[chapterId];
  else chapters[chapterId] = state;
  if (Object.keys(chapters).length === 0) delete base.chapter;
  else base.chapter = chapters;
  return base;
}

export interface ChecklistProgress {
  done: number;
  total: number;
}

/** Count ticked items in a state against `ids` (hidden items count toward
 *  neither done nor total). */
export function stateProgress(state: ChecklistState, ids: readonly string[]): ChecklistProgress {
  let done = 0;
  for (const id of ids) if (state[id]?.done) done += 1;
  return { done, total: ids.length };
}

/** Count ticked items in a tier against its EFFECTIVE checkpoint ids
 *  (`storyCheckpoints(o)` / `pageCheckIds(o)`; shipped by default). A hidden
 *  item's tick counts toward neither done nor total. */
export function checklistProgress(
  data: RevisionChecklistData | undefined,
  tier: ChecklistTier,
  ids: readonly string[] = TIER_IDS[tier]
): ChecklistProgress {
  return stateProgress(tierState(data, tier), ids);
}
