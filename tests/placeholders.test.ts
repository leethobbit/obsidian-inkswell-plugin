import { describe, expect, it } from "vitest";
import {
  PlaceholderKind,
  findGaps,
  scanPlaceholders,
} from "../src/lib/placeholders";

const kinds = (text: string): PlaceholderKind[] =>
  scanPlaceholders(text).map((m) => m.kind);

describe("scanPlaceholders — token forms", () => {
  it("matches all five token kinds", () => {
    expect(kinds("[TK]")).toEqual(["tk"]);
    expect(kinds("[???]")).toEqual(["unknown"]);
    expect(kinds("[DIALOGUE: they argue]")).toEqual(["dialogue"]);
    expect(kinds("[SCENE: flashback to the fire]")).toEqual(["scene"]);
    expect(kinds("[NOTE: check timeline]")).toEqual(["note"]);
  });

  it("is case-insensitive on the keyword", () => {
    expect(kinds("[tk]")).toEqual(["tk"]);
    expect(kinds("[dialogue: hi]")).toEqual(["dialogue"]);
  });

  it("accepts an empty colon body", () => {
    expect(kinds("[NOTE:]")).toEqual(["note"]);
  });

  it("returns absolute offsets", () => {
    const [m] = scanPlaceholders("ab [TK] cd");
    expect(m).toEqual({ from: 3, to: 7, kind: "tk" });
  });

  it("finds multiple tokens sorted by start, with mixed kinds", () => {
    const out = scanPlaceholders("[NOTE: x] middle [TK] end [???]");
    expect(out.map((m) => m.kind)).toEqual(["note", "tk", "unknown"]);
    expect(out.map((m) => m.from)).toEqual([...out.map((m) => m.from)].sort((a, b) => a - b));
  });
});

describe("scanPlaceholders — rejects malformed / non-tokens", () => {
  it("ignores an unclosed bracket", () => {
    expect(scanPlaceholders("[TK and more")).toEqual([]);
  });

  it("does not treat [TKfoo] as a TK token", () => {
    expect(scanPlaceholders("[TKfoo]")).toEqual([]);
  });

  it("does not match an unknown keyword", () => {
    expect(scanPlaceholders("[TODO: later]")).toEqual([]);
  });

  it("stops colon content at a newline (single-line only)", () => {
    // The `]` is on the next line, so the token never closes on its own line.
    expect(scanPlaceholders("[SCENE: foo\nbar]")).toEqual([]);
  });
});

describe("findGaps", () => {
  it("returns [] for a doc with no tokens", () => {
    expect(findGaps("just prose, no gaps")).toEqual([]);
  });

  it("reports 1-based line numbers across newlines", () => {
    const hits = findGaps("line one\nline [TK] two\nline three [???]");
    expect(hits.map((h) => h.line)).toEqual([2, 3]);
  });

  it("captures the trimmed line as the excerpt", () => {
    const [hit] = findGaps("  here is a [TK] line  ");
    expect(hit.excerpt).toBe("here is a [TK] line");
  });

  it("handles multiple tokens on one line", () => {
    const hits = findGaps("[TK] and [NOTE: x] together");
    expect(hits.map((h) => h.line)).toEqual([1, 1]);
    expect(hits.map((h) => h.kind)).toEqual(["tk", "note"]);
  });

  it("truncates a long excerpt", () => {
    const long = `${"x".repeat(200)} [TK]`;
    const [hit] = findGaps(long);
    expect(hit.excerpt.length).toBe(120);
    expect(hit.excerpt.endsWith("…")).toBe(true);
  });
});
