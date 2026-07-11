/**
 * Pure operations on a project's revision-decision list. No Obsidian imports, so
 * these are unit-testable in plain Node. The I/O wrapper (persistRevisions) lives
 * in revisions.ts and calls into these.
 */

import type { Project } from "../projects/types";
import { RevisionDecision, RevisionPriority, RevisionStatus, RevisionType } from "./types";

/** Append (or replace by id) a decision. */
export function upsertDecision(
  list: RevisionDecision[],
  decision: RevisionDecision
): RevisionDecision[] {
  const idx = list.findIndex((d) => d.id === decision.id);
  if (idx < 0) return [...list, decision];
  return list.map((d) => (d.id === decision.id ? decision : d));
}

export function setDecisionStatus(
  list: RevisionDecision[],
  id: string,
  status: RevisionStatus
): RevisionDecision[] {
  return list.map((d) => (d.id === id ? { ...d, status } : d));
}

export function removeDecision(
  list: RevisionDecision[],
  id: string
): RevisionDecision[] {
  return list.filter((d) => d.id !== id);
}

export interface DecisionFilter {
  status?: RevisionStatus;
  /** Match a scene title, or null for project-wide decisions. */
  scene?: string | null;
  type?: RevisionType;
  priority?: RevisionPriority;
}

/** A decision's effective type (absent = continuity). */
export function decisionType(d: RevisionDecision): RevisionType {
  return d.type ?? "continuity";
}

export function filterDecisions(
  list: RevisionDecision[],
  filter: DecisionFilter
): RevisionDecision[] {
  return list.filter((d) => {
    if (filter.status && d.status !== filter.status) return false;
    if (filter.scene !== undefined && d.scene !== filter.scene) return false;
    if (filter.type && decisionType(d) !== filter.type) return false;
    if (filter.priority && d.priority !== filter.priority) return false;
    return true;
  });
}

/** Count decisions by effective type. */
export function countByType(list: RevisionDecision[]): Record<RevisionType, number> {
  const out = {
    continuity: 0,
    "plot-hole": 0,
    rewrite: 0,
    character: 0,
    research: 0,
    "new-scene": 0,
  } as Record<RevisionType, number>;
  for (const d of list) out[decisionType(d)] += 1;
  return out;
}

/** Count pending decisions — handy for badges. */
export function pendingCount(list: RevisionDecision[]): number {
  return list.reduce((n, d) => (d.status === "pending" ? n + 1 : n), 0);
}

const PRIORITY_RANK: Record<RevisionPriority, number> = { high: 0, med: 1, low: 2 };

/** Display order within a group: high → med → low → no priority; stable
 *  (creation order preserved) within a band. Returns a new array. */
export function sortDecisionsForDisplay(list: RevisionDecision[]): RevisionDecision[] {
  const rank = (d: RevisionDecision): number =>
    d.priority ? PRIORITY_RANK[d.priority] : 3;
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/** Current decisions for a project (empty array if none). */
export function decisionsOf(project: Project): RevisionDecision[] {
  return project.inkswell?.revisions ?? [];
}
