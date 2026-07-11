/**
 * Pure Kanban-grouping logic (no Obsidian imports — unit-testable).
 *
 * Two column models:
 * - `buildColumns` — flat per-scene fields (status, POV): one column per
 *   distinct value; a drop sets that field to the column's `key` ("" clears).
 * - `buildOutlineColumns` — the structural axes (act, chapter): columns come
 *   from the outline tree (the authoritative Act › Chapter › Scene model), so
 *   every configured act/chapter appears — INCLUDING empty ones — in outline
 *   order, and a drop is an outline move (the panel routes it through
 *   moveScene/applyOutline so the Tree, Grid, and manuscript order all agree).
 */

import { linkTarget } from "../codex/codex";
import { SCENE_STATUSES, SceneStatus, statusLabel } from "../scenes/scene-meta";
import { OutlineTree } from "./outline";

export type GroupField = "status" | "act" | "chapter" | "pov";

export interface BoardItem {
  title: string;
  path: string;
  status?: SceneStatus;
  act?: string;
  chapter?: string;
  pov?: string;
  synopsis?: string;
  color?: string;
}

export interface BoardColumn {
  /** Drop target: the field value for flat groupings, the act/chapter ID for
   *  structural groupings ("" = the None column, which clears/unassigns). */
  key: string;
  label: string;
  /** Muted context line under the label (e.g. a chapter column's act). */
  sub?: string;
  items: BoardItem[];
}

const NONE_LABEL: Record<GroupField, string> = {
  status: "No status",
  act: "No act",
  chapter: "No chapter",
  pov: "No POV",
};

export function buildColumns(items: BoardItem[], field: "status" | "pov"): BoardColumn[] {
  const none: BoardColumn = {
    key: "",
    label: NONE_LABEL[field],
    items: [],
  };

  if (field === "status") {
    const cols: BoardColumn[] = SCENE_STATUSES.map((s) => ({
      key: s,
      label: statusLabel(s),
      items: [],
    }));
    const byKey = new Map(cols.map((c) => [c.key, c]));
    for (const it of items) {
      const col = (it.status && byKey.get(it.status)) || none;
      col.items.push(it);
    }
    return [...cols, none];
  }

  const get = (it: BoardItem) => it.pov;
  // Order columns by first appearance in manuscript (scene) order, NOT
  // alphabetically — `items` arrives in scene order and a Set preserves
  // insertion order, so the distinct values are already in reading order.
  const values = Array.from(
    new Set(items.map(get).filter((v): v is string => !!v))
  );
  // Display the clean name (e.g. "Anna" not "[[Anna]]") while keeping the raw
  // value as the key so drag-drop writes back exactly what's already stored.
  const cols: BoardColumn[] = values.map((v) => ({ key: v, label: linkTarget(v), items: [] }));
  const byKey = new Map(cols.map((c) => [c.key, c]));
  for (const it of items) {
    const v = get(it);
    ((v && byKey.get(v)) || none).items.push(it);
  }
  return [...cols, none];
}

/**
 * Structural columns (act/chapter grouping) derived from the outline tree —
 * the same model the Tree and Grid render, so the three views can't disagree.
 * Every act/chapter appears in outline order, including empty ones (they're
 * planning targets, not noise). Column keys are stable act/chapter IDs; the
 * trailing None column ("" key) holds unassigned scenes (and, for acts, the
 * scenes of act-less chapters).
 */
export function buildOutlineColumns(
  tree: OutlineTree,
  field: "act" | "chapter",
  items: BoardItem[]
): BoardColumn[] {
  const byPath = new Map(items.map((it) => [it.path, it] as const));
  const cards = (scenes: { path: string | null }[]): BoardItem[] =>
    scenes.flatMap((s) => {
      const it = s.path ? byPath.get(s.path) : undefined;
      return it ? [it] : [];
    });

  const cols: BoardColumn[] = [];
  if (field === "chapter") {
    for (const a of tree.acts) {
      for (const c of a.chapters) {
        cols.push({ key: c.id, label: c.title, sub: a.title, items: cards(c.scenes) });
      }
    }
    for (const c of tree.looseChapters) {
      cols.push({ key: c.id, label: c.title, items: cards(c.scenes) });
    }
    cols.push({ key: "", label: NONE_LABEL.chapter, items: cards(tree.unassignedScenes) });
    return cols;
  }

  for (const a of tree.acts) {
    cols.push({ key: a.id, label: a.title, items: cards(a.chapters.flatMap((c) => c.scenes)) });
  }
  cols.push({
    key: "",
    label: NONE_LABEL.act,
    items: cards([...tree.looseChapters.flatMap((c) => c.scenes), ...tree.unassignedScenes]),
  });
  return cols;
}

/** Where a card dropped on an act column lands. */
export type ActDropResolution =
  | { kind: "move"; chapterId: string }
  | { kind: "empty-act" }
  | { kind: "noop" };

/**
 * An act is a container of chapters, so "move scene to act B" needs a chapter.
 * Pick the act boundary nearest the scene's current position: moving to a
 * LATER act lands in its first chapter, to an EARLIER act in its last — the
 * scene stays adjacent to where it came from. An act with no chapters can't
 * take a scene (`empty-act`); dropping on the act it's already in is a noop.
 */
export function resolveActDrop(
  tree: OutlineTree,
  sceneTitle: string,
  targetActId: string
): ActDropResolution {
  const targetIdx = tree.acts.findIndex((a) => a.id === targetActId);
  if (targetIdx < 0) return { kind: "noop" };
  const target = tree.acts[targetIdx];
  if (target.chapters.length === 0) return { kind: "empty-act" };

  // The scene's current act index; loose/unassigned scenes sit after every act
  // in manuscript order, so they count as "later than all acts".
  let currentIdx = tree.acts.length;
  for (let i = 0; i < tree.acts.length; i++) {
    if (tree.acts[i].chapters.some((c) => c.scenes.some((s) => s.title === sceneTitle))) {
      currentIdx = i;
      break;
    }
  }
  if (currentIdx === targetIdx) return { kind: "noop" };

  const chapter =
    currentIdx < targetIdx ? target.chapters[0] : target.chapters[target.chapters.length - 1];
  return { kind: "move", chapterId: chapter.id };
}
