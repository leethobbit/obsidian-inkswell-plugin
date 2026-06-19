import { describe, expect, it, vi } from "vitest";
import { ActiveProject, resolveActive } from "../src/projects/active-project";
import { Project } from "../src/projects/types";

function project(path: string, title = path): Project {
  return {
    vaultPath: path,
    draft: {
      format: "single",
      title,
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
    },
    scenes: [],
    unknownFiles: [],
    inkswell: null,
  };
}

describe("ActiveProject", () => {
  it("stores and returns the path", () => {
    const a = new ActiveProject("x.md");
    expect(a.get()).toBe("x.md");
    a.set("y.md");
    expect(a.get()).toBe("y.md");
  });

  it("notifies subscribers on change, but not on a no-op set", () => {
    const a = new ActiveProject(null);
    const fn = vi.fn();
    a.subscribe(fn);
    a.set("x.md");
    a.set("x.md"); // no-op
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("x.md");
  });

  it("stops notifying after unsubscribe", () => {
    const a = new ActiveProject(null);
    const fn = vi.fn();
    const off = a.subscribe(fn);
    off();
    a.set("x.md");
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("resolveActive", () => {
  const projects = [project("a.md"), project("b.md")];

  it("returns the matching project", () => {
    expect(resolveActive(projects, "b.md")?.vaultPath).toBe("b.md");
  });

  it("falls back to the first project when the path is missing or null", () => {
    expect(resolveActive(projects, "gone.md")?.vaultPath).toBe("a.md");
    expect(resolveActive(projects, null)?.vaultPath).toBe("a.md");
  });

  it("returns null for an empty list", () => {
    expect(resolveActive([], "a.md")).toBeNull();
  });
});
