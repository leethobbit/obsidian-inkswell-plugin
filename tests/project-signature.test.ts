import { describe, expect, it } from "vitest";
import { projectsSignature } from "../src/projects/project-signature";
import { InkswellProjectData, Project, ResolvedScene } from "../src/projects/types";

function project(
  path: string,
  opts: { title?: string; scenes?: ResolvedScene[]; inkswell?: InkswellProjectData | null } = {}
): Project {
  return {
    vaultPath: path,
    draft: {
      format: "scenes",
      title: opts.title ?? path,
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
      sceneFolder: "/",
      scenes: (opts.scenes ?? []).map((s) => ({ title: s.title, indent: s.indent })),
      ignoredFiles: [],
      sceneTemplate: null,
    },
    scenes: opts.scenes ?? [],
    unknownFiles: [],
    inkswell: opts.inkswell ?? null,
  };
}

const scene = (title: string, path: string | null): ResolvedScene => ({
  title,
  indent: 0,
  path,
});

describe("projectsSignature", () => {
  it("is stable when nothing structural changes", () => {
    const a = [project("p.md", { scenes: [scene("S1", "S1.md")] })];
    const b = [project("p.md", { scenes: [scene("S1", "S1.md")] })];
    expect(projectsSignature(a)).toBe(projectsSignature(b));
  });

  it("changes when a scene is added or renamed", () => {
    const base = projectsSignature([project("p.md", { scenes: [scene("S1", "S1.md")] })]);
    const added = projectsSignature([
      project("p.md", { scenes: [scene("S1", "S1.md"), scene("S2", "S2.md")] }),
    ]);
    const renamed = projectsSignature([project("p.md", { scenes: [scene("S1x", "S1.md")] })]);
    expect(added).not.toBe(base);
    expect(renamed).not.toBe(base);
  });

  it("changes when inkswell data changes (beats/series/goals live there)", () => {
    const base = projectsSignature([project("p.md", { inkswell: null })]);
    const withGoal = projectsSignature([
      project("p.md", { inkswell: { goals: { target: 1000 } } }),
    ]);
    expect(withGoal).not.toBe(base);
  });

  it("changes when projects are added, removed, or retitled", () => {
    const one = projectsSignature([project("a.md")]);
    const two = projectsSignature([project("a.md"), project("b.md")]);
    const retitled = projectsSignature([project("a.md", { title: "New" })]);
    expect(two).not.toBe(one);
    expect(retitled).not.toBe(one);
  });
});
