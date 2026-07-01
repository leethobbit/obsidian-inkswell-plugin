import { describe, expect, it } from "vitest";
import { planDraftCopy } from "../src/projects/draft-plan";
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
    const plan = planDraftCopy(multiScene(), "Editor Pass", "Draft 1");
    expect(plan.indexFrom).toBe("Inkswell/My Novel/My Novel.md");
    expect(plan.indexPath).toBe("Inkswell/My Novel/Drafts/Editor Pass/My Novel — Editor Pass.md");
    expect(plan.folders).toEqual([
      "Inkswell/My Novel/Drafts/Editor Pass",
      "Inkswell/My Novel/Drafts/Editor Pass/Scenes",
    ]);
  });

  it("copies every resolved scene into the new Scenes folder, keeping basenames", () => {
    const plan = planDraftCopy(multiScene(), "Editor Pass", "Draft 1");
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
    const plan = planDraftCopy(p, "Editor Pass", "Draft 1");
    expect(plan.sceneCopies).toHaveLength(1);
  });

  it("clones the draft with the new draftTitle and a local Scenes folder", () => {
    const plan = planDraftCopy(multiScene(), "Editor Pass", "Draft 1");
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
    expect(planDraftCopy(multiScene(), "Editor Pass", "Draft 1").renameOriginalTo).toBe("Draft 1");
    expect(
      planDraftCopy(multiScene({ draftTitle: "First" }), "Editor Pass", "Draft 1").renameOriginalTo
    ).toBeNull();
  });

  it("sanitizes illegal characters in folder and index names", () => {
    const plan = planDraftCopy(multiScene(), "A/B: C", "Draft 1");
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
    const plan = planDraftCopy(single(), "Revision", "Draft 1");
    expect(plan.sceneCopies).toEqual([]);
    expect(plan.folders).toEqual(["Stories/Drafts/Revision"]);
    expect(plan.newDraft).toMatchObject({ format: "single", draftTitle: "Revision" });
  });
});
