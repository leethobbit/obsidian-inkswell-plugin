import { describe, expect, it } from "vitest";
import { ArcRow, buildArcTimeline, flatStretches, transformDelta } from "../src/revisions/arc";

const scenes = [
  { title: "S1", arc: { Mara: { internal: "guarded", external: "hunted" } } },
  { title: "S2", arc: { Mara: { internal: "guarded", external: "hunted" } } },
  { title: "S3", arc: {} }, // no data — skipped
  { title: "S4", arc: { Mara: { internal: "guarded", external: "hunted" } } },
  { title: "S5", arc: { Mara: { internal: "open", external: "free" } } },
];

describe("buildArcTimeline", () => {
  it("builds rows in character order with a cell per scene", () => {
    const rows = buildArcTimeline(scenes, ["Mara"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].character).toBe("Mara");
    expect(rows[0].cells.map((c) => c.title)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
  });

  it("treats empty snapshots as no data (null cell)", () => {
    const rows = buildArcTimeline(scenes, ["Mara"]);
    expect(rows[0].cells[2].snapshot).toBeNull(); // S3 has no Mara data
    expect(rows[0].cells[0].snapshot).toEqual({ internal: "guarded", external: "hunted" });
  });

  it("yields all-null cells for an untracked character", () => {
    const rows = buildArcTimeline(scenes, ["Ghost"]);
    expect(rows[0].cells.every((c) => c.snapshot === null)).toBe(true);
  });
});

describe("flatStretches", () => {
  it("flags a run of identical recorded snapshots, skipping gaps", () => {
    const row: ArcRow = buildArcTimeline(scenes, ["Mara"])[0];
    // S1, S2, S4 are identical "guarded/hunted" (S3 gap skipped) → run of 3.
    const flats = flatStretches(row, 3);
    expect(flats).toHaveLength(1);
    expect(flats[0].scenes).toEqual(["S1", "S2", "S4"]);
  });

  it("does not flag when the run is shorter than minRun", () => {
    const row = buildArcTimeline(scenes, ["Mara"])[0];
    expect(flatStretches(row, 4)).toEqual([]);
  });
});

describe("transformDelta", () => {
  it("reports a change between first and last recorded snapshots", () => {
    const row = buildArcTimeline(scenes, ["Mara"])[0];
    const d = transformDelta(row);
    expect(d.changed).toBe(true);
    expect(d.first).toEqual({ internal: "guarded", external: "hunted" });
    expect(d.last).toEqual({ internal: "open", external: "free" });
    expect(d.recorded).toBe(4);
  });

  it("reports no change for a flat character", () => {
    const flat = [
      { title: "A", arc: { X: { internal: "same" } } },
      { title: "B", arc: { X: { internal: "same" } } },
    ];
    expect(transformDelta(buildArcTimeline(flat, ["X"])[0]).changed).toBe(false);
  });
});
