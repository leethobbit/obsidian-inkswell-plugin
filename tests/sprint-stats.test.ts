import { describe, expect, it } from "vitest";
import { sprintStats, sprintWpm, sprintSeconds } from "../src/sprints/sprint-stats";
import { SprintRecord } from "../src/tracking/types";

const rec = (over: Partial<SprintRecord>): SprintRecord => ({
  start: "2026-06-20T10:00:00.000Z",
  durationSec: 1500, // 25 min
  words: 500,
  goal: null,
  ...over,
});

describe("sprintSeconds / sprintWpm", () => {
  it("prefers elapsedSec, falls back to durationSec", () => {
    expect(sprintSeconds(rec({ elapsedSec: 600 }))).toBe(600);
    expect(sprintSeconds(rec({ elapsedSec: undefined }))).toBe(1500);
  });

  it("computes WPM from actual elapsed time", () => {
    // 300 words in 600s (10 min) = 30 wpm
    expect(sprintWpm(rec({ words: 300, elapsedSec: 600 }))).toBe(30);
    // same words but fell back to configured 1500s (25 min) = 12 wpm
    expect(sprintWpm(rec({ words: 300, elapsedSec: undefined }))).toBe(12);
  });
});

describe("sprintStats", () => {
  it("returns zeros for no sprints", () => {
    const s = sprintStats([]);
    expect(s.count).toBe(0);
    expect(s.avgWpm).toBe(0);
    expect(s.hitRate).toBe(0);
  });

  it("aggregates totals, averages, bests, and WPM", () => {
    const s = sprintStats([
      rec({ words: 300, elapsedSec: 600 }), // 30 wpm
      rec({ words: 600, elapsedSec: 600 }), // 60 wpm
    ]);
    expect(s.count).toBe(2);
    expect(s.totalWords).toBe(900);
    expect(s.totalSec).toBe(1200);
    expect(s.avgWords).toBe(450);
    expect(s.avgWpm).toBe(45); // 900 words / 1200s * 60
    expect(s.bestWords).toBe(600);
    expect(s.bestWpm).toBe(60);
  });

  it("computes goal hit-rate over goal'd sprints only", () => {
    const s = sprintStats([
      rec({ words: 500, goal: 400 }), // met
      rec({ words: 300, goal: 400 }), // missed
      rec({ words: 800, goal: null }), // no goal — excluded
    ]);
    expect(s.goalCount).toBe(2);
    expect(s.goalsMet).toBe(1);
    expect(s.hitRate).toBe(0.5);
  });
});
