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
});
