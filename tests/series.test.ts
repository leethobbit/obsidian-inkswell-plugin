import { describe, expect, it } from "vitest";
import { groupIntoSeries, projectSeries, readSeriesInfo, shelfMetaText } from "../src/series/series";
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
  it("accepts a named series, optional positive integer order", () => {
    expect(readSeriesInfo({ name: "Saga", order: 2 })).toEqual({ name: "Saga", order: 2 });
    expect(readSeriesInfo({ name: "Saga" })).toEqual({ name: "Saga" });
  });

  it("trims the name and drops invalid orders", () => {
    expect(readSeriesInfo({ name: "  Saga  ", order: 0 })).toEqual({ name: "Saga" });
    expect(readSeriesInfo({ name: "Saga", order: -1 })).toEqual({ name: "Saga" });
    expect(readSeriesInfo({ name: "Saga", order: 1.7 })).toEqual({ name: "Saga", order: 1 });
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
