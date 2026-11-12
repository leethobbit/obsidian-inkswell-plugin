/**
 * The sidebar companions (pure — no Obsidian import). Each is its own view
 * type with its own icon, so writers can show two at once and Obsidian keeps
 * the layout (decision 2026-11-12, docs/plans/2026-11-peek-and-companions.md).
 *
 * Rules for every companion (AGENTS.md "Single host view"): it opens only in a
 * sidebar, it is read-mostly, and it never contains a scene editor.
 */

import { FeatureId, featureEnabled } from "../features";
import type { MessageKey } from "../i18n/locales/en";
import type { InkswellMode } from "../views/nav-model";

export type CompanionId = "codex" | "plan" | "scenes" | "track" | "todos";

export interface CompanionDef {
  id: CompanionId;
  /** Obsidian view type. */
  viewType: string;
  /** Catalog key for its name (tab title, menus, commands). */
  labelKey: MessageKey;
  /** Its rail icon where it shows the same thing (Codex, Plan, Track), so the
   *  sidebar tab reads as Inkswell's; Scenes and To-dos say what they list. */
  icon: string;
  /** Where it opens the first time; Obsidian remembers where you move it. */
  side: "left" | "right";
  /** The rail destination it belongs to ("Open in sidebar" lives on that icon). */
  destination: InkswellMode;
  /** Hidden from every entry point while this feature is off. */
  feature?: FeatureId;
}

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: "codex",
    viewType: "inkswell-companion-codex",
    labelKey: "companion.codex.name",
    icon: "book-marked",
    side: "right",
    destination: "codex",
  },
  {
    id: "plan",
    viewType: "inkswell-companion-plan",
    labelKey: "companion.plan.name",
    icon: "compass",
    side: "right",
    destination: "plan",
  },
  {
    id: "scenes",
    viewType: "inkswell-companion-scenes",
    labelKey: "companion.scenes.name",
    icon: "list-tree",
    side: "left",
    destination: "home",
  },
  {
    id: "track",
    viewType: "inkswell-companion-track",
    labelKey: "companion.track.name",
    icon: "bar-chart-3",
    side: "right",
    destination: "track",
    feature: "tracking",
  },
  {
    id: "todos",
    viewType: "inkswell-companion-todos",
    labelKey: "companion.todos.name",
    icon: "list-checks",
    side: "right",
    destination: "revise",
  },
];

export function companionById(id: CompanionId): CompanionDef {
  const def = COMPANIONS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown companion: ${id}`);
  return def;
}

/** Companions offered by the menus and commands (feature-gated). */
export function visibleCompanions(disabled: readonly string[]): CompanionDef[] {
  return COMPANIONS.filter((c) => !c.feature || featureEnabled(disabled, c.feature));
}

/** The companion that belongs to a rail destination, if one does and it's enabled. */
export function companionForDestination(
  dest: InkswellMode,
  disabled: readonly string[]
): CompanionDef | null {
  return visibleCompanions(disabled).find((c) => c.destination === dest) ?? null;
}
