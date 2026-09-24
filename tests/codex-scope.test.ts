import { describe, expect, it } from "vitest";
import {
  bookMatches,
  defaultScopeForProject,
  describeCreateScope,
  filterToScope,
  isEntityVisible,
  isGlobalScope,
  parseProjectScopeValue,
  projectKey,
  projectName,
  remapScopeProjects,
  scopeContextForEntity,
  scopeContextForProject,
} from "../src/codex/codex-scope";
import { CodexEntity, EntityScope } from "../src/codex/types";
import { Project, SeriesInfo } from "../src/projects/types";

function project(title: string, series?: Partial<SeriesInfo> | null, path?: string): Project {
  return {
    vaultPath: path ?? `${title}.md`,
    draft: {
      format: "single",
      title,
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
    },
    scenes: [],
    unknownFiles: [],
    inkswell: series ? { series: series as SeriesInfo } : null,
  };
}

/** A named draft of a story (same `title`, its own path + draftTitle). */
function draft(
  title: string,
  draftTitle: string,
  path: string,
  series?: Partial<SeriesInfo> | null
): Project {
  const p = project(title, series, path);
  return { ...p, draft: { ...p.draft, draftTitle, titleInFrontmatter: true } };
}

function entity(name: string, scope?: EntityScope): CodexEntity {
  return { path: `Codex/${name}.md`, name, category: "character", aliases: [], scope };
}

/** The canonical two-draft story: base at the story root, copy under Drafts/. */
const NOVEL_BASE = draft("Novel", "First Draft", "Books/Novel/Novel.md");
const NOVEL_D2 = draft("Novel", "Second Draft", "Books/Novel/Drafts/Second/Novel — Second.md");
const TWO_DRAFTS = [NOVEL_BASE, NOVEL_D2];
/** A story's vantage carries both identity forms of every draft: basenames, then path forms. */
const NOVEL_KEYS = [
  "Novel",
  "Novel — Second",
  "Books/Novel/Novel",
  "Books/Novel/Drafts/Second/Novel — Second",
];

describe("projectName", () => {
  it("is the index-note basename without extension or folders", () => {
    expect(projectName(project("Book One", null, "Series/Book One.md"))).toBe("Book One");
    expect(projectName(project("Solo"))).toBe("Solo");
  });
});

describe("parseProjectScopeValue (codex-project frontmatter → book basenames)", () => {
  it("reads the pre-1.17 single wikilink string", () => {
    expect(parseProjectScopeValue("[[Book One]]")).toEqual(["Book One"]);
    expect(parseProjectScopeValue("Book One")).toEqual(["Book One"]);
    expect(parseProjectScopeValue("[[Book One|alias]]")).toEqual(["Book One"]);
  });

  it("reads a list of wikilinks, skipping junk and duplicates, keeping order", () => {
    expect(parseProjectScopeValue(["[[B]]", "[[A]]"])).toEqual(["B", "A"]);
    expect(parseProjectScopeValue(["[[A]]", 7, "", null, "  ", "[[A]]", "B"])).toEqual(["A", "B"]);
  });

  it("treats anything else as global", () => {
    expect(parseProjectScopeValue(undefined)).toEqual([]);
    expect(parseProjectScopeValue(null)).toEqual([]);
    expect(parseProjectScopeValue("")).toEqual([]);
    expect(parseProjectScopeValue(42)).toEqual([]);
    expect(parseProjectScopeValue({})).toEqual([]);
    expect(parseProjectScopeValue([42, {}])).toEqual([]);
  });
});

describe("scopeContextForProject", () => {
  it("derives series from the active project", () => {
    const p = project("Book One", { name: "Saga" });
    expect(scopeContextForProject(p, [p])).toEqual({
      projectNames: ["Book One"],
      seriesName: "Saga",
    });
  });

  it("leaves series null for a standalone project, and empty for none", () => {
    const p = project("Solo");
    expect(scopeContextForProject(p, [p])).toEqual({
      projectNames: ["Solo"],
      seriesName: null,
    });
    expect(scopeContextForProject(null, [p])).toEqual({ projectNames: [], seriesName: null });
  });

  it("carries EVERY draft of the active story, from either draft's vantage", () => {
    expect(scopeContextForProject(NOVEL_BASE, TWO_DRAFTS).projectNames).toEqual(NOVEL_KEYS);
    expect(scopeContextForProject(NOVEL_D2, TWO_DRAFTS).projectNames).toEqual(NOVEL_KEYS);
  });

  it("resolves series from the base draft when a sibling copy carries a stale one", () => {
    const base = draft("Novel", "First", "Books/Novel/Novel.md", { name: "Saga" });
    const copy = draft("Novel", "Second", "Books/Novel/Drafts/S/Novel — S.md", {
      name: "Old Saga Name",
    });
    expect(scopeContextForProject(copy, [base, copy]).seriesName).toBe("Saga");
  });
});

