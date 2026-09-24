import { describe, expect, it } from "vitest";
import { nextBookOrder, planReorder, planSeriesRename } from "../src/series/series-ops";
import { Project, SeriesInfo } from "../src/projects/types";

function project(title: string, series?: Partial<SeriesInfo> | null, path = `${title}.md`): Project {
  return {
    vaultPath: path,
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

describe("nextBookOrder", () => {
  it("is 1 for an empty or wholly unnumbered series", () => {
    expect(nextBookOrder([])).toBe(1);
    expect(nextBookOrder([project("A", { name: "S" })])).toBe(1);
  });

  it("is one past the highest number, without filling gaps", () => {
    const books = [
      project("A", { name: "S", order: 1 }),
      project("C", { name: "S", order: 4 }),
      project("D", { name: "S" }),
    ];
    expect(nextBookOrder(books)).toBe(5);
  });
});

describe("planSeriesRename", () => {
  const projects = [
    project("A", { name: "Old", order: 1 }),
    project("A", { name: "Old", order: 1 }, "A/Draft 2/A.md"), // byte-copied sibling draft
    project("B", { name: "Old", order: 2 }),
    project("C", { name: "Other", order: 1 }),
    project("D", null),
  ];
  const entities = [
    { path: "codex/Mara.md", series: "Old" },
    { path: "codex/Elsewhere.md", series: "Other" },
    { path: "codex/Global.md" },
  ];

  it("rewrites every draft carrying the old name, preserving order, plus matching codex entities", () => {
    const plan = planSeriesRename(projects, entities, "Old", "New");
    expect(plan.books).toEqual([
      { indexPath: "A.md", info: { name: "New", order: 1 } },
      { indexPath: "A/Draft 2/A.md", info: { name: "New", order: 1 } },
      { indexPath: "B.md", info: { name: "New", order: 2 } },
    ]);
    expect(plan.entities).toEqual(["codex/Mara.md"]);
    expect(plan.mergesInto).toBe(false);
  });

  it("trims the target and flags a merge when the target series already exists", () => {
    const plan = planSeriesRename(projects, entities, "Old", "  Other ");
    expect(plan.mergesInto).toBe(true);
    expect(plan.books.every((b) => b.info.name === "Other")).toBe(true);
    expect(plan.books).toHaveLength(3);
  });

  it("plans nothing for a blank or unchanged name", () => {
    expect(planSeriesRename(projects, entities, "Old", "   ")).toEqual({
      books: [],
      entities: [],
      mergesInto: false,
    });
    expect(planSeriesRename(projects, entities, "Old", "Old").books).toEqual([]);
  });
});

describe("planReorder", () => {
  it("renumbers 1..n in the given order, repairing duplicates and gaps", () => {
    const books = [
      project("A", { name: "S", order: 1 }),
      project("B", { name: "S", order: 1 }),
      project("C", { name: "S" }),
    ];
    expect(planReorder(books, ["C.md", "A.md", "B.md"])).toEqual([
      { indexPath: "C.md", info: { name: "S", order: 1 } },
      { indexPath: "A.md", info: { name: "S", order: 2 } },
      { indexPath: "B.md", info: { name: "S", order: 3 } },
    ]);
  });

  it("skips paths that aren't series members", () => {
    const books = [project("A", { name: "S", order: 1 }), project("Z", null)];
    expect(planReorder(books, ["Z.md", "A.md", "missing.md"])).toEqual([
      { indexPath: "A.md", info: { name: "S", order: 2 } },
    ]);
  });
});
