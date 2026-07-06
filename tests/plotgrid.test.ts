import { describe, expect, it } from "vitest";
import {
  Plotline,
  PlotGridScene,
  addPlotlineTag,
  buildPlotGrid,
  isOrphanPlotline,
  movePlotline,
  removePlotline,
  removePlotlineTag,
  renamePlotlineConfig,
  renamePlotlineTag,
  upsertPlotline,
} from "../src/outliner/plotgrid";

const PL: Plotline[] = [
  { id: "pl-1", title: "Main", color: "#e05252" },
  { id: "pl-2", title: "Romance" },
];

function scene(partial: Partial<PlotGridScene> & { title: string }): PlotGridScene {
  return { path: `Book/${partial.title}.md`, ...partial };
}

describe("upsertPlotline", () => {
  it("appends a new plotline with a minted id", () => {
    const next = upsertPlotline(undefined, { title: "Mystery" });
    expect(next).toHaveLength(1);
    expect(next[0].id).toMatch(/^pl-/);
    expect(next[0]).toMatchObject({ title: "Mystery" });
  });

  it("matches by id (rename keeps the color)", () => {
    const next = upsertPlotline(PL, { id: "pl-1", title: "A plot" });
    expect(next[0]).toEqual({ id: "pl-1", title: "A plot", color: "#e05252" });
    expect(next).toHaveLength(2);
  });

  it("matches by title (recolor keeps the id) and clears color on empty string", () => {
    const recolored = upsertPlotline(PL, { title: "Main", color: "#00ff00" });
    expect(recolored[0]).toEqual({ id: "pl-1", title: "Main", color: "#00ff00" });
    const cleared = upsertPlotline(PL, { title: "Main", color: "" });
    expect(cleared[0]).toEqual({ id: "pl-1", title: "Main" });
  });
});

describe("removePlotline / movePlotline", () => {
  it("drops by id and no-ops for unknown ids", () => {
    expect(removePlotline(PL, "pl-1").map((p) => p.title)).toEqual(["Romance"]);
    expect(removePlotline(PL, "nope")).toEqual(PL);
  });

  it("moves relative to an anchor (before / after)", () => {
    const three = [...PL, { id: "pl-3", title: "Mystery" }];
    expect(movePlotline(three, "pl-3", "pl-1", false).map((p) => p.id)).toEqual([
      "pl-3",
      "pl-1",
      "pl-2",
    ]);
    expect(movePlotline(three, "pl-1", "pl-3", true).map((p) => p.id)).toEqual([
      "pl-2",
      "pl-3",
      "pl-1",
    ]);
  });

  it("appends when the anchor is null/absent", () => {
    expect(movePlotline(PL, "pl-1", null).map((p) => p.id)).toEqual(["pl-2", "pl-1"]);
  });

  it("returns the SAME reference when nothing moves (caller skips the write)", () => {
    expect(movePlotline(PL, "nope", "pl-1")).toBe(PL);
    expect(movePlotline(PL, "pl-1", "pl-1")).toBe(PL);
    expect(movePlotline(PL, "pl-2", "pl-1", true)).toBe(PL); // already in place
  });
});

describe("renamePlotlineConfig", () => {
  it("rewrites the matching entry's title, keeping id and color", () => {
    expect(renamePlotlineConfig(PL, "Main", "A plot")).toEqual([
      { id: "pl-1", title: "A plot", color: "#e05252" },
      { id: "pl-2", title: "Romance" },
    ]);
  });

  it("returns null when nothing matches or titles are equal", () => {
    expect(renamePlotlineConfig(PL, "Nope", "X")).toBeNull();
    expect(renamePlotlineConfig(PL, "Main", "Main")).toBeNull();
    expect(renamePlotlineConfig(undefined, "Main", "X")).toBeNull();
  });
});

describe("tag ops", () => {
  it("addPlotlineTag appends, and returns null when already present", () => {
    expect(addPlotlineTag(undefined, "Main")).toEqual(["Main"]);
    expect(addPlotlineTag(["Main"], "Romance")).toEqual(["Main", "Romance"]);
    expect(addPlotlineTag(["Main"], "Main")).toBeNull();
  });

  it("removePlotlineTag filters, and returns null when absent", () => {
    expect(removePlotlineTag(["Main", "Romance"], "Main")).toEqual(["Romance"]);
    expect(removePlotlineTag(["Main"], "Romance")).toBeNull();
    expect(removePlotlineTag(undefined, "Main")).toBeNull();
  });

  it("renamePlotlineTag renames in place and dedupes on collision", () => {
    expect(renamePlotlineTag(["A", "B"], "A", "Z")).toEqual(["Z", "B"]);
    // Renaming onto an already-present title collapses to one entry.
    expect(renamePlotlineTag(["A", "B"], "A", "B")).toEqual(["B"]);
    expect(renamePlotlineTag(["A"], "X", "Z")).toBeNull();
    expect(renamePlotlineTag(["A"], "A", "A")).toBeNull();
  });
});

