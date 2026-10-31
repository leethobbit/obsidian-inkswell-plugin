import { describe, expect, it } from "vitest";
import {
  codexSearchMatch,
  isPinnedIn,
  pinnedFirst,
  withPin,
  withoutPin,
} from "../src/codex/codex-list";
import { ScopeContext } from "../src/codex/codex-scope";
import { CodexEntity } from "../src/codex/types";

function entity(name: string, extra: Partial<CodexEntity> = {}): CodexEntity {
  return { path: `Codex/${name}.md`, name, category: "character", aliases: [], ...extra };
}

/** A two-draft story's vantage: both drafts' basenames, then their path forms. */
const NOVEL: ScopeContext = {
  projectNames: ["Novel", "Novel — Second", "Books/Novel/Novel", "Books/Novel/Drafts/Second/Novel — Second"],
  seriesName: null,
};
const SEQUEL: ScopeContext = { projectNames: ["Sequel", "Books/Sequel/Sequel"], seriesName: null };

describe("isPinnedIn (#70)", () => {
  it("matches a pin naming any draft of the open book, in either form, ignoring case", () => {
    expect(isPinnedIn(entity("Mira", { pinned: ["Novel"] }), NOVEL)).toBe(true);
    expect(isPinnedIn(entity("Mira", { pinned: ["novel — second"] }), NOVEL)).toBe(true);
    expect(isPinnedIn(entity("Mira", { pinned: ["Books/Novel/Novel"] }), NOVEL)).toBe(true);
  });

  it("is per book: a pin in another book, no pins, or no book open is not pinned", () => {
    expect(isPinnedIn(entity("Mira", { pinned: ["Sequel"] }), NOVEL)).toBe(false);
    expect(isPinnedIn(entity("Mira"), NOVEL)).toBe(false);
    expect(isPinnedIn(entity("Mira", { pinned: ["Novel"] }), null)).toBe(false);
  });
});

describe("pinnedFirst", () => {
  const list = [
    entity("Anna"),
    entity("Bram", { pinned: ["Novel"] }),
    entity("Cass"),
    entity("Dov", { pinned: ["Novel", "Sequel"] }),
  ];

  it("puts the open book's pins first, each side keeping its A–Z order", () => {
    expect(pinnedFirst(list, NOVEL).map((e) => e.name)).toEqual(["Bram", "Dov", "Anna", "Cass"]);
    expect(pinnedFirst(list, SEQUEL).map((e) => e.name)).toEqual(["Dov", "Anna", "Bram", "Cass"]);
  });

  it("leaves the order alone with no book open", () => {
    expect(pinnedFirst(list, null).map((e) => e.name)).toEqual(["Anna", "Bram", "Cass", "Dov"]);
  });
});

describe("withPin / withoutPin (delta on the stored list)", () => {
  it("adds the book once, keeping other books' pins", () => {
    expect(withPin([], NOVEL, "Novel")).toEqual(["Novel"]);
    expect(withPin(["Sequel"], NOVEL, "Novel")).toEqual(["Sequel", "Novel"]);
  });

  it("doesn't add a second key when another draft of the story is already named", () => {
    expect(withPin(["Novel — Second"], NOVEL, "Novel")).toEqual(["Novel — Second"]);
  });

  it("removes every value naming the story, and only those", () => {
    expect(withoutPin(["Novel", "Sequel", "books/novel/drafts/second/novel — second"], NOVEL)).toEqual(["Sequel"]);
    expect(withoutPin(["Sequel"], NOVEL)).toEqual(["Sequel"]);
  });
});

describe("codexSearchMatch", () => {
  const mira = entity("Mira Vale", { aliases: ["The Lamplighter"], classifiers: ["Antagonist"] });

  it("matches the name or an alias first", () => {
    expect(codexSearchMatch(mira, "vale")).toBe("name");
    expect(codexSearchMatch(mira, "lamp")).toBe("name");
  });

  it("then the Role / Type value, reporting which one matched", () => {
    expect(codexSearchMatch(mira, "antag")).toEqual({ classifier: "Antagonist" });
  });

  it("is null when nothing matches, and everything matches an empty query", () => {
    expect(codexSearchMatch(mira, "mentor")).toBeNull();
    expect(codexSearchMatch(entity("Bram"), "antag")).toBeNull();
    expect(codexSearchMatch(mira, "")).toBe("name");
  });
});
