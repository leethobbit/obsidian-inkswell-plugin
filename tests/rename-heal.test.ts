import { describe, expect, it } from "vitest";
import { planSceneRename, reconcileSuggestions } from "../src/projects/rename-heal";
import { Project, ResolvedScene } from "../src/projects/types";

/** Build a minimal multi-scene project for the pure healers. */
function project(
  vaultPath: string,
  scenes: ResolvedScene[],
  unknownFiles: string[] = []
): Project {
  return {
    vaultPath,
    draft: {
      format: "scenes",
      title: "Book",
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
      sceneFolder: "/",
      scenes: scenes.map((s) => ({ title: s.title, indent: s.indent })),
      ignoredFiles: [],
      sceneTemplate: null,
    },
    scenes,
    unknownFiles,
    inkswell: null,
  };
}

const scene = (title: string, path: string | null, indent = 0): ResolvedScene => ({
  title,
  indent,
  path,
});

describe("planSceneRename", () => {
  const projects = [
    project("Book.md", [
      scene("01 - Opening", "Manuscript/01 - Opening.md"),
      scene("02 - Blackout", "Manuscript/02 - Blackout.md"),
    ]),
  ];

  it("heals a same-folder rename matched by the old path", () => {
    const plan = planSceneRename(
      projects,
      "Manuscript/02 - Blackout.md",
      "Manuscript/02 - The Blackout.md"
    );
    expect(plan).toEqual({
      indexPath: "Book.md",
      oldTitle: "02 - Blackout",
      newTitle: "02 - The Blackout",
    });
  });

  it("returns null for a move to a different folder", () => {
    expect(
      planSceneRename(projects, "Manuscript/02 - Blackout.md", "Archive/02 - Blackout.md")
    ).toBeNull();
  });

  it("returns null when the basename is unchanged (pure move)", () => {
    expect(
      planSceneRename(projects, "Manuscript/02 - Blackout.md", "Manuscript/02 - Blackout.md")
    ).toBeNull();
  });

  it("returns null when the new title already exists (no clobber)", () => {
    expect(
      planSceneRename(projects, "Manuscript/02 - Blackout.md", "Manuscript/01 - Opening.md")
    ).toBeNull();
  });

  it("returns null when no scene resolves to the old path", () => {
    expect(
      planSceneRename(projects, "Manuscript/99 - Ghost.md", "Manuscript/99 - Spirit.md")
    ).toBeNull();
  });

  it("ignores a scene that is already missing (path null)", () => {
    const orphaned = [project("Book.md", [scene("02 - Blackout", null)])];
    expect(
      planSceneRename(orphaned, "Manuscript/02 - Blackout.md", "Manuscript/02 - New.md")
    ).toBeNull();
  });
});

describe("reconcileSuggestions", () => {
  it("auto-matches the unambiguous 1:1 (missing + orphan)", () => {
    const p = project(
      "Book.md",
      [scene("01 - Opening", "Manuscript/01 - Opening.md"), scene("02 - Blackout", null)],
      ["02 - The Blackout"]
    );
    expect(reconcileSuggestions(p)).toEqual({
      missing: ["02 - Blackout"],
      orphans: ["02 - The Blackout"],
      autoMatch: { oldTitle: "02 - Blackout", newBasename: "02 - The Blackout" },
    });
  });

  it("does not auto-match when ambiguous (many missing or many orphans)", () => {
    const p = project(
      "Book.md",
      [scene("a", null), scene("b", null)],
      ["x", "y"]
    );
    const r = reconcileSuggestions(p);
    expect(r.missing).toEqual(["a", "b"]);
    expect(r.orphans).toEqual(["x", "y"]);
    expect(r.autoMatch).toBeNull();
  });

  it("is empty for a healthy project", () => {
    const p = project("Book.md", [scene("a", "Manuscript/a.md")]);
    expect(reconcileSuggestions(p)).toEqual({ missing: [], orphans: [], autoMatch: null });
  });
});
