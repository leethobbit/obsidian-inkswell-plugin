/**
 * Invisible-revision decision log model.
 *
 * The "invisible revision" method: while fast-drafting,
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

/**
 * Types offered when logging a NEW decision — story-level rulings only.
 * `research` / `new-scene` are legacy: point-in-prose work belongs in a
 * `[RESEARCH: ]` / `[SCENE: ]` marker at the exact spot instead. Saved
 * decisions with those types stay valid forever (post-1.0 frozen contract:
 * enum values are never removed) — they render, filter, and edit normally.
 */
export const OFFERED_REVISION_TYPES: RevisionType[] = [
  "continuity",
  "plot-hole",
  "character",
  "rewrite",
];

/**
 * Dropdown choices for the decision modal: the offered set, plus the
 * decision's own legacy type when editing one — so a saved research/new-scene
 * decision keeps its label and never silently changes type.
 */
export function typeChoices(existing?: RevisionType): { id: RevisionType; label: string }[] {
  const ids = OFFERED_REVISION_TYPES.includes(existing as RevisionType)
    ? OFFERED_REVISION_TYPES
    : existing
      ? [...OFFERED_REVISION_TYPES, existing]
      : OFFERED_REVISION_TYPES;
  return ids.map((id) => REVISION_TYPES.find((t) => t.id === id) ?? { id, label: id });
}

// No REVISION_PRIORITIES picker list: priority is legacy as of 1.8 (a rank
// never changed behavior in a prose-order revision pass). The `priority` field
// below stays — saved values render as badges and survive edits.

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
