import { describe, expect, it } from "vitest";
import {
  WritingChallenge,
  challengeProgress,
  normalizeChallenge,
  novemberPreset,
  showEndedResult,
  todayTarget,
} from "../src/goals/challenge";

const NOV: WritingChallenge = { name: "Nov", start: "2026-11-01", end: "2026-11-30", target: 50_000 };
const day = (d: number, m = 11) => new Date(2026, m - 1, d, 15, 0);

/** `words` on each of Nov 1..n. */
function steady(n: number, words: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let d = 1; d <= n; d++) out[`2026-11-${String(d).padStart(2, "0")}`] = words;
  return out;
}

describe("challengeProgress", () => {
  it("is upcoming the day before the start", () => {
    const p = challengeProgress({ "2026-10-31": 900 }, NOV, day(31, 10));
    expect(p.phase).toBe("upcoming");
    expect(p.status).toBe("upcoming");
    expect(p.startsIn).toBe(1);
    expect(p.written).toBe(0);
    expect(p.neededToday).toBe(0);
  });

  it("day 1 with no words: par and needed are a 30th of the target", () => {
    const p = challengeProgress({}, NOV, day(1));
    expect(p.phase).toBe("active");
    expect(p.dayIndex).toBe(1);
    expect(p.daysLeft).toBe(30);
    expect(p.par).toBe(1667);
    expect(p.neededToday).toBe(1667);
    expect(p.status).toBe("behind");
  });

  it("mid-window ahead and behind", () => {
    expect(challengeProgress(steady(12, 2000), NOV, day(12)).status).toBe("ahead");
    expect(challengeProgress(steady(12, 1000), NOV, day(12)).status).toBe("behind");
  });

  it("a negative day lowers the total", () => {
    const daily = { ...steady(3, 1000), "2026-11-02": -500 };
    expect(challengeProgress(daily, NOV, day(3)).written).toBe(1500);
  });

  it("today's words don't change neededToday", () => {
    const before = challengeProgress(steady(4, 1500), NOV, day(5));
    const after = challengeProgress({ ...steady(4, 1500), "2026-11-05": 800 }, NOV, day(5));
    expect(after.neededToday).toBe(before.neededToday);
    expect(after.today).toBe(800);
    expect(before.neededToday).toBe(Math.ceil((50_000 - 6000) / 26));
  });

  it("ignores words outside the window", () => {
    const daily = { "2026-10-31": 5000, ...steady(2, 100), "2026-12-01": 5000 };
    expect(challengeProgress(daily, NOV, day(2)).written).toBe(200);
  });

  it("spans a month boundary", () => {
    const ch = { name: "x", start: "2026-10-30", end: "2026-11-02", target: 4000 };
    const p = challengeProgress({ "2026-10-30": 1000, "2026-10-31": 1000 }, ch, day(1));
    expect(p.totalDays).toBe(4);
    expect(p.dayIndex).toBe(3);
    expect(p.written).toBe(2000);
    expect(p.par).toBe(3000);
  });

  it("the last day needs everything that's left", () => {
    const p = challengeProgress(steady(29, 1600), NOV, day(30));
    expect(p.daysLeft).toBe(1);
    expect(p.neededToday).toBe(50_000 - 29 * 1600);
  });

  it("is ended the day after, with the result and best day", () => {
    const daily = { ...steady(30, 1500), "2026-11-11": 4000 };
    const p = challengeProgress(daily, NOV, day(1, 12));
    expect(p.phase).toBe("ended");
    expect(p.daysLeft).toBe(0);
    expect(p.status).toBe("behind");
    expect(p.bestDay).toEqual({ date: "2026-11-11", words: 4000 });
  });

  it("is met as soon as the target is reached", () => {
    const p = challengeProgress(steady(20, 2500), NOV, day(20));
    expect(p.status).toBe("met");
    expect(p.neededToday).toBe(0);
  });

  it("handles a one-day window", () => {
    const ch = { name: "x", start: "2026-11-05", end: "2026-11-05", target: 1000 };
    const p = challengeProgress({ "2026-11-05": 400 }, ch, day(5));
    expect(p.totalDays).toBe(1);
    expect(p.par).toBe(1000);
    expect(p.neededToday).toBe(1000);
  });
});

describe("novemberPreset", () => {
  it("is this year's November until it has passed", () => {
    expect(novemberPreset(new Date(2026, 9, 5))).toMatchObject({ start: "2026-11-01", end: "2026-11-30", target: 50_000 });
    expect(novemberPreset(new Date(2026, 10, 30)).start).toBe("2026-11-01");
  });
  it("rolls to next year after November", () => {
    expect(novemberPreset(new Date(2026, 11, 5)).start).toBe("2027-11-01");
  });
});

describe("normalizeChallenge", () => {
  it("accepts a valid challenge and floors the target", () => {
    expect(normalizeChallenge({ ...NOV, target: 50_000.7 })).toEqual(NOV);
  });
  it("drops bad dates, reversed windows, and non-positive targets", () => {
    expect(normalizeChallenge({ ...NOV, start: "2026-02-30" })).toBeNull();
    expect(normalizeChallenge({ ...NOV, start: "11/01/2026" })).toBeNull();
    expect(normalizeChallenge({ ...NOV, end: "2026-10-01" })).toBeNull();
    expect(normalizeChallenge({ ...NOV, target: 0 })).toBeNull();
    expect(normalizeChallenge({ ...NOV, start: "2020-01-01" })).toBeNull(); // > 400 days
    expect(normalizeChallenge(null)).toBeNull();
    expect(normalizeChallenge("x")).toBeNull();
  });
  it("defaults a blank name", () => {
    expect(normalizeChallenge({ ...NOV, name: "  " })?.name).toBe("Writing challenge");
  });
});

describe("todayTarget", () => {
  it("uses the challenge's need while it runs, else the daily goal", () => {
    expect(todayTarget(500, challengeProgress({}, NOV, day(1)))).toBe(1667);
    expect(todayTarget(500, challengeProgress({}, NOV, day(1, 12)))).toBe(500);
    expect(todayTarget(500, null)).toBe(500);
  });
});

describe("showEndedResult", () => {
  it("keeps the result for 7 days after the end", () => {
    expect(showEndedResult(NOV, day(7, 12))).toBe(true);
    expect(showEndedResult(NOV, day(8, 12))).toBe(false);
  });
});
