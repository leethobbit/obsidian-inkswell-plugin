import { describe, expect, it } from "vitest";
import {
  SearchFilters,
  SearchOptions,
  findMatches,
  replaceMatches,
  sceneMatchesFilters,
} from "../src/lib/scene-search";
import type { SceneMeta } from "../src/scenes/scene-meta";

const opts = (over: Partial<SearchOptions> = {}): SearchOptions => ({
  query: "",
  caseSensitive: false,
  wholeWord: false,
  ...over,
});

const froms = (text: string, o: SearchOptions) =>
  findMatches(text, o, "body").map((m) => m.from);

describe("findMatches — literal matching", () => {
  it("returns [] for an empty query", () => {
    expect(findMatches("anything", opts({ query: "" }), "body")).toEqual([]);
  });

  it("finds every non-overlapping occurrence, ascending", () => {
    expect(froms("aXaXa", opts({ query: "aX" }))).toEqual([0, 2]);
  });

  it("does not overlap matches", () => {
    // "aa" in "aaaa" → offsets 0 and 2, not 0/1/2/3.
    expect(froms("aaaa", opts({ query: "aa" }))).toEqual([0, 2]);
  });

  it("treats regex-special characters as literals", () => {
    expect(froms("x a.b*c y", opts({ query: "a.b*c" }))).toEqual([2]);
    expect(froms("see [TODO] here", opts({ query: "[TODO]" }))).toEqual([4]);
    expect(froms("1+1=2", opts({ query: "1+1" }))).toEqual([0]);
  });

  it("reports from/to spanning the match", () => {
    const [m] = findMatches("the locket gleamed", opts({ query: "locket" }), "body");
    expect([m.from, m.to]).toEqual([4, 10]);
    expect(m.target).toBe("body");
  });
});

describe("findMatches — case sensitivity", () => {
  it("is case-insensitive by default", () => {
    expect(froms("Anna and anna", opts({ query: "anna" }))).toEqual([0, 9]);
  });

  it("respects caseSensitive", () => {
    expect(froms("Anna and anna", opts({ query: "anna", caseSensitive: true }))).toEqual([9]);
  });

  it("keeps original-case offsets when matching case-insensitively", () => {
    const [m] = findMatches("The LOCKET", opts({ query: "locket" }), "body");
    expect([m.from, m.to]).toEqual([4, 10]);
  });
});

describe("findMatches — whole word", () => {
  it("matches only standalone words", () => {
    expect(froms("cat scatter cats cat.", opts({ query: "cat", wholeWord: true }))).toEqual([
      0,
      17,
    ]);
  });

  it("is Unicode-aware at boundaries", () => {
    // "café" flanked by spaces is a whole word; "cafés" is not.
    expect(froms("a café here cafés", opts({ query: "café", wholeWord: true }))).toEqual([2]);
  });

  it("counts punctuation and edges as boundaries", () => {
    expect(froms("(cat) cat", opts({ query: "cat", wholeWord: true }))).toEqual([1, 6]);
  });
});

describe("findMatches — line numbers & excerpts", () => {
  it("reports 1-based line numbers across newlines", () => {
    const hits = findMatches("one\ntwo locket\nthree", opts({ query: "locket" }), "body");
    expect(hits.map((h) => h.line)).toEqual([2]);
  });

  it("captures the trimmed containing line as the excerpt", () => {
    const [h] = findMatches("  a locket sat  ", opts({ query: "locket" }), "body");
    expect(h.excerpt).toBe("a locket sat");
  });

  it("handles multiple matches on one line", () => {
    const hits = findMatches("locket locket", opts({ query: "locket" }), "body");
    expect(hits.map((h) => h.line)).toEqual([1, 1]);
    expect(hits.map((h) => h.from)).toEqual([0, 7]);
  });

  it("truncates a long excerpt to 120 with an ellipsis", () => {
    const [h] = findMatches(`${"x".repeat(200)} locket`, opts({ query: "locket" }), "body");
    expect(h.excerpt.length).toBe(120);
    expect(h.excerpt.endsWith("…")).toBe(true);
  });
});

describe("replaceMatches", () => {
  it("replaces every occurrence and reports the count", () => {
    expect(replaceMatches("Anna met Anna", opts({ query: "Anna" }), "Mara")).toEqual({
      text: "Mara met Mara",
      count: 2,
    });
  });

  it("count equals what findMatches would report (preview == applied)", () => {
    const text = "aa aa aa";
    const o = opts({ query: "aa" });
    expect(replaceMatches(text, o, "b").count).toBe(findMatches(text, o, "body").length);
  });

  it("supports deletion via an empty replacement", () => {
    expect(replaceMatches("a[cut]b", opts({ query: "[cut]" }), "")).toEqual({
      text: "ab",
      count: 1,
    });
  });

  it("returns the text unchanged with count 0 when nothing matches", () => {
    expect(replaceMatches("hello", opts({ query: "zzz" }), "x")).toEqual({
      text: "hello",
      count: 0,
    });
  });

  it("respects case sensitivity", () => {
    expect(replaceMatches("Anna anna", opts({ query: "anna", caseSensitive: true }), "X")).toEqual(
      { text: "Anna X", count: 1 }
    );
  });
});

describe("sceneMatchesFilters", () => {
  const meta = (over: Partial<SceneMeta> = {}): SceneMeta => ({ ...over });
  const base: SearchFilters = { includeInactive: true };

  it("passes when no filters are active", () => {
    expect(sceneMatchesFilters(meta({ status: "draft" }), base)).toBe(true);
  });

  it("filters by status", () => {
    expect(sceneMatchesFilters(meta({ status: "draft" }), { ...base, status: ["draft"] })).toBe(
      true
    );
    expect(sceneMatchesFilters(meta({ status: "final" }), { ...base, status: ["draft"] })).toBe(
      false
    );
    expect(sceneMatchesFilters(meta({}), { ...base, status: ["draft"] })).toBe(false);
  });

  it("filters by pov and chapter", () => {
    expect(sceneMatchesFilters(meta({ pov: "Anna" }), { ...base, pov: ["Anna"] })).toBe(true);
    expect(sceneMatchesFilters(meta({ chapter: "One" }), { ...base, chapter: ["Two"] })).toBe(
      false
    );
  });

  it("filters by plotline (OR within the field)", () => {
    const m = meta({ plotlines: ["Romance", "Mystery"] });
    expect(sceneMatchesFilters(m, { ...base, plotline: ["Mystery"] })).toBe(true);
    expect(sceneMatchesFilters(m, { ...base, plotline: ["Politics"] })).toBe(false);
  });

  it("filters by character wikilink, matched verbatim", () => {
    const m = meta({ characters: ["[[Anna]]", "[[Bram]]"] });
    expect(sceneMatchesFilters(m, { ...base, character: ["[[Bram]]"] })).toBe(true);
    expect(sceneMatchesFilters(m, { ...base, character: ["Bram"] })).toBe(false);
  });

  it("excludes inactive scenes unless includeInactive", () => {
    expect(sceneMatchesFilters(meta({ inactive: true }), { includeInactive: false })).toBe(false);
    expect(sceneMatchesFilters(meta({ inactive: true }), { includeInactive: true })).toBe(true);
  });

  it("ANDs across fields", () => {
    const m = meta({ status: "draft", pov: "Anna" });
    expect(sceneMatchesFilters(m, { ...base, status: ["draft"], pov: ["Bram"] })).toBe(false);
    expect(sceneMatchesFilters(m, { ...base, status: ["draft"], pov: ["Anna"] })).toBe(true);
  });
});
