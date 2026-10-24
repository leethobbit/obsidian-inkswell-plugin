import { describe, expect, it } from "vitest";
import {
  groupIntoSeries,
  normalizeSeriesOrder,
  orderSeries,
  partitionArchived,
  projectSeries,
  readSeriesInfo,
  renameInOrder,
  shelfMetaText,
} from "../src/series/series";
import { Project, SeriesInfo } from "../src/projects/types";

function project(title: string, series?: Partial<SeriesInfo> | null): Project {
  return {
    vaultPath: `${title}.md`,
    draft: {
      format: "single",
      title,
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
    },
    scenes: [],
    unknownFiles: [],
    inkswell: series ? { series: series as SeriesInfo } : null,
  };
}

describe("readSeriesInfo", () => {
  it("accepts a named series, optional order", () => {
    expect(readSeriesInfo({ name: "Saga", order: 2 })).toEqual({ name: "Saga", order: 2 });
    expect(readSeriesInfo({ name: "Saga" })).toEqual({ name: "Saga" });
  });

  it("keeps 0 and fractional orders as written (prequels, novellas — #47)", () => {
    expect(readSeriesInfo({ name: "Saga", order: 0 })).toEqual({ name: "Saga", order: 0 });
    expect(readSeriesInfo({ name: "Saga", order: 0.5 })).toEqual({ name: "Saga", order: 0.5 });
    expect(readSeriesInfo({ name: "Saga", order: 1.5 })).toEqual({ name: "Saga", order: 1.5 });
  });

  it("trims the name and drops invalid orders", () => {
    expect(readSeriesInfo({ name: "  Saga  ", order: 2 })).toEqual({ name: "Saga", order: 2 });
    expect(readSeriesInfo({ name: "Saga", order: -1 })).toEqual({ name: "Saga" });
    expect(readSeriesInfo({ name: "Saga", order: Infinity })).toEqual({ name: "Saga" });
    expect(readSeriesInfo({ name: "Saga", order: "x" })).toEqual({ name: "Saga" });
  });

  it("rejects missing/blank/non-object values", () => {
    expect(readSeriesInfo(null)).toBeNull();
    expect(readSeriesInfo({})).toBeNull();
    expect(readSeriesInfo({ name: "   " })).toBeNull();
    expect(readSeriesInfo("Saga")).toBeNull();
  });
});

