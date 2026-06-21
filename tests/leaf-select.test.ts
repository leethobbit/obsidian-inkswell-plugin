import { describe, expect, it } from "vitest";
import { pickReusableLeaf } from "../src/lib/leaf-select";

type Leaf = { id: string; pinned: boolean };
const pinned = (l: Leaf) => l.pinned;

describe("pickReusableLeaf", () => {
  it("returns the first non-pinned leaf", () => {
    const leaves: Leaf[] = [
      { id: "a", pinned: true },
      { id: "b", pinned: false },
      { id: "c", pinned: false },
    ];
    expect(pickReusableLeaf(leaves, pinned)?.id).toBe("b");
  });

  it("returns null when every leaf is pinned", () => {
    const leaves: Leaf[] = [
      { id: "a", pinned: true },
      { id: "b", pinned: true },
    ];
    expect(pickReusableLeaf(leaves, pinned)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(pickReusableLeaf([], pinned)).toBeNull();
  });
});
