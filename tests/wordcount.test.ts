import { describe, expect, it } from "vitest";
import { countWords } from "../src/lib/wordcount";

describe("countWords", () => {
  it("counts plain prose", () => {
    expect(countWords("The quick brown fox")).toBe(4);
  });

  it("ignores leading frontmatter", () => {
    const text = "---\ntitle: Foo\ntags: [a, b]\n---\nReal words here";
    expect(countWords(text)).toBe(3);
  });

  it("ignores Obsidian and HTML comments", () => {
    expect(countWords("hello %% a note to self %% world")).toBe(2);
    expect(countWords("hello <!-- skip me --> world")).toBe(2);
  });

  it("ignores fenced and inline code", () => {
    expect(countWords("before\n```\ncode here ignored\n```\nafter")).toBe(2);
    expect(countWords("use `npm run build` now")).toBe(2);
  });

  it("keeps wikilink and markdown-link display text, drops targets", () => {
    expect(countWords("see [[Some Note|the alias]] please")).toBe(4);
    expect(countWords("read [the docs](https://example.com/x) now")).toBe(4);
  });

  it("drops image references entirely", () => {
    expect(countWords("look ![alt text](img.png) here")).toBe(2);
  });

  it("counts hyphenated and apostrophe words as one", () => {
    expect(countWords("don't well-being")).toBe(2);
  });

  it("returns 0 for empty input", () => {
    expect(countWords("")).toBe(0);
  });

  // CJK counting: one grapheme = one word (the 字数/文字数 convention).
  // Multi-char CJK words deliberately count per character, not per word.

  it("counts each Chinese character in unspaced prose", () => {
    expect(countWords("你好世界")).toBe(4);
    expect(countWords("春眠不覺曉處處聞啼鳥")).toBe(10);
  });

  it("counts mixed CJK + Latin: chars plus space-delimited words", () => {
    expect(countWords("我在用Obsidian写作")).toBe(6); // 我 在 用 + Obsidian + 写 作
    expect(countWords("Chapter one: 第一章")).toBe(5);
  });

  it("counts Japanese kana and kanji per character, including ー", () => {
    expect(countWords("コーヒーを飲んだ。")).toBe(8); // scx puts ー with katakana
    expect(countWords("ありがとう")).toBe(5);
  });

  it("counts Korean hangul per syllable", () => {
    expect(countWords("안녕하세요")).toBe(5);
  });

  it("excludes CJK punctuation", () => {
    expect(countWords("你好，世界。")).toBe(4);
    expect(countWords("「静かに」と言った。")).toBe(7);
  });

  it("ignores frontmatter before CJK prose", () => {
    expect(countWords("---\ntitle: 章\n---\n正文在这里")).toBe(5);
  });

  it("keeps digits as one token inside CJK text", () => {
    expect(countWords("第3章")).toBe(3); // 第 + 3 + 章
  });
});
