import { describe, expect, it } from "vitest";
import { OpeningType, classifyOpening, flagOpeningRuns } from "../src/revisions/openings";

describe("classifyOpening", () => {
  it("detects a dialogue opening", () => {
    expect(classifyOpening('"Get down!" she hissed.')).toBe("dialogue");
    expect(classifyOpening("“Where were you?”")).toBe("dialogue");
  });

  it("detects an interiority (thought) opening from leading italics", () => {
    expect(classifyOpening("*Why now, of all nights?*")).toBe("thought");
    expect(classifyOpening("_I should have known better._")).toBe("thought");
  });

  it("detects an action opening from a motion verb", () => {
    expect(classifyOpening("She slammed the door and ran for the stairs.")).toBe("action");
  });

  it("falls back to reflection for descriptive narration", () => {
    expect(classifyOpening("The harbor was grey that morning, the light thin and cold.")).toBe(
      "reflection"
    );
  });

  it("returns unknown for an empty body", () => {
    expect(classifyOpening("")).toBe("unknown");
    expect(classifyOpening("\n\n")).toBe("unknown");
  });

  it("skips a leading heading and frontmatter to reach the first prose", () => {
    const body = "---\nstatus: draft\n---\n# Chapter One\n\n\"Run!\" he shouted.";
    expect(classifyOpening(body)).toBe("dialogue");
  });

  it("does not treat a bullet or bold as a thought opening", () => {
    expect(classifyOpening("* a list item about the weather")).not.toBe("thought");
    expect(classifyOpening("**The End**")).not.toBe("thought");
  });
});

describe("flagOpeningRuns", () => {
  const seq = (s: string): OpeningType[] => s.split("").map((c) =>
    ({ d: "dialogue", a: "action", t: "thought", r: "reflection", u: "unknown" }[c] as OpeningType)
  );

  it("flags a run of 2+ identical consecutive openings", () => {
    const runs = flagOpeningRuns(seq("ddda"));
    expect(runs).toEqual([{ type: "dialogue", start: 0, length: 3 }]);
  });

  it("finds multiple separate runs", () => {
    const runs = flagOpeningRuns(seq("aatt"));
    expect(runs).toEqual([
      { type: "action", start: 0, length: 2 },
      { type: "thought", start: 2, length: 2 },
    ]);
  });

  it("ignores singletons and unknown runs", () => {
    expect(flagOpeningRuns(seq("arar"))).toEqual([]);
    expect(flagOpeningRuns(seq("uuu"))).toEqual([]);
  });

  it("respects a custom minRun", () => {
    expect(flagOpeningRuns(seq("aaa"), 3)).toEqual([{ type: "action", start: 0, length: 3 }]);
    expect(flagOpeningRuns(seq("aa"), 3)).toEqual([]);
  });
});
