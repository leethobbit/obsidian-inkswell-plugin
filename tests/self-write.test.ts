/**
 * SelfWriteRegistry: a notify is "covered" only when every changed path was
 * marked as a self-write inside the freshness window — partial coverage or a
 * stale mark must fall through to a full rebuild. Matched marks are CONSUMED
 * (one mark = one notify), so an external edit landing on the same path
 * moments after our own write can never ride a leftover mark into the soft
 * path and get silently clobbered.
 */
import { describe, expect, it } from "vitest";
import { SelfWriteRegistry } from "../src/lib/self-write";

function withClock(start = 1000) {
  let t = start;
  const reg = new SelfWriteRegistry(() => t);
  return { reg, tick: (ms: number) => (t += ms) };
}

describe("SelfWriteRegistry", () => {
  it("covers a change set whose every path was just marked", () => {
    const { reg } = withClock();
    reg.mark("Codex/Mina.md");
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
  });

  it("rejects a batch containing any unmarked path", () => {
    const { reg } = withClock();
    reg.mark("Codex/Mina.md");
    expect(reg.coveredBy(new Set(["Codex/Mina.md", "Books/Alpha/Alpha.md"]))).toBe(false);
  });

  it("rejects an empty change set (nothing vouches for it)", () => {
    const { reg } = withClock();
    reg.mark("Codex/Mina.md");
    expect(reg.coveredBy(new Set())).toBe(false);
  });

  it("expires marks outside the window", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(3001);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(false);
  });

  it("CONSUMES a matched mark — one mark vouches for exactly one notify", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(500);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
    // A second notify on the same path within the window is an EXTERNAL change
    // (sync, another device) — it must fall through to a full rebuild, not be
    // softened away and later clobbered by the panel's stale save.
    tick(500);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(false);
  });

  it("a rejected mixed batch does not burn the marked path's mark", () => {
    const { reg } = withClock();
    reg.mark("Codex/Mina.md");
    expect(reg.coveredBy(new Set(["Codex/Mina.md", "Books/Alpha/Alpha.md"]))).toBe(false);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
  });

  it("re-marking refreshes the window", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(2500);
    reg.mark("Codex/Mina.md");
    tick(2500);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
  });

  it("covers a multi-path batch when EVERY path is marked, consuming all marks", () => {
    // The contract multi-file panel ops rely on (plotline rename: N scene
    // writes + the index write in one notify batch).
    const { reg } = withClock();
    reg.mark("Book/Scenes/01.md");
    reg.mark("Book/Scenes/02.md");
    reg.mark("Book/Book.md");
    const batch = new Set(["Book/Scenes/01.md", "Book/Scenes/02.md", "Book/Book.md"]);
    expect(reg.coveredBy(batch)).toBe(true);
    // All three marks were consumed together.
    expect(reg.coveredBy(new Set(["Book/Scenes/01.md"]))).toBe(false);
    expect(reg.coveredBy(new Set(["Book/Book.md"]))).toBe(false);
  });

  it("double-marking one path still vouches for exactly one notify", () => {
    // Two writes coalescing into one store notify: both mark() calls collapse
    // to one Map entry, which the single notify consumes.
    const { reg } = withClock();
    reg.mark("Codex/Mina.md");
    reg.mark("Codex/Mina.md");
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(false);
  });

  it("honors a custom window", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(150);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]), 100)).toBe(false);
  });
});
