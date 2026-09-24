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
  const order =
    typeof r.order === "number" && Number.isFinite(r.order) && r.order > 0
      ? Math.floor(r.order)
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
