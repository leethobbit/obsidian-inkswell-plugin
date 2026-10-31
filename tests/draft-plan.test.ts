import { describe, expect, it } from "vitest";
import { planDraftCopy, planDraftDelete } from "../src/projects/draft-plan";
import { MultipleSceneDraft, Project, SingleSceneDraft } from "../src/projects/types";

function multiScene(over: Partial<MultipleSceneDraft> = {}): Project {
  const draft: MultipleSceneDraft = {
    format: "scenes",
    title: "My Novel",
    titleInFrontmatter: true,
    draftTitle: null,
    workflow: null,
    sceneFolder: "Scenes",
    scenes: [
      { title: "01 - Opening", indent: 0 },
      { title: "02 - Rising", indent: 0 },
    ],
    ignoredFiles: [],
    sceneTemplate: null,
    ...over,
  };
  return {
    vaultPath: "Inkswell/My Novel/My Novel.md",
    draft,
    scenes: [
      { title: "01 - Opening", indent: 0, path: "Inkswell/My Novel/Scenes/01 - Opening.md" },
      { title: "02 - Rising", indent: 0, path: "Inkswell/My Novel/Scenes/02 - Rising.md" },
    ],
    unknownFiles: [],
    inkswell: null,
  };
}

describe("planDraftCopy (multi-scene)", () => {
  it("targets a Drafts/<name> folder beside the source with a unique index basename", () => {
    const plan = planDraftCopy(multiScene(), multiScene(), "Editor Pass", "Draft 1");
    expect(plan.indexFrom).toBe("Inkswell/My Novel/My Novel.md");
    expect(plan.indexPath).toBe("Inkswell/My Novel/Drafts/Editor Pass/My Novel — Editor Pass.md");
    expect(plan.folders).toEqual([
      "Inkswell/My Novel/Drafts/Editor Pass",
      "Inkswell/My Novel/Drafts/Editor Pass/Scenes",
    ]);
  });

  it("copies every resolved scene into the new Scenes folder, keeping basenames", () => {
    const plan = planDraftCopy(multiScene(), multiScene(), "Editor Pass", "Draft 1");
    expect(plan.sceneCopies).toEqual([
      {
        from: "Inkswell/My Novel/Scenes/01 - Opening.md",
        to: "Inkswell/My Novel/Drafts/Editor Pass/Scenes/01 - Opening.md",
      },
      {
        from: "Inkswell/My Novel/Scenes/02 - Rising.md",
        to: "Inkswell/My Novel/Drafts/Editor Pass/Scenes/02 - Rising.md",
      },
    ]);
  });

  it("skips scenes with no resolved file", () => {
    const p = multiScene();
    p.scenes[1] = { title: "02 - Rising", indent: 0, path: null };
    const plan = planDraftCopy(p, p, "Editor Pass", "Draft 1");
    expect(plan.sceneCopies).toHaveLength(1);
  });

  it("clones the draft with the new draftTitle and a local Scenes folder", () => {
    const plan = planDraftCopy(multiScene(), multiScene(), "Editor Pass", "Draft 1");
    expect(plan.newDraft).toMatchObject({
      format: "scenes",
      title: "My Novel",
      titleInFrontmatter: true,
      draftTitle: "Editor Pass",
      sceneFolder: "Scenes",
    });
    expect((plan.newDraft as MultipleSceneDraft).scenes).toHaveLength(2);
  });

  it("names the original draft only when it had no draftTitle", () => {
    expect(planDraftCopy(multiScene(), multiScene(), "Editor Pass", "Draft 1").renameOriginalTo).toBe("Draft 1");
    expect(
      planDraftCopy(multiScene({ draftTitle: "First" }), multiScene({ draftTitle: "First" }), "Editor Pass", "Draft 1").renameOriginalTo
    ).toBeNull();
  });

  it("anchors placement at the BASE draft: copying from a copy never nests", () => {
    // Source = an existing draft copy (its own index under Drafts/), anchor =
    // the story's base draft. Content paths come from the source; the new
    // draft's folder comes from the anchor — flat Drafts/, no Drafts-in-Drafts.
    const base = multiScene();
    const copy = multiScene({ draftTitle: "Editor Pass" });
    copy.vaultPath = "Inkswell/My Novel/Drafts/Editor Pass/My Novel — Editor Pass.md";
    copy.scenes = [
      {
        title: "01 - Opening",
        indent: 0,
        path: "Inkswell/My Novel/Drafts/Editor Pass/Scenes/01 - Opening.md",
      },
    ];
    const plan = planDraftCopy(copy, base, "Proof Pass", "Draft 1");
    expect(plan.indexPath).toBe("Inkswell/My Novel/Drafts/Proof Pass/My Novel — Proof Pass.md");
    expect(plan.folders).toEqual([
      "Inkswell/My Novel/Drafts/Proof Pass",
      "Inkswell/My Novel/Drafts/Proof Pass/Scenes",
    ]);
    // Scene CONTENT still copies from the source draft, not the anchor.
    expect(plan.sceneCopies).toEqual([
      {
        from: "Inkswell/My Novel/Drafts/Editor Pass/Scenes/01 - Opening.md",
        to: "Inkswell/My Novel/Drafts/Proof Pass/Scenes/01 - Opening.md",
      },
    ]);
    // And the rename-the-original logic still keys off the SOURCE's draftTitle.
    expect(plan.renameOriginalTo).toBeNull();
  });

  it("sanitizes illegal characters in folder and index names", () => {
    const plan = planDraftCopy(multiScene(), multiScene(), "A/B: C", "Draft 1");
    expect(plan.indexPath).toBe("Inkswell/My Novel/Drafts/A-B- C/My Novel — A-B- C.md");
  });
});

