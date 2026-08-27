import { describe, expect, it } from "vitest";
import { isRenameBlock, planProjectRename, ProjectRenamePlan } from "../src/projects/rename-plan";
import { InkswellProjectData, MultipleSceneDraft, Project } from "../src/projects/types";

function project(
  vaultPath: string,
  over: Partial<MultipleSceneDraft> = {},
  inkswell: InkswellProjectData | null = null
): Project {
  const draft: MultipleSceneDraft = {
    format: "scenes",
    title: "Working Title",
    titleInFrontmatter: true,
    draftTitle: null,
    workflow: null,
    sceneFolder: "Draft 1",
    scenes: [],
    ignoredFiles: [],
    sceneTemplate: null,
    ...over,
  };
  return { vaultPath, draft, scenes: [], unknownFiles: [], inkswell };
}

const base = () =>
  project("Writing/Working Title/Working Title.md", {}, {
    overview: {
      planningNote: "Writing/Working Title/Working Title — Plan.md",
      cover: "Writing/Working Title/cover.png",
    },
  });

function plan(
  drafts: Project[],
  title: string,
  opts: { renameFiles?: boolean; existing?: string[]; others?: Project[] } = {}
): ProjectRenamePlan {
  // The vault as it stands: index notes, plus any planning note a draft points at.
  const existing = new Set([
    ...(opts.existing ?? []),
    ...drafts.map((d) => d.vaultPath),
    ...drafts.flatMap((d) => (d.inkswell?.overview?.planningNote ? [d.inkswell.overview.planningNote] : [])),
  ]);
  const res = planProjectRename(drafts, drafts[0], title, {
    renameFiles: opts.renameFiles ?? true,
    exists: (p) => existing.has(p),
    allProjects: [...drafts, ...(opts.others ?? [])],
  });
  if (isRenameBlock(res)) throw new Error(`blocked: ${res.kind}`);
  return res;
}

describe("planProjectRename — conventional layout", () => {
  it("moves the folder, index, and plan note, and remaps stored paths", () => {
    const p = plan([base()], "Final Title");
    expect(p.folderMove).toEqual({ from: "Writing/Working Title", to: "Writing/Final Title" });
    expect(p.fileMoves).toEqual([
      { from: "Writing/Final Title/Working Title.md", to: "Writing/Final Title/Final Title.md" },
      {
        from: "Writing/Final Title/Working Title — Plan.md",
        to: "Writing/Final Title/Final Title — Plan.md",
      },
    ]);
    expect(p.patches).toEqual([
      {
        indexPath: "Writing/Final Title/Final Title.md",
        title: "Final Title",
        planningNote: "Writing/Final Title/Final Title — Plan.md",
        cover: "Writing/Final Title/cover.png",
      },
    ]);
    expect(p.codexRenames).toEqual([{ from: "Working Title", to: "Final Title" }]);
  });

  it("remaps arbitrary paths under the old folder (tracker baselines)", () => {
    const p = plan([base()], "Final Title");
    expect(p.remap("Writing/Working Title/Draft 1/01.md")).toBe("Writing/Final Title/Draft 1/01.md");
    expect(p.remap("Elsewhere/note.md")).toBe("Elsewhere/note.md");
  });

  it("renames every draft's title and the `<Title> — <Draft>` index basenames", () => {
    const b = base();
    b.draft.draftTitle = "Draft 1";
    const copy = project("Writing/Working Title/Drafts/Second/Working Title — Second.md", {
      draftTitle: "Second",
    });
    const p = plan([b, copy], "Final Title");
    expect(p.fileMoves).toContainEqual({
      from: "Writing/Final Title/Drafts/Second/Working Title — Second.md",
      to: "Writing/Final Title/Drafts/Second/Final Title — Second.md",
    });
    expect(p.patches.map((x) => [x.indexPath, x.title])).toEqual([
      ["Writing/Final Title/Final Title.md", "Final Title"],
      ["Writing/Final Title/Drafts/Second/Final Title — Second.md", "Final Title"],
    ]);
    expect(p.codexRenames).toEqual([
      { from: "Working Title", to: "Final Title" },
      { from: "Working Title — Second", to: "Final Title — Second" },
    ]);
  });

  it("sanitizes the new title the same way project creation does", () => {
    const p = plan([base()], "  What: A Story?  ");
    expect(p.newTitle).toBe("What- A Story-");
    expect(p.folderMove?.to).toBe("Writing/What- A Story-");
  });
});