describe("buildPlotGrid", () => {
  const scenes: PlotGridScene[] = [
    scene({ title: "S1", chapter: "One", act: "Act I", plotlines: ["Main"] }),
    scene({ title: "S2", chapter: "One", act: "Act I", plotlines: ["Main", "Romance"] }),
    scene({ title: "S3", chapter: "Two", act: "Act I", plotlines: ["Romance"] }),
    scene({ title: "S4", chapter: "Three", act: "Act II" }),
    scene({ title: "S5", plotlines: ["Ghost"] }), // no chapter + orphan tag
  ];
  const chapterCfg = [
    { id: "c-1", title: "One" },
    { id: "c-9", title: "Nine" }, // planned: no scene yet
  ];

  it("orders columns as configured then orphans, with totals", () => {
    const grid = buildPlotGrid(scenes, PL, chapterCfg, undefined);
    expect(grid.columns.map((c) => c.title)).toEqual(["Main", "Romance", "Ghost"]);
    expect(grid.configuredCount).toBe(2);
    expect(isOrphanPlotline(grid.columns[2])).toBe(true);
    expect(grid.totals).toEqual([2, 2, 1]);
  });

  it("groups chapter rows under acts, appending loose/planned/unassigned in a tier-less group", () => {
    const grid = buildPlotGrid(scenes, PL, chapterCfg, [{ id: "a-1", title: "Act I" }]);
    expect(grid.byChapter).toBe(true);
    expect(grid.groups.map((g) => g.title)).toEqual(["Act I", "Act II", ""]);
    expect(grid.groups[0].rows.map((r) => r.label)).toEqual(["One", "Two"]);
    expect(grid.groups[1].rows.map((r) => r.label)).toEqual(["Three"]);
    // Tier-less group: the planned chapter then the No-chapter bucket.
    expect(grid.groups[2].rows.map((r) => `${r.kind}:${r.label}`)).toEqual([
      "planned:Nine",
      "unassigned:No chapter",
    ]);
    expect(grid.groups[2].rows[1].chapterTitle).toBe("");
  });

  it("fills cells with the row's scenes tagged for each column (multi-tag → multi-cell)", () => {
    const grid = buildPlotGrid(scenes, PL, chapterCfg, undefined);
    const one = grid.groups.flatMap((g) => g.rows).find((r) => r.label === "One")!;
    expect(one.cells[0].map((s) => s.title)).toEqual(["S1", "S2"]); // Main
    expect(one.cells[1].map((s) => s.title)).toEqual(["S2"]); // Romance: S2 in both cells
    expect(one.cells[2]).toEqual([]); // Ghost
  });

  it("computes per-act aggregate counts for collapsed act rows", () => {
    const grid = buildPlotGrid(scenes, PL, chapterCfg, [{ id: "a-1", title: "Act I" }]);
    expect(grid.groups[0].counts).toEqual([2, 2, 0]); // Act I: Main×2, Romance×2
    expect(grid.groups[2].counts).toEqual([0, 0, 1]); // tier-less: Ghost×1 (S5)
  });

  it("falls back to scene rows when the book has no chapters at all", () => {
    const flat = [
      scene({ title: "A", plotlines: ["Main"] }),
      scene({ title: "B" }),
    ];
    const grid = buildPlotGrid(flat, PL, undefined, undefined);
    expect(grid.byChapter).toBe(false);
    expect(grid.groups).toHaveLength(1);
    expect(grid.groups[0].title).toBe("");
    expect(grid.groups[0].rows.map((r) => `${r.kind}:${r.label}`)).toEqual([
      "scene:A",
      "scene:B",
    ]);
    expect(grid.groups[0].rows[0].cells[0].map((s) => s.title)).toEqual(["A"]);
  });

  it("renders a grid with no plotlines configured but orphan tags present", () => {
    const grid = buildPlotGrid([scene({ title: "A", plotlines: ["Loose"] })], undefined, undefined, undefined);
    expect(grid.configuredCount).toBe(0);
    expect(grid.columns.map((c) => c.title)).toEqual(["Loose"]);
    expect(grid.totals).toEqual([1]);
  });
});
