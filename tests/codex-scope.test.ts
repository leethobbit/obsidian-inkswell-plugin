import { describe, expect, it } from "vitest";
import {
  defaultScopeForProject,
  filterToScope,
  isEntityVisible,
  projectName,
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

function entity(name: string, scope?: EntityScope): CodexEntity {
  return { path: `Codex/${name}.md`, name, category: "character", aliases: [], scope };
}

describe("projectName", () => {
  it("is the index-note basename without extension or folders", () => {
    expect(projectName(project("Book One", null, "Series/Book One.md"))).toBe("Book One");
    expect(projectName(project("Solo"))).toBe("Solo");
  });
});

describe("scopeContextForProject", () => {
  it("derives series from the active project", () => {
    expect(scopeContextForProject(project("Book One", { name: "Saga" }))).toEqual({
      projectName: "Book One",
      seriesName: "Saga",
    });
  });

  it("leaves series null for a standalone project, and both null for none", () => {
    expect(scopeContextForProject(project("Solo"))).toEqual({
      projectName: "Solo",
      seriesName: null,
    });
    expect(scopeContextForProject(null)).toEqual({ projectName: null, seriesName: null });
  });
});

describe("defaultScopeForProject", () => {
  it("prefers the series when the active book belongs to one", () => {
    expect(defaultScopeForProject(project("Book One", { name: "Saga" }))).toEqual({
      series: "Saga",
    });
  });

  it("falls back to the book for a standalone project", () => {
    expect(defaultScopeForProject(project("Solo"))).toEqual({ project: "Solo" });
  });

  it("is global when no project is active", () => {
    expect(defaultScopeForProject(null)).toEqual({});
  });
});

describe("isEntityVisible", () => {
  const sagaCtx = { projectName: "Book One", seriesName: "Saga" };

  it("shows untagged (global) entities everywhere", () => {
    expect(isEntityVisible(entity("Narrator"), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Narrator", {}), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Narrator"), { projectName: null, seriesName: null })).toBe(true);
  });

  it("shows a series-tagged entity to any book in that series", () => {
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectName: "Book Two",
      seriesName: "Saga",
    })).toBe(true);
  });

  it("hides a series-tagged entity from a different (or no) series", () => {
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectName: "Thriller",
      seriesName: "Crime",
    })).toBe(false);
    expect(isEntityVisible(entity("Aragorn", { series: "Saga" }), {
      projectName: "Solo",
      seriesName: null,
    })).toBe(false);
  });

  it("shows a project-tagged entity only to that exact book", () => {
    expect(isEntityVisible(entity("Vance", { project: "Book One" }), sagaCtx)).toBe(true);
    expect(isEntityVisible(entity("Vance", { project: "Book Two" }), sagaCtx)).toBe(false);
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
    const kept = filterToScope(entities, { projectName: "Book One", seriesName: "Saga" }).map(
      (e) => e.name
    );
    expect(kept).toEqual(["Global", "SagaWide", "BookOnly"]);
  });
});
