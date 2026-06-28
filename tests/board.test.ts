import { describe, expect, it } from "vitest";
import { BoardItem, buildColumns } from "../src/outliner/board";

const items: BoardItem[] = [
  { title: "S1", path: "a", status: "draft", act: "1", chapter: "1", pov: "Anna" },
  { title: "S2", path: "b", status: "final", act: "1", chapter: "2", pov: "Erik" },
  { title: "S3", path: "c", act: "2" }, // no status, no chapter, no pov
];

describe("buildColumns by status", () => {
  const cols = buildColumns(items, "status");
  it("has all 6 status columns plus a No-status column", () => {
    expect(cols.map((c) => c.key)).toEqual([
      "idea",
      "outlined",
      "draft",
      "written",
      "revised",
      "final",
      "",
    ]);
  });
  it("places cards in the right columns", () => {
    expect(cols.find((c) => c.key === "draft")!.items.map((i) => i.title)).toEqual(["S1"]);
    expect(cols.find((c) => c.key === "final")!.items.map((i) => i.title)).toEqual(["S2"]);
    expect(cols.find((c) => c.key === "")!.items.map((i) => i.title)).toEqual(["S3"]);
  });
});

describe("buildColumns by act", () => {
  const cols = buildColumns(items, "act");
  it("makes a column per distinct act + None, sorted numerically", () => {
    expect(cols.map((c) => c.key)).toEqual(["1", "2", ""]);
    expect(cols[0].items.map((i) => i.title)).toEqual(["S1", "S2"]);
    expect(cols[1].items.map((i) => i.title)).toEqual(["S3"]);
  });
});

describe("buildColumns by chapter", () => {
  const cols = buildColumns(items, "chapter");
  it("makes a column per distinct chapter + No-chapter, sorted numerically", () => {
    expect(cols.map((c) => c.key)).toEqual(["1", "2", ""]);
    expect(cols[0].items.map((i) => i.title)).toEqual(["S1"]);
    expect(cols[1].items.map((i) => i.title)).toEqual(["S2"]);
    expect(cols.find((c) => c.key === "")!.items.map((i) => i.title)).toEqual(["S3"]);
  });
});

describe("buildColumns orders columns by manuscript order, not alphabetically", () => {
  // Scenes in reading order whose values would sort the OTHER way alphabetically.
  const ordered: BoardItem[] = [
    { title: "S1", path: "a", chapter: "Two", act: "Beta", pov: "Zara" },
    { title: "S2", path: "b", chapter: "One", act: "Alpha", pov: "Adam" },
    { title: "S3", path: "c" }, // no fields
  ];

  it("chapter columns follow first appearance in scene order", () => {
    const cols = buildColumns(ordered, "chapter");
    expect(cols.map((c) => c.key)).toEqual(["Two", "One", ""]);
  });

  it("act columns follow first appearance in scene order", () => {
    const cols = buildColumns(ordered, "act");
    expect(cols.map((c) => c.key)).toEqual(["Beta", "Alpha", ""]);
  });

  it("pov columns follow first appearance in scene order", () => {
    const cols = buildColumns(ordered, "pov");
    expect(cols.map((c) => c.key)).toEqual(["Zara", "Adam", ""]);
  });

  it("dedupes on first appearance (a value seen again keeps its first slot)", () => {
    const items: BoardItem[] = [
      { title: "S1", path: "a", chapter: "Two" },
      { title: "S2", path: "b", chapter: "One" },
      { title: "S3", path: "c", chapter: "Two" }, // Two reappears
    ];
    const cols = buildColumns(items, "chapter");
    expect(cols.map((c) => c.key)).toEqual(["Two", "One", ""]);
    expect(cols.find((c) => c.key === "Two")!.items.map((i) => i.title)).toEqual(["S1", "S3"]);
  });
});

describe("buildColumns by pov", () => {
  const cols = buildColumns(items, "pov");
  it("groups by POV with a No-POV column", () => {
    expect(cols.map((c) => c.key)).toEqual(["Anna", "Erik", ""]);
    expect(cols.find((c) => c.key === "")!.items.map((i) => i.title)).toEqual(["S3"]);
  });

  it("displays the clean name for wikilink POV values but keeps the raw key", () => {
    const linked: BoardItem[] = [{ title: "S", path: "a", pov: "[[Anna]]" }];
    const col = buildColumns(linked, "pov")[0];
    expect(col.key).toBe("[[Anna]]"); // drag-drop writes back the stored value
    expect(col.label).toBe("Anna"); // header shows the clean name
  });
});
