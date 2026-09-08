import { describe, expect, it } from "vitest";
import { TypographyRules, smartTypography } from "../src/lib/smart-typography";

const ALL: TypographyRules = { dashes: true, quotes: true, ellipsis: true };

/** Type `typed` at the end of `doc` (or at `pos`). */
const type = (doc: string, typed: string, rules: TypographyRules = ALL, pos = doc.length) =>
  smartTypography(doc, pos, typed, rules);

/** The inserted text only (null when the default insert should happen). */
const ins = (doc: string, typed: string, rules: TypographyRules = ALL, pos = doc.length) =>
  type(doc, typed, rules, pos)?.insert ?? null;

describe("smartTypography — dashes", () => {
  it("turns -- into an en dash and a third - into an em dash", () => {
    expect(type("a-", "-")).toEqual({ from: 1, to: 2, insert: "–" });
    expect(type("a–", "-")).toEqual({ from: 1, to: 2, insert: "—" });
  });
  it("leaves an em dash alone", () => {
    expect(type("a—", "-")).toBeNull();
  });
  it("converts inside a word", () => {
    expect(type("re-", "-")).toEqual({ from: 2, to: 3, insert: "–" });
  });
  it("never touches a dash run at the start of a line (thematic breaks)", () => {
    expect(type("--", "-")).toBeNull();
    expect(type("x\n-", "-", ALL, 3)).toBeNull();
    expect(type("  -", "-")).toBeNull();
  });
  it("only looks at text before the cursor", () => {
    expect(type("a-b", "-", ALL, 2)).toEqual({ from: 1, to: 2, insert: "–" });
  });
  it("respects the rule switch", () => {
    expect(type("a-", "-", { ...ALL, dashes: false })).toBeNull();
  });
  it("respects a backslash escape", () => {
    expect(type("\\-", "-")).toBeNull();
  });
});

describe("smartTypography — ellipsis", () => {
  it("turns ... into …", () => {
    expect(type("..", ".")).toEqual({ from: 0, to: 2, insert: "…" });
  });
  it("leaves one dot or an existing ellipsis alone", () => {
    expect(type("a.", ".")).toBeNull();
    expect(type("…", ".")).toBeNull();
  });
  it("respects the rule switch", () => {
    expect(type("..", ".", { ...ALL, ellipsis: false })).toBeNull();
  });
});

describe("smartTypography — quotes", () => {
  it("opens at the start of the document and after whitespace", () => {
    expect(type("", '"')).toEqual({ from: 0, to: 0, insert: "“" });
    expect(ins("He said ", '"')).toBe("“");
    expect(ins("x\n", '"')).toBe("“");
    expect(ins("x ", "'")).toBe("‘");
  });
  it("closes after a word", () => {
    expect(ins("Hello", '"')).toBe("”");
    expect(ins("don", "'")).toBe("’");
  });
  it("opens after brackets, opening quotes and dashes", () => {
    for (const p of ["(", "[", "{", "“", "—", "–", "-"]) expect(ins(p, '"')).toBe("“");
    expect(ins("“", "'")).toBe("‘");
  });
  it("looks through emphasis markers before the cursor", () => {
    expect(ins("He said **", '"')).toBe("“");
    expect(ins("**bold**", '"')).toBe("”");
  });
  it("respects the rule switch and a backslash escape", () => {
    expect(type("a", '"', { ...ALL, quotes: false })).toBeNull();
    expect(type("\\", '"')).toBeNull();
  });
});

describe("smartTypography — guards", () => {
  it("ignores multi-character input (paste, IME commits)", () => {
    expect(type("a-", "--")).toBeNull();
    expect(type("", "")).toBeNull();
  });
  it("skips inline code", () => {
    expect(type("`code ", '"')).toBeNull();
    expect(ins("`code` ", '"')).toBe("“");
    expect(type("`a-", "-")).toBeNull();
  });
  it("skips fenced code blocks", () => {
    expect(type("```\nx", '"')).toBeNull();
    expect(type("~~~\nx-", "-")).toBeNull();
    expect(ins("```\nx\n```\ny", '"')).toBe("”");
  });
  it("skips unclosed wikilinks and link targets", () => {
    expect(type("[[O", "'")).toBeNull();
    expect(ins("[[O]] don", "'")).toBe("’");
    expect(type("[a](http://x/a-", "-")).toBeNull();
    expect(ins("[a](http://x) don", "'")).toBe("’");
  });
  it("treats to-do placeholders as prose", () => {
    expect(ins("[TODO: he said ", '"')).toBe("“");
  });
  it("clamps an out-of-range position", () => {
    expect(type("a-", "-", ALL, 99)).toEqual({ from: 1, to: 2, insert: "–" });
  });
});
