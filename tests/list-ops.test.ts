import { describe, expect, it } from "vitest";
import { dropIndex, moveItem } from "../src/lib/list-ops";

const abcd = ["a", "b", "c", "d"];

describe("moveItem", () => {
  it("moves up and down by one with post-removal indices", () => {
    expect(moveItem(abcd, 2, 1)).toEqual(["a", "c", "b", "d"]); // Move up
    expect(moveItem(abcd, 1, 2)).toEqual(["a", "c", "b", "d"]); // Move down
  });

  it("moves to the ends and clamps out-of-range targets", () => {
    expect(moveItem(abcd, 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveItem(abcd, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(abcd, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(abcd, 2, -5)).toEqual(["c", "a", "b", "d"]);
  });

  it("returns a copy for no-ops and bad sources, never the same reference", () => {
    const same = moveItem(abcd, 1, 1);
    expect(same).toEqual(abcd);
    expect(same).not.toBe(abcd);
    expect(moveItem(abcd, 9, 0)).toEqual(abcd);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});

describe("dropIndex", () => {
  it("drag down: above target takes its slot, below lands after it", () => {
    expect(moveItem(abcd, 0, dropIndex(0, 2, false))).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(abcd, 0, dropIndex(0, 2, true))).toEqual(["b", "c", "a", "d"]);
  });

  it("drag up: above target takes its slot, below lands after it", () => {
    expect(moveItem(abcd, 3, dropIndex(3, 1, false))).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(abcd, 3, dropIndex(3, 1, true))).toEqual(["a", "b", "d", "c"]);
  });

  it("dropping a row onto itself is a no-op on either half", () => {
    expect(dropIndex(1, 1, false)).toBe(1);
    expect(dropIndex(1, 1, true)).toBe(1);
  });
});
