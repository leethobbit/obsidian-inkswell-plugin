/**
 * The single navigation model. The desktop icon rail, the phone bottom bar, and
 * the phone "More" sheet all derive from DESTINATIONS — add a destination here
 * once and every surface picks it up. (Previously the rail and the phone bar
 * were declared independently and reconciled by hand; they drifted.)
 */

/** Top-level phase destinations. */
export type InkswellMode =
  | "home"
  | "plan"
  | "write"
  | "track"
  | "revise"
  | "publish"
  | "codex"
  | "help";

export interface SubTab {
  id: string;
  label: string;
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

export interface Destination {
  id: InkswellMode;
  label: string;
  icon: string;
  subtabs?: SubTab[];
  /** Meta cluster (cross-cutting views/tools), rendered after a rail separator. */
  meta?: boolean;
  /** Phone placement; absent = reachable on phones only indirectly. */
  phone?: PhonePlacement;
  /** Always shows the "use a larger screen" notice on phones. */
  phoneRedirect?: boolean;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    phone: { slot: "bar", order: 2, label: "Scenes" },
  },
  {
    id: "plan",
    label: "Plan",
    icon: "compass",
    subtabs: [
      { id: "overview", label: "Overview" },
      { id: "beats", label: "Beats" },
      { id: "board", label: "Board" },
      { id: "outline", label: "Outline" },
    ],
    phone: { slot: "more", order: 5 },
    phoneRedirect: true,
  },
  { id: "write", label: "Write", icon: "pencil", phone: { slot: "bar", order: 1 } },
  {
    id: "revise",
    label: "Revise",
    icon: "git-compare",
    subtabs: [
      { id: "audit", label: "Audit" },
      { id: "log", label: "Log" },
      { id: "todos", label: "Todos" },
      { id: "analysis", label: "Analysis" },
    ],
    // Only the Todos slice is phone-usable; the sheet row jumps straight to it.
    phone: { slot: "more", order: 2, label: "To-dos", subtab: "todos" },
  },
  {
    id: "publish",
    label: "Publish",
    icon: "upload",
    subtabs: [
      { id: "compile", label: "Compile" },
      { id: "checklist", label: "Checklist" },
      { id: "launch", label: "Launch" },
    ],
    phone: { slot: "more", order: 6 },
    phoneRedirect: true,
  },
  // Meta cluster (after a separator): cross-cutting tools, not pipeline phases.
  // Codex is reference material used across Plan/Write/Revise, so it sits here.
  {
    id: "codex",
    label: "Codex",
    icon: "book-marked",
    meta: true,
    phone: { slot: "bar", order: 3 },
  },
  {
    id: "track",
    label: "Track",
    icon: "bar-chart-3",
    meta: true,
    phone: { slot: "more", order: 1 },
  },
  {
    id: "help",
    label: "Help",
    icon: "help-circle",
    meta: true,
    phone: { slot: "more", order: 3 },
  },
];

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
