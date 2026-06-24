import { describe, expect, it } from "vitest";
import {
  RevisionChecklistData,
  checklistProgress,
  setChecklistItem,
  tierState,
} from "../src/revisions/checklist";

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
