import { describe, expect, it } from "vitest";
import {
  ArcRow,
  buildArcTimeline,
  flatStretches,
  parseSceneArc,
  parseTracked,
  serializeSceneArc,
  serializeTracked,
  transformDelta,
} from "../src/revisions/arc";

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

describe("scene-arc (de)serialization (Option B — wikilink values)", () => {
  it("parses the list form, resolving the wikilink to a plain name", () => {
    const raw = [{ character: "[[Mara Vance]]", internal: "guarded", external: "hunted" }];
    expect(parseSceneArc(raw)).toEqual({ "Mara Vance": { internal: "guarded", external: "hunted" } });
  });

  it("resolves aliased wikilinks (`[[Name|alias]]`) to the target", () => {
    const raw = [{ character: "[[Mara Vance|Mara]]", internal: "x" }];
    expect(parseSceneArc(raw)).toEqual({ "Mara Vance": { internal: "x" } });
  });

  it("still reads the legacy plain-name-keyed object form", () => {
    const legacy = { "Mara Vance": { internal: "guarded", external: "hunted" } };
    expect(parseSceneArc(legacy)).toEqual({ "Mara Vance": { internal: "guarded", external: "hunted" } });
  });

  it("drops empty snapshots and tolerates junk", () => {
    expect(parseSceneArc([{ character: "[[A]]" }])).toEqual({});
    expect(parseSceneArc(undefined)).toEqual({});
    expect(parseSceneArc([{ internal: "no character" }])).toEqual({});
  });

  it("serializes a record to the wikilinked list, trimming and dropping empties", () => {
    const out = serializeSceneArc({
      "Mara Vance": { internal: " guarded ", external: "" },
      Empty: {},
    });
    expect(out).toEqual([{ character: "[[Mara Vance]]", internal: "guarded" }]);
  });

  it("round-trips list → record → list", () => {
    const list = [{ character: "[[Coll]]", internal: "rigid", external: "the case" }];
    expect(serializeSceneArc(parseSceneArc(list))).toEqual(list);
  });
});

describe("arcTracked (de)serialization", () => {
  it("parses wikilinks and legacy plain names to plain names", () => {
    expect(parseTracked(["[[Mara Vance]]", "Coll"])).toEqual(["Mara Vance", "Coll"]);
  });
  it("serializes plain names to wikilinks", () => {
    expect(serializeTracked(["Mara Vance"])).toEqual(["[[Mara Vance]]"]);
  });
  it("ignores non-arrays / non-strings", () => {
    expect(parseTracked(undefined)).toEqual([]);
    expect(parseTracked([1, "Coll"])).toEqual(["Coll"]);
  });
});