describe("defaultScopeForProject", () => {
  it("prefers the series when the active book belongs to one", () => {
    const p = project("Book One", { name: "Saga" });
    expect(defaultScopeForProject(p, [p])).toEqual({ series: "Saga" });
  });

  it("falls back to the book (a one-element list) for a standalone project", () => {
    const p = project("Solo");
    expect(defaultScopeForProject(p, [p])).toEqual({ projects: ["Solo"] });
  });

  it("is global when no project is active", () => {
    expect(defaultScopeForProject(null, [])).toEqual({});
  });

  it("normalizes to the BASE draft's basename when a later draft is active", () => {
    expect(defaultScopeForProject(NOVEL_D2, TWO_DRAFTS)).toEqual({ projects: ["Novel"] });
  });
});

describe("describeCreateScope / isGlobalScope", () => {
  it("describes series, one book, several books, and global", () => {
    expect(describeCreateScope({ series: "Saga" })).toContain("Saga");
    expect(describeCreateScope({ projects: ["Solo"] })).toContain("“Solo”");
    expect(describeCreateScope({ projects: ["A", "B", "C"] })).toContain("3 books");
    expect(describeCreateScope({})).toContain("global");
    expect(describeCreateScope({ projects: [] })).toContain("global");
  });

  it("an empty book list is global", () => {
    expect(isGlobalScope(undefined)).toBe(true);
    expect(isGlobalScope({})).toBe(true);
    expect(isGlobalScope({ projects: [] })).toBe(true);
    expect(isGlobalScope({ projects: ["A"] })).toBe(false);
    expect(isGlobalScope({ series: "Saga" })).toBe(false);
  });
});

describe("isEntityVisible", () => {
  const sagaCtx = { projectNames: ["Book One"], seriesName: "Saga" };

  it("shows untagged (global) entities everywhere", () => {
    expect(isEntityVisible(entity("Narrator"), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Narrator", {}), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Narrator"), { projectNames: [], seriesName: null })).toBe(true);
  });

  it("shows a series-tagged entity to any book in that series", () => {
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectNames: ["Book Two"],
      seriesName: "Saga",
    })).toBe(true);
  });

  it("hides a series-tagged entity from a different (or no) series", () => {
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectNames: ["Thriller"],
      seriesName: "Crime",
    })).toBe(false);
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectNames: ["Solo"],
      seriesName: null,
    })).toBe(false);
  });

  it("shows a project-tagged entity only to its own story", () => {
    expect(isEntityVisible(entity("Vance", { projects: ["Book One"] }), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Vance", { projects: ["Book Two"] }), sagaCtx)).toBe(false);
  });

  it("#40: a multi-book entity is visible from EACH listed book and hidden from the rest", () => {
    const two = entity("Recurring", { projects: ["Book Two", "Book Three"] });
    const ctx = (book: string) => ({ projectNames: [book], seriesName: "Saga" });
    expect(isEntityVisible(two, ctx("Book Two"))).toBe(true);
    expect(isEntityVisible(two, ctx("Book Three"))).toBe(true);
    expect(isEntityVisible(two, ctx("Book One"))).toBe(false);
    expect(isEntityVisible(two, ctx("Book Four"))).toBe(false);
    // Series membership alone does NOT admit it — it is book-scoped, not series-wide.
    expect(isEntityVisible(two, { projectNames: [], seriesName: "Saga" })).toBe(false);
  });

  it("a listed NON-base draft name still matches via the story vantage", () => {
    const fromBase = scopeContextForProject(NOVEL_BASE, TWO_DRAFTS);
    expect(isEntityVisible(entity("Bob", { projects: ["Other", "Novel — Second"] }), fromBase)).toBe(
      true
    );
  });

  it("the user-reported bug: base-scoped entity is visible from a NEW draft (and vice versa)", () => {
    const fromD2 = scopeContextForProject(NOVEL_D2, TWO_DRAFTS);
    const fromBase = scopeContextForProject(NOVEL_BASE, TWO_DRAFTS);
    // Entity created under the original draft, viewed from the copy…
    expect(isEntityVisible(entity("Alice", { projects: ["Novel"] }), fromD2)).toBe(true);
    // …and a legacy entity that was scoped to the copy, viewed from the original.
    expect(isEntityVisible(entity("Bob", { projects: ["Novel — Second"] }), fromBase)).toBe(true);
    // A different story's entity stays invisible from both.
    expect(isEntityVisible(entity("Eve", { projects: ["Other Book"] }), fromD2)).toBe(false);
  });
});

