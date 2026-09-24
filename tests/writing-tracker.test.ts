import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { FakeApp } from "./fakes/fake-app";
import { WritingTracker } from "../src/tracking/writing-tracker";
import { WritingLogData, dateKey, emptyLog, noteBaseline } from "../src/tracking/types";

const TODAY = dateKey(new Date());
const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

/** A tracker over the fake vault: every path is a "scene", nothing disabled. */
function setup(seed: Record<string, string>) {
  const app = new FakeApp(seed);
  const log: WritingLogData = emptyLog();
  let persisted = 0;
  const tracker = new WritingTracker(
    app as unknown as App,
    log,
    () => void persisted++,
    () => "scene",
    () => new Set()
  );
  tracker.load();
  const deltas: number[] = [];
  tracker.onDelta((d) => deltas.push(d));
  return { app, log, tracker, deltas, persisted: () => persisted };
}

describe("noteBaseline (pure)", () => {
  it("moves the baseline without attributing, and reports whether it changed", () => {
    const log = emptyLog();
    expect(noteBaseline(log, "s.md", 100)).toBe(true);
    expect(noteBaseline(log, "s.md", 100)).toBe(false);
    expect(noteBaseline(log, "s.md", 140)).toBe(true);
    expect(log.baselines["s.md"]).toBe(140);
    expect(log.daily).toEqual({});
  });
});

describe("WritingTracker attribution (#44: disk events never count as typing)", () => {
  it("a disk modify — Sync arrival or external tool — only moves the baseline", async () => {
    const { app, log, tracker, deltas } = setup({ "Book/Scene.md": words(10) });
    await tracker.warmBaselines(["Book/Scene.md"]);
    expect(log.baselines["Book/Scene.md"]).toBe(10);

    const file = app.file("Book/Scene.md");
    await app.vault.modify(file, words(60)); // another device's 50 words land via sync
    await new Promise((r) => setTimeout(r, 0)); // handleFile's cachedRead
    expect(log.baselines["Book/Scene.md"]).toBe(60);
    expect(log.daily).toEqual({}); // nothing logged as written here
    expect(deltas).toEqual([]);
  });

  it("typing (the live path) attributes the delta measured from the moved baseline", async () => {
    const { app, log, tracker, deltas } = setup({ "Book/Scene.md": words(10) });
    await tracker.warmBaselines(["Book/Scene.md"]);
    const file = app.file("Book/Scene.md");
    await app.vault.modify(file, words(60));
    await new Promise((r) => setTimeout(r, 0));

    tracker.noteLiveContent("Book/Scene.md", words(80)); // 20 typed here
    expect(log.daily[TODAY]).toBe(20);
    expect(deltas).toEqual([20]);

    // The editor's own save arrives with the count already recorded → no-op.
    await app.vault.modify(file, words(80));
    await new Promise((r) => setTimeout(r, 0));
    expect(log.daily[TODAY]).toBe(20);
    expect(deltas).toEqual([20]);
  });

  it("a brand-new file's creation is its baseline; the first typing counts (gotcha 5 intact)", async () => {
    const { app, log, tracker } = setup({});
    await app.vault.create("Book/New.md", words(0));
    await new Promise((r) => setTimeout(r, 0));
    expect(log.baselines["Book/New.md"]).toBe(0);
    tracker.noteLiveContent("Book/New.md", words(7));
    expect(log.daily[TODAY]).toBe(7);
  });

  it("a file first seen with text is baselined, never logged as today's words", async () => {
    const { log, tracker } = setup({});
    tracker.noteLiveContent("Book/Old.md", words(12_000));
    expect(log.baselines["Book/Old.md"]).toBe(12_000);
    expect(log.daily).toEqual({});
  });
});
