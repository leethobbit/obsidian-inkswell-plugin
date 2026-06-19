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
});