describe("filterToScope", () => {
  it("keeps globals + matching series/project, drops the rest", () => {
    const entities = [
      entity("Global"),
      entity("SagaWide", { series: "Saga" }),
      entity("BookOnly", { projects: ["Book One"] }),
      entity("TwoBooks", { projects: ["Book Two", "Book One"] }),
      entity("OtherBook", { projects: ["Book Two"] }),
      entity("OtherSeries", { series: "Crime" }),
    ];
    const kept = filterToScope(entities, { projectNames: ["Book One"], seriesName: "Saga" }).map(
      (e) => e.name
    );
    expect(kept).toEqual(["Global", "SagaWide", "BookOnly", "TwoBooks"]);
  });
});

describe("scopeContextForEntity", () => {
  const projects = [project("Book One", { name: "Saga" }), project("Solo")];

  it("returns null (no constraint) for a global entity", () => {
    expect(scopeContextForEntity(entity("Narrator"), projects)).toBeNull();
    expect(scopeContextForEntity(entity("Narrator", {}), projects)).toBeNull();
    expect(scopeContextForEntity(entity("Narrator", { projects: [] }), projects)).toBeNull();
  });

  it("scopes a series entity to its series", () => {
    expect(scopeContextForEntity(entity("Aragorn", { series: "Saga" }), projects)).toEqual({
      projectNames: [],
      seriesName: "Saga",
    });
  });

  it("scopes a project entity to its book AND resolves its series so series-mates stay linkable", () => {
    expect(scopeContextForEntity(entity("Vance", { projects: ["Book One"] }), projects)).toEqual({
      projectNames: ["Book One"],
      seriesName: "Saga",
    });
  });

  it("leaves series null for a standalone-project entity or an unknown project", () => {
    expect(scopeContextForEntity(entity("X", { projects: ["Solo"] }), projects)).toEqual({
      projectNames: ["Solo"],
      seriesName: null,
    });
    expect(scopeContextForEntity(entity("X", { projects: ["Ghost"] }), projects)).toEqual({
      projectNames: ["Ghost"],
      seriesName: null,
    });
  });

  it("expands a project-scoped entity to its owning story's drafts", () => {
    const ctx = scopeContextForEntity(entity("Alice", { projects: ["Novel"] }), TWO_DRAFTS);
    expect(ctx).toEqual({ projectNames: NOVEL_KEYS, seriesName: null });
    // Even when the entity's recorded scope names the NON-base draft.
    const legacy = scopeContextForEntity(entity("Bob", { projects: ["Novel — Second"] }), TWO_DRAFTS);
    expect(legacy?.projectNames).toEqual(NOVEL_KEYS);
  });

  it("a multi-book entity's vantage is the UNION of its books' stories (+ first series found)", () => {
    const all = [...TWO_DRAFTS, ...projects];
    const ctx = scopeContextForEntity(entity("R", { projects: ["Solo", "Novel", "Book One"] }), all);
    expect(ctx).toEqual({
      projectNames: ["Solo", ...NOVEL_KEYS, "Book One"],
      seriesName: "Saga",
    });
    // One known book + one ghost: the ghost keeps its name, widens nothing.
    expect(scopeContextForEntity(entity("R", { projects: ["Ghost", "Book One"] }), all)).toEqual({
      projectNames: ["Ghost", "Book One"],
      seriesName: "Saga",
    });
  });

  it("a series entity's candidates exclude other series but include globals (integration)", () => {
    const all = [
      entity("Mina", { series: "Mina Mora" }),
      entity("Zoie", { series: "Mina Mora" }),
      entity("Mara", { series: "The Lattice Cycle" }),
      entity("Narrator"),
    ];
    const ctx = scopeContextForEntity(entity("Mina", { series: "Mina Mora" }), projects);
    const names = filterToScope(all, ctx!).map((e) => e.name);
    expect(names).toEqual(["Mina", "Zoie", "Narrator"]); // no "Mara" (other series)
  });
});

