import { describe, expect, it } from "vitest";
import { SAVE_THE_CAT } from "../src/outliner/beat-templates";
import { beatProgress, mergeBeats, setAssignment } from "../src/outliner/beats";

describe("mergeBeats", () => {
  it("returns the full template in order with empty assignments by default", () => {
    const beats = mergeBeats(undefined);
    expect(beats).toHaveLength(SAVE_THE_CAT.length);
    expect(beats[0].id).toBe("opening-image");
    expect(beats[0].assignment).toEqual({});
  });

  it("overlays assignments onto the template by beat id", () => {
    const beats = mergeBeats({
      template: "save-the-cat",
      assignments: { midpoint: { note: "false win", done: true } },
    });
    const mid = beats.find((b) => b.id === "midpoint")!;
    expect(mid.assignment.note).toBe("false win");
    expect(mid.assignment.done).toBe(true);
  });
});

describe("beatProgress", () => {
  it("counts done and started", () => {
    const beats = mergeBeats({
      template: "save-the-cat",
      assignments: {
        "opening-image": { done: true },
        catalyst: { note: "inciting event" }, // started, not done
        midpoint: { scene: "Ch 8" }, // started, not done
      },
    });
    const p = beatProgress(beats);
    expect(p.total).toBe(15);
    expect(p.done).toBe(1);
    expect(p.started).toBe(3);
  });
});

describe("setAssignment", () => {
  it("creates a sheet from undefined and sets a field", () => {
    const sheet = setAssignment(undefined, "catalyst", { note: "the call" });
    expect(sheet.template).toBe("save-the-cat");
    expect(sheet.assignments.catalyst.note).toBe("the call");
  });

  it("merges patches and drops emptied fields", () => {
    let sheet = setAssignment(undefined, "midpoint", { note: "x", done: true });
    sheet = setAssignment(sheet, "midpoint", { done: false });
    expect(sheet.assignments.midpoint).toEqual({ note: "x" });
  });

  it("removes a beat entry once fully cleared", () => {
    let sheet = setAssignment(undefined, "finale", { note: "win" });
    sheet = setAssignment(sheet, "finale", { note: "  " });
    expect(sheet.assignments.finale).toBeUndefined();
  });

  it("clears a scene link with null", () => {
    let sheet = setAssignment(undefined, "b-story", { scene: "Ch 3" });
    expect(sheet.assignments["b-story"].scene).toBe("Ch 3");
    sheet = setAssignment(sheet, "b-story", { scene: null });
    expect(sheet.assignments["b-story"]).toBeUndefined();
  });
});
