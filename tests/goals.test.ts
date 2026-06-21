import { describe, expect, it } from "vitest";
import {
  computeStreaks,
  dailySeries,
  projectFinish,
  recentDailyAverage,
} from "../src/goals/goals";

const TODAY = new Date(2026, 5, 18); // 2026-06-18 (local)

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
