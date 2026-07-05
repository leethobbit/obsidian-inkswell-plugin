import { describe, expect, it } from "vitest";
import { WritingLogData, applyCountToLog, emptyLog } from "../src/tracking/types";

const NOW = new Date(2026, 6, 4); // 2026-07-04
const TODAY = "2026-07-04";

const log = (over: Partial<WritingLogData> = {}): WritingLogData => ({
  ...emptyLog(),
  ...over,
});

describe("applyCountToLog", () => {
  it("first sighting sets the baseline only — no phantom words (gotcha #5)", () => {
    const l = log();
    const delta = applyCountToLog(l, "Book/Scene 1.md", 12_000, NOW);
    expect(delta).toBeNull();
    expect(l.baselines["Book/Scene 1.md"]).toBe(12_000);
    expect(l.daily).toEqual({}); // nothing attributed to today
  });

  it("attributes the net positive delta to today once a baseline exists", () => {
    const l = log({ baselines: { "s.md": 100 } });
    expect(applyCountToLog(l, "s.md", 150, NOW)).toBe(50);
    expect(l.daily[TODAY]).toBe(50);
    expect(l.baselines["s.md"]).toBe(150);
  });

  it("attributes negative deltas (deleting words counts down)", () => {
    const l = log({ baselines: { "s.md": 100 }, daily: { [TODAY]: 80 } });
    expect(applyCountToLog(l, "s.md", 70, NOW)).toBe(-30);
    expect(l.daily[TODAY]).toBe(50);
  });

  it("returns 0 and changes nothing when the count is unchanged", () => {
    const l = log({ baselines: { "s.md": 100 }, daily: { [TODAY]: 5 } });
    expect(applyCountToLog(l, "s.md", 100, NOW)).toBe(0);
    expect(l.daily[TODAY]).toBe(5);
  });

  it("accumulates repeated edits into one daily total", () => {
    const l = log({ baselines: { "s.md": 0 } });
    applyCountToLog(l, "s.md", 10, NOW);
    applyCountToLog(l, "s.md", 25, NOW);
    applyCountToLog(l, "s.md", 20, NOW); // trimmed 5 back out
    expect(l.daily[TODAY]).toBe(20);
    expect(l.baselines["s.md"]).toBe(20);
  });

  it("does not double-count a live edit followed by its disk save (same funnel)", () => {
    // Live keystroke path reports 120; the later disk `modify` re-reports 120.
    const l = log({ baselines: { "s.md": 100 } });
    expect(applyCountToLog(l, "s.md", 120, NOW)).toBe(20);
    expect(applyCountToLog(l, "s.md", 120, NOW)).toBe(0); // disk pass is a no-op
    expect(l.daily[TODAY]).toBe(20);
  });

  it("tracks files independently and dates by the supplied clock", () => {
    const l = log({ baselines: { "a.md": 10 } });
    applyCountToLog(l, "a.md", 15, new Date(2026, 6, 3)); // 2026-07-03
    applyCountToLog(l, "b.md", 999, NOW); // first sight, no attribution
    applyCountToLog(l, "b.md", 1_009, NOW);
    expect(l.daily).toEqual({ "2026-07-03": 5, [TODAY]: 10 });
  });
});
