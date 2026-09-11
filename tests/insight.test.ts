import { describe, expect, it } from "vitest";
import { tallyBy } from "../src/insight/breakdown";
import {
  assembleManuscriptText,
  countSyllables,
  findEchoes,
  readability,
  wordFrequency,
} from "../src/insight/analysis";
import { compositionProfile } from "../src/insight/composition";

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
  it("counts CJK graphemes and CJK sentence enders (reconciles with countWords)", () => {
    const r = readability("你好世界。再见了！");
    expect(r.words).toBe(7); // 你 好 世 界 + 再 见 了
    expect(r.sentences).toBe(2); // 。 and ！
  });
});

describe("wordFrequency", () => {
  it("ranks non-stopwords, excludes short/stopwords", () => {
    const f = wordFrequency("The dragon flew. The dragon roared at the knight.");
    expect(f[0]).toEqual({ word: "dragon", count: 2 });
    expect(f.some((x) => x.word === "the")).toBe(false);
  });
  it("keeps single CJK graphemes despite the Latin length gate", () => {
    const f = wordFrequency("龙飞。龙吼。");
    expect(f[0]).toEqual({ word: "龙", count: 2 });
    expect(f.some((x) => x.word === "at")).toBe(false); // gate still applies to Latin
  });
});

describe("assembleManuscriptText", () => {
  const scene = (title: string, fm: string, body: string) => ({
    title,
    text: `---\n${fm}\n---\n${body}`,
  });

  it("strips frontmatter from every scene, not just the first", () => {
    const { joined, scenes } = assembleManuscriptText([
      scene("One", "status: draft\nsynopsis: opening", "The harbor lay grey."),
      scene("Two", "status: draft\nsynopsis: middle", "She ran for the stairs."),
      scene("Three", "status: final\nact: Act I", "The door held."),
    ]);
    expect(joined).toBe("The harbor lay grey.\n\nShe ran for the stairs.\n\nThe door held.");
    expect(joined).not.toMatch(/status:|synopsis:|act:/);
    expect(scenes.map((s) => s.body)).toEqual([
      "The harbor lay grey.",
      "She ran for the stairs.",
      "The door held.",
    ]);
    expect(scenes.map((s) => s.title)).toEqual(["One", "Two", "Three"]);
  });

  it("leaves a body-leading --- divider alone (a non-mapping fence is prose)", () => {
    const { joined } = assembleManuscriptText([
      { title: "A", text: "---\n\nLater that night." },
    ]);
    expect(joined).toBe("---\n\nLater that night.");
  });

  it("a quoted YAML value no longer counts as dialogue or a most-used word", () => {
    const { joined } = assembleManuscriptText([
      scene("One", "status: draft", "The harbor lay grey under a thin cold light."),
      scene("Two", 'status: draft\nsynopsis: "She said no."', "The tide turned and the boats came home."),
    ]);
    expect(compositionProfile(joined).counts.dialogue).toBe(0);
    const words = wordFrequency(joined).map((f) => f.word);
    expect(words).not.toContain("synopsis");
    expect(words).not.toContain("status");
    expect(words).not.toContain("draft");
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
