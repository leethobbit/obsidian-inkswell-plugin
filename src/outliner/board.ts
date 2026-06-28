/**
 * Pure Kanban-grouping logic (no Obsidian imports — unit-testable). The board
 * panel reads each scene's metadata, then groups cards into columns by a chosen
 * field. Dropping a card on a column sets that field to the column's `key`
 * ("" clears it).
 */

import { linkTarget } from "../codex/codex";
import { SCENE_STATUSES, SceneStatus, statusLabel } from "../scenes/scene-meta";

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
  /** Value to assign when a card is dropped here ("" = clear the field). */
  key: string;
  label: string;
  items: BoardItem[];
}

const NONE_LABEL: Record<GroupField, string> = {
  status: "No status",
  act: "No act",
  chapter: "No chapter",
  pov: "No POV",
};

export function buildColumns(items: BoardItem[], field: GroupField): BoardColumn[] {
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

  const get = (it: BoardItem) =>
    field === "act" ? it.act : field === "chapter" ? it.chapter : it.pov;
  // Order columns by first appearance in manuscript (scene) order, NOT
  // alphabetically — `items` arrives in scene order and a Set preserves
  // insertion order, so the distinct values are already in reading order.
  // This matches the compile group-by-chapter step and keeps spelled-out
  // chapters/acts ("One, Two, Three") in narrative sequence.
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
