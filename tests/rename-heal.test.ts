import { describe, expect, it } from "vitest";
import {
  RECONCILE_SETTLE_MS,
  advanceSettle,
  markCreatedHere,
  mismatchKeys,
  planSceneRename,
  reconcileSuggestions,
  settleRemaining,
  wasCreatedHere,
} from "../src/projects/rename-heal";
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

describe("settle window (#69)", () => {
  const S = RECONCILE_SETTLE_MS;
  const RENAMED = ["m:Scene B2", "o:Scene B"]; // index arrived, renamed file not yet

  it("keys a mismatch by kind, sorted, so a title and a file of the same name differ", () => {
    expect(mismatchKeys({ missing: ["b", "a"], orphans: ["a"], autoMatch: null })).toEqual([
      "m:a",
      "m:b",
      "o:a",
    ]);
  });

  it("holds a new mismatch back for the whole window, then shows it", () => {
    const s0 = advanceSettle(undefined, RENAMED, 1000);
    expect(s0).toEqual({ keys: RENAMED, since: 1000 });
    expect(settleRemaining(s0!, 1000)).toBe(S);
    const s1 = advanceSettle(s0!, [...RENAMED], 1000 + S - 1);
    expect(settleRemaining(s1!, 1000 + S - 1)).toBe(1);
    expect(settleRemaining(s1!, 1000 + S)).toBe(0);
  });

  it("never shows a sync rename that lands inside the window", () => {
    const s0 = advanceSettle(undefined, RENAMED, 0);
    // Delivered as delete + create: the old file goes first, then the new one arrives.
    const s1 = advanceSettle(s0!, ["m:Scene B2"], 2000);
    expect(s1).toEqual({ keys: ["m:Scene B2"], since: 2000 }); // a change restarts the clock
    expect(advanceSettle(s1!, [], 3000)).toBeNull();
  });

  it("restarts on any change before it has shown, including one that only removes items", () => {
    const s0 = advanceSettle(undefined, RENAMED, 0);
    expect(advanceSettle(s0!, ["o:Scene B"], S - 1)).toEqual({ keys: ["o:Scene B"], since: S - 1 });
  });

  it("keeps showing while the writer resolves items one by one", () => {
    const keys = ["o:a", "o:b", "o:c"];
    const shown = advanceSettle(undefined, keys, 0)!;
    const after = advanceSettle(shown, ["o:b", "o:c"], S + 500);
    expect(after).toEqual({ keys: ["o:b", "o:c"], since: 0 });
    expect(settleRemaining(after!, S + 500)).toBe(0);
  });

  it("restarts when something new turns up, even while showing", () => {
    const shown = advanceSettle(undefined, ["o:a"], 0)!;
    expect(advanceSettle(shown, ["o:a", "o:new"], S + 500)).toEqual({
      keys: ["o:a", "o:new"],
      since: S + 500,
    });
  });

  it("remembers projects created on this device", () => {
    expect(wasCreatedHere("Fresh/Fresh.md")).toBe(false);
    markCreatedHere("Fresh/Fresh.md");
    expect(wasCreatedHere("Fresh/Fresh.md")).toBe(true);
  });
});
