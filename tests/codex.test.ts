import { describe, expect, it } from "vitest";
import { detectMentions, linkTarget, toLink } from "../src/codex/codex";
import { CodexEntity } from "../src/codex/types";

const entities: CodexEntity[] = [
  { path: "Codex/Anna.md", name: "Anna", category: "character", aliases: ["The Shadow"] },
  { path: "Codex/Erik.md", name: "Erik", category: "character", aliases: [] },
  { path: "Codex/Mife.md", name: "Mife", category: "location", aliases: [] },
];

describe("link helpers", () => {
  it("wraps and unwraps wikilinks", () => {
    expect(toLink("Anna")).toBe("[[Anna]]");
    expect(linkTarget("[[Anna]]")).toBe("Anna");
    expect(linkTarget("[[Anna|A]]")).toBe("Anna");
    expect(linkTarget("Anna")).toBe("Anna");
  });
});

describe("detectMentions", () => {
  it("matches names as whole words, case-insensitive", () => {
    const text = "anna walked into the city of Mife.";
    const m = detectMentions(text, entities).map((x) => x.name);
    expect(m).toContain("Anna");
    expect(m).toContain("Mife");
    expect(m).not.toContain("Erik");
  });

  it("matches aliases", () => {
    const text = "They called her The Shadow.";
    expect(detectMentions(text, entities).map((x) => x.name)).toEqual(["Anna"]);
  });

  it("does not match substrings inside larger words", () => {
    const text = "The Erikson family arrived."; // 'Erik' inside 'Erikson'
    expect(detectMentions(text, entities).map((x) => x.name)).not.toContain("Erik");
  });

  it("returns one mention per entity even if repeated", () => {
    const text = "Anna, Anna, Anna!";
    expect(detectMentions(text, entities).filter((m) => m.name === "Anna")).toHaveLength(1);
  });

  // The iOS-safe regex replaced a lookbehind with a group that *consumes* one
  // preceding non-word char (or matches start-of-string). These lock down the
  // boundary semantics that change is most likely to get subtly wrong.

  it("matches a name at the very start of the text (the ^ branch)", () => {
    expect(detectMentions("Anna left at dawn.", entities).map((x) => x.name)).toContain("Anna");
  });

  it("matches a name at the start of a line (after a newline)", () => {
    const text = "She paused.\nErik spoke first.";
    expect(detectMentions(text, entities).map((x) => x.name)).toContain("Erik");
  });

  it("matches names hugged by punctuation with no surrounding spaces", () => {
    const text = `"Anna!" muttered (Erik).`;
    const m = detectMentions(text, entities).map((x) => x.name);
    expect(m).toContain("Anna");
    expect(m).toContain("Erik");
  });

  it("detects two names separated by a single delimiter (the consumed-char case)", () => {
    // Matching "Anna" leaves the comma; "Erik"'s leading group must still be able
    // to consume that same comma. Per-entity .test() makes this independent — this
    // guards against a regression to a single global scan.
    const text = "Present: Anna,Erik.";
    const m = detectMentions(text, entities).map((x) => x.name);
    expect(m).toContain("Anna");
    expect(m).toContain("Erik");
  });

  it("matches a possessive form (trailing apostrophe is a boundary)", () => {
    expect(detectMentions("Anna's journal", entities).map((x) => x.name)).toContain("Anna");
  });

  it("does not match a name fused to a digit", () => {
    // A digit is a word char (\p{N}), so neither boundary opens: no false positive.
    const m = detectMentions("room 3Anna4 ", entities).map((x) => x.name);
    expect(m).not.toContain("Anna");
  });

  it("respects unicode word boundaries for accented names", () => {
    const accented: CodexEntity[] = [
      { path: "Codex/Zoe.md", name: "Zoë", category: "character", aliases: [] },
    ];
    expect(detectMentions("Then Zoë vanished.", accented).map((x) => x.name)).toEqual(["Zoë"]);
    // Plural/substring must NOT match (trailing letter blocks the boundary).
    expect(detectMentions("the Zoës arrived", accented)).toEqual([]);
  });
});
