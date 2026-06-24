import { describe, expect, it } from "vitest";
import { SIDE_ROLES, rosterGaps } from "../src/revisions/roster";

describe("SIDE_ROLES", () => {
  it("lists the nine narrative functions", () => {
    expect(SIDE_ROLES).toHaveLength(9);
  });
});

describe("rosterGaps", () => {
  it("reports a complete entry as having no missing fields", () => {
    const gaps = rosterGaps({
      name: "Coll",
      func: "Stands in the hero's way",
      goal: "Close the case",
      flaw: "Rigid",
      trait: "Always sketching",
      appearances: 4,
    });
    expect(gaps.missing).toEqual([]);
    expect(gaps.spearCarrier).toBe(false);
  });

  it("flags every missing field", () => {
    const gaps = rosterGaps({ name: "Extra", appearances: 3 });
    expect(gaps.missing).toEqual(["function", "goal", "flaw", "trait"]);
  });

  it("treats blank/whitespace values as missing", () => {
    const gaps = rosterGaps({ name: "X", func: "  ", goal: "", appearances: 2 });
    expect(gaps.missing).toContain("function");
    expect(gaps.missing).toContain("goal");
  });

  it("flags a one-appearance spear-carrier", () => {
    expect(rosterGaps({ name: "Walk-on", appearances: 1 }).spearCarrier).toBe(true);
    expect(rosterGaps({ name: "Walk-on", appearances: 0 }).spearCarrier).toBe(true);
    expect(rosterGaps({ name: "Real", appearances: 2 }).spearCarrier).toBe(false);
  });
});