describe("groupIntoSeries", () => {
  it("separates series members from standalone projects", () => {
    const { series, standalone } = groupIntoSeries([
      project("Book A", { name: "Saga", order: 1 }),
      project("Solo"),
      project("Book B", { name: "Saga", order: 2 }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].name).toBe("Saga");
    expect(series[0].books.map((b) => b.draft.title)).toEqual(["Book A", "Book B"]);
    expect(standalone.map((p) => p.draft.title)).toEqual(["Solo"]);
  });

  it("orders books by order, then unordered ones by title", () => {
    const { series } = groupIntoSeries([
      project("Zed", { name: "Saga" }),
      project("Alpha", { name: "Saga" }),
      project("Second", { name: "Saga", order: 2 }),
      project("First", { name: "Saga", order: 1 }),
    ]);
    expect(series[0].books.map((b) => b.draft.title)).toEqual([
      "First",
      "Second",
      "Alpha",
      "Zed",
    ]);
  });

  it("sorts multiple series by name", () => {
    const { series } = groupIntoSeries([
      project("X", { name: "Zeta" }),
      project("Y", { name: "Alpha" }),
    ]);
    expect(series.map((s) => s.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("treats a blank series name as standalone", () => {
    const { series, standalone } = groupIntoSeries([project("Book", { name: "   " })]);
    expect(series).toHaveLength(0);
    expect(standalone).toHaveLength(1);
  });
});

describe("projectSeries", () => {
  it("reads validated series info off a project", () => {
    expect(projectSeries(project("B", { name: "Saga", order: 3 }))).toEqual({
      name: "Saga",
      order: 3,
    });
    expect(projectSeries(project("B"))).toBeNull();
  });
});

describe("shelfMetaText", () => {
  it("counts books only when word counts are hidden", () => {
    expect(shelfMetaText([{ words: 5, target: 10 }], false)).toBe("1 book");
    expect(shelfMetaText([{ words: 5 }, { words: 6 }], false)).toBe("2 books");
  });

  it("shows total words with no progress when no book has a target", () => {
    expect(shelfMetaText([{ words: 1000 }, { words: 2000, target: 0 }], true)).toBe(
      `2 books · ${(3000).toLocaleString()} words`
    );
  });

  it("measures progress over targeted books only when some lack a target (#44 588%)", () => {
    const text = shelfMetaText(
      [{ words: 21040, target: 60000 }, { words: 200000 }, { words: 132372 }],
      true
    );
    expect(text).toBe(
      `3 books · ${(353412).toLocaleString()} words · ${(21040).toLocaleString()} / ${(60000).toLocaleString()} targeted (35%)`
    );
  });

  it("uses the plain form when every book has a target", () => {
    expect(
      shelfMetaText([{ words: 30000, target: 60000 }, { words: 30000, target: 60000 }], true)
    ).toBe(`2 books · ${(60000).toLocaleString()} words / ${(120000).toLocaleString()} (50%)`);
  });
});

describe("series shelf order (#57)", () => {
  const s = (...names: string[]) => names.map((name) => ({ name }));

  it("puts saved names first, case-insensitively; the rest keep their order", () => {
    expect(orderSeries(s("Alpha", "Beta", "Gamma", "Delta"), ["gamma", "Alpha"]).map((x) => x.name)).toEqual([
      "Gamma",
      "Alpha",
      "Beta",
      "Delta",
    ]);
    expect(orderSeries(s("Alpha", "Beta"), []).map((x) => x.name)).toEqual(["Alpha", "Beta"]);
    // A saved name with no series (all its books left) is simply skipped.
    expect(orderSeries(s("Beta"), ["Gone", "Beta"]).map((x) => x.name)).toEqual(["Beta"]);
  });

  it("normalizes the stored list", () => {
    expect(normalizeSeriesOrder([" Saga ", "saga", "", 3, "Other"])).toEqual(["Saga", "Other"]);
    expect(normalizeSeriesOrder("Saga")).toEqual([]);
    expect(normalizeSeriesOrder(undefined)).toEqual([]);
  });

  it("a rename keeps the slot; a merge drops the old name", () => {
    expect(renameInOrder(["A", "B", "C"], "B", "Bee")).toEqual(["A", "Bee", "C"]);
    expect(renameInOrder(["A", "B", "C"], "b", "B2")).toEqual(["A", "B2", "C"]);
    expect(renameInOrder(["A", "B", "C"], "B", "c")).toEqual(["A", "C"]);
    expect(renameInOrder(["A", "B"], "B", "b")).toEqual(["A", "b"]); // case-only rename
    expect(renameInOrder(["A"], "Z", "Y")).toBeNull();
  });
});

describe("partitionArchived (Home shelves, archive = out of sight)", () => {
  const archivedBook = (title: string, series?: Partial<SeriesInfo> | null): Project => {
    const p = project(title, series);
    return { ...p, inkswell: { ...(p.inkswell ?? {}), archived: true } };
  };
  const isArchived = (p: Project) => p.inkswell?.archived === true;

  it("with nothing archived, every shelf stays live", () => {
    const grouped = groupIntoSeries([project("A", { name: "S", order: 1 }), project("Solo")]);
    const out = partitionArchived(grouped, isArchived);
    expect(out.series.map((s) => s.name)).toEqual(["S"]);
    expect(out.standalone.map((p) => p.draft.title)).toEqual(["Solo"]);
    expect(out.archivedSeries).toEqual([]);
    expect(out.archivedStandalone).toEqual([]);
  });

  it("a partially archived series keeps its shelf, with every book (order + totals stay truthful)", () => {
    const grouped = groupIntoSeries([
      project("One", { name: "S", order: 1 }),
      archivedBook("Two", { name: "S", order: 2 }),
      project("Three", { name: "S", order: 3 }),
    ]);
    const out = partitionArchived(grouped, isArchived);
    expect(out.series[0].books.map((b) => b.draft.title)).toEqual(["One", "Two", "Three"]);
    expect(out.archivedSeries).toEqual([]);
  });

  it("a fully archived series moves to the archived side whole", () => {
    const grouped = groupIntoSeries([
      archivedBook("One", { name: "Done", order: 1 }),
      archivedBook("Two", { name: "Done", order: 2 }),
      project("Live", { name: "Ongoing", order: 1 }),
    ]);
    const out = partitionArchived(grouped, isArchived);
    expect(out.series.map((s) => s.name)).toEqual(["Ongoing"]);
    expect(out.archivedSeries.map((s) => s.name)).toEqual(["Done"]);
    expect(out.archivedSeries[0].books).toHaveLength(2);
  });

  it("archived standalone books leave the Standalone shelf", () => {
    const out = partitionArchived(groupIntoSeries([project("Live"), archivedBook("Trunk")]), isArchived);
    expect(out.standalone.map((p) => p.draft.title)).toEqual(["Live"]);
    expect(out.archivedStandalone.map((p) => p.draft.title)).toEqual(["Trunk"]);
  });
});
