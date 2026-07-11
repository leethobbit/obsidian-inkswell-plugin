import { describe, expect, it } from "vitest";
import {
  BoardItem,
  buildColumns,
  buildOutlineColumns,
  resolveActDrop,
} from "../src/outliner/board";
import { buildOutline } from "../src/outliner/outline";
import type { StructureGroup } from "../src/outliner/structure";

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

describe("buildColumns by pov", () => {
  const cols = buildColumns(items, "pov");
  it("groups by POV with a No-POV column", () => {
    expect(cols.map((c) => c.key)).toEqual(["Anna", "Erik", ""]);
    expect(cols.find((c) => c.key === "")!.items.map((i) => i.title)).toEqual(["S3"]);
  });

  it("pov columns follow first appearance in scene order, deduped", () => {
    const ordered: BoardItem[] = [
      { title: "S1", path: "a", pov: "Zara" },
      { title: "S2", path: "b", pov: "Adam" },
      { title: "S3", path: "c", pov: "Zara" },
    ];
    const cols = buildColumns(ordered, "pov");
    expect(cols.map((c) => c.key)).toEqual(["Zara", "Adam", ""]);
    expect(cols.find((c) => c.key === "Zara")!.items.map((i) => i.title)).toEqual(["S1", "S3"]);
  });

  it("displays the clean name for wikilink POV values but keeps the raw key", () => {
    const linked: BoardItem[] = [{ title: "S", path: "a", pov: "[[Anna]]" }];
    const col = buildColumns(linked, "pov")[0];
    expect(col.key).toBe("[[Anna]]"); // drag-drop writes back the stored value
    expect(col.label).toBe("Anna"); // header shows the clean name
  });
});

// --- Structural (outline-derived) columns ------------------------------------

const acts: StructureGroup[] = [
  { id: "act-1", title: "Act I" },
  { id: "act-2", title: "Act II" },
  { id: "act-3", title: "Act III" }, // no chapters — planned/empty act
];
const chapters: StructureGroup[] = [
  { id: "ch-1", title: "One", actId: "act-1" },
  { id: "ch-2", title: "Two", actId: "act-1" },
  { id: "ch-3", title: "Three", actId: "act-2" },
  { id: "ch-4", title: "Four", actId: "act-2" }, // no scenes — planned/empty chapter
];
const boardItems: BoardItem[] = [
  { title: "S1", path: "p1", chapter: "One" },
  { title: "S2", path: "p2", chapter: "One" },
  { title: "S3", path: "p3", chapter: "Two" },
  { title: "S4", path: "p4", chapter: "Three" },
  { title: "S5", path: "p5" }, // unassigned
];
const scenes = boardItems.map((it) => ({
  title: it.title,
  path: it.path,
  indent: 0,
  chapter: it.chapter,
  act: it.act,
}));
const tree = buildOutline(acts, chapters, scenes);

describe("buildOutlineColumns by chapter", () => {
  const cols = buildOutlineColumns(tree, "chapter", boardItems);
  it("shows every chapter in outline order — including empty ones — plus No chapter", () => {
    expect(cols.map((c) => c.key)).toEqual(["ch-1", "ch-2", "ch-3", "ch-4", ""]);
    expect(cols.map((c) => c.label)).toEqual(["One", "Two", "Three", "Four", "No chapter"]);
  });
  it("carries the act as the column's sub-label", () => {
    expect(cols.map((c) => c.sub)).toEqual(["Act I", "Act I", "Act II", "Act II", undefined]);
  });
  it("places cards by outline membership; unassigned scenes land in No chapter", () => {
    expect(cols[0].items.map((i) => i.title)).toEqual(["S1", "S2"]);
    expect(cols[3].items).toEqual([]); // empty chapter renders as an empty column
    expect(cols[4].items.map((i) => i.title)).toEqual(["S5"]);
  });
});

describe("buildOutlineColumns by act", () => {
  const cols = buildOutlineColumns(tree, "act", boardItems);
  it("shows every act — including empty ones — plus No act", () => {
    expect(cols.map((c) => c.key)).toEqual(["act-1", "act-2", "act-3", ""]);
  });
  it("an act column holds its chapters' scenes in outline order", () => {
    expect(cols[0].items.map((i) => i.title)).toEqual(["S1", "S2", "S3"]);
    expect(cols[1].items.map((i) => i.title)).toEqual(["S4"]);
    expect(cols[2].items).toEqual([]); // empty act
    expect(cols[3].items.map((i) => i.title)).toEqual(["S5"]);
  });
});

describe("resolveActDrop", () => {
  it("moving to a LATER act lands in its first chapter", () => {
    expect(resolveActDrop(tree, "S1", "act-2")).toEqual({ kind: "move", chapterId: "ch-3" });
  });
  it("moving to an EARLIER act lands in its last chapter", () => {
    expect(resolveActDrop(tree, "S4", "act-1")).toEqual({ kind: "move", chapterId: "ch-2" });
  });
  it("an unassigned scene counts as later than every act (lands in last chapter)", () => {
    expect(resolveActDrop(tree, "S5", "act-1")).toEqual({ kind: "move", chapterId: "ch-2" });
  });
  it("dropping on an act with no chapters is rejected", () => {
    expect(resolveActDrop(tree, "S1", "act-3")).toEqual({ kind: "empty-act" });
  });
  it("dropping on the scene's own act is a noop", () => {
    expect(resolveActDrop(tree, "S1", "act-1")).toEqual({ kind: "noop" });
  });
  it("an unknown act id is a noop", () => {
    expect(resolveActDrop(tree, "S1", "nope")).toEqual({ kind: "noop" });
  });
});
