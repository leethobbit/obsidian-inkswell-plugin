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

import type { MessageKey } from "./i18n";

export type FeatureId =
  | "beats"
  | "board"
  | "plot-grid"
  | "audit"
  | "analysis"
  | "checklist"
  | "launch"
  | "prompts"
  | "tracking"
  | "stream";

/** Grouping id for the Customize → Features section (an id, not display text). */
export type FeatureGroup = "Planning" | "Revision" | "Publishing" | "Writing";

/** Display label key per group (resolve with `t()` at render). */
export const FEATURE_GROUP_LABEL: Record<FeatureGroup, MessageKey> = {
  Planning: "feature.group.planning",
  Revision: "feature.group.revision",
  Publishing: "feature.group.publishing",
  Writing: "feature.group.writing",
};

export interface FeatureDef {
  id: FeatureId;
  /** Display name key (resolve with `t()` at render). */
  labelKey: MessageKey;
  group: FeatureGroup;
  /** One-line explanation shown under the toggle (a key; resolve at render). */
  descKey: MessageKey;
}

/**
 * Every optional feature, in the order (and grouping) the Settings section shows
 * them. Core surfaces (Home, Write, Codex, Search, Help, Customize, Plan →
 * Overview, Structure → Tree, Revise → Revision log, Publish → Compile, ideas) are
 * deliberately absent — they can't be hidden. Track + sprints + goals hide
 * together as one "tracking" feature (a whole destination, gated in the rail,
 * More sheet, status bar, Write toolbar, hero card, and commands).
 */
export const OPTIONAL_FEATURES: FeatureDef[] = [
  { id: "beats", labelKey: "feature.beats.label", group: "Planning", descKey: "feature.beats.desc" },
  { id: "board", labelKey: "feature.board.label", group: "Planning", descKey: "feature.board.desc" },
  { id: "plot-grid", labelKey: "feature.plotGrid.label", group: "Planning", descKey: "feature.plotGrid.desc" },
  { id: "audit", labelKey: "feature.audit.label", group: "Revision", descKey: "feature.audit.desc" },
  { id: "analysis", labelKey: "feature.analysis.label", group: "Revision", descKey: "feature.analysis.desc" },
  { id: "checklist", labelKey: "feature.checklist.label", group: "Publishing", descKey: "feature.checklist.desc" },
  { id: "launch", labelKey: "feature.launch.label", group: "Publishing", descKey: "feature.launch.desc" },
  { id: "prompts", labelKey: "feature.prompts.label", group: "Writing", descKey: "feature.prompts.desc" },
  { id: "stream", labelKey: "feature.stream.label", group: "Writing", descKey: "feature.stream.desc" },
  { id: "tracking", labelKey: "feature.tracking.label", group: "Writing", descKey: "feature.tracking.desc" },
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
