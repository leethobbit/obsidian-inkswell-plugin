/**
 * Pure operations on a project's revision-decision list. No Obsidian imports, so
 * these are unit-testable in plain Node. The I/O wrapper (persistRevisions) lives
 * in revisions.ts and calls into these.
 */

import type { Project } from "../projects/types";
import { RevisionDecision, RevisionStatus } from "./types";

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
}

export function filterDecisions(
  list: RevisionDecision[],
  filter: DecisionFilter
): RevisionDecision[] {
  return list.filter((d) => {
    if (filter.status && d.status !== filter.status) return false;
    if (filter.scene !== undefined && d.scene !== filter.scene) return false;
    return true;
  });
}

/** Count pending decisions — handy for badges. */
export function pendingCount(list: RevisionDecision[]): number {
  return list.reduce((n, d) => (d.status === "pending" ? n + 1 : n), 0);
}

/** Current decisions for a project (empty array if none). */
export function decisionsOf(project: Project): RevisionDecision[] {
  return project.inkswell?.revisions ?? [];
}
