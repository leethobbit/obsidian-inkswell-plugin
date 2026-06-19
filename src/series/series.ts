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
