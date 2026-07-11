/**
 * The single navigation model. The desktop icon rail, the phone bottom bar, and
 * the phone "More" sheet all derive from DESTINATIONS — add a destination here
 * once and every surface picks it up. (Previously the rail and the phone bar
 * were declared independently and reconciled by hand; they drifted.)
 */

import { FeatureId, featureEnabled } from "../features";

/** Top-level phase destinations. */
export type InkswellMode =
  | "home"
  | "plan"
  | "write"
  | "track"
  | "revise"
  | "publish"
  | "codex"
  | "search"
  | "help";

export interface SubTab {
  id: string;
  label: string;
  /** Optional-feature id gating this tab; absent = always shown (core). */
  feature?: FeatureId;
}

/** Where (and how) a destination surfaces on phones. */
export interface PhonePlacement {
  /** "bar" = a bottom-bar slot; "more" = a row in the More sheet. */
  slot: "bar" | "more";
  /** Left→right (bar) / top→bottom (sheet) ordering within the slot. */
  order: number;
  /** Phone label override (e.g. Home reads as "Scenes" on the bar). */
  label?: string;
  /** Sub-tab a phone tap should land on (e.g. Revise → todos). */
  subtab?: string;
}

/**
 * Rail grouping. The desktop rail draws a divider between consecutive groups;
 * `tools` is floated to the bottom like a footer. Groups appear as contiguous
 * runs in DESTINATIONS order (asserted in tests). Phone surfaces ignore this —
 * they're driven by `phone` placement.
 *   hub      — the entry point (Home)
 *   pipeline — the writing lifecycle, in order (Plan · Write · Revise · Publish)
 *   insight  — reference/insight consulted during any phase (Codex · Track)
 *   tools    — occasional utilities, pinned to the bottom (Search · Help)
 */
export type RailGroup = "hub" | "pipeline" | "insight" | "tools";

export interface Destination {
  id: InkswellMode;
  label: string;
  icon: string;
  subtabs?: SubTab[];
  /** Which rail group this destination belongs to (drives dividers + footer). */
  group: RailGroup;
  /** Phone placement; absent = reachable on phones only indirectly. */
  phone?: PhonePlacement;
  /** Always shows the "use a larger screen" notice on phones. */
  phoneRedirect?: boolean;
}

export const DESTINATIONS: Destination[] = [
  // Hub — the entry point.
  {
    id: "home",
    label: "Home",
    icon: "home",
    group: "hub",
    phone: { slot: "bar", order: 2, label: "Scenes" },
  },
  // Pipeline — the writing lifecycle, in order.
  {
    id: "plan",
    label: "Plan",
    icon: "compass",
    group: "pipeline",
    subtabs: [
      { id: "overview", label: "Overview" },
      { id: "beats", label: "Beats", feature: "beats" },
      { id: "structure", label: "Structure" },
    ],
    phone: { slot: "more", order: 5 },
    phoneRedirect: true,
  },
  { id: "write", label: "Write", icon: "pencil", group: "pipeline", phone: { slot: "bar", order: 1 } },
  {
    id: "revise",
    label: "Revise",
    icon: "git-compare",
    group: "pipeline",
    subtabs: [
      { id: "audit", label: "Audit", feature: "audit" },
      // The merged worklist: inline prose markers + logged decisions in one
      // scene-grouped view (the old separate Log subtab folded into it).
      { id: "todos", label: "To-dos" },
      { id: "analysis", label: "Analysis", feature: "analysis" },
    ],
    // Only the To-dos slice is phone-usable; the sheet row jumps straight to it.
    phone: { slot: "more", order: 2, label: "To-dos", subtab: "todos" },
  },
  {
    id: "publish",
    label: "Publish",
    icon: "upload",
    group: "pipeline",
    subtabs: [
      { id: "compile", label: "Compile" },
      { id: "checklist", label: "Checklist", feature: "checklist" },
      { id: "launch", label: "Launch", feature: "launch" },
    ],
    phone: { slot: "more", order: 6 },
    phoneRedirect: true,
  },
  // Insight — reference material consulted across any pipeline phase.
  {
    id: "codex",
    label: "Codex",
    icon: "book-marked",
    group: "insight",
    phone: { slot: "bar", order: 3 },
  },
  {
    id: "track",
    label: "Track",
    icon: "bar-chart-3",
    group: "insight",
    phone: { slot: "more", order: 1 },
  },
  // Tools — occasional utilities, floated to the bottom of the rail.
  {
    id: "search",
    label: "Search",
    icon: "search",
    group: "tools",
    phone: { slot: "more", order: 4 },
  },
  {
    id: "help",
    label: "Help",
    icon: "help-circle",
    group: "tools",
    phone: { slot: "more", order: 3 },
  },
];

/** Rail group order — the sequence of contiguous group runs in DESTINATIONS. */
export const RAIL_GROUP_ORDER: RailGroup[] = ["hub", "pipeline", "insight", "tools"];

/** The group floated to the bottom of the rail (a footer of occasional tools). */
export const RAIL_FOOTER_GROUP: RailGroup = "tools";

/** Destinations always redirected to the "use a larger screen" notice on phones. */
export const PHONE_REDIRECTED: ReadonlySet<InkswellMode> = new Set(
  DESTINATIONS.filter((d) => d.phoneRedirect).map((d) => d.id)
);

/** Bottom-bar destinations, left→right (the fixed "More" slot is appended by the bar builder). */
export function phoneBarDestinations(): Destination[] {
  return DESTINATIONS.filter((d) => d.phone?.slot === "bar").sort(
    (a, b) => (a.phone?.order ?? 0) - (b.phone?.order ?? 0)
  );
}

/** More-sheet destinations in order: phone-usable rows first, then redirected ones. */
export function phoneMoreDestinations(): { usable: Destination[]; redirected: Destination[] } {
  const rows = DESTINATIONS.filter((d) => d.phone?.slot === "more").sort(
    (a, b) => (a.phone?.order ?? 0) - (b.phone?.order ?? 0)
  );
  return {
    usable: rows.filter((d) => !d.phoneRedirect),
    redirected: rows.filter((d) => d.phoneRedirect),
  };
}

/** Which bottom tab is highlighted for a destination ("more" when it has no bar slot). */
export function phoneTabForMode(mode: InkswellMode): string {
  const dest = DESTINATIONS.find((d) => d.id === mode);
  return dest?.phone?.slot === "bar" ? dest.id : "more";
}

/** A destination's sub-tabs with feature-gated ones dropped when disabled. */
export function enabledSubtabs(dest: Destination, disabled: readonly string[]): SubTab[] {
  return (dest.subtabs ?? []).filter((s) => !s.feature || featureEnabled(disabled, s.feature));
}

/**
 * Resolve the effective sub-tab to show: the remembered one if it's still
 * enabled, otherwise the first enabled sub-tab (so hiding the active tab falls
 * back to a visible core one rather than a blank pane). Undefined when the
 * destination has no (enabled) sub-tabs.
 */
export function resolveSubtab(
  dest: Destination,
  remembered: string | undefined,
  disabled: readonly string[]
): string | undefined {
  const enabled = enabledSubtabs(dest, disabled);
  if (remembered && enabled.some((s) => s.id === remembered)) return remembered;
  return enabled[0]?.id;
}
