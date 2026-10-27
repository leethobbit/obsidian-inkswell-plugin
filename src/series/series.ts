/**
 * Series grouping (pure, Obsidian-free, tested). A "series" is just the set of
 * projects (books) whose `inkswell.series.name` matches. There is no series note
 * or database — membership lives in each book's frontmatter, and the codex is
 * already vault-wide (shared across all books for free).
 */

import { Project, SeriesInfo } from "../projects/types";

export interface Series {
  name: string;
  /** Member books, ordered by `series.order` then title. */
  books: Project[];
}

/** Validate/coerce a raw `inkswell.series` value into SeriesInfo, or null. */
export function readSeriesInfo(raw: unknown): SeriesInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  // 0 and fractions are real series conventions (a "Book 0" prequel, a
  // "Book 1.5" novella), so any finite number ≥ 0 is kept as written.
  const order =
    typeof r.order === "number" && Number.isFinite(r.order) && r.order >= 0
      ? r.order
      : undefined;
  return { name, order };
}

/** A project's series membership, if any. */
export function projectSeries(project: Project): SeriesInfo | null {
  return readSeriesInfo(project.inkswell?.series);
}

/**
 * Partition projects into named series (each with ordered books) and standalone
 * projects. Series are sorted by name; books within a series by order then title.
 */
export function groupIntoSeries(projects: Project[]): {
  series: Series[];
  standalone: Project[];
} {
  const map = new Map<string, Project[]>();
  const standalone: Project[] = [];

  for (const p of projects) {
    const info = projectSeries(p);
    if (!info) {
      standalone.push(p);
      continue;
    }
    const list = map.get(info.name) ?? [];
    list.push(p);
    map.set(info.name, list);
  }

  const series: Series[] = [];
  for (const [name, books] of map) {
    books.sort((a, b) => {
      const oa = projectSeries(a)?.order ?? Infinity;
      const ob = projectSeries(b)?.order ?? Infinity;
      if (oa !== ob) return oa - ob;
      return a.draft.title.localeCompare(b.draft.title);
    });
    series.push({ name, books });
  }
  series.sort((a, b) => a.name.localeCompare(b.name));

  return { series, standalone };
}

/** Home's shelves split by archive state (see {@link partitionArchived}). */
export interface ArchivePartition {
  /** Live series shelves — the books to SHOW (see `hideInSeries`). */
  series: Series[];
  standalone: Project[];
  /** Archived series shelves: a fully archived series whole, or (with
   *  `hideInSeries`) a live series' archived books under its name. */
  archivedSeries: Series[];
  archivedStandalone: Project[];
}

/**
 * Split grouped shelves by archive state, AFTER grouping (so series order and
 * book numbering still see every book). A fully archived series moves to the
 * archived side whole. A partially archived one either keeps its archived
 * books in place (Home dims them — order and shelf totals stay truthful) or,
 * with `hideInSeries` (the "Hide archived books from their series" setting —
 * short stories archived once they're out), splits: its live books stay on the
 * shelf and its archived books move to the archived side under the series
 * name. The returned Series objects are DISPLAY lists — callers that act on
 * the whole series (new book numbering, reorder, rename) must use the full
 * series from the grouping, never these. Pure.
 */
export function partitionArchived(
  grouped: { series: Series[]; standalone: Project[] },
  isArchived: (p: Project) => boolean,
  hideInSeries = false
): ArchivePartition {
  const out: ArchivePartition = { series: [], standalone: [], archivedSeries: [], archivedStandalone: [] };
  for (const s of grouped.series) {
    const archived = s.books.filter(isArchived);
    if (archived.length === 0) out.series.push(s);
    else if (archived.length === s.books.length) out.archivedSeries.push(s);
    else if (!hideInSeries) out.series.push(s);
    else {
      out.series.push({ name: s.name, books: s.books.filter((b) => !isArchived(b)) });
      out.archivedSeries.push({ name: s.name, books: archived });
    }
  }
  for (const p of grouped.standalone) {
    (isArchived(p) ? out.archivedStandalone : out.standalone).push(p);
  }
  return out;
}

/** A series name as series match it: trimmed, case-insensitive. */
const seriesKey = (name: string): string => name.trim().toLowerCase();

/**
 * Home's series order (#57): names in the writer's saved `order` first, then
 * the rest in the order given (alphabetical, from `groupIntoSeries`). Matched
 * case-insensitively, like series membership. Pure; returns a new array.
 */
