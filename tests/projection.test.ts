import { describe, expect, it } from "vitest";
import {
  WordCategory,
  WritingLogData,
  applyCountToLog,
  emptyLog,
  projectedDaily,
  projectedDayWords,
} from "../src/tracking/types";

const NOW = new Date(2026, 6, 4); // 2026-07-04
const TODAY = "2026-07-04";

const none = new Set<WordCategory>();
const no = (...cats: WordCategory[]) => new Set<WordCategory>(cats);

describe("projectedDayWords / projectedDaily", () => {
  it("legacy-only days count fully whatever is disabled (no dailyBy → subtract nothing)", () => {
    const log = { daily: { "2026-01-01": 900 } };
    expect(projectedDayWords(log, "2026-01-01", no("scene", "planning", "codex", "other"))).toBe(900);
    expect(projectedDaily(log, no("codex"))).toEqual({ "2026-01-01": 900 });
  });

  it("disabled buckets are subtracted; enabled buckets and the legacy remainder survive", () => {
    // Mixed upgrade day: 200 words predate category tracking, then 400 scene
    // + 100 codex words were logged with buckets.
    const log = {
      daily: { [TODAY]: 700 },
      dailyBy: { [TODAY]: { scene: 400, codex: 100 } },
    };
    expect(projectedDayWords(log, TODAY, no("codex"))).toBe(600);
    expect(projectedDayWords(log, TODAY, no("scene", "codex"))).toBe(200);
  });

  it("a negative disabled bucket adds back — deleting codex words can't erase scene progress", () => {
    const log = {
      daily: { [TODAY]: 460 },
      dailyBy: { [TODAY]: { scene: 500, codex: -40 } },
    };
    expect(projectedDayWords(log, TODAY, no("codex"))).toBe(500);
  });

  it("nothing disabled reproduces daily verbatim — as a copy, not the live object", () => {
    const log = { daily: { [TODAY]: 50 }, dailyBy: { [TODAY]: { scene: 50 } } };
    const out = projectedDaily(log, none);
    expect(out).toEqual(log.daily);
    expect(out).not.toBe(log.daily);
  });

  it("projectedDayWords agrees with projectedDaily and returns 0 for unknown dates", () => {
    const log = {
      daily: { [TODAY]: 130 },
      dailyBy: { [TODAY]: { scene: 100, other: 30 } },
    };
    const disabled = no("other");
    expect(projectedDaily(log, disabled)[TODAY]).toBe(
      projectedDayWords(log, TODAY, disabled)
    );
    expect(projectedDayWords(log, "1999-01-01", disabled)).toBe(0);
  });

  it("round-trip: applyCountToLog buckets then projection equals the sum of enabled categories", () => {
    const l: WritingLogData = {
      ...emptyLog(),
      baselines: { "s.md": 0, "p.md": 0, "c.md": 0, "o.md": 0 },
    };
    applyCountToLog(l, "s.md", 300, "scene", NOW);
    applyCountToLog(l, "p.md", 80, "planning", NOW);
    applyCountToLog(l, "c.md", 50, "codex", NOW);
    applyCountToLog(l, "o.md", 20, "other", NOW);
    expect(projectedDayWords(l, TODAY, none)).toBe(450);
    expect(projectedDayWords(l, TODAY, no("planning", "codex", "other"))).toBe(300);
    expect(projectedDayWords(l, TODAY, no("scene"))).toBe(150);
  });
});
