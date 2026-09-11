import { describe, expect, it } from "vitest";
import {
  buildLinkText,
  buildReplacement,
  findExistingEntity,
  relocate,
  seedFromSelection,
  selectionInsideWikilink,
  shouldOfferAlias,
} from "../src/codex/quick-codex";
import { CodexEntity } from "../src/codex/types";

/** Fixture notation: `|` = collapsed cursor, `⟦…⟧` = selection (as in inline-format tests). */
function parse(fixture: string): { doc: string; from: number; to: number } {
  const cursor = fixture.indexOf("|");
  if (cursor !== -1) {
    return { doc: fixture.slice(0, cursor) + fixture.slice(cursor + 1), from: cursor, to: cursor };
  }
  const open = fixture.indexOf("⟦");
  const close = fixture.indexOf("⟧");
  const doc = fixture.slice(0, open) + fixture.slice(open + 1, close) + fixture.slice(close + 1);
  return { doc, from: open, to: close - 1 };
}

const seed = (fixture: string) => {
  const { doc, from, to } = parse(fixture);
  return { doc, seed: seedFromSelection(doc, from, to) };
};

describe("seedFromSelection — selections", () => {
  it("keeps inner edge whitespace as lead/trail and trims the core", () => {
    const { seed: s } = seed("met⟦ Sarah Jones ⟧at");
    expect(s).toMatchObject({ lead: " ", trail: " ", core: "Sarah Jones", name: "Sarah Jones" });
    expect(s?.raw).toBe(" Sarah Jones ");
  });

  it("trims edge punctuation from the name but not from the core", () => {
    const { seed: s } = seed("⟦“Sarah,”⟧ she said");
    expect(s?.core).toBe("“Sarah,”");
    expect(s?.name).toBe("Sarah");
  });

  it("takes the name from the first line of a multi-line selection", () => {
    const { seed: s } = seed("⟦The Undercroft\nArchive⟧");
    expect(s?.name).toBe("The Undercroft");
  });

  it("returns null for a whitespace-only or punctuation-only selection", () => {
    expect(seed("a⟦   ⟧b").seed).toBeNull();
    expect(seed("a⟦...⟧b").seed).toBeNull();
  });
});

describe("seedFromSelection — cursor", () => {
  it("picks the word under the cursor", () => {
    const { seed: s } = seed("Create Sa|rah Jones");
    expect(s).toMatchObject({ rangeFrom: 7, rangeTo: 12, raw: "Sarah", core: "Sarah", name: "Sarah" });
  });

  it("picks the word just before a cursor at its end", () => {
    const { seed: s } = seed("Create Sarah|");
    expect(s?.raw).toBe("Sarah");
  });

  it("keeps apostrophes and hyphens inside a word", () => {
    expect(seed("saw O'Br|ien-Smith go").seed?.raw).toBe("O'Brien-Smith");
  });

  it("returns null in whitespace", () => {
    expect(seed("Sarah  |  Jones").seed).toBeNull();
  });

  it("treats one CJK grapheme as the word", () => {
    const { seed: s } = seed("龙飞|吼");
    expect(s?.raw).toBe("飞");
    expect(s?.rangeFrom).toBe(1);
  });
});

describe("selectionInsideWikilink", () => {
  it("is true when the selection touches an existing link on the line", () => {
    const doc = "see [[Anna]] now";
    expect(selectionInsideWikilink(doc, 7, 7)).toBe(true);
    expect(selectionInsideWikilink(doc, 6, 10)).toBe(true);
  });
  it("is false elsewhere", () => {
    expect(selectionInsideWikilink("see [[Anna]] now", 13, 16)).toBe(false);
    expect(selectionInsideWikilink("plain Anna", 6, 10)).toBe(false);
  });
});

describe("link text", () => {
  it("uses the alias form only when the shown text differs from the basename", () => {
    expect(buildLinkText("Anna", "Anna")).toBe("[[Anna]]");
    expect(buildLinkText("Anna", "anna")).toBe("[[Anna|anna]]");
    expect(buildLinkText("Anna", "")).toBe("[[Anna]]");
  });

  it("strips characters that would break the link from the alias", () => {
    expect(buildLinkText("Anna", "An|na]]")).toBe("[[Anna]]"); // sanitized alias == basename
    expect(buildLinkText("Anna", "the ]]kid|")).toBe("[[Anna|the kid]]");
  });

  it("buildReplacement keeps lead/trail whitespace around the link", () => {
    const { seed: s } = seed("met⟦ Sarah ⟧at");
    expect(buildReplacement(s!, "Sarah Jones")).toBe(" [[Sarah Jones|Sarah]] ");
    expect(buildReplacement(s!, "Sarah")).toBe(" [[Sarah]] ");
  });
});

describe("shouldOfferAlias", () => {
  it("is false when the name equals the selected text, true otherwise", () => {
    expect(shouldOfferAlias("Sarah", "Sarah")).toBe(false);
    expect(shouldOfferAlias("Sarah Jones", "Sarah")).toBe(true);
    expect(shouldOfferAlias("Sarah", "")).toBe(false);
  });
});

describe("relocate", () => {
  it("returns the original range when the text is unchanged", () => {
    const { doc, seed: s } = seed("met ⟦Sarah⟧ at");
    expect(relocate(doc, s!)).toEqual({ from: 4, to: 9 });
  });

  it("follows the literal after text was inserted before it", () => {
    const { doc, seed: s } = seed("met ⟦Sarah⟧ at");
    expect(relocate("Yesterday I " + doc, s!)).toEqual({ from: 16, to: 21 });
  });

  it("returns null when the literal is gone", () => {
    const { seed: s } = seed("met ⟦Sarah⟧ at");
    expect(relocate("met Beatrice at", s!)).toBeNull();
  });
});

describe("findExistingEntity", () => {
  const ents: CodexEntity[] = [
    { path: "Codex/Anna.md", name: "Anna", category: "character", aliases: ["Annie", "The Kid"] },
    { path: "Codex/Vesper Row.md", name: "Vesper Row", category: "location", aliases: [] },
  ];
  it("matches the name case-insensitively", () => {
    expect(findExistingEntity(ents, "anna")?.path).toBe("Codex/Anna.md");
    expect(findExistingEntity(ents, " vesper row ")?.name).toBe("Vesper Row");
  });
  it("matches an alias case-insensitively", () => {
    expect(findExistingEntity(ents, "the kid")?.name).toBe("Anna");
  });
  it("returns null for no match or a blank name", () => {
    expect(findExistingEntity(ents, "Beatrice")).toBeNull();
    expect(findExistingEntity(ents, "   ")).toBeNull();
  });
});
