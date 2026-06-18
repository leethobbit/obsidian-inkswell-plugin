import { describe, expect, it } from "vitest";
import {
  computeStreaks,
  projectFinish,
  recentDailyAverage,
} from "../src/goals/goals";

const TODAY = new Date(2026, 5, 18); // 2026-06-18 (local)

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