export function orderSeries<T extends { name: string }>(series: readonly T[], order: readonly string[]): T[] {
  const rank = new Map<string, number>();
  order.forEach((name, i) => {
    const k = seriesKey(name);
    if (!rank.has(k)) rank.set(k, i);
  });
  const at = (s: T): number => rank.get(seriesKey(s.name)) ?? Number.POSITIVE_INFINITY;
  return series
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const ra = at(a.s);
      const rb = at(b.s);
      if (ra !== rb) return ra < rb ? -1 : 1;
      return a.i - b.i;
    })
    .map((x) => x.s);
}

/**
 * The reserved `settings.seriesOrder` entry for Home's Standalone shelf (#67).
 * A control character leads it, so no series name — typed text — can collide.
 * Series sorting ignores it (no series matches); only {@link orderShelves} reads it.
 */
export const STANDALONE_SHELF = "\u0000standalone";

/** One live shelf on Home, in the writer's order. */
export type Shelf<T> = { kind: "series"; series: T } | { kind: "standalone" };

/**
 * Home's shelves in the writer's order (#67): the series, plus the Standalone
 * shelf when there is one. Listed entries (series names case-insensitively,
 * the {@link STANDALONE_SHELF} token exactly) come first in saved order; the
 * rest follow in the order given, with an unlisted Standalone last — so a vault
 * that never reordered looks exactly as before. Pure.
 */
export function orderShelves<T extends { name: string }>(
  series: readonly T[],
  hasStandalone: boolean,
  order: readonly string[]
): Shelf<T>[] {
  const rank = new Map<string, number>();
  order.forEach((name, i) => {
    const k = name === STANDALONE_SHELF ? STANDALONE_SHELF : seriesKey(name);
    if (!rank.has(k)) rank.set(k, i);
  });
  const items: { shelf: Shelf<T>; key: string; base: number }[] = series.map((s, i) => ({
    shelf: { kind: "series" as const, series: s },
    key: seriesKey(s.name),
    base: i,
  }));
  if (hasStandalone) {
    items.push({ shelf: { kind: "standalone" }, key: STANDALONE_SHELF, base: Number.POSITIVE_INFINITY });
  }
  const at = (key: string): number => rank.get(key) ?? Number.POSITIVE_INFINITY;
  return items
    .sort((a, b) => {
      const ra = at(a.key);
      const rb = at(b.key);
      if (ra !== rb) return ra < rb ? -1 : 1;
      return a.base - b.base;
    })
    .map((x) => x.shelf);
}

/** `settings.seriesOrder` as stored (data.json is hand-editable and synced):
 *  trimmed non-empty strings, case-insensitive repeats dropped. */
export function normalizeSeriesOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string" || !v.trim()) continue;
    const k = seriesKey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

/**
 * A series rename keeps its shelf's place: `from` becomes `to` in the order.
 * Renaming onto a series already listed (a merge) drops `from` instead.
 * Returns null when the order doesn't list `from`.
 */
export function renameInOrder(order: readonly string[], from: string, to: string): string[] | null {
  const at = order.findIndex((n) => seriesKey(n) === seriesKey(from));
  if (at < 0 || !to.trim()) return null;
  const merges = seriesKey(from) !== seriesKey(to) && order.some((n) => seriesKey(n) === seriesKey(to));
  if (merges) return order.filter((_, i) => i !== at);
  const next = [...order];
  next[at] = to.trim();
  return next;
}

/** One book's contribution to a shelf header: its words and (story-level) target, if any. */
export interface ShelfBook {
  words: number;
  target?: number;
}

/**
 * The shelf header line: "N books · X words", plus progress toward the targets.
 * Progress counts ONLY the words of books that have a target — summing every
 * book's words over a partial target set inflated it (one 60k target on a 353k
 * series read "588%", #44). When only some books are targeted the progress is
 * labelled "targeted" so the two numbers aren't mistaken for one.
 */
export function shelfMetaText(books: ShelfBook[], showWords: boolean): string {
  const n = books.length;
  let text = `${n} book${n === 1 ? "" : "s"}`;
  if (!showWords) return text;

  let words = 0;
  let targetedWords = 0;
  let target = 0;
  let targeted = 0;
  for (const b of books) {
    words += b.words;
    if (typeof b.target === "number" && b.target > 0) {
      target += b.target;
      targetedWords += b.words;
      targeted++;
    }
  }
  text += ` · ${words.toLocaleString()} words`;
  if (target === 0) return text;

  const pct = Math.round((targetedWords / target) * 100);
  if (targeted === n) return `${text} / ${target.toLocaleString()} (${pct}%)`;
  return `${text} · ${targetedWords.toLocaleString()} / ${target.toLocaleString()} targeted (${pct}%)`;
}
