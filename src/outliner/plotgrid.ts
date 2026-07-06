/**
 * Plot Grid — plotline × chapter matrix (pure, Obsidian-free, unit-tested).
 *
 * Plotlines are a lightweight ordered config list under `inkswell.plotlines`
 * (the StructureGroup pattern: membership by `title`, stable `id` carries the
 * color across a rename). Each scene opts into plotlines via a `plotlines`
 * frontmatter array of plain titles (like `act`/`chapter` strings — NOT
 * wikilinks). The grid is fully derived from scene data: cells are real
 * scenes, so the view can never drift from the manuscript.
 *
 * Row structure reuses the Outline tree (`buildOutline`) so chapters group
 * under acts exactly like Plan → Outline; a book with no chapters falls back
 * to one row per scene.
 */

import type { SceneStatus } from "../scenes/scene-meta";
import { buildOutline } from "./outline";
import { StructureGroup, distinctInOrder } from "./structure";

export interface Plotline {
  /** Stable id, minted once; lets the color survive a rename. */
  id: string;
  /** Label matching scene `plotlines` entries (membership + display key). */
  title: string;
  /** Optional hex column color, e.g. "#FF6B6B". */
  color?: string;
}

/** Prefix marking a ghost column derived from scene tags with no config entry. */
const ORPHAN_PREFIX = "orphan:";

export function isOrphanPlotline(p: Plotline): boolean {
  return p.id.startsWith(ORPHAN_PREFIX);
}

