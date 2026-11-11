import { describe, expect, it } from "vitest";
import {
  RevisionChecklistData,
  chapterState,
  checklistProgress,
  setChapterChecklistItem,
  setChecklistItem,
  stateProgress,
  tierState,
} from "../src/revisions/checklist";
import { CHAPTER_CHECKPOINTS, chapterCheckpoints } from "../src/revisions/audit";

describe("setChecklistItem", () => {
  it("sets an item's done flag", () => {
    const next = setChecklistItem(undefined, "story", "structure", { done: true });
    expect(next.story).toEqual({ structure: { done: true } });
  });

  it("does not mutate the input", () => {
    const data: RevisionChecklistData = { story: { structure: { done: true } } };
    const next = setChecklistItem(data, "story", "conflict", { done: true });
    expect(data.story).toEqual({ structure: { done: true } });
    expect(next.story).toEqual({ structure: { done: true }, conflict: { done: true } });
  });

  it("merges a note onto an existing item", () => {
    const data = setChecklistItem(undefined, "page", "telling", { done: true });
    const next = setChecklistItem(data, "page", "telling", { note: "ch.3 opening" });
    expect(next.page?.telling).toEqual({ done: true, note: "ch.3 opening" });
  });

  it("drops an item when done is cleared and note is blank", () => {
    const data = setChecklistItem(undefined, "story", "structure", { done: true });
    const next = setChecklistItem(data, "story", "structure", { done: false });
    expect(next.story).toBeUndefined();
  });

  it("drops the tier entirely when its last item is cleared", () => {
    const data = setChecklistItem(undefined, "page", "echoes", { done: true });
    const next = setChecklistItem(data, "page", "echoes", { done: false, note: "  " });
    expect(next.page).toBeUndefined();
  });

  it("keeps an item that has a note but no done", () => {
    const next = setChecklistItem(undefined, "story", "stakes", { note: "raise in act 2" });
    expect(next.story?.stakes).toEqual({ note: "raise in act 2" });
  });
});

describe("checklistProgress", () => {
  it("counts done items against the tier total", () => {
    let data: RevisionChecklistData | undefined;
    data = setChecklistItem(data, "story", "structure", { done: true });
    data = setChecklistItem(data, "story", "conflict", { done: true });
    data = setChecklistItem(data, "story", "stakes", { note: "note only" }); // not done
    expect(checklistProgress(data, "story")).toEqual({ done: 2, total: 18 });
  });

  it("reports zero done for empty data", () => {
    expect(checklistProgress(undefined, "page")).toEqual({ done: 0, total: 32 });
  });
});

describe("tierState", () => {
  it("returns an empty object when the tier is absent", () => {
    expect(tierState(undefined, "story")).toEqual({});
  });
});

describe("chapter checklist (#75)", () => {
  it("sets an item on one chapter without touching another", () => {
    let data = setChapterChecklistItem(undefined, "sg-1", "hook", { done: true });
    data = setChapterChecklistItem(data, "c:Two", "tension", { note: "flat middle" });
    expect(chapterState(data, "sg-1")).toEqual({ hook: { done: true } });
    expect(chapterState(data, "c:Two")).toEqual({ tension: { note: "flat middle" } });
  });

  it("leaves the story and prose tiers alone", () => {
    const base = setChecklistItem(undefined, "story", "structure", { done: true });
    const next = setChapterChecklistItem(base, "sg-1", "hook", { done: true });
    expect(next.story).toEqual({ structure: { done: true } });
    expect(base.chapter).toBeUndefined();
  });

  it("prunes an emptied chapter, then the whole chapter map", () => {
    let data = setChapterChecklistItem(undefined, "sg-1", "hook", { done: true });
    data = setChapterChecklistItem(data, "sg-2", "paced", { done: true });
    data = setChapterChecklistItem(data, "sg-1", "hook", { done: false });
    expect(Object.keys(data.chapter ?? {})).toEqual(["sg-2"]);
    data = setChapterChecklistItem(data, "sg-2", "paced", { done: false, note: " " });
    expect(data.chapter).toBeUndefined();
    expect(Object.keys(data)).toEqual([]);
  });

  it("reads hand-edited junk as empty instead of throwing", () => {
    const junk = { chapter: ["not", "a", "map"] } as unknown as RevisionChecklistData;
    expect(chapterState(junk, "sg-1")).toEqual({});
    const junk2 = { chapter: { "sg-1": "done" } } as unknown as RevisionChecklistData;
    expect(chapterState(junk2, "sg-1")).toEqual({});
    expect(setChapterChecklistItem(junk, "sg-1", "hook", { done: true }).chapter).toEqual({
      "sg-1": { hook: { done: true } },
    });
  });

  it("counts progress against the effective ids only", () => {
    const data = setChapterChecklistItem(
      setChapterChecklistItem(undefined, "sg-1", "hook", { done: true }),
      "sg-1",
      "hidden",
      { done: true }
    );
    expect(stateProgress(chapterState(data, "sg-1"), ["hook", "paced"])).toEqual({ done: 1, total: 2 });
  });

  it("ships ten chapter checkpoints with unique ids", () => {
    const ids = CHAPTER_CHECKPOINTS.map((c) => c.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(chapterCheckpoints({ hidden: ["hook"] }).map((c) => c.id)).not.toContain("hook");
  });
});
