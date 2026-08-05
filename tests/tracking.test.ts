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
    const delta = applyCountToLog(l, "Book/Scene 1.md", 12_000, "scene", NOW);
    expect(delta).toBeNull();
    expect(l.baselines["Book/Scene 1.md"]).toBe(12_000);
    expect(l.daily).toEqual({}); // nothing attributed to today
  });

  it("attributes the net positive delta to today once a baseline exists", () => {
    const l = log({ baselines: { "s.md": 100 } });
    expect(applyCountToLog(l, "s.md", 150, "scene", NOW)).toBe(50);
    expect(l.daily[TODAY]).toBe(50);
    expect(l.baselines["s.md"]).toBe(150);
  });

  it("attributes negative deltas (deleting words counts down)", () => {
    const l = log({ baselines: { "s.md": 100 }, daily: { [TODAY]: 80 } });
    expect(applyCountToLog(l, "s.md", 70, "scene", NOW)).toBe(-30);
    expect(l.daily[TODAY]).toBe(50);
  });

  it("returns 0 and changes nothing when the count is unchanged", () => {
    const l = log({ baselines: { "s.md": 100 }, daily: { [TODAY]: 5 } });
    expect(applyCountToLog(l, "s.md", 100, "scene", NOW)).toBe(0);
    expect(l.daily[TODAY]).toBe(5);
  });

  it("accumulates repeated edits into one daily total", () => {
    const l = log({ baselines: { "s.md": 0 } });
    applyCountToLog(l, "s.md", 10, "scene", NOW);
    applyCountToLog(l, "s.md", 25, "scene", NOW);
    applyCountToLog(l, "s.md", 20, "scene", NOW); // trimmed 5 back out
    expect(l.daily[TODAY]).toBe(20);
    expect(l.baselines["s.md"]).toBe(20);
  });

  it("does not double-count a live edit followed by its disk save (same funnel)", () => {
    // Live keystroke path reports 120; the later disk `modify` re-reports 120.
    const l = log({ baselines: { "s.md": 100 } });
    expect(applyCountToLog(l, "s.md", 120, "scene", NOW)).toBe(20);
    expect(applyCountToLog(l, "s.md", 120, "scene", NOW)).toBe(0); // disk pass is a no-op
    expect(l.daily[TODAY]).toBe(20);
  });

  it("tracks files independently and dates by the supplied clock", () => {
    const l = log({ baselines: { "a.md": 10 } });
    applyCountToLog(l, "a.md", 15, "scene", new Date(2026, 6, 3)); // 2026-07-03
    applyCountToLog(l, "b.md", 999, "scene", NOW); // first sight, no attribution
    applyCountToLog(l, "b.md", 1_009, "scene", NOW);
    expect(l.daily).toEqual({ "2026-07-03": 5, [TODAY]: 10 });
  });

  it("unrelated files (category null) update the baseline but attribute nothing — vault notes never count", () => {
    const l = log({ baselines: { "Daily/2026-07-04.md": 100 } });
    expect(applyCountToLog(l, "Daily/2026-07-04.md", 250, null, NOW)).toBeNull();
    expect(l.baselines["Daily/2026-07-04.md"]).toBe(250);
    expect(l.daily).toEqual({});
    expect(l.dailyBy).toBeUndefined();
  });

  it("a file that later joins a project dumps no phantom delta (baseline stayed warm while unrelated)", () => {
    const l = log();
    applyCountToLog(l, "n.md", 500, null, NOW); // first sight, unrelated
    applyCountToLog(l, "n.md", 800, null, NOW); // grows while unrelated — still nothing
    // Now added as a scene: only NEW words from here attribute.
    expect(applyCountToLog(l, "n.md", 810, "scene", NOW)).toBe(10);
    expect(l.daily[TODAY]).toBe(10);
  });

  it("attributes each delta to daily AND its category bucket under one date key", () => {
    const l = log({ baselines: { "s.md": 100 } });
    applyCountToLog(l, "s.md", 150, "scene", NOW);
    expect(l.daily).toEqual({ [TODAY]: 50 });
    expect(l.dailyBy).toEqual({ [TODAY]: { scene: 50 } });
  });

  it("category buckets on one day accumulate independently (scene + codex sum to daily)", () => {
    const l = log({ baselines: { "s.md": 0, "c.md": 0 } });
    applyCountToLog(l, "s.md", 300, "scene", NOW);
    applyCountToLog(l, "c.md", 120, "codex", NOW);
    applyCountToLog(l, "s.md", 400, "scene", NOW);
    expect(l.dailyBy?.[TODAY]).toEqual({ scene: 400, codex: 120 });
    expect(l.daily[TODAY]).toBe(520);
  });

  it("negative deltas decrement the file's category bucket, not the others", () => {
    const l = log({ baselines: { "s.md": 200, "c.md": 100 } });
    applyCountToLog(l, "s.md", 250, "scene", NOW);
    applyCountToLog(l, "c.md", 60, "codex", NOW); // deleted 40 codex words
    expect(l.dailyBy?.[TODAY]).toEqual({ scene: 50, codex: -40 });
    expect(l.daily[TODAY]).toBe(10);
  });
});
