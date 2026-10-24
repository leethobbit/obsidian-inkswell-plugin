import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKERS,
  MarkerExtra,
  SHIPPED_MARKERS,
  buildMarkerSet,
  findGaps,
  findUnknownMarkers,
  insertableMarkers,
  isValidKeyword,
  markerClass,
  markerSet,
  markerTemplate,
  scanPlaceholders,
  stripPlaceholders,
} from "../src/lib/placeholders";
import type { ListOverride } from "../src/lib/list-override";

const kinds = (text: string, set = DEFAULT_MARKERS): string[] =>
  scanPlaceholders(text, set).map((m) => m.kind);

describe("shipped markers", () => {
  it("are the five, in canonical order, with fixed keywords", () => {
    expect(SHIPPED_MARKERS.map((m) => m.id)).toEqual(["todo", "research", "note", "dialogue", "scene"]);
    expect(DEFAULT_MARKERS.defs.map((d) => d.keyword)).toEqual(["TODO", "RESEARCH", "NOTE", "DIALOGUE", "SCENE"]);
  });

  it("insert template lands the cursor inside the colon form", () => {
    expect(markerTemplate({ keyword: "TODO" })).toEqual({ text: "[TODO: ]", cursor: 7 });
    expect(markerTemplate({ keyword: "RESEARCH" })).toEqual({ text: "[RESEARCH: ]", cursor: 11 });
    expect(markerTemplate({ keyword: "TK" })).toEqual({ text: "[TK: ]", cursor: 5 });
  });

  it("shipped markers keep their own class; customs share one", () => {
    expect(markerClass({ id: "note", custom: false })).toBe("cm-ph-note");
    expect(markerClass({ id: "mk-1", custom: true })).toBe("cm-ph-custom");
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

describe("isValidKeyword", () => {
  it("accepts a letter then 1–19 letters, digits or hyphens (any case, any script)", () => {
    expect(isValidKeyword("CHECK")).toBe(true);
    expect(isValidKeyword("tk")).toBe(true);
    expect(isValidKeyword("FIX-2")).toBe(true);
    expect(isValidKeyword("ÉDIT")).toBe(true);
  });

  it("rejects single letters, leading digits, spaces, brackets and over-long words", () => {
    expect(isValidKeyword("X")).toBe(false);
    expect(isValidKeyword("1X")).toBe(false);
    expect(isValidKeyword("TWO WORDS")).toBe(false);
    expect(isValidKeyword("A]B")).toBe(false);
    expect(isValidKeyword("A".repeat(21))).toBe(false);
    expect(isValidKeyword("")).toBe(false);
  });
});

describe("markerSet — the writer's override", () => {
  const custom = (id: string, label: string, keyword: string) => ({ id, label, keyword });

  it("with no override is the shipped set (same instance)", () => {
    expect(markerSet(undefined)).toBe(DEFAULT_MARKERS);
  });

  it("matches a custom keyword case-insensitively, alongside the shipped five", () => {
    const set = markerSet({ added: [custom("mk-1", "Check", "CHECK")] });
    expect(kinds("[CHECK: date] [check] [TODO]", set)).toEqual(["mk-1", "mk-1", "todo"]);
    // The default set doesn't know it.
    expect(kinds("[CHECK: date]")).toEqual([]);
  });

  it("a hidden marker is still matched and stripped, just not insertable", () => {
    const set = markerSet({ hidden: ["research"], added: [custom("mk-1", "Check", "CHECK")] });
    expect(kinds("[RESEARCH: year]", set)).toEqual(["research"]);
    expect(stripPlaceholders("a [RESEARCH: year] b", set)).toBe("a  b");
    expect(insertableMarkers(set).map((d) => d.id)).toEqual(["todo", "note", "dialogue", "scene", "mk-1"]);
  });

  it("a custom keyword can never shadow a shipped one (or an earlier custom)", () => {
    const set = markerSet({
      added: [custom("mk-1", "Mine", "todo"), custom("mk-2", "Fix", "FIX"), custom("mk-3", "Fix again", "fix")],
    });
    expect(kinds("[TODO]", set)).toEqual(["todo"]);
    expect(set.defs.map((d) => d.id)).toEqual(["todo", "research", "note", "dialogue", "scene", "mk-2"]);
  });

  it("a shipped marker's keyword is fixed — a stored extras.keyword is ignored", () => {
    const o = { extras: { todo: { keyword: "LATER" } } } as ListOverride<MarkerExtra>;
    const set = markerSet(o);
    expect(set.byId.get("todo")?.keyword).toBe("TODO");
    expect(kinds("[LATER]", set)).toEqual([]);
  });

  it("renames are display-only; order follows the override", () => {
    const set = markerSet({
      labels: { research: "Fact check" },
      order: ["mk-1", "todo"],
      added: [custom("mk-1", "TK", "TK")],
    });
    expect(set.byId.get("research")).toMatchObject({ label: "Fact check", keyword: "RESEARCH" });
    expect(set.defs.map((d) => d.id).slice(0, 3)).toEqual(["mk-1", "todo", "research"]);
  });

  it("builds a valid matcher for hyphenated keywords (no `\\-` under the u flag)", () => {
    const set = buildMarkerSet([{ id: "x", keyword: "FIX-2", label: "x", custom: true, hidden: false }]);
    expect(scanPlaceholders("[FIX-2: y] [FIXx2]", set).map((m) => m.kind)).toEqual(["x"]);
  });

  it("drops a def with an invalid keyword instead of breaking the matcher", () => {
    const set = buildMarkerSet([
      { id: "bad", keyword: "A.B", label: "x", custom: true, hidden: false },
      { id: "ok", keyword: "OK", label: "y", custom: true, hidden: false },
    ]);
    expect(set.defs.map((d) => d.id)).toEqual(["ok"]);
    expect(scanPlaceholders("[AxB] [A.B] [OK]", set).map((m) => m.kind)).toEqual(["ok"]);
  });

  it("is memoized on the override's identity (the scanner asks every keystroke)", () => {
    const o = { added: [custom("mk-1", "Check", "CHECK")] };
    expect(markerSet(o)).toBe(markerSet(o));
    expect(markerSet({ ...o })).not.toBe(markerSet(o));
  });
});

describe("findUnknownMarkers", () => {
  it("flags uppercase colon-form tokens the set doesn't know", () => {
    expect(findUnknownMarkers("[CHEKC: date] and [TODO: x]")).toEqual(["CHEKC"]);
  });

  it("knows the writer's own markers", () => {
    const set = markerSet({ added: [{ id: "mk-1", label: "Check", keyword: "CHECK" }] });
    expect(findUnknownMarkers("[CHECK: date]", set)).toEqual([]);
  });

  it("ignores bare tokens and lowercase brackets (ordinary prose far more often)", () => {
    expect(findUnknownMarkers("[REDACTED] and [sic: x] and [Note: y]")).toEqual([]);
  });
});
