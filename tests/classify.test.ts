import { describe, expect, it } from "vitest";
import { buildClassifierIndex, classifyPath } from "../src/tracking/classify";
import { WordCategory } from "../src/tracking/types";
import { Project } from "../src/projects/types";

/** Multi-scene project literal with sensible defaults. */
function multi(over: {
  vaultPath: string;
  title: string;
  sceneFolder?: string;
  scenePaths?: (string | null)[];
  planningNote?: string;
  targetBasename?: string;
}): Project {
  return {
    vaultPath: over.vaultPath,
    draft: {
      format: "scenes",
      title: over.title,
      titleInFrontmatter: true,
      draftTitle: null,
      workflow: null,
      sceneFolder: over.sceneFolder ?? "Scenes",
      scenes: (over.scenePaths ?? []).map((_, i) => ({ title: `Scene ${i + 1}`, indent: 0 })),
      ignoredFiles: [],
      sceneTemplate: null,
    },
    scenes: (over.scenePaths ?? []).map((path, i) => ({
      title: `Scene ${i + 1}`,
      indent: 0,
      path,
    })),
    unknownFiles: [],
    inkswell:
      over.planningNote || over.targetBasename
        ? {
            overview: over.planningNote ? { planningNote: over.planningNote } : undefined,
            compile: over.targetBasename
              ? {
                  sceneSteps: [],
                  manuscriptSteps: [],
                  separator: "\n\n",
                  targetBasename: over.targetBasename,
                  format: "md" as const,
                }
              : undefined,
          }
        : null,
  };
}

/** Single-note project literal. */
function single(vaultPath: string, title: string): Project {
  return {
    vaultPath,
    draft: {
      format: "single",
      title,
      titleInFrontmatter: true,
      draftTitle: null,
      workflow: null,
    },
    scenes: [],
    unknownFiles: [],
    inkswell: null,
  };
}

const BOOK = multi({
  vaultPath: "Writing/Book/Book.md",
  title: "Book",
  scenePaths: ["Writing/Book/Scenes/Scene 1.md", "Writing/Book/Scenes/Scene 2.md"],
  planningNote: "Writing/Book/My Plan.md",
  targetBasename: "manuscript",
});

const classify = (
  path: string,
  projects: Project[] = [BOOK],
  isCodex = false
): WordCategory | null => classifyPath(path, buildClassifierIndex(projects), isCodex);

describe("classifyPath", () => {
  it("listed scene files classify as scene", () => {
    expect(classify("Writing/Book/Scenes/Scene 1.md")).toBe("scene");
  });

  it("a single-note project's own file classifies as scene", () => {
    const p = single("Writing/Short.md", "Short");
    expect(classify("Writing/Short.md", [p])).toBe("scene");
  });

  it("the planning note classifies as planning — both the stored pointer and the default sibling path", () => {
    expect(classify("Writing/Book/My Plan.md")).toBe("planning"); // stored pointer
    expect(classify("Writing/Book/Book — Plan.md")).toBe("planning"); // default path
  });

  it("planning beats other (the planning note lives inside the project folder)", () => {
    // Both paths are inside Writing/Book/ and would match the folder rule.
    expect(classify("Writing/Book/My Plan.md")).not.toBe("other");
  });

  it("a codex-flagged note inside a project folder is codex, not other", () => {
    expect(classify("Writing/Book/Codex/Alice.md", [BOOK], true)).toBe("codex");
  });

  it("a codex-flagged note anywhere in the vault is codex (membership is the key, never the folder)", () => {
    expect(classify("Worldbuilding/Alice.md", [BOOK], true)).toBe("codex");
  });

  it("a listed scene with a stray codex key still counts as scene (precedence)", () => {
    expect(classify("Writing/Book/Scenes/Scene 1.md", [BOOK], true)).toBe("scene");
  });

  it("the multi-scene index note classifies as other", () => {
    expect(classify("Writing/Book/Book.md")).toBe("other");
  });

  it("stray notes in the project folder subtree classify as other", () => {
    expect(classify("Writing/Book/Notes/Research.md")).toBe("other");
    expect(classify("Writing/Book/Ideas.md")).toBe("other");
  });

  it("compile output <indexFolder>/<targetBasename>.md is unrelated — recompiles never double-count", () => {
    expect(classify("Writing/Book/manuscript.md")).toBeNull();
  });

  it("the default compile basename is excluded even when the project never configured compile", () => {
    const p = multi({ vaultPath: "Writing/B2/B2.md", title: "B2" });
    expect(classify("Writing/B2/manuscript.md", [p])).toBeNull();
  });

  it("files outside every project are unrelated", () => {
    expect(classify("Daily/2026-07-04.md")).toBeNull();
    expect(classify("Inbox.md")).toBeNull();
  });

  it("a project indexed at the vault root does not swallow the vault into other", () => {
    const root = multi({
      vaultPath: "Root Book.md",
      title: "Root Book",
      sceneFolder: "Root Scenes",
      scenePaths: ["Root Scenes/Scene 1.md"],
    });
    expect(classify("Root Scenes/Scene 1.md", [root])).toBe("scene");
    expect(classify("Root Scenes/Stray.md", [root])).toBe("other"); // scene folder still scoped
    expect(classify("Root Book.md", [root])).toBe("other"); // exact index path
    expect(classify("Daily/2026-07-04.md", [root])).toBeNull(); // vault NOT swallowed
    expect(classify("Inbox.md", [root])).toBeNull();
  });

  it("multi-draft: a shared path classifies once regardless of how many projects claim it", () => {
    const draft2 = multi({
      vaultPath: "Writing/Book/Drafts/Draft 2/Book.md",
      title: "Book",
      scenePaths: ["Writing/Book/Drafts/Draft 2/Scenes/Scene 1.md"],
    });
    const projects = [BOOK, draft2];
    // Draft 2's folder is inside BOOK's folder; scene wins over both folder rules.
    expect(classify("Writing/Book/Drafts/Draft 2/Scenes/Scene 1.md", projects)).toBe("scene");
    expect(classify("Writing/Book/Scenes/Scene 1.md", projects)).toBe("scene");
  });
});
