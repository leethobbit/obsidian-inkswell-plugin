import { describe, expect, it } from "vitest";
import {
  LinkCandidate,
  completionText,
  linkContextAt,
  rankCandidates,
} from "../src/lib/link-complete";

describe("linkContextAt", () => {
  it("finds an open [[ before the cursor and the query typed so far", () => {
    const line = "she met [[Ann";
    expect(linkContextAt(line, line.length)).toEqual({ from: 10, query: "Ann" });
    expect(linkContextAt("[[", 2)).toEqual({ from: 2, query: "" });
  });

  it("is null with no [[, after the link closed, or past an alias/heading pipe", () => {
    expect(linkContextAt("plain text", 5)).toBeNull();
    expect(linkContextAt("[[Anna]] then", 13)).toBeNull();
    expect(linkContextAt("[[Anna|sis", 10)).toBeNull();
    expect(linkContextAt("[[Anna#Bio", 10)).toBeNull();
  });

  it("is null inside an inline code span", () => {
    expect(linkContextAt("use `[[not", 10)).toBeNull();
    expect(linkContextAt("`x` then [[yes", 14)).toEqual({ from: 11, query: "yes" });
  });

  it("uses the [[ nearest the cursor when several are on the line", () => {
    const line = "[[Anna]] and [[Be";
    expect(linkContextAt(line, line.length)).toEqual({ from: 15, query: "Be" });
  });
});

const cands: LinkCandidate[] = [
  { name: "Anna", kind: "codex", detail: "Character" },
  { name: "Anna", kind: "codex", alias: "The Shadow", detail: "Character" },
  { name: "The Undercroft Archive", kind: "codex", detail: "Location" },
  { name: "04 - The Undercroft", kind: "scene", detail: "Scene" },
  { name: "Annotations", kind: "note" },
  { name: "Banana", kind: "note" },
];

describe("rankCandidates", () => {
  it("with an empty query orders codex, then scenes, then notes, by name", () => {
    expect(rankCandidates("", cands).map((c) => c.kind)).toEqual([
      "codex",
      "codex",
      "codex",
      "scene",
      "note",
      "note",
    ]);
  });

  it("ranks exact > prefix > word-start > substring > subsequence", () => {
    const names = rankCandidates("anna", cands).map((c) => c.alias ?? c.name);
    expect(names[0]).toBe("Anna");
    expect(names).toContain("Annotations");
    expect(names).toContain("Banana");
    expect(names.indexOf("Annotations")).toBeLessThan(names.indexOf("Banana"));
  });

  it("matches on the alias and returns the aliased candidate", () => {
    const hit = rankCandidates("shadow", cands);
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ name: "Anna", alias: "The Shadow" });
  });

  it("is case-insensitive and fuzzy", () => {
    const names = rankCandidates("undrcrft", cands).map((c) => c.name);
    expect(names).toContain("The Undercroft Archive");
    expect(names).toContain("04 - The Undercroft");
  });

  it("drops non-matches and honours the limit", () => {
    expect(rankCandidates("zzz", cands)).toEqual([]);
    expect(rankCandidates("", cands, 2)).toHaveLength(2);
  });
});

describe("completionText", () => {
  it("closes the link, adding the alias form for alias picks", () => {
    expect(completionText({ name: "Anna", kind: "codex" })).toBe("Anna]]");
    expect(completionText({ name: "Anna", kind: "codex", alias: "The Shadow" })).toBe(
      "Anna|The Shadow]]"
    );
    expect(completionText({ name: "Anna", kind: "codex", alias: "Anna" })).toBe("Anna]]");
    expect(completionText({ name: "Anna", kind: "codex", alias: "a|b]]" })).toBe("Anna|ab]]");
  });
});