describe("planProjectRename — customised layouts are left alone", () => {
  it("does not move a folder that isn't named after the title", () => {
    const p = plan([project("Writing/Book/Working Title.md")], "Final Title");
    expect(p.folderMove).toBeNull();
    expect(p.fileMoves).toEqual([
      { from: "Writing/Book/Working Title.md", to: "Writing/Book/Final Title.md" },
    ]);
  });

  it("does not rename an index whose basename isn't the title", () => {
    const p = plan([project("Writing/Working Title/index.md")], "Final Title");
    expect(p.fileMoves).toEqual([]); // no conventional plan note either
    expect(p.codexRenames).toEqual([]);
    expect(p.folderMove).toEqual({ from: "Writing/Working Title", to: "Writing/Final Title" });
    expect(p.patches[0].indexPath).toBe("Writing/Final Title/index.md");
  });

  it("keeps a planning note the user named themselves, but remaps its path", () => {
    const b = project("Writing/Working Title/Working Title.md", {}, {
      overview: { planningNote: "Writing/Working Title/Notes.md" },
    });
    const p = plan([b], "Final Title");
    expect(p.fileMoves.some((m) => m.from.endsWith("Notes.md"))).toBe(false);
    expect(p.patches[0].planningNote).toBe("Writing/Final Title/Notes.md");
  });

  it("renameFiles=false only patches titles", () => {
    const p = plan([base()], "Final Title", { renameFiles: false });
    expect(p.folderMove).toBeNull();
    expect(p.fileMoves).toEqual([]);
    expect(p.codexRenames).toEqual([]);
    expect(p.patches[0]).toEqual({
      indexPath: "Writing/Working Title/Working Title.md",
      title: "Final Title",
      planningNote: "Writing/Working Title/Working Title — Plan.md",
      cover: "Writing/Working Title/cover.png",
    });
  });

  it("works for a root-level project", () => {
    const p = plan([project("Working Title/Working Title.md")], "Final Title");
    expect(p.folderMove).toEqual({ from: "Working Title", to: "Final Title" });
    expect(p.patches[0].indexPath).toBe("Final Title/Final Title.md");
  });
});

describe("planProjectRename — blocks", () => {
  const block = (drafts: Project[], title: string, existing: string[] = [], others: Project[] = []) => {
    const set = new Set([
      ...existing,
      ...drafts.map((d) => d.vaultPath),
      ...drafts.flatMap((d) => (d.inkswell?.overview?.planningNote ? [d.inkswell.overview.planningNote] : [])),
    ]);
    const res = planProjectRename(drafts, drafts[0], title, {
      renameFiles: true,
      exists: (p) => set.has(p),
      allProjects: [...drafts, ...others],
    });
    return isRenameBlock(res) ? res.kind : "ok";
  };

  it("rejects empty / dots-only / unchanged titles", () => {
    expect(block([base()], "   ")).toBe("empty");
    expect(block([base()], "..")).toBe("empty");
    expect(block([base()], "Working Title")).toBe("unchanged");
  });

  it("rejects a title another story already uses", () => {
    const other = project("Writing/Final Title/Final Title.md", { title: "Final Title" });
    expect(block([base()], "Final Title", [], [other])).toBe("title-taken");
  });

  it("rejects a destination folder or file that already exists", () => {
    expect(block([base()], "Final Title", ["Writing/Final Title"])).toBe("path-taken");
    expect(block([project("Writing/Book/Working Title.md")], "Final Title", ["Writing/Book/Final Title.md"])).toBe(
      "path-taken"
    );
  });

  it("does not treat a move source as a collision", () => {
    // The index and plan note exist now (they're what we're moving) — not collisions.
    expect(block([base()], "Final Title")).toBe("ok");
  });

  it("skips a conventional plan note that was never created", () => {
    const b = project("Writing/Working Title/Working Title.md");
    const res = planProjectRename([b], b, "Final Title", {
      renameFiles: true,
      exists: (p) => p === b.vaultPath,
      allProjects: [b],
    });
    if (isRenameBlock(res)) throw new Error(res.kind);
    expect(res.fileMoves.map((m) => m.to)).toEqual(["Writing/Final Title/Final Title.md"]);
  });
});