describe("remapScopeProjects (project rename)", () => {
  const byOld = new Map([["Old", "New"]]);

  it("remaps a matching book, leaving the others", () => {
    expect(remapScopeProjects({ projects: ["Old"] }, byOld)).toEqual({ projects: ["New"] });
    expect(remapScopeProjects({ projects: ["A", "Old"] }, byOld)).toEqual({ projects: ["A", "New"] });
  });

  it("collapses a duplicate the rename would create", () => {
    expect(remapScopeProjects({ projects: ["New", "Old"] }, byOld)).toEqual({ projects: ["New"] });
  });

  it("returns null when nothing changes, and never touches a series scope", () => {
    expect(remapScopeProjects({ projects: ["A"] }, byOld)).toBeNull();
    expect(remapScopeProjects({}, byOld)).toBeNull();
    expect(remapScopeProjects({ series: "Old" }, byOld)).toBeNull();
  });

  it("matches the old key case-insensitively and remaps the path form too", () => {
    const moves = new Map([
      ["Books/Old/Old", "Books/New/New"],
      ["Old", "New"],
    ]);
    expect(remapScopeProjects({ projects: ["old"] }, moves)).toEqual({ projects: ["New"] });
    expect(remapScopeProjects({ projects: ["Books/Old/Old"] }, moves)).toEqual({
      projects: ["Books/New/New"],
    });
  });
});

describe("book identity when index notes share a basename (#44)", () => {
  // Two Longform-style books, both indexed by `Index.md`, plus one with a unique name.
  const A = project("Alpha Book", null, "Books/Alpha/Index.md");
  const B = project("Beta Book", null, "Books/Beta/Index.md");
  const SOLO = project("Solo", null, "Books/Solo/Solo.md");
  const all = [A, B, SOLO];

  it("projectKey is the basename when unique, the path form when shared", () => {
    expect(projectKey(SOLO, all)).toBe("Solo");
    expect(projectKey(A, all)).toBe("Books/Alpha/Index");
    expect(projectKey(B, all)).toBe("Books/Beta/Index");
  });

  it("bookMatches accepts either form, case-insensitively", () => {
    expect(bookMatches("Index", A)).toBe(true);
    expect(bookMatches("books/alpha/index", A)).toBe(true);
    expect(bookMatches("Books/Beta/Index", A)).toBe(false);
    expect(bookMatches(" solo ", SOLO)).toBe(true);
  });

  it("path-form scopes keep the two books apart", () => {
    const forA = entity("Ada", { projects: ["Books/Alpha/Index"] });
    expect(isEntityVisible(forA, scopeContextForProject(A, all))).toBe(true);
    expect(isEntityVisible(forA, scopeContextForProject(B, all))).toBe(false);
    expect(isEntityVisible(forA, scopeContextForProject(SOLO, all))).toBe(false);
  });

  it("a legacy ambiguous basename stays visible from every book that shares it", () => {
    const legacy = entity("Bea", { projects: ["Index"] });
    expect(isEntityVisible(legacy, scopeContextForProject(A, all))).toBe(true);
    expect(isEntityVisible(legacy, scopeContextForProject(B, all))).toBe(true);
    expect(isEntityVisible(legacy, scopeContextForProject(SOLO, all))).toBe(false);
    // …and its own vantage is the union of both stories.
    const ctx = scopeContextForEntity(legacy, all);
    expect(ctx?.projectNames).toEqual(
      expect.arrayContaining(["Index", "Books/Alpha/Index", "Books/Beta/Index"])
    );
  });

  it("new entries default to the unambiguous key", () => {
    expect(defaultScopeForProject(A, all)).toEqual({ projects: ["Books/Alpha/Index"] });
    expect(defaultScopeForProject(SOLO, all)).toEqual({ projects: ["Solo"] });
  });
});
