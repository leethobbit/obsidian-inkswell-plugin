import { describe, expect, it } from "vitest";
import { detectMentions, firstMentionOffset, linkTarget, toLink } from "../src/codex/codex";
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

describe("firstMentionOffset", () => {
  const anna = entities[0]; // name "Anna", alias "The Shadow"
  const erik = entities[1];

  it("returns offsets that slice back to the matched name (mid-text)", () => {
    const text = "She turned as Anna entered.";
    const hit = firstMentionOffset(text, anna);
    expect(hit).not.toBeNull();
    expect(text.slice(hit!.from, hit!.to)).toBe("Anna");
  });

  it("locates a name at the very start (no consumed leading char)", () => {
    const text = "Anna arrived first.";
    const hit = firstMentionOffset(text, anna);
    expect(hit).toEqual({ from: 0, to: 4 });
  });

  it("returns the FIRST appearance when repeated", () => {
    const text = "Once, Anna spoke. Later, Anna left.";
    const hit = firstMentionOffset(text, anna)!;
    expect(hit.from).toBe(text.indexOf("Anna"));
    expect(text.slice(hit.from, hit.to)).toBe("Anna");
  });

  it("picks the earliest of name-or-alias, not the first needle tried", () => {
    // Alias appears before the name; offsets must point at the alias occurrence.
    const text = "They called her The Shadow long before anyone knew Anna.";
    const hit = firstMentionOffset(text, anna)!;
    expect(text.slice(hit.from, hit.to)).toBe("The Shadow");
  });

  it("returns null when the entity is absent (frontmatter-only reference)", () => {
    expect(firstMentionOffset("A quiet room, nobody home.", erik)).toBeNull();
    expect(firstMentionOffset("", anna)).toBeNull();
  });

  it("does not match a substring inside a larger word", () => {
    // 'Erik' inside 'Erikson' must not produce a bogus offset.
    expect(firstMentionOffset("The Erikson estate.", erik)).toBeNull();
  });
});
