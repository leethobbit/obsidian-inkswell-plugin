/**
 * Pure operations on a project's Story-level and Prose-level revision checklists
 * (no Obsidian imports — unit-testable). Persistence is handled by the AuditPanel
 * via `persistInkswellData`, which writes `inkswell.revisionChecklist`. The prose
 * tier's stored key stays "page" for back-compat (see audit.ts).
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
}

const TIER_IDS: Record<ChecklistTier, string[]> = {
  story: STORY_CHECKPOINTS.map((c) => c.id),
  page: PAGE_CHECK_IDS,
};

/** Read a tier's state from the project data (empty object if none). */
export function tierState(
  data: RevisionChecklistData | undefined,
  tier: ChecklistTier
): ChecklistState {
  return data?.[tier] ?? {};
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
  const state: ChecklistState = { ...(base[tier] ?? {}) };
  const next: ChecklistItem = { ...(state[id] ?? {}), ...patch };

  if (!next.done) delete next.done;
  if (!(next.note ?? "").trim()) delete next.note;

  if (Object.keys(next).length === 0) delete state[id];
  else state[id] = next;

  if (Object.keys(state).length === 0) delete base[tier];
  else base[tier] = state;
  return base;
}

export interface ChecklistProgress {
  done: number;
  total: number;
}

/** Count ticked items in a tier against that tier's full checkpoint set. */
export function checklistProgress(
  data: RevisionChecklistData | undefined,
  tier: ChecklistTier
): ChecklistProgress {
  const state = tierState(data, tier);
  const ids = TIER_IDS[tier];
  let done = 0;
  for (const id of ids) if (state[id]?.done) done += 1;
  return { done, total: ids.length };
}
