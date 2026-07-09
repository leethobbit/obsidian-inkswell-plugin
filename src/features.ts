/**
 * Optional-feature registry for the feature-toggle system.
 *
 * Most writers won't use every surface, so a handful of optional features can be
 * hidden. This module is the single source of truth for WHICH features are
 * optional; the gating itself lives at each consumption point (a sub-tab, a
 * Structure view, a command, a toolbar group) which reads {@link featureEnabled}.
 *
 * Kept dependency-free (no Obsidian, no settings import) so it stays pure and
 * unit-testable and can be imported from the nav model without a cycle.
 *
 * Storage contract: a feature is ON unless its id is listed in
 * `settings.disabledFeatures`. So new optional features default on with no
 * migration, and toggling only ever gates rendering — never touches stored data,
 * so re-enabling is lossless.
 */

export type FeatureId =
  | "beats"
  | "board"
  | "plot-grid"
  | "audit"
  | "analysis"
  | "checklist"
  | "launch"
  | "prompts";

/** Grouping label for the Settings → Features section. */
export type FeatureGroup = "Planning" | "Revision" | "Publishing" | "Writing";

export interface FeatureDef {
  id: FeatureId;
  /** Display name (also used in the in-app "Hide <label>" menu). */
  label: string;
  group: FeatureGroup;
  /** One-line explanation shown under the Settings toggle. */
  desc: string;
}

/**
 * Every optional feature, in the order (and grouping) the Settings section shows
 * them. Core surfaces (Home, Write, Track, Codex, Search, Help, Plan → Overview,
 * Structure → Tree, Revise → Log/Todos, Publish → Compile, sprints, ideas) are
 * deliberately absent — they can't be hidden.
 */
export const OPTIONAL_FEATURES: FeatureDef[] = [
  {
    id: "beats",
    label: "Beats",
    group: "Planning",
    desc: "The beat-sheet planner (Plan → Beats) and its scene scaffolding.",
  },
  {
    id: "board",
    label: "Board",
    group: "Planning",
    desc: "The Kanban board view of your scenes (Plan → Structure → Board).",
  },
  {
    id: "plot-grid",
    label: "Plot grid",
    group: "Planning",
    desc: "The plotline × chapter matrix (Plan → Structure → Grid) and the scene Plotlines field.",
  },
  {
    id: "audit",
    label: "Revision audit",
    group: "Revision",
    desc: "The revision audit checklists and character-arc tracker (Revise → Audit).",
  },
  {
    id: "analysis",
    label: "Analysis",
    group: "Revision",
    desc: "Readability, word-frequency, and echo analysis (Revise → Analysis).",
  },
  {
    id: "checklist",
    label: "Publishing checklist",
    group: "Publishing",
    desc: "The self-publishing task checklist (Publish → Checklist).",
  },
  {
    id: "launch",
    label: "Launch planner",
    group: "Publishing",
    desc: "The pre-order timeline and launch trackers (Publish → Launch).",
  },
  {
    id: "prompts",
    label: "Writing prompts",
    group: "Writing",
    desc: "The writing-prompt / ideation button on the Write toolbar.",
  },
];

const OPTIONAL_IDS = new Set<string>(OPTIONAL_FEATURES.map((f) => f.id));

/** Whether `id` names a real optional feature (guards stale/typo'd stored ids). */
export function isOptionalFeature(id: string): id is FeatureId {
  return OPTIONAL_IDS.has(id);
}

/**
 * Whether an optional feature is currently enabled. A feature is on unless its id
 * appears in the caller's `disabledFeatures` list.
 */
export function featureEnabled(disabled: readonly string[], id: FeatureId): boolean {
  return !disabled.includes(id);
}
