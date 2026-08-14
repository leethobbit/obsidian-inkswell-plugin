import { describe, expect, it } from "vitest";
import {
  defaultScopeForProject,
  filterToScope,
  isEntityVisible,
  projectName,
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

describe("projectName", () => {
  it("is the index-note basename without extension or folders", () => {
    expect(projectName(project("Book One", null, "Series/Book One.md"))).toBe("Book One");
    expect(projectName(project("Solo"))).toBe("Solo");
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
    const names = ["Novel", "Novel — Second"];
    expect(scopeContextForProject(NOVEL_BASE, TWO_DRAFTS).projectNames).toEqual(names);
    expect(scopeContextForProject(NOVEL_D2, TWO_DRAFTS).projectNames).toEqual(names);
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

  it("falls back to the book for a standalone project", () => {
    const p = project("Solo");
    expect(defaultScopeForProject(p, [p])).toEqual({ project: "Solo" });
  });

  it("is global when no project is active", () => {
    expect(defaultScopeForProject(null, [])).toEqual({});
  });

  it("normalizes to the BASE draft's basename when a later draft is active", () => {
    expect(defaultScopeForProject(NOVEL_D2, TWO_DRAFTS)).toEqual({ project: "Novel" });
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
    expect(isEntityVisible(entity("Vance", { project: "Book One" }), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Vance", { project: "Book Two" }), sagaCtx)).toBe(false);
  });

  it("the user-reported bug: base-scoped entity is visible from a NEW draft (and vice versa)", () => {
    const fromD2 = scopeContextForProject(NOVEL_D2, TWO_DRAFTS);
    const fromBase = scopeContextForProject(NOVEL_BASE, TWO_DRAFTS);
    // Entity created under the original draft, viewed from the copy…
    expect(isEntityVisible(entity("Alice", { project: "Novel" }), fromD2)).toBe(true);
    // …and a legacy entity that was scoped to the copy, viewed from the original.
    expect(isEntityVisible(entity("Bob", { project: "Novel — Second" }), fromBase)).toBe(true);
    // A different story's entity stays invisible from both.
    expect(isEntityVisible(entity("Eve", { project: "Other Book" }), fromD2)).toBe(false);
  });
});

describe("filterToScope", () => {
  it("keeps globals + matching series/project, drops the rest", () => {
    const entities = [
      entity("Global"),
      entity("SagaWide", { series: "Saga" }),
      entity("BookOnly", { project: "Book One" }),
      entity("OtherBook", { project: "Book Two" }),
      entity("OtherSeries", { series: "Crime" }),
    ];
    const kept = filterToScope(entities, { projectNames: ["Book One"], seriesName: "Saga" }).map(
      (e) => e.name
    );
    expect(kept).toEqual(["Global", "SagaWide", "BookOnly"]);
  });
});

describe("scopeContextForEntity", () => {
  const projects = [project("Book One", { name: "Saga" }), project("Solo")];

  it("returns null (no constraint) for a global entity", () => {
    expect(scopeContextForEntity(entity("Narrator"), projects)).toBeNull();
    expect(scopeContextForEntity(entity("Narrator", {}), projects)).toBeNull();
  });

  it("scopes a series entity to its series", () => {
    expect(scopeContextForEntity(entity("Aragorn", { series: "Saga" }), projects)).toEqual({
      projectNames: [],
      seriesName: "Saga",
    });
  });

  it("scopes a project entity to its book AND resolves its series so series-mates stay linkable", () => {
    expect(scopeContextForEntity(entity("Vance", { project: "Book One" }), projects)).toEqual({
      projectNames: ["Book One"],
      seriesName: "Saga",
    });
  });

  it("leaves series null for a standalone-project entity or an unknown project", () => {
    expect(scopeContextForEntity(entity("X", { project: "Solo" }), projects)).toEqual({
      projectNames: ["Solo"],
      seriesName: null,
    });
    expect(scopeContextForEntity(entity("X", { project: "Ghost" }), projects)).toEqual({
      projectNames: ["Ghost"],
      seriesName: null,
    });
  });

  it("expands a project-scoped entity to its owning story's drafts", () => {
    const ctx = scopeContextForEntity(entity("Alice", { project: "Novel" }), TWO_DRAFTS);
    expect(ctx).toEqual({ projectNames: ["Novel", "Novel — Second"], seriesName: null });
    // Even when the entity's recorded scope names the NON-base draft.
    const legacy = scopeContextForEntity(entity("Bob", { project: "Novel — Second" }), TWO_DRAFTS);
    expect(legacy?.projectNames).toEqual(["Novel", "Novel — Second"]);
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
