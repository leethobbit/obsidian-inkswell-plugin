/**
 * The single navigation model. The desktop icon rail, the phone bottom bar, and
 * the phone "More" sheet all derive from DESTINATIONS — add a destination here
 * once and every surface picks it up. (Previously the rail and the phone bar
 * were declared independently and reconciled by hand; they drifted.)
 */

import { FeatureId, featureEnabled } from "../features";
import { MessageKey, t } from "../i18n";

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
  | "customize"
  | "help";

/**
 * Labels are stored as message keys (this table is built at import time, before
 * the catalog is chosen); `label` is a getter that translates on every read, so
 * callers read it at render time and always get the current language.
 */
interface Labelled {
  labelKey: MessageKey;
  readonly label: string;
}

export interface SubTab extends Labelled {
  id: string;
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
  labelKey?: MessageKey;
  /** The override, translated on read (undefined when there is none). */
  readonly label?: string;
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
 *   tools    — occasional utilities, pinned to the bottom (Search · Customize · Help)
 */
export type RailGroup = "hub" | "pipeline" | "insight" | "tools";

export interface Destination extends Labelled {
  id: InkswellMode;
  icon: string;
  subtabs?: SubTab[];
  /** Which rail group this destination belongs to (drives dividers + footer). */
  group: RailGroup;
  /** Phone placement; absent = reachable on phones only indirectly. */
  phone?: PhonePlacement;
  /** Always shows the "use a larger screen" notice on phones. */
  phoneRedirect?: boolean;
  /** Optional-feature id gating the WHOLE destination (rail item, More-sheet
   *  row, commands); absent = core, always shown. */
  feature?: FeatureId;
}

/** Add the translate-on-read `label` getter for an entry's `labelKey`. */
function labelled<T extends { labelKey?: MessageKey }>(entry: T): T & { readonly label: string } {
  return Object.defineProperty(entry, "label", {
    enumerable: true,
    get: (): string | undefined => (entry.labelKey ? t(entry.labelKey) : undefined),
  }) as T & { readonly label: string };
}

type DestinationSpec = Omit<Destination, "label" | "subtabs" | "phone"> & {
  subtabs?: Omit<SubTab, "label">[];
  phone?: Omit<PhonePlacement, "label">;
};

function destination(spec: DestinationSpec): Destination {
  const { subtabs, phone, ...rest } = spec;
  const dest: Destination = labelled({ ...rest });
  if (subtabs) dest.subtabs = subtabs.map((s) => labelled({ ...s }));
  if (phone) dest.phone = labelled({ ...phone });
  return dest;
}

export const DESTINATIONS: Destination[] = [
  // Hub — the entry point.
  destination({
    id: "home",
    labelKey: "nav.home",
    icon: "home",
    group: "hub",
    phone: { slot: "bar", order: 2, labelKey: "nav.home.phone" },
  }),
  // Pipeline — the writing lifecycle, in order.
  destination({
    id: "plan",
    labelKey: "nav.plan",
    icon: "compass",
    group: "pipeline",
    subtabs: [
      { id: "overview", labelKey: "nav.tab.overview" },
      { id: "beats", labelKey: "nav.tab.beats", feature: "beats" },
      { id: "structure", labelKey: "nav.tab.structure" },
    ],
    phone: { slot: "more", order: 5 },
    phoneRedirect: true,
  }),
  destination({ id: "write", labelKey: "nav.write", icon: "pencil", group: "pipeline", phone: { slot: "bar", order: 1 } }),
  destination({
    id: "revise",
    labelKey: "nav.revise",
    icon: "git-compare",
    group: "pipeline",
    subtabs: [
      { id: "audit", labelKey: "nav.tab.audit", feature: "audit" },
      // The merged worklist: inline prose markers + logged decisions in one
      // scene-grouped view (the old separate Log subtab folded into it).
      { id: "todos", labelKey: "nav.tab.revisionLog" },
      { id: "analysis", labelKey: "nav.tab.analysis", feature: "analysis" },
    ],
    // Only the revision-log slice is phone-usable; the sheet row jumps straight to it.
    phone: { slot: "more", order: 2, labelKey: "nav.tab.revisionLog", subtab: "todos" },
  }),
  destination({
    id: "publish",
    labelKey: "nav.publish",
    icon: "upload",
    group: "pipeline",
    subtabs: [
      { id: "compile", labelKey: "nav.tab.compile" },
      { id: "checklist", labelKey: "nav.tab.checklist", feature: "checklist" },
      { id: "launch", labelKey: "nav.tab.launch", feature: "launch" },
    ],
    phone: { slot: "more", order: 6 },
    phoneRedirect: true,
  }),
  // Insight — reference material consulted across any pipeline phase.
  destination({
    id: "codex",
    labelKey: "nav.codex",
    icon: "book-marked",
    group: "insight",
    phone: { slot: "bar", order: 3 },
  }),
  destination({
    id: "track",
    labelKey: "nav.track",
    icon: "bar-chart-3",
    group: "insight",
    phone: { slot: "more", order: 1 },
    feature: "tracking",
  }),
  // Tools — occasional utilities, floated to the bottom of the rail.
  destination({
    id: "search",
    labelKey: "nav.search",
    icon: "search",
    group: "tools",
    phone: { slot: "more", order: 4 },
  }),
  // Shape-of-the-tool customization (types, fields, templates, structures,
  // checklists, prompts, features). No sub-tabs: the panel carries its own
  // catalog. Multi-pane editors → redirected on phones.
  destination({
    id: "customize",
    labelKey: "nav.customize",
    icon: "sliders-horizontal",
    group: "tools",
    phone: { slot: "more", order: 7 },
    phoneRedirect: true,
  }),
  destination({
    id: "help",
    labelKey: "nav.help",
    icon: "help-circle",
    group: "tools",
    phone: { slot: "more", order: 3 },
  }),
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

/** Whether a destination is shown at all (its gating feature, if any, is on). */
export function destinationEnabled(dest: Destination, disabled: readonly string[]): boolean {
  return !dest.feature || featureEnabled(disabled, dest.feature);
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

// --- The writer's rail arrangement (#55) -------------------------------------
// Home stays first and the tools footer stays at the bottom. Everything between
// (the pipeline + insight destinations) lives in two sections split by one
// divider, and the writer may reorder within and move between them (drag on
// desktop, Move up/down in the item menu). The default is the shipped grouping:
// pipeline above the divider, Codex · Track below it.

export interface RailLayout {
  upper: InkswellMode[];
  lower: InkswellMode[];
}

export type RailSection = keyof RailLayout;

const UPPER_GROUP: RailGroup = "pipeline";
const LOWER_GROUP: RailGroup = "insight";

/** Whether a destination can be rearranged (Home and the footer are fixed). */
export function isRailMovable(id: InkswellMode): boolean {
  const g = DESTINATIONS.find((d) => d.id === id)?.group;
  return g === UPPER_GROUP || g === LOWER_GROUP;
}

export function defaultRailLayout(): RailLayout {
  return {
    upper: DESTINATIONS.filter((d) => d.group === UPPER_GROUP).map((d) => d.id),
    lower: DESTINATIONS.filter((d) => d.group === LOWER_GROUP).map((d) => d.id),
  };
}

/**
 * Sanitize a stored layout: unknown, fixed, and duplicate ids are dropped, and a
 * movable destination missing from it (one added in a later release) is
 * appended to its default section. Anything unreadable → the default.
 */
export function resolveRailLayout(raw: unknown): RailLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultRailLayout();
  const rec = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const take = (v: unknown): InkswellMode[] =>
    (Array.isArray(v) ? v : []).filter((id): id is InkswellMode => {
      if (typeof id !== "string" || seen.has(id) || !isRailMovable(id as InkswellMode)) return false;
      seen.add(id);
      return true;
    });
  const upper = take(rec["upper"]);
  const lower = take(rec["lower"]);
  for (const d of DESTINATIONS) {
    if (seen.has(d.id) || !isRailMovable(d.id)) continue;
    (d.group === UPPER_GROUP ? upper : lower).push(d.id);
  }
  return { upper, lower };
}

export function isDefaultRailLayout(layout: RailLayout): boolean {
  const def = defaultRailLayout();
  return (
    layout.upper.join("|") === def.upper.join("|") && layout.lower.join("|") === def.lower.join("|")
  );
}

/** Move `id` to position `index` of `section` (index counted without `id` itself). */
export function moveRailItem(
  layout: RailLayout,
  id: InkswellMode,
  section: RailSection,
  index: number
): RailLayout {
  if (!isRailMovable(id)) return layout;
  const next: RailLayout = {
    upper: layout.upper.filter((x) => x !== id),
    lower: layout.lower.filter((x) => x !== id),
  };
  const list = next[section];
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id);
  return next;
}

/**
 * One step up (-1) or down (+1) past the next VISIBLE item, crossing the
 * divider: down from the last upper item lands first in the lower section, up
 * from the first lower item lands last in the upper. No-op at either end.
 */
export function nudgeRailItem(
  layout: RailLayout,
  id: InkswellMode,
  dir: -1 | 1,
  isVisible: (id: InkswellMode) => boolean = () => true
): RailLayout {
  // One flat sequence with the divider as a marker between the sections.
  const DIV = "|divider|";
  const flat: string[] = [...layout.upper, DIV, ...layout.lower];
  const from = flat.indexOf(id);
  if (from < 0) return layout;
  flat.splice(from, 1);
  // Walk past hidden items; crossing the divider counts as the step.
  let at = from;
  if (dir === 1) {
    while (at < flat.length && flat[at] !== DIV && !isVisible(flat[at] as InkswellMode)) at++;
    if (at >= flat.length) return layout;
    at += 1;
  } else {
    at -= 1;
    while (at >= 0 && flat[at] !== DIV && !isVisible(flat[at] as InkswellMode)) at--;
    if (at < 0) return layout;
  }
  flat.splice(at, 0, id);
  const div = flat.indexOf(DIV);
  return {
    upper: flat.slice(0, div) as InkswellMode[],
    lower: flat.slice(div + 1) as InkswellMode[],
  };
}
