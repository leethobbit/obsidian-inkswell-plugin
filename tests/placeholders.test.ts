import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_LABEL,
  PLACEHOLDER_ORDER,
  PlaceholderKind,
  findGaps,
  scanPlaceholders,
} from "../src/lib/placeholders";

const kinds = (text: string): PlaceholderKind[] =>
  scanPlaceholders(text).map((m) => m.kind);

describe("kind labels", () => {
  it("covers every kind, in a canonical order", () => {
    expect([...PLACEHOLDER_ORDER].sort()).toEqual(Object.keys(PLACEHOLDER_LABEL).sort());
    expect(PLACEHOLDER_ORDER).toEqual(["todo", "research", "note", "dialogue", "scene"]);
  });
});

describe("scanPlaceholders — token forms", () => {
  it("matches all five token kinds", () => {
    expect(kinds("[TODO: rework this]")).toEqual(["todo"]);
    expect(kinds("[RESEARCH: birth year]")).toEqual(["research"]);
    expect(kinds("[NOTE: check timeline]")).toEqual(["note"]);
    expect(kinds("[DIALOGUE: they argue]")).toEqual(["dialogue"]);
    expect(kinds("[SCENE: flashback to the fire]")).toEqual(["scene"]);
  });

  it("is case-insensitive on the keyword", () => {
    expect(kinds("[todo: later]")).toEqual(["todo"]);
    expect(kinds("[dialogue: hi]")).toEqual(["dialogue"]);
  });

  it("accepts a bare token (no colon body) and an empty body", () => {
    expect(kinds("[TODO]")).toEqual(["todo"]);
    expect(kinds("[RESEARCH]")).toEqual(["research"]);
    expect(kinds("[NOTE:]")).toEqual(["note"]);
  });

  it("returns absolute offsets", () => {
    const [m] = scanPlaceholders("ab [TODO] cd");
    expect(m).toEqual({ from: 3, to: 9, kind: "todo" });
  });

  it("finds multiple tokens sorted by start, with mixed kinds", () => {
    const out = scanPlaceholders("[NOTE: x] middle [TODO] end [RESEARCH: y]");
    expect(out.map((m) => m.kind)).toEqual(["note", "todo", "research"]);
    expect(out.map((m) => m.from)).toEqual([...out.map((m) => m.from)].sort((a, b) => a - b));
  });
});

describe("scanPlaceholders — rejects malformed / non-tokens", () => {
  it("ignores an unclosed bracket", () => {
    expect(scanPlaceholders("[TODO and more")).toEqual([]);
  });

  it("does not treat [TODOfoo] as a token", () => {
    expect(scanPlaceholders("[TODOfoo]")).toEqual([]);
  });

  it("does not match an unknown keyword", () => {
    expect(scanPlaceholders("[FIXME: later]")).toEqual([]);
  });

  it("no longer recognizes the retired [TK]/[???] markers", () => {
    expect(scanPlaceholders("[TK] and [???]")).toEqual([]);
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
    const hits = findGaps("line one\nline [TODO] two\nline three [RESEARCH: x]");
    expect(hits.map((h) => h.line)).toEqual([2, 3]);
  });

  it("captures the trimmed line as the excerpt", () => {
    const [hit] = findGaps("  here is a [TODO] line  ");
    expect(hit.excerpt).toBe("here is a [TODO] line");
  });

  it("handles multiple tokens on one line", () => {
    const hits = findGaps("[TODO] and [NOTE: x] together");
    expect(hits.map((h) => h.line)).toEqual([1, 1]);
    expect(hits.map((h) => h.kind)).toEqual(["todo", "note"]);
  });

  it("truncates a long excerpt", () => {
    const long = `${"x".repeat(200)} [TODO]`;
    const [hit] = findGaps(long);
    expect(hit.excerpt.length).toBe(120);
    expect(hit.excerpt.endsWith("…")).toBe(true);
  });
});
