import { describe, expect, it } from "vitest";
import { SAVE_THE_CAT } from "../src/outliner/beat-templates";
import {
  beatProgress,
  mergeBeats,
  renameSceneInBeats,
  setAssignment,
} from "../src/outliner/beats";

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
        midpoint: { scenes: ["Ch 8"] }, // started, not done
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

  it("attaches multiple scenes and clears when emptied", () => {
    let sheet = setAssignment(undefined, "b-story", { scenes: ["Ch 3", "Ch 4"] });
    expect(sheet.assignments["b-story"].scenes).toEqual(["Ch 3", "Ch 4"]);
    sheet = setAssignment(sheet, "b-story", { scenes: [] });
    expect(sheet.assignments["b-story"]).toBeUndefined();
  });

  it("migrates a legacy single `scene` to `scenes` on read", () => {
    const beats = mergeBeats({
      template: "save-the-cat",
      // legacy shape from before multi-scene support
      assignments: { catalyst: { scene: "Ch 1" } as never },
    });
    expect(beats.find((b) => b.id === "catalyst")!.assignment.scenes).toEqual(["Ch 1"]);
  });
});

describe("renameSceneInBeats", () => {
  it("rewrites the renamed title across every beat that links it", () => {
    const sheet = {
      template: "save-the-cat",
      assignments: {
        catalyst: { scenes: ["02 - Blackout"], note: "the call" },
        midpoint: { scenes: ["02 - Blackout", "08 - Pivot"] },
      },
    };
    const next = renameSceneInBeats(sheet, "02 - Blackout", "02 - The Blackout")!;
    expect(next.assignments.catalyst).toEqual({
      scenes: ["02 - The Blackout"],
      note: "the call",
    });
    expect(next.assignments.midpoint.scenes).toEqual(["02 - The Blackout", "08 - Pivot"]);
  });

  it("returns null when no beat references the old title (skips a redundant write)", () => {
    const sheet = {
      template: "save-the-cat",
      assignments: { midpoint: { scenes: ["08 - Pivot"] } },
    };
    expect(renameSceneInBeats(sheet, "02 - Blackout", "02 - New")).toBeNull();
  });

  it("returns null for an undefined sheet or a no-op rename", () => {
    expect(renameSceneInBeats(undefined, "a", "b")).toBeNull();
    const sheet = { template: "save-the-cat", assignments: { catalyst: { scenes: ["a"] } } };
    expect(renameSceneInBeats(sheet, "a", "a")).toBeNull();
  });

  it("dedupes when the new title is already linked to the same beat", () => {
    const sheet = {
      template: "save-the-cat",
      assignments: { midpoint: { scenes: ["A", "B"] } },
    };
    const next = renameSceneInBeats(sheet, "A", "B")!;
    expect(next.assignments.midpoint.scenes).toEqual(["B"]);
  });

  it("folds a legacy single `scene` link into `scenes` while rewriting", () => {
    const sheet = {
      template: "save-the-cat",
      assignments: { catalyst: { scene: "Old" } as never },
    };
    const next = renameSceneInBeats(sheet, "Old", "New")!;
    expect(next.assignments.catalyst).toEqual({ scenes: ["New"] });
    expect((next.assignments.catalyst as { scene?: string }).scene).toBeUndefined();
  });
});
