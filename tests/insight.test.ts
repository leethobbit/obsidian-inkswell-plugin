import { describe, expect, it } from "vitest";
import { tallyBy } from "../src/insight/breakdown";
import {
  countSyllables,
  findEchoes,
  readability,
  wordFrequency,
} from "../src/insight/analysis";

describe("tallyBy", () => {
  it("counts, honours order, and buckets blanks as None last", () => {
    const t = tallyBy(
      ["draft", "draft", undefined, "final", ""],
      ["idea", "draft", "final"]
    );
    expect(t).toEqual([
      { key: "draft", count: 2 },
      { key: "final", count: 1 },
      { key: "None", count: 2 },
    ]);
  });
  it("appends unknown keys sorted after ordered ones", () => {
    const t = tallyBy(["2", "1", "10"], []);
    expect(t.map((x) => x.key)).toEqual(["1", "2", "10"]); // numeric-aware sort
  });
});

describe("countSyllables", () => {
  it("estimates reasonably", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("table")).toBe(1); // silent e: tabl-e → "a","e"→ e dropped → 1? heuristic
    expect(countSyllables("running")).toBe(2);
    expect(countSyllables("")).toBe(1);
  });
});

describe("readability", () => {
  it("returns word/sentence counts and finite scores", () => {
    const r = readability("The cat sat. The dog ran fast.");
    expect(r.words).toBe(7);
    expect(r.sentences).toBe(2);
    expect(Number.isFinite(r.grade)).toBe(true);
    expect(Number.isFinite(r.ease)).toBe(true);
  });
  it("handles empty text", () => {
    expect(readability("").words).toBe(0);
  });
});

describe("wordFrequency", () => {
  it("ranks non-stopwords, excludes short/stopwords", () => {
    const f = wordFrequency("The dragon flew. The dragon roared at the knight.");
    expect(f[0]).toEqual({ word: "dragon", count: 2 });
    expect(f.some((x) => x.word === "the")).toBe(false);
  });
});

describe("findEchoes", () => {
  it("finds repeated trigrams", () => {
    const text = "she looked at him. she looked at him again.";
    const e = findEchoes(text, 3, 2);
    const counts = Object.fromEntries(e.map((x) => [x.phrase, x.count]));
    expect(counts["she looked at"]).toBe(2);
    expect(counts["looked at him"]).toBe(2);
  });
});
