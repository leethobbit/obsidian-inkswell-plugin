import { describe, expect, it } from "vitest";
import { formatMilestone, milestoneOffsets } from "../src/lib/milestones";
import { countWords } from "../src/lib/wordcount";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i + 1}`).join(" ");

describe("milestoneOffsets", () => {
  it("returns [] when disabled or for an empty doc", () => {
    expect(milestoneOffsets(words(10), 0)).toEqual([]);
    expect(milestoneOffsets(words(10), -5)).toEqual([]);
    expect(milestoneOffsets(words(10), NaN)).toEqual([]);
    expect(milestoneOffsets("", 3)).toEqual([]);
  });

  it("lands on the start of the Nth word with the running count", () => {
    const doc = "one two three four five six seven";
    const m = milestoneOffsets(doc, 3);
    expect(m).toEqual([
      { offset: doc.indexOf("three"), words: 3 },
      { offset: doc.indexOf("six"), words: 6 },
    ]);
  });

  it("ignores words inside code and comments, and link targets, but counts link display text", () => {
    const doc = "a b `c d e` f %% g h %% [[Target Note|shown]] i";
    // countable: a b f shown i = 5
    expect(countWords(doc)).toBe(5);
    const m = milestoneOffsets(doc, 2);
    expect(m.map((x) => doc.slice(x.offset, x.offset + 1))).toEqual(["b", "s"]); // b (2), shown (4)
    expect(m.map((x) => x.words)).toEqual([2, 4]);
  });

  it("skips leading frontmatter", () => {
    const doc = "---\nstatus: draft\nsynopsis: x y z\n---\none two three";
    expect(milestoneOffsets(doc, 2)).toEqual([{ offset: doc.indexOf("two"), words: 2 }]);
  });

  it("counts CJK graphemes one each", () => {
    const doc = "你好世界";
    expect(milestoneOffsets(doc, 2)).toEqual([
      { offset: 1, words: 2 },
      { offset: 3, words: 4 },
    ]);
  });

  it("produces floor(countWords / n) milestones", () => {
    for (const [doc, n] of [
      [words(1000), 100],
      ["one\n\ntwo three\n\nfour five six seven", 3],
      ["---\na: b\n---\n" + words(25), 10],
    ] as [string, number][]) {
      expect(milestoneOffsets(doc, n)).toHaveLength(Math.floor(countWords(doc) / n));
    }
  });
});

describe("formatMilestone", () => {
  it("formats compactly", () => {
    expect(formatMilestone(500)).toBe("500");
    expect(formatMilestone(1000)).toBe("1k");
    expect(formatMilestone(1500)).toBe("1.5k");
    expect(formatMilestone(2500)).toBe("2.5k");
    expect(formatMilestone(10000)).toBe("10k");
  });
});
