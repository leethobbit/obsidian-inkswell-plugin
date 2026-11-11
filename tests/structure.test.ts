import { describe, expect, it } from "vitest";
import {
  StructureGroup,
  distinctInOrder,
  mergeGroups,
  pinChapterConfig,
  removeGroup,
  renameGroupConfig,
  sumGroupWords,
  upsertGroup,
} from "../src/outliner/structure";
import { chapterRuns } from "../src/outliner/outline";

describe("distinctInOrder", () => {
  it("keeps first-appearance order and drops blanks/dupes", () => {
    expect(distinctInOrder(["One", "One", "Two", "", undefined, "Three", "Two"])).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("trims whitespace and treats trimmed-blank as blank", () => {
    expect(distinctInOrder(["  A  ", "A", "   "])).toEqual(["A"]);
  });
});

describe("mergeGroups", () => {
  const configured: StructureGroup[] = [
    { id: "c-1", title: "One", targetWords: 3000 },
    { id: "c-2", title: "Six", targetWords: 5000 }, // planned: no scene has "Six"
  ];

  it("returns active groups in derived (manuscript) order with targets attached", () => {
    const { active } = mergeGroups(["One", "Two"], configured);
    expect(active.map((g) => g.title)).toEqual(["One", "Two"]);
    expect(active[0]).toMatchObject({ id: "c-1", title: "One", targetWords: 3000 });
    // Derived-only group has no config → synthetic id, no target.
    expect(active[1].title).toBe("Two");
    expect(active[1].targetWords).toBeUndefined();
  });

  it("splits configured-with-no-scene entries into planned (array order)", () => {
    const { planned } = mergeGroups(["One", "Two"], configured);
    expect(planned.map((g) => g.title)).toEqual(["Six"]);
    expect(planned[0]).toMatchObject({ id: "c-2", targetWords: 5000 });
  });

  it("handles no config", () => {
    const { active, planned } = mergeGroups(["One"], undefined);
    expect(active.map((g) => g.title)).toEqual(["One"]);
    expect(planned).toEqual([]);
  });
});

describe("upsertGroup", () => {
  it("appends a new group with a minted id", () => {
    const next = upsertGroup(undefined, { title: "One", targetWords: 3000 });
    expect(next).toHaveLength(1);
    expect(next[0].id).toMatch(/^sg-/);
    expect(next[0]).toMatchObject({ title: "One", targetWords: 3000 });
  });

  it("replaces an existing entry matched by title, preserving its id", () => {
    const start: StructureGroup[] = [{ id: "c-1", title: "One", targetWords: 1000 }];
    const next = upsertGroup(start, { title: "One", targetWords: 3000 });
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ id: "c-1", title: "One", targetWords: 3000 });
  });

  it("matches by id when provided (supports rename-in-place)", () => {
    const start: StructureGroup[] = [{ id: "c-1", title: "One" }];
    const next = upsertGroup(start, { id: "c-1", title: "Chapter 1", targetWords: 2000 });
    expect(next).toEqual([{ id: "c-1", title: "Chapter 1", targetWords: 2000 }]);
  });

  it("omits targetWords when zero/absent (keeps a bare planned entry)", () => {
    const next = upsertGroup(undefined, { title: "Six" });
    expect(next[0].targetWords).toBeUndefined();
  });
});

describe("removeGroup", () => {
  it("drops the entry with the given id", () => {
    const start: StructureGroup[] = [
      { id: "c-1", title: "One" },
      { id: "c-2", title: "Two" },
    ];
    expect(removeGroup(start, "c-1")).toEqual([{ id: "c-2", title: "Two" }]);
  });

  it("no-ops for an unknown id", () => {
    const start: StructureGroup[] = [{ id: "c-1", title: "One" }];
    expect(removeGroup(start, "nope")).toEqual(start);
  });
});

describe("renameGroupConfig", () => {
  it("rewrites the matching entry's title", () => {
    const start: StructureGroup[] = [{ id: "c-1", title: "One", targetWords: 3000 }];
    expect(renameGroupConfig(start, "One", "Chapter 1")).toEqual([
      { id: "c-1", title: "Chapter 1", targetWords: 3000 },
    ]);
  });

  it("returns null when nothing matches or titles are equal", () => {
    const start: StructureGroup[] = [{ id: "c-1", title: "One" }];
    expect(renameGroupConfig(start, "Nope", "X")).toBeNull();
    expect(renameGroupConfig(start, "One", "One")).toBeNull();
    expect(renameGroupConfig(undefined, "One", "Two")).toBeNull();
  });
});

describe("sumGroupWords", () => {
  it("buckets and sums words + scene counts by label", () => {
    const map = sumGroupWords([
      { label: "One", words: 100 },
      { label: "One", words: 50 },
      { label: "Two", words: 200 },
      { label: "", words: 10 },
      { label: undefined, words: 5 },
    ]);
    expect(map.get("One")).toEqual({ words: 150, scenes: 2 });
    expect(map.get("Two")).toEqual({ words: 200, scenes: 1 });
    // Blank + undefined both fall into the "" bucket.
    expect(map.get("")).toEqual({ words: 15, scenes: 2 });
  });
});

describe("pinChapterConfig (#75)", () => {
  it("appends an anchored entry for an unconfigured chapter", () => {
    expect(pinChapterConfig(undefined, { id: "c:One", title: "One", firstScene: "A" })).toEqual([
      { id: "c:One", title: "One", firstScene: "A" },
    ]);
  });

  it("returns null when the id is already configured", () => {
    const cfg: StructureGroup[] = [{ id: "sg-1", title: "One", targetWords: 3000 }];
    expect(pinChapterConfig(cfg, { id: "sg-1", title: "One", firstScene: "A" })).toBeNull();
  });

  it("keeps a pinned chapter's id when a same-named chapter appears earlier (#58)", () => {
    // Two runs of "Interlude": derived ids follow occurrence order.
    const scenes = [
      { title: "A", chapter: "Interlude" },
      { title: "B", chapter: "Main" },
      { title: "C", chapter: "Interlude" },
    ];
    const before = chapterRuns(scenes, undefined).runs;
    const second = before[2];
    expect(second.id).toBe("c:Interlude~2");
    const pinned = pinChapterConfig(undefined, {
      id: second.id,
      title: second.title,
      firstScene: scenes[second.indices[0]].title,
    });

    // Drop the first Interlude run: unpinned, the old second run would now
    // derive plain `c:Interlude`; pinned, it keeps its own id.
    const after = scenes.slice(1);
    expect(chapterRuns(after, undefined).runs[1].id).toBe("c:Interlude");
    expect(chapterRuns(after, pinned ?? undefined).runs[1].id).toBe("c:Interlude~2");
  });
});