describe("planDraftCopy (single-format)", () => {
  function single(): Project {
    const draft: SingleSceneDraft = {
      format: "single",
      title: "Short Story",
      titleInFrontmatter: true,
      draftTitle: null,
      workflow: null,
    };
    return { vaultPath: "Stories/Short Story.md", draft, scenes: [], unknownFiles: [], inkswell: null };
  }

  it("copies no scenes and only makes the draft folder", () => {
    const plan = planDraftCopy(single(), single(), "Revision", "Draft 1");
    expect(plan.sceneCopies).toEqual([]);
    expect(plan.folders).toEqual(["Stories/Drafts/Revision"]);
    expect(plan.newDraft).toMatchObject({ format: "single", draftTitle: "Revision" });
  });
});

describe("planDraftDelete", () => {
  const SCENES = "Inkswell/My Novel/Scenes";
  const atPath = (vaultPath: string, scenes: string[]): Project => ({
    ...multiScene(),
    vaultPath,
    scenes: scenes.map((t) => ({ title: t, indent: 0, path: `${SCENES}/${t}.md` })),
  });

  it("trashes every scene of a draft that shares nothing", () => {
    const real = multiScene();
    const other = {
      ...multiScene(),
      vaultPath: "Inkswell/My Novel/Drafts/B/My Novel — B.md",
      scenes: [{ title: "01 - Opening", indent: 0, path: "Inkswell/My Novel/Drafts/B/Scenes/01 - Opening.md" }],
    };
    expect(planDraftDelete(real, [real, other])).toEqual({
      trash: ["Inkswell/My Novel/Scenes/01 - Opening.md", "Inkswell/My Novel/Scenes/02 - Rising.md"],
      kept: [],
    });
  });

  it("keeps every scene when the draft is a sync conflict copy of the index (#69)", () => {
    const real = multiScene();
    const copy = { ...multiScene(), vaultPath: "Inkswell/My Novel/My Novel (Conflicted copy).md" };
    expect(planDraftDelete(copy, [real, copy])).toEqual({
      trash: [],
      kept: ["Inkswell/My Novel/Scenes/01 - Opening.md", "Inkswell/My Novel/Scenes/02 - Rising.md"],
    });
    // And the other way round: deleting the original leaves the copy whole.
    expect(planDraftDelete(real, [real, copy]).trash).toEqual([]);
  });

  it("splits a partial overlap: only the scenes no other project lists are trashed", () => {
    const copy = atPath("Inkswell/My Novel/Copy.md", ["01 - Opening", "02 - Rising", "03 - New"]);
    const real = atPath("Inkswell/My Novel/My Novel.md", ["01 - Opening", "02 - Rising"]);
    expect(planDraftDelete(copy, [real, copy])).toEqual({
      trash: [`${SCENES}/03 - New.md`],
      kept: [`${SCENES}/01 - Opening.md`, `${SCENES}/02 - Rising.md`],
    });
  });

  it("counts another story's files too, and another project's index note", () => {
    const mine = atPath("A/Mine.md", ["Shared", "Index"]);
    mine.scenes[1].path = "B/Other.md";
    const other = { ...atPath("B/Other.md", ["Shared"]), draft: { ...multiScene().draft, title: "Other" } };
    expect(planDraftDelete(mine, [mine, other])).toEqual({
      trash: [],
      kept: [`${SCENES}/Shared.md`, "B/Other.md"],
    });
  });

  it("skips unresolved scenes and lists a repeated scene once", () => {
    const p = atPath("A/Mine.md", ["One", "One"]);
    p.scenes.push({ title: "Gone", indent: 0, path: null });
    expect(planDraftDelete(p, [p])).toEqual({ trash: [`${SCENES}/One.md`], kept: [] });
  });
});
