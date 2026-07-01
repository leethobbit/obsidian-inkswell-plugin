import { describe, expect, it } from "vitest";
import { draftLabel, groupIntoStories, storyOf } from "../src/projects/stories";
import { Project } from "../src/projects/types";

function project(path: string, title: string, draftTitle: string | null = null): Project {
  return {
    vaultPath: path,
    draft: {
      format: "single",
      title,
      titleInFrontmatter: true,
      draftTitle,
      workflow: null,
    },
    scenes: [],
    unknownFiles: [],
    inkswell: null,
  };
}

describe("groupIntoStories", () => {
  it("groups drafts sharing a title and preserves order within a group", () => {
    const a1 = project("a/d1.md", "Novel A", "Draft 1");
    const a2 = project("a/d2.md", "Novel A", "Revision");
    const b = project("b/b.md", "Novel B");
    const stories = groupIntoStories([a1, a2, b]);
    expect(stories.map((s) => s.title)).toEqual(["Novel A", "Novel B"]);
    expect(stories[0].drafts.map((d) => d.vaultPath)).toEqual(["a/d1.md", "a/d2.md"]);
    expect(stories[1].drafts).toHaveLength(1);
  });

  it("treats a single-draft project as a one-draft story", () => {
    const stories = groupIntoStories([project("x.md", "Solo")]);
    expect(stories).toHaveLength(1);
    expect(stories[0].drafts).toHaveLength(1);
  });

  it("returns an empty list for no projects", () => {
    expect(groupIntoStories([])).toEqual([]);
  });
});

describe("draftLabel", () => {
  it("uses the authored draftTitle when present", () => {
    expect(draftLabel(project("a.md", "T", "Editor Pass"), 0)).toBe("Editor Pass");
  });

  it("falls back to a positional label when draftTitle is missing or blank", () => {
    expect(draftLabel(project("a.md", "T", null), 0)).toBe("Draft 1");
    expect(draftLabel(project("a.md", "T", "  "), 2)).toBe("Draft 3");
  });
});

describe("storyOf", () => {
  const a1 = project("a/d1.md", "Novel A", "Draft 1");
  const a2 = project("a/d2.md", "Novel A", "Revision");
  const stories = groupIntoStories([a1, a2]);

  it("finds the story owning the active draft", () => {
    expect(storyOf(stories, "a/d2.md")?.title).toBe("Novel A");
  });

  it("returns null for a null or unknown path", () => {
    expect(storyOf(stories, null)).toBeNull();
    expect(storyOf(stories, "gone.md")).toBeNull();
  });
});
