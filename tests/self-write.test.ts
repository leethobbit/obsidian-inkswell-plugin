/**
 * SelfWriteRegistry: a notify is "covered" only when every changed path was
 * marked as a self-write inside the freshness window — partial coverage or a
 * stale mark must fall through to a full rebuild.
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

  it("keeps marks inside the window across multiple checks", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(2000);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]))).toBe(true);
    tick(500);
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

  it("honors a custom window", () => {
    const { reg, tick } = withClock();
    reg.mark("Codex/Mina.md");
    tick(150);
    expect(reg.coveredBy(new Set(["Codex/Mina.md"]), 100)).toBe(false);
  });
});
