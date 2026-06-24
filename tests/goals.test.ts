import { describe, expect, it } from "vitest";
import {
  computePace,
  computeStreaks,
  dailySeries,
  draftMilestone,
  projectFinish,
  recentDailyAverage,
  suggestedDeadlineWeeks,
} from "../src/goals/goals";

const TODAY = new Date(2026, 5, 18); // 2026-06-18 (local)

describe("computePace", () => {
  it("returns met when the target is reached", () => {
    expect(computePace(80000, 80000, "2026-12-01", 7, 0, TODAY).status).toBe("met");
  });

  it("returns no-deadline when no deadline is set", () => {
    expect(computePace(0, 80000, null, 7, 500, TODAY).status).toBe("no-deadline");
  });

  it("computes required rate over writing days and judges on-track vs behind", () => {
    // 20k remaining, deadline +28 calendar days, 7 days/week → 28 writing days → ~715/day.
    const r = computePace(60000, 80000, "2026-07-16", 7, 800, TODAY);
    expect(r.remaining).toBe(20000);
    expect(r.calendarDays).toBe(28);
    expect(r.writingDays).toBe(28);
    expect(r.requiredRate).toBe(Math.ceil(20000 / 28));
    expect(r.status).toBe("ahead"); // 800 ≥ required × 1.1
    expect(computePace(60000, 80000, "2026-07-16", 7, 600, TODAY).status).toBe("behind");
  });

  it("scales writing days by days-per-week", () => {
    const r = computePace(0, 14000, "2026-07-16", 5, 0, TODAY); // 28 cal days × 5/7 = 20 writing days
    expect(r.writingDays).toBe(20);
  });

  it("is behind when the deadline is in the past with words remaining", () => {
    const r = computePace(1000, 80000, "2026-06-01", 7, 1000, TODAY);
    expect(r.status).toBe("behind");
    expect(r.calendarDays).toBe(0);
  });
});

describe("suggestedDeadlineWeeks", () => {
  it("uses ~1 week per 10k words, minimum 1", () => {
    expect(suggestedDeadlineWeeks(80000)).toBe(8);
    expect(suggestedDeadlineWeeks(5000)).toBe(1);
    expect(suggestedDeadlineWeeks(0)).toBe(1);
  });
});

describe("draftMilestone", () => {
  it("maps progress to the right zone", () => {
    expect(draftMilestone(0, 80000).zone?.label).toBe("Starting line");
    expect(draftMilestone(40000, 80000).pct).toBe(50);
    expect(draftMilestone(40000, 80000).zone?.label).toBe("Halfway");
    expect(draftMilestone(80000, 80000).zone?.label).toBe("Draft complete");
  });

  it("caps at 100% and returns no zone without a target", () => {
    expect(draftMilestone(200000, 80000).pct).toBe(100);
    expect(draftMilestone(100, 0).zone).toBeNull();
  });
});

describe("dailySeries", () => {
  it("returns the last N days ending today, zero-filled, oldest first", () => {
    const daily = { "2026-06-16": 100, "2026-06-18": 50 };
    const out = dailySeries(daily, 3, TODAY);
    expect(out).toEqual([
      { date: "2026-06-16", words: 100 },
      { date: "2026-06-17", words: 0 },
      { date: "2026-06-18", words: 50 },
    ]);
  });

  it("returns all recorded dates ascending when days is null", () => {
    const daily = { "2026-06-18": 50, "2026-01-02": 10, "2026-03-05": 20 };
    expect(dailySeries(daily, null)).toEqual([
      { date: "2026-01-02", words: 10 },
      { date: "2026-03-05", words: 20 },
      { date: "2026-06-18", words: 50 },
    ]);
  });

  it("handles an empty log", () => {
    expect(dailySeries({}, null)).toEqual([]);
    expect(dailySeries({}, 2, TODAY)).toEqual([
      { date: "2026-06-17", words: 0 },
      { date: "2026-06-18", words: 0 },
    ]);
  });
});

describe("computeStreaks", () => {
  it("counts a run ending today", () => {
    const daily = { "2026-06-16": 100, "2026-06-17": 200, "2026-06-18": 50 };
    expect(computeStreaks(daily, 1, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it("gives today a grace day when not yet met", () => {
    const daily = { "2026-06-16": 100, "2026-06-17": 200 }; // nothing today
    expect(computeStreaks(daily, 1, TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it("breaks the current streak after a gap", () => {
    const daily = { "2026-06-10": 100, "2026-06-12": 100, "2026-06-13": 100 };
    const r = computeStreaks(daily, 1, TODAY);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(2);
  });

  it("respects the threshold", () => {
    const daily = { "2026-06-18": 50 };
    expect(computeStreaks(daily, 100, TODAY).current).toBe(0);
  });
});

describe("projectFinish", () => {
  it("estimates days at a rate", () => {
    expect(projectFinish(0, 1000, 100)).toEqual({
      remaining: 1000,
      daysToFinish: 10,
      done: false,
    });
  });
  it("marks done when target met", () => {
    expect(projectFinish(1200, 1000, 100)).toEqual({
      remaining: 0,
      daysToFinish: 0,
      done: true,
    });
  });
  it("returns null days when rate is zero", () => {
    expect(projectFinish(500, 1000, 0)).toEqual({
      remaining: 500,
      daysToFinish: null,
      done: false,
    });
  });
});

describe("recentDailyAverage", () => {
  it("averages only recorded days in the window", () => {
    const daily = { "2026-06-18": 100, "2026-06-17": 200, "2026-06-16": 0 };
    expect(recentDailyAverage(daily, 3, TODAY)).toBe(100);
  });
  it("returns 0 with no records", () => {
    expect(recentDailyAverage({}, 7, TODAY)).toBe(0);
  });
});