/** Hand-rolled stable id (mirrors newStructureId): `pl-<time>-<rand>` base36. */
export function newPlotlineId(): string {
  return `pl-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Add or replace a config entry, matching by `id` (preferred) or `title`.
 * Mints an id when absent. Fields the caller doesn't pass are preserved
 * (recoloring must not drop anything on a later field; renaming keeps the
 * color); passing `color: ""` explicitly clears it.
 */
export function upsertPlotline(
  configured: Plotline[] | undefined,
  plotline: { id?: string; title: string; color?: string }
): Plotline[] {
  const list = [...(configured ?? [])];
  const idx = list.findIndex(
    (p) => (plotline.id && p.id === plotline.id) || p.title === plotline.title
  );
  const existing = idx >= 0 ? list[idx] : undefined;
  const color = plotline.color ?? existing?.color;
  const next: Plotline = {
    id: plotline.id ?? existing?.id ?? newPlotlineId(),
    title: plotline.title,
    ...(color ? { color } : {}),
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  return list;
}

/** Drop a config entry by id. Returns a new array. */
export function removePlotline(
  configured: Plotline[] | undefined,
  id: string
): Plotline[] {
  return (configured ?? []).filter((p) => p.id !== id);
}

/**
 * Reorder a plotline relative to `anchorId` (before it, or after it when
 * `after`). Returns the SAME array reference when nothing moved so callers can
 * skip a redundant write.
 */
export function movePlotline(
  configured: Plotline[],
  id: string,
  anchorId: string | null,
  after = false
): Plotline[] {
  const from = configured.findIndex((p) => p.id === id);
  if (from < 0 || id === anchorId) return configured;
  const next = [...configured];
  const [moved] = next.splice(from, 1);
  const anchor = anchorId === null ? -1 : next.findIndex((p) => p.id === anchorId);
  if (anchor < 0) next.push(moved);
  else next.splice(after ? anchor + 1 : anchor, 0, moved);
  return next.every((p, i) => p === configured[i]) ? configured : next;
}

/**
 * Rewrite a config entry's title (plotline rename). Returns a new array, or
 * `null` when nothing changed, so the caller can skip a redundant write.
 * Mirrors `renameGroupConfig`.
 */
export function renamePlotlineConfig(
  configured: Plotline[] | undefined,
  oldTitle: string,
  newTitle: string
): Plotline[] | null {
  if (!configured || oldTitle === newTitle) return null;
  let changed = false;
  const next = configured.map((p) => {
    if (p.title === oldTitle) {
      changed = true;
      return { ...p, title: newTitle };
    }
    return p;
  });
  return changed ? next : null;
}

// --- Per-scene tag ops (arrays of plain titles) ------------------------------
// Each returns `null` when the array is already in the desired state, so
// callers skip the frontmatter write (the apply-outline changed-only economy).

export function addPlotlineTag(
  tags: string[] | undefined,
  title: string
): string[] | null {
  const cur = tags ?? [];
  return cur.includes(title) ? null : [...cur, title];
}

export function removePlotlineTag(
  tags: string[] | undefined,
  title: string
): string[] | null {
  const cur = tags ?? [];
  return cur.includes(title) ? cur.filter((t) => t !== title) : null;
}

/**
 * Rename a tag in place (position preserved). Collapses onto an existing
 * `newTitle` entry instead of duplicating it.
 */
export function renamePlotlineTag(
  tags: string[] | undefined,
  oldTitle: string,
  newTitle: string
): string[] | null {
  const cur = tags ?? [];
  if (oldTitle === newTitle || !cur.includes(oldTitle)) return null;
  const next = cur
    .map((t) => (t === oldTitle ? newTitle : t))
    .filter((t, i, arr) => arr.indexOf(t) === i);
  return next;
}

// --- Grid model ---------------------------------------------------------------

export interface PlotGridScene {
  title: string;
  path: string | null;
  chapter?: string;
  act?: string;
  plotlines?: string[];
  status?: SceneStatus;
  synopsis?: string;
  color?: string;
  inactive?: boolean;
}

export interface PlotGridRow {
  /** Stable identity for expand-state (chapter id, "unassigned", or `scene:<title>`). */
  key: string;
  label: string;
  kind: "chapter" | "planned" | "unassigned" | "scene";
  /** The `chapter` string a drop on this row writes ("" clears; undefined for scene rows). */
  chapterTitle?: string;
  /** All scenes in this row, manuscript order (drives expanded per-scene sub-rows). */
  scenes: PlotGridScene[];
  /** Aligned to `grid.columns`: this row's scenes tagged with each column's title. */
  cells: PlotGridScene[][];
}

export interface PlotGridActGroup {
  /** Act id, or "" for the tier-less group (panel skips the act header). */
  key: string;
  title: string;
  rows: PlotGridRow[];
  /** Aligned to `grid.columns`: scene count per column across the whole act
   *  (drives the collapsed-act presence dots). */
  counts: number[];
}

export interface PlotGrid {
  /** Configured plotlines (array order) followed by orphan ghost columns. */
  columns: Plotline[];
  /** How many leading `columns` entries are configured (the rest are orphans). */
  configuredCount: number;
  groups: PlotGridActGroup[];
  /** False = no chapter structure at all → one row per scene. */
  byChapter: boolean;
  /** Aligned to `columns`: scene count per column across the book (header badges). */
  totals: number[];
}

/**
 * Build the grid. `scenes` arrive in manuscript order; chapter/act rows derive
 * from the same Outline tree as Plan → Outline (config + scene strings), so the
 * two surfaces always agree on structure. Scene tags referencing no configured
 * plotline become orphan ghost columns (first-appearance order) — never
 * silently dropped.
 */
export function buildPlotGrid(
  scenes: PlotGridScene[],
  configured: Plotline[] | undefined,
  chapterConfig: StructureGroup[] | undefined,
  actConfig: StructureGroup[] | undefined
): PlotGrid {
  const cfg = configured ?? [];
  const cfgTitles = new Set(cfg.map((p) => p.title));
  const orphanTitles = distinctInOrder(scenes.flatMap((s) => s.plotlines ?? [])).filter(
    (t) => !cfgTitles.has(t)
  );
  const columns: Plotline[] = [
    ...cfg,
    ...orphanTitles.map((title) => ({ id: `${ORPHAN_PREFIX}${title}`, title })),
  ];

  const cellsFor = (rowScenes: PlotGridScene[]): PlotGridScene[][] =>
    columns.map((col) => rowScenes.filter((s) => (s.plotlines ?? []).includes(col.title)));

  const byTitle = new Map(scenes.map((s) => [s.title, s] as const));
  const tree = buildOutline(
    actConfig,
    chapterConfig,
    scenes.map((s) => ({ title: s.title, path: s.path, indent: 0, chapter: s.chapter, act: s.act }))
  );
  const hasChapters =
    tree.acts.some((a) => a.chapters.length > 0) || tree.looseChapters.length > 0;

  const groups: PlotGridActGroup[] = [];
  if (!hasChapters) {
    // Scene-row fallback: one tier-less group, one row per scene.
    const rows: PlotGridRow[] = scenes.map((s) => ({
      key: `scene:${s.title}`,
      label: s.title,
      kind: "scene",
      scenes: [s],
      cells: cellsFor([s]),
    }));
    groups.push({ key: "", title: "", rows, counts: countCells(rows, columns.length) });
  } else {
    const chapterRow = (id: string, title: string, refs: Array<{ title: string }>): PlotGridRow => {
      const rowScenes = refs
        .map((r) => byTitle.get(r.title))
        .filter((s): s is PlotGridScene => !!s);
      return {
        key: id,
        label: title,
        kind: rowScenes.length ? "chapter" : "planned",
        chapterTitle: title,
        scenes: rowScenes,
        cells: cellsFor(rowScenes),
      };
    };
    for (const act of tree.acts) {
      if (act.chapters.length === 0) continue; // config-only act with no chapters: nothing to show
      const rows = act.chapters.map((c) => chapterRow(c.id, c.title, c.scenes));
      groups.push({ key: act.id, title: act.title, rows, counts: countCells(rows, columns.length) });
    }
    const looseRows = tree.looseChapters.map((c) => chapterRow(c.id, c.title, c.scenes));
    if (tree.unassignedScenes.length > 0) {
      const rowScenes = tree.unassignedScenes
        .map((r) => byTitle.get(r.title))
        .filter((s): s is PlotGridScene => !!s);
      looseRows.push({
        key: "unassigned",
        label: "No chapter",
        kind: "unassigned",
        chapterTitle: "",
        scenes: rowScenes,
        cells: cellsFor(rowScenes),
      });
    }
    if (looseRows.length > 0) {
      groups.push({ key: "", title: "", rows: looseRows, counts: countCells(looseRows, columns.length) });
    }
  }

  const totals = columns.map((_, i) =>
    groups.reduce((sum, g) => sum + g.counts[i], 0)
  );

  return { columns, configuredCount: cfg.length, groups, byChapter: hasChapters, totals };
}

function countCells(rows: PlotGridRow[], cols: number): number[] {
  const counts = new Array<number>(cols).fill(0);
  for (const row of rows) row.cells.forEach((cell, i) => (counts[i] += cell.length));
  return counts;
}
