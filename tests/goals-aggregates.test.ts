import { describe, expect, it } from "vitest";
import {
  habitDaysMet,
  heatmapWeeks,
  lifetimeRecords,
  monthToDateWords,
  nextMilestone,
  weekToDateWords,
} from "../src/goals/goals";

// Wed 2026-06-17 (Mon=15, so week-to-date covers 15,16,17)
const WED = new Date(2026, 5, 17);
const daily = {
  "2026-06-15": 100, // Mon
  "2026-06-16": 200, // Tue
  "2026-06-17": 50, // Wed (today)
  "2026-06-10": 999,
  "2026-05-31": 300, // last month
};

// Same week with a Sunday entry, to tell the two week starts apart.
const dailyWithSunday = { ...daily, "2026-06-14": 40 }; // Sun

describe("weekToDateWords", () => {
  it("sums Monday through today", () => {
    expect(weekToDateWords(daily, WED)).toBe(350);
  });

  it("respects a Sunday week start", () => {
    expect(weekToDateWords(dailyWithSunday, WED, "monday")).toBe(350); // Sun excluded
    expect(weekToDateWords(dailyWithSunday, WED, "sunday")).toBe(390); // Sun included
  });
});

describe("monthToDateWords", () => {
  it("sums the 1st through today (excludes last month)", () => {
    expect(monthToDateWords(daily, WED)).toBe(100 + 200 + 50 + 999);
  });
});

describe("habitDaysMet", () => {
  it("counts week days meeting the minimum", () => {
    expect(habitDaysMet(daily, 100, WED)).toBe(2); // Mon 100, Tue 200; Wed 50 < 100
    expect(habitDaysMet(daily, 50, WED)).toBe(3);
  });

  it("respects a Sunday week start", () => {
    expect(habitDaysMet(dailyWithSunday, 40, WED, "monday")).toBe(3); // Mon, Tue, Wed
    expect(habitDaysMet(dailyWithSunday, 40, WED, "sunday")).toBe(4); // + Sun
  });
});

describe("lifetimeRecords", () => {
  it("totals words, counts days, finds best day", () => {
    const r = lifetimeRecords(daily);
    expect(r.totalWords).toBe(100 + 200 + 50 + 999 + 300);
    expect(r.daysWritten).toBe(5);
    expect(r.bestDay).toEqual({ date: "2026-06-10", words: 999 });
  });
});

describe("nextMilestone", () => {
  it("returns the next unreached threshold", () => {
    expect(nextMilestone(0)).toBe(10000);
    expect(nextMilestone(12000)).toBe(25000);
    expect(nextMilestone(200000)).toBeNull();
  });
});

describe("heatmapWeeks", () => {
  it("builds N week-columns of 7 days ending this week", () => {
    const cols = heatmapWeeks(daily, 4, WED);
    expect(cols).toHaveLength(4);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    // last column is the current week; Monday cell is 2026-06-15
    expect(cols[3][0].key).toBe("2026-06-15");
    expect(cols[3][0].words).toBe(100);
  });

  it("starts columns on Sunday when configured", () => {
    const cols = heatmapWeeks(dailyWithSunday, 4, WED, "sunday");
    expect(cols[3][0].key).toBe("2026-06-14");
    expect(cols[3][0].words).toBe(40);
  });
});
