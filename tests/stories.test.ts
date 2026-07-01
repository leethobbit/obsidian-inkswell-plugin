import { describe, expect, it } from "vitest";
import { baseDraft, baseDraftFor, draftLabel, groupIntoStories, storyOf } from "../src/projects/stories";
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

describe("baseDraft", () => {
  it("picks the draft whose folder is an ancestor of the others (the copy origin)", () => {
    // New drafts are copied under <origin>/Drafts/<name>/, so the origin's
    // folder is an ancestor of every sibling.
    const origin = project("Book/Novel/Novel.md", "Novel", "Draft 1");
    const editor = project("Book/Novel/Drafts/Editor/Novel — Editor.md", "Novel", "Editor");
    const proof = project("Book/Novel/Drafts/Editor/Drafts/Proof/Novel — Proof.md", "Novel", "Proof");
    // Order shouldn't matter — the ancestor wins regardless of position.
    expect(baseDraft({ title: "Novel", drafts: [proof, editor, origin] }).vaultPath).toBe("Book/Novel/Novel.md");
  });

  it("returns the sole draft for a one-draft story", () => {
    const solo = project("x/Solo.md", "Solo");
    expect(baseDraft({ title: "Solo", drafts: [solo] })).toBe(solo);
  });

  it("falls back to the first draft when no folder is a common ancestor", () => {
    const a = project("one/A.md", "Novel", "A");
    const b = project("two/B.md", "Novel", "B");
    expect(baseDraft({ title: "Novel", drafts: [a, b] })).toBe(a);
  });

  it("treats a vault-root draft as an ancestor of nested siblings", () => {
    const root = project("Novel.md", "Novel", "Draft 1");
    const nested = project("Drafts/Editor/Novel — Editor.md", "Novel", "Editor");
    expect(baseDraft({ title: "Novel", drafts: [nested, root] }).vaultPath).toBe("Novel.md");
  });
});

describe("baseDraftFor", () => {
  const origin = project("Book/Novel/Novel.md", "Novel", "Draft 1");
  const editor = project("Book/Novel/Drafts/Editor/Novel — Editor.md", "Novel", "Editor");
  const other = project("z/Other.md", "Other");

  it("resolves the base draft of the story containing the given draft", () => {
    expect(baseDraftFor([origin, editor, other], editor).vaultPath).toBe("Book/Novel/Novel.md");
  });

  it("returns the project itself when it isn't in the list", () => {
    const stray = project("gone/G.md", "Ghost");
    expect(baseDraftFor([origin, editor], stray)).toBe(stray);
  });
});
