import { describe, expect, it } from "vitest";
import {
  addScene,
  indentScene,
  moveScene,
  removeScene,
  unindentScene,
} from "../src/projects/scene-tree";
import { IndentedScene } from "../src/projects/types";

const titles = (s: IndentedScene[]) => s.map((x) => x.title).join(",");

const base: IndentedScene[] = [
  { title: "a", indent: 0 },
  { title: "b", indent: 0 },
  { title: "c", indent: 0 },
];

describe("moveScene", () => {
  it("moves an item later", () => {
    expect(titles(moveScene(base, 0, 2))).toBe("b,a,c");
  });
  it("moves an item earlier", () => {
    expect(titles(moveScene(base, 2, 0))).toBe("c,a,b");
  });
  it("does not mutate the input", () => {
    const copy = base.slice();
    moveScene(base, 0, 2);
    expect(base).toEqual(copy);
  });
});

describe("indentScene", () => {
  it("nests under the previous scene", () => {
    const out = indentScene(base, 1);
    expect(out[1].indent).toBe(1);
  });
  it("won't indent the first scene", () => {
    expect(indentScene(base, 0)[0].indent).toBe(0);
  });
  it("won't over-indent beyond previous + 1", () => {
    const start: IndentedScene[] = [
      { title: "a", indent: 0 },
      { title: "b", indent: 1 },
    ];
    // b is already at prev+1; indenting again is a no-op.
    expect(indentScene(start, 1)[1].indent).toBe(1);
  });
});

describe("unindentScene", () => {
  it("decreases indent and pulls descendants along", () => {
    const start: IndentedScene[] = [
      { title: "a", indent: 0 },
      { title: "b", indent: 1 },
      { title: "c", indent: 2 },
      { title: "d", indent: 1 },
    ];
    const out = unindentScene(start, 1);
    expect(out.map((s) => s.indent)).toEqual([0, 0, 1, 1]);
  });
  it("is a no-op at the top level", () => {
    expect(unindentScene(base, 0)[0].indent).toBe(0);
  });
});

describe("addScene / removeScene", () => {
  it("appends at top level", () => {
    expect(titles(addScene(base, "d"))).toBe("a,b,c,d");
  });
  it("removes by title", () => {
    expect(titles(removeScene(base, "b"))).toBe("a,c");
  });
});
