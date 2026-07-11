/**
 * Pure grouping for the Write → Revision sidebar: merge inline to-do markers and
 * logged revision decisions into per-scene groups, ordered for a writer who is
 * working one scene at a time.
 *
 * Ordering: the current scene first (always shown, even when empty), then a
 * "Whole project" group (decisions with no scene anchor, plus any whose scene no
 * longer resolves — so nothing is silently dropped), then every other scene that
 * has outstanding work, in manuscript order. No Obsidian imports → unit-testable.
 */

import {
  GapHit,
  PLACEHOLDER_LABEL,
  PLACEHOLDER_ORDER,
  PlaceholderKind,
} from "../lib/placeholders";
import { decisionType } from "./decisions";
import { REVISION_TYPES, RevisionDecision, RevisionType } from "./types";
import { SceneTodos } from "./todos-scan";

/** The pseudo-key for the scene-less "Whole project" group. */
export const PROJECT_GROUP_KEY = "__project__";

export interface RevisionGroup {
  /** Scene path, or PROJECT_GROUP_KEY for the whole-project group. */
  key: string;
  /** Scene title, or "Whole project". */
  title: string;
  /** Scene path (null for the whole-project group). */
  path: string | null;
  isCurrent: boolean;
  todos: GapHit[];
  decisions: RevisionDecision[];
}

/**
 * Build the ordered group list. `decisions` should already be filtered to the
 * statuses to display (e.g. pending-only, or pending+applied); this function only
 * groups and orders them.
 */
export function buildRevisionGroups(
  scenes: { title: string; path: string | null }[],
  todos: SceneTodos[],
  decisions: RevisionDecision[],
  currentPath: string | null
): RevisionGroup[] {
  const todosByPath = new Map<string, GapHit[]>();
  for (const g of todos) todosByPath.set(g.path, g.todos);

  // Decisions anchor by scene TITLE (or null). Bucket by title; track which
  // titles correspond to a real scene so leftovers can fall into "Whole project".
  const sceneTitles = new Set(scenes.map((s) => s.title));
  const decisionsByTitle = new Map<string, RevisionDecision[]>();
  const projectDecisions: RevisionDecision[] = [];
  for (const d of decisions) {
    if (d.scene && sceneTitles.has(d.scene)) {
      const list = decisionsByTitle.get(d.scene) ?? [];
      list.push(d);
      decisionsByTitle.set(d.scene, list);
    } else {
      // scene === null, or a title that no longer resolves to a scene.
      projectDecisions.push(d);
    }
  }

  const groupFor = (scene: { title: string; path: string | null }): RevisionGroup => ({
    key: scene.path ?? scene.title,
    title: scene.title,
    path: scene.path,
    isCurrent: scene.path != null && scene.path === currentPath,
    todos: scene.path ? todosByPath.get(scene.path) ?? [] : [],
    decisions: decisionsByTitle.get(scene.title) ?? [],
  });

  const hasWork = (g: RevisionGroup): boolean => g.todos.length > 0 || g.decisions.length > 0;

  const out: RevisionGroup[] = [];

  // 1) Current scene first — always shown, even if it has no work.
  const current = currentPath ? scenes.find((s) => s.path === currentPath) : undefined;
  if (current) out.push(groupFor(current));

  // 2) Whole-project group (scene-less + orphaned-title decisions), if any.
  if (projectDecisions.length > 0) {
    out.push({
      key: PROJECT_GROUP_KEY,
      title: "Whole project",
      path: null,
      isCurrent: false,
      todos: [],
      decisions: projectDecisions,
    });
  }

  // 3) Other scenes with outstanding work, in manuscript order.
  for (const scene of scenes) {
    if (current && scene.path === current.path) continue;
    const g = groupFor(scene);
    if (hasWork(g)) out.push(g);
  }

  return out;
}

// ---- Unified filter for the merged Revise → To-dos panel -------------------
// One chip row filters across both facets: inline marker kinds and logged
// decision types. Pure so chip building and filtering are unit-testable.

export type WorkFilter =
  | { facet: "all" }
  | { facet: "marker"; kind: PlaceholderKind }
  | { facet: "decision"; type: RevisionType };

export interface WorkChip {
  label: string;
  filter: WorkFilter;
  count: number;
  /** True for decision-type chips (styled distinctly from marker-kind chips). */
  decision: boolean;
}

/**
 * Chip row for the current work set: `All (n)`, marker kinds in canonical
 * order, then decision types in declaration order. Zero-count chips are
 * omitted — including the legacy Research / New scene decision types, which
 * only appear when such decisions still exist.
 */
export function buildWorkChips(
  todos: SceneTodos[],
  decisions: RevisionDecision[]
): WorkChip[] {
  const markerCounts = new Map<PlaceholderKind, number>();
  let markerTotal = 0;
  for (const g of todos) {
    for (const t of g.todos) {
      markerCounts.set(t.kind, (markerCounts.get(t.kind) ?? 0) + 1);
      markerTotal++;
    }
  }
  const typeCounts = new Map<RevisionType, number>();
  for (const d of decisions) {
    const t = decisionType(d);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }

  const chips: WorkChip[] = [
    {
      label: "All",
      filter: { facet: "all" },
      count: markerTotal + decisions.length,
      decision: false,
    },
  ];
  for (const kind of PLACEHOLDER_ORDER) {
    const count = markerCounts.get(kind) ?? 0;
    if (!count) continue;
    chips.push({
      label: PLACEHOLDER_LABEL[kind],
      filter: { facet: "marker", kind },
      count,
      decision: false,
    });
  }
  for (const t of REVISION_TYPES) {
    const count = typeCounts.get(t.id) ?? 0;
    if (!count) continue;
    chips.push({ label: t.label, filter: { facet: "decision", type: t.id }, count, decision: true });
  }
  return chips;
}

/** Narrow the work set to one facet; `all` is the identity. */
export function applyWorkFilter(
  todos: SceneTodos[],
  decisions: RevisionDecision[],
  filter: WorkFilter
): { todos: SceneTodos[]; decisions: RevisionDecision[] } {
  if (filter.facet === "all") return { todos, decisions };
  if (filter.facet === "marker") {
    const kind = filter.kind;
    const narrowed = todos
      .map((g) => ({ ...g, todos: g.todos.filter((t) => t.kind === kind) }))
      .filter((g) => g.todos.length > 0);
    return { todos: narrowed, decisions: [] };
  }
  return { todos: [], decisions: decisions.filter((d) => decisionType(d) === filter.type) };
}
