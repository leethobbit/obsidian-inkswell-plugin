import { describe, expect, it } from "vitest";
import {
  OutlineTree,
  buildOutline,
  moveAct,
  moveChapter,
  moveScene,
  serializeOutline,
} from "../src/outliner/outline";

const scene = (title: string, chapter?: string, act?: string) => ({
  title,
  path: `${title}.md`,
  indent: 0,
  chapter,
  act,
});

// Manuscript-order fixture: chapters One(1,2)/Two(3) in act "1", Three(4) in act "2", s5 loose.
const SCENES = [
  scene("s1", "One", "1"),
  scene("s2", "One", "1"),
  scene("s3", "Two", "1"),
  scene("s4", "Three", "2"),
  scene("s5"),
];

describe("buildOutline — adoption + inference", () => {
  it("adopts derived chapters/acts from scene strings when no config exists", () => {
    const t = buildOutline(undefined, undefined, SCENES);
    expect(t.acts.map((a) => a.title)).toEqual(["1", "2"]);
    expect(t.acts[0].chapters.map((c) => c.title)).toEqual(["One", "Two"]);
    expect(t.acts[1].chapters.map((c) => c.title)).toEqual(["Three"]);
    expect(t.acts[0].chapters[0].scenes.map((s) => s.title)).toEqual(["s1", "s2"]);
    expect(t.looseChapters).toEqual([]);
    expect(t.unassignedScenes.map((s) => s.title)).toEqual(["s5"]);
    // Derived ids are deterministic + title-based.
    expect(t.acts[0].id).toBe("a:1");
    expect(t.acts[0].chapters[0].id).toBe("c:One");
  });

  it("orders chapters by first manuscript appearance, acts by first appearance", () => {
    // Reverse the manuscript: Three first.
    const rev = [scene("x1", "Three", "2"), scene("x2", "One", "1")];
    const t = buildOutline(undefined, undefined, rev);
    expect(t.acts.map((a) => a.title)).toEqual(["2", "1"]);
  });

  it("config actId + id win over inference; targets carry", () => {
    const acts = [{ id: "act-A", title: "1" }];
    const chapters = [{ id: "ch-1", title: "One", actId: "act-A", targetWords: 3000 }];
    const t = buildOutline(acts, chapters, SCENES);
    const one = t.acts.find((a) => a.id === "act-A")!.chapters.find((c) => c.title === "One")!;
    expect(one.id).toBe("ch-1");
    expect(one.targetWords).toBe(3000);
    // "Two" was inferred into the same act by its scene's act string "1".
    expect(t.acts.find((a) => a.id === "act-A")!.chapters.map((c) => c.title)).toContain("Two");
  });

  it("keeps a configured chapter with no scenes as an empty node", () => {
    const chapters = [{ id: "ch-9", title: "Prologue" }];
    const t = buildOutline(undefined, chapters, SCENES);
    const all = [...t.acts.flatMap((a) => a.chapters), ...t.looseChapters];
    const prologue = all.find((c) => c.title === "Prologue")!;
    expect(prologue.scenes).toEqual([]);
  });
});

describe("serializeOutline", () => {
  it("produces contiguous order + denormalized maps + config arrays", () => {
    const t = buildOutline(undefined, undefined, SCENES);
    const out = serializeOutline(t);
    expect(out.order.map((s) => s.title)).toEqual(["s1", "s2", "s3", "s4", "s5"]);
    expect(out.sceneChapter.get("s1")).toBe("One");
    expect(out.sceneAct.get("s3")).toBe("1");
    expect(out.sceneChapter.get("s5")).toBe(""); // unassigned clears
    expect(out.sceneAct.get("s5")).toBe("");
    expect(out.acts.map((a) => a.title)).toEqual(["1", "2"]);
    const two = out.chapters.find((c) => c.title === "Two")!;
    expect(two.actId).toBe("a:1");
  });

  it("round-trips: build(serialize(t)) is structurally stable", () => {
    const t = buildOutline(undefined, undefined, SCENES);
    const out = serializeOutline(t);
    const scenes2 = out.order.map((s) => ({
      title: s.title,
      path: `${s.title}.md`,
      indent: s.indent,
      chapter: out.sceneChapter.get(s.title) || undefined,
      act: out.sceneAct.get(s.title) || undefined,
    }));
    const t2 = buildOutline(out.acts, out.chapters, scenes2);
    expect(t2.acts.map((a) => [a.title, a.chapters.map((c) => c.title)])).toEqual(
      t.acts.map((a) => [a.title, a.chapters.map((c) => c.title)])
    );
    expect(t2.unassignedScenes.map((s) => s.title)).toEqual(["s5"]);
  });
});

describe("move helpers", () => {
  const tree = (): OutlineTree => buildOutline(undefined, undefined, SCENES);

  it("moveScene into another chapter (appends) then re-serializes contiguously", () => {
    const t = moveScene(tree(), "s3", "c:One", null);
    const out = serializeOutline(t);
    // s3 now trails s1,s2 in chapter One; Two is empty.
    expect(out.sceneChapter.get("s3")).toBe("One");
    expect(out.order.map((s) => s.title)).toEqual(["s1", "s2", "s3", "s4", "s5"]);
  });

  it("moveScene to unassigned clears its chapter", () => {
    const out = serializeOutline(moveScene(tree(), "s1", null, null));
    expect(out.sceneChapter.get("s1")).toBe("");
    expect(out.sceneAct.get("s1")).toBe("");
  });

  it("moveChapter into a different act moves its scenes' act on serialize", () => {
    const out = serializeOutline(moveChapter(tree(), "c:Two", "a:2", null));
    expect(out.chapters.find((c) => c.title === "Two")!.actId).toBe("a:2");
    expect(out.sceneAct.get("s3")).toBe("2"); // denormalized to the new act
  });

  it("moveChapter to loose (no act) clears its scenes' act", () => {
    const out = serializeOutline(moveChapter(tree(), "c:Two", null, null));
    expect(out.chapters.find((c) => c.title === "Two")!.actId).toBeUndefined();
    expect(out.sceneAct.get("s3")).toBe("");
  });

  it("moveAct reorders acts", () => {
    const t = moveAct(tree(), "a:2", "a:1"); // move act 2 before act 1
    expect(t.acts.map((a) => a.title)).toEqual(["2", "1"]);
  });

  it("returns the same tree reference for a no-op move (unknown id)", () => {
    const t = tree();
    expect(moveScene(t, "nope", "c:One", null)).toBe(t);
  });
});
