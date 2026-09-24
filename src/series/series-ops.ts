/**
 * Pure series operations (Obsidian-free, tested): the next free book number and
 * the write plans behind "Rename series" and "Reorder books". A series is
 * implicit — the set of books whose `inkswell.series.name` matches — so every
 * series-level action is a batch of per-book (and per-codex-entity) frontmatter
 * writes. These planners decide WHAT to write; src/series/series-actions.ts
 * does the writing.
 */

import { Project, SeriesInfo } from "../projects/types";
import { projectSeries } from "./series";

/** One index note to rewrite with a new `inkswell.series` value. */
export interface SeriesWrite {
  indexPath: string;
  info: SeriesInfo;
}

/**
 * The number a book joining `books` should get: one past the highest existing
 * number (1 for an empty or wholly unnumbered series). Gaps are not filled — a
 * missing "3" usually means the author is still writing it.
 */
export function nextBookOrder(books: readonly Project[]): number {
  let max = 0;
  for (const b of books) {
    const o = projectSeries(b)?.order;
    if (o != null && o > max) max = o;
  }
  return max + 1;
}

/** A codex note and its `codex-series` value (undefined = not series-scoped). */
export interface ScopedEntityRef {
  path: string;
  series?: string;
}

export interface SeriesRenamePlan {
  /**
   * Every project (any draft) carrying the old name, order preserved. Sibling
   * drafts byte-copy the tag; an inert stale copy left behind would resurrect the
   * old series the day the base draft is deleted, so all of them are rewritten.
   */
  books: SeriesWrite[];
  /** Codex notes whose `codex-series` names the old series. */
  entities: string[];
  /** True when a series named `to` already exists — the rename is a merge. */
  mergesInto: boolean;
}

/** Plan a rename of series `from` → `to`. An empty or unchanged target plans nothing. */
export function planSeriesRename(
  projects: readonly Project[],
  entities: readonly ScopedEntityRef[],
  from: string,
  to: string
): SeriesRenamePlan {
  const target = to.trim();
  if (!target || target === from) return { books: [], entities: [], mergesInto: false };
  const books: SeriesWrite[] = [];
  let mergesInto = false;
  for (const p of projects) {
    const info = projectSeries(p);
    if (!info) continue;
    if (info.name === from) {
      books.push({ indexPath: p.vaultPath, info: { name: target, order: info.order } });
    } else if (info.name === target) {
      mergesInto = true;
    }
  }
  return {
    books,
    entities: entities.filter((e) => e.series === from).map((e) => e.path),
    mergesInto,
  };
}

/**
 * Renumber `books` 1..n in the order `orderedPaths` lists them. Every listed
 * book is rewritten — so duplicate or missing numbers are repaired as a side
 * effect. Paths that aren't series members are skipped.
 */
export function planReorder(
  books: readonly Project[],
  orderedPaths: readonly string[]
): SeriesWrite[] {
  const out: SeriesWrite[] = [];
  orderedPaths.forEach((path, i) => {
    const book = books.find((b) => b.vaultPath === path);
    const info = book ? projectSeries(book) : null;
    if (!book || !info) return;
    out.push({ indexPath: book.vaultPath, info: { name: info.name, order: i + 1 } });
  });
  return out;
}
