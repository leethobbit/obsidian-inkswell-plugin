/**
 * Pure planning for Write → Stream: which scenes the stream shows (a filter),
 * where its chapters start (jump targets), and how tall an unrendered scene
 * probably is (so a 200k-word book can be scrolled without drawing it all).
 * Obsidian-free and DOM-free; the view lives in `src/views/stream/`.
 */

import { linkTarget } from "../codex/codex";

/** What the stream can be narrowed by. */
export type StreamField = "chapter" | "pov" | "plotline" | "character" | "status";

export interface StreamFilter {
  field: StreamField;
  /** A chapter run id for "chapter", the plain value otherwise. */
  value: string;
}

/** One scene of the book, with the fields the stream filters and groups by. */
export interface StreamRow {
  path: string;
  title: string;
  /** The chapter run this scene belongs to, if any. */
  run: { id: string; title: string } | null;
  pov?: string;
  plotlines?: string[];
  /** As stored: wikilinks ("[[Anna]]") or plain names. */
  characters?: string[];
  status?: string;
}

/** A value the filter can take, with the label the picker shows. */
export interface FilterOption {
  value: string;
  label: string;
}

const norm = (s: string): string => s.trim().toLowerCase();

function fieldValues(row: StreamRow, field: StreamField): string[] {
  switch (field) {
    case "chapter":
      return row.run ? [row.run.id] : [];
    case "pov":
      return row.pov?.trim() ? [row.pov.trim()] : [];
    case "plotline":
      return (row.plotlines ?? []).map((p) => p.trim()).filter(Boolean);
    case "character":
      return (row.characters ?? []).map(linkTarget).filter(Boolean);
    case "status":
      return row.status ? [row.status] : [];
  }
}

/** Whether `row` passes `filter` (no filter passes everything). Case-insensitive. */
export function rowMatches(row: StreamRow, filter: StreamFilter | null): boolean {
  if (!filter) return true;
  const want = norm(filter.value);
  return fieldValues(row, filter.field).some((v) => norm(v) === want);
}

/** The rows `filter` keeps, in manuscript order. */
export function applyFilter(rows: readonly StreamRow[], filter: StreamFilter | null): StreamRow[] {
  return rows.filter((r) => rowMatches(r, filter));
}

/**
 * Every value `field` takes across `rows`, for the filter's value picker.
 * Chapters come in manuscript order (a repeated chapter title gets a "(2)");
 * everything else alphabetically, merging case variants under the first spelling.
 */
export function filterOptions(rows: readonly StreamRow[], field: StreamField): FilterOption[] {
  if (field === "chapter") {
    const out: FilterOption[] = [];
    const seenIds = new Set<string>();
    const titleCount = new Map<string, number>();
    for (const r of rows) {
      if (!r.run || seenIds.has(r.run.id)) continue;
      seenIds.add(r.run.id);
      const n = (titleCount.get(r.run.title) ?? 0) + 1;
      titleCount.set(r.run.title, n);
      out.push({ value: r.run.id, label: n > 1 ? `${r.run.title} (${n})` : r.run.title });
    }
    return out;
  }
  const byKey = new Map<string, string>();
  for (const r of rows) {
    for (const v of fieldValues(r, field)) if (!byKey.has(norm(v))) byKey.set(norm(v), v);
  }
  return [...byKey.values()]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

/** Where a chapter begins in the stream: the first shown scene of each run. */
export interface ChapterStop {
  runId: string;
  title: string;
  path: string;
}

/**
 * The chapter starts among `rows` (already filtered), in order. A run that a
 * filter splits into pieces still gets one stop, at its first shown scene.
 */
export function chapterStops(rows: readonly StreamRow[]): ChapterStop[] {
  const out: ChapterStop[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.run || seen.has(r.run.id)) continue;
    seen.add(r.run.id);
    out.push({ runId: r.run.id, title: r.run.title, path: r.path });
  }
  return out;
}

/**
 * The chapter stop after (`dir` 1) or before (-1) the scene at `path`. "Before"
 * from mid-chapter means this chapter's own start, as a book's back button
 * would; null at either end or when `path` isn't shown.
 */
export function chapterStep(rows: readonly StreamRow[], path: string, dir: 1 | -1): string | null {
  const at = rows.findIndex((r) => r.path === path);
  if (at === -1) return null;
  const stops = chapterStops(rows);
  const index = new Map(rows.map((r, i) => [r.path, i] as const));
  if (dir === 1) return stops.find((s) => (index.get(s.path) ?? -1) > at)?.path ?? null;
  // The last start before here: this chapter's own start from mid-chapter, the
  // previous chapter's from a chapter's first scene.
  const before = stops.filter((s) => (index.get(s.path) ?? Infinity) < at);
  return before.length ? before[before.length - 1].path : null;
}

/** The shown scene next to `path` (`dir` 1 = after), or null at an end. */
export function neighbour(rows: readonly StreamRow[], path: string, dir: 1 | -1): string | null {
  const at = rows.findIndex((r) => r.path === path);
  if (at === -1) return null;
  return rows[at + dir]?.path ?? null;
}

// --- Height estimates ------------------------------------------------------------
// An unrendered scene is a placeholder as tall as its text probably is, so the
// scrollbar is roughly right and a jump lands roughly in place. The ratio is
// learned from scenes that have been drawn.

/** Pixels per character of scene text before anything has been measured. */
export const DEFAULT_PX_PER_CHAR = 0.35;
/** The shortest placeholder (an empty scene still has a line). */
const MIN_PLACEHOLDER_PX = 40;

/** A placeholder height for a scene of `chars` characters. */
export function estimateHeight(chars: number, pxPerChar: number): number {
  return Math.max(MIN_PLACEHOLDER_PX, Math.round(chars * pxPerChar));
}

/** Learned pixels-per-character from drawn scenes, or null with nothing usable yet. */
export function calibrate(samples: readonly { chars: number; px: number }[]): number | null {
  let chars = 0;
  let px = 0;
  for (const s of samples) {
    if (s.chars <= 0 || s.px <= 0) continue;
    chars += s.chars;
    px += s.px;
  }
  return chars > 0 ? px / chars : null;
}
