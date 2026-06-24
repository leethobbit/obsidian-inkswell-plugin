/**
 * Invisible-revision decision log model.
 *
 * The "Invisible Revision" method (Writing Mastery Academy): while fast-drafting,
 * when you get an idea that would change earlier pages, you DON'T go back. You log
 * the decision ("from now on, assume X") and keep drafting forward as if it were
 * already true — then apply the real edits later, during the revision pass.
 *
 * Decisions are stored per-project under the index note's `inkswell.revisions`
 * frontmatter. They are NOT inserted into the draft (drafting stays uninterrupted).
 */

export type RevisionStatus = "pending" | "applied";

/**
 * Category of a logged item. "continuity" is the classic invisible-revision
 * decision ("from now on X is true") and the default when unset, so existing
 * entries (which have no `type`) read as continuity decisions.
 */
export type RevisionType =
  | "continuity"
  | "plot-hole"
  | "rewrite"
  | "character"
  | "research"
  | "new-scene";

export type RevisionPriority = "low" | "med" | "high";

export const REVISION_TYPES: { id: RevisionType; label: string }[] = [
  { id: "continuity", label: "Continuity" },
  { id: "plot-hole", label: "Plot hole" },
  { id: "rewrite", label: "Rewrite" },
  { id: "character", label: "Character" },
  { id: "research", label: "Research" },
  { id: "new-scene", label: "New scene" },
];

export const REVISION_PRIORITIES: { id: RevisionPriority; label: string }[] = [
  { id: "high", label: "High" },
  { id: "med", label: "Medium" },
  { id: "low", label: "Low" },
];

export interface RevisionDecision {
  id: string;
  /** The decision, e.g. "From now on, the brother is dead." */
  text: string;
  /** Scene title this decision was logged from, or null for a project-wide decision. */
  scene: string | null;
  status: RevisionStatus;
  /** ISO timestamp the decision was logged. */
  created: string;
  /** Category (optional; absent = "continuity"). */
  type?: RevisionType;
  /** Priority (optional). */
  priority?: RevisionPriority;
}

/** Generate a reasonably unique id for a new decision. */
export function newRevisionId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
