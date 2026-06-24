import { describe, expect, it } from "vitest";
import { PUBLISHING_CHECKLIST } from "../src/publishing/checklist-def";
import {
  PublishingData,
  budgetTotals,
  categoriesOk,
  keywordsInBand,
  overallProgress,
  phaseProgress,
} from "../src/publishing/publishing-data";
import { computeMilestones, milestoneStatus } from "../src/publishing/preorder";

describe("checklist definition", () => {
  it("has unique phase ids and unique task ids within each phase", () => {
    const phaseIds = PUBLISHING_CHECKLIST.map((p) => p.id);
    expect(new Set(phaseIds).size).toBe(phaseIds.length);
    for (const phase of PUBLISHING_CHECKLIST) {
      const ids = phase.tasks.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("checklist progress", () => {
  const data: PublishingData = {
    checklist: {
      writing: { draft: { done: true } },
      editing: { selfEdit: { done: true }, hireEditor: { done: false } },
    },
  };

  it("counts done tasks per phase against the full task total", () => {
    expect(phaseProgress(data, "writing")).toEqual({ done: 1, total: 1 });
    const editing = phaseProgress(data, "editing");
    expect(editing.done).toBe(1);
    expect(editing.total).toBe(PUBLISHING_CHECKLIST.find((p) => p.id === "editing")!.tasks.length);
  });

  it("returns zeros for an unknown phase and empty data", () => {
    expect(phaseProgress(data, "nope")).toEqual({ done: 0, total: 0 });
    expect(phaseProgress(undefined, "writing")).toEqual({ done: 0, total: 1 });
  });

  it("sums overall progress across phases", () => {
    const o = overallProgress(data);
    expect(o.done).toBe(2);
    expect(o.total).toBe(
      PUBLISHING_CHECKLIST.reduce((n, p) => n + p.tasks.length, 0)
    );
  });
});

describe("metadata guidance", () => {
  it("flags the 7–10 keyword band", () => {
    expect(keywordsInBand(["a", "b", "c", "d", "e", "f", "g"])).toBe(true);
    expect(keywordsInBand(["a", "b"])).toBe(false);
    expect(keywordsInBand(undefined)).toBe(false);
  });

  it("requires a main category and ≤3 sub", () => {
    expect(categoriesOk({ main: "Fiction", sub: ["A", "B"] })).toBe(true);
    expect(categoriesOk({ sub: ["A"] })).toBe(false);
    expect(categoriesOk({ main: "Fiction", sub: ["A", "B", "C", "D"] })).toBe(false);
  });
});

describe("budgetTotals", () => {
  it("splits needs/wants and sums estimate/actual, treating missing as 0", () => {
    const t = budgetTotals([
      { id: "1", label: "Editor", category: "need", estimate: 1000, actual: 1200 },
      { id: "2", label: "Cover", category: "need", estimate: 500 },
      { id: "3", label: "Ads", category: "want", estimate: 300, actual: 250 },
    ]);
    expect(t).toEqual({ needs: 1500, wants: 300, estimate: 1800, actual: 1450 });
  });

  it("handles an empty list", () => {
    expect(budgetTotals(undefined)).toEqual({ needs: 0, wants: 0, estimate: 0, actual: 0 });
  });
});

describe("computeMilestones", () => {
  it("subtracts the right day offsets from the release date (medium)", () => {
    const ms = computeMilestones("2026-09-01", "medium");
    const submit = ms.find((m) => m.id === "submit")!;
    expect(submit.date).toBe("2026-06-03"); // 90 days before 2026-09-01
    const deliver = ms.find((m) => m.id === "deliverIncentives")!;
    expect(deliver.date).toBe("2026-08-31");
  });

  it("produces an ordered cover-reveal window (start before end, both pre-release)", () => {
    const ms = computeMilestones("2026-09-01", "medium");
    const reveal = ms.find((m) => m.id === "coverReveal")!;
    expect(reveal.windowEnd).toBeDefined();
    expect(reveal.date < reveal.windowEnd!).toBe(true);
    expect(reveal.windowEnd! < "2026-09-01").toBe(true);
  });

  it("crosses year boundaries correctly (long strategy)", () => {
    const ms = computeMilestones("2026-03-01", "long");
    // 240 days before 2026-03-01 is in 2025.
    expect(ms.find((m) => m.id === "submit")!.date.startsWith("2025-")).toBe(true);
  });

  it("does not mutate via repeated calls (stable output)", () => {
    const a = computeMilestones("2026-09-01", "short");
    const b = computeMilestones("2026-09-01", "short");
    expect(a).toEqual(b);
  });
});

describe("milestoneStatus", () => {
  const today = new Date(2026, 5, 23); // 2026-06-23

  it("returns done regardless of date when complete", () => {
    expect(milestoneStatus("2026-01-01", true, today)).toBe("done");
  });

  it("flags overdue / upcoming / future", () => {
    expect(milestoneStatus("2026-06-01", false, today)).toBe("overdue");
    expect(milestoneStatus("2026-06-27", false, today)).toBe("upcoming");
    expect(milestoneStatus("2026-08-01", false, today)).toBe("future");
  });
});
