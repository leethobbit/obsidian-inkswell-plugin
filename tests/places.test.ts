/**
 * Nested places (#66): World › Region › City, derived from each location's
 * `parent`. The tree must never lose an entry (loops, missing containers,
 * out-of-scope containers all degrade to top-level) and never walk forever.
 */
import { describe, expect, it } from "vitest";
import {
  PLACE_CATEGORY,
  buildPlaceTree,
  placeDescendants,
  placePath,
  placesInside,
} from "../src/codex/places";
import { CodexEntity } from "../src/codex/types";

const place = (name: string, parent?: string): CodexEntity => ({
  path: `Codex/${name}.md`,
  name,
  category: PLACE_CATEGORY,
  aliases: [],
  parent,
});
const world = (name: string): CodexEntity => ({ path: `Codex/${name}.md`, name, category: "world", aliases: [] });

const westeros = world("Westeros");
const north = place("The North", "Westeros");
const winterfell = place("Winterfell", "The North");
const wolfswood = place("Wolfswood", "the north"); // case-insensitive link
const reach = place("The Reach", "Westeros");
const lonely = place("Lonely Isle"); // no container
const lost = place("Lost Keep", "Nowhere"); // container doesn't exist
const ALL = [westeros, north, winterfell, wolfswood, reach, lonely, lost];
const PLACES = ALL.filter((e) => e.category === PLACE_CATEGORY);

const names = (list: CodexEntity[]) => list.map((e) => e.name);

describe("buildPlaceTree", () => {
  it("nests each place under the place it's inside; anything else is top-level", () => {
    const tree = buildPlaceTree(PLACES);
    expect(names(tree.roots)).toEqual(["Lonely Isle", "Lost Keep", "The North", "The Reach"]);
    expect(names(tree.children.get(north.path) ?? [])).toEqual(["Winterfell", "Wolfswood"]);
    expect(tree.children.get(winterfell.path)).toBeUndefined();
  });

  it("a place whose container isn't in the list (out of scope) is top-level", () => {
    const tree = buildPlaceTree([winterfell, reach]);
    expect(names(tree.roots)).toEqual(["The Reach", "Winterfell"]);
  });

  it("loops and self-references degrade to top-level — every entry stays listed", () => {
    const a = place("A", "B");
    const b = place("B", "A");
    const self = place("Self", "Self");
    const c = place("C", "A"); // hangs off a loop member
    const tree = buildPlaceTree([a, b, self, c]);
    expect(names(tree.roots)).toEqual(["A", "B", "Self"]);
    expect(names(tree.children.get(a.path) ?? [])).toEqual(["C"]);
  });
});

describe("placePath", () => {
  it("lists the containers outermost first, through to the world", () => {
    expect(names(placePath(winterfell, ALL))).toEqual(["Westeros", "The North"]);
    expect(names(placePath(north, ALL))).toEqual(["Westeros"]);
    expect(placePath(lonely, ALL)).toEqual([]);
    expect(placePath(lost, ALL)).toEqual([]);
  });

  it("stops at a loop instead of walking forever", () => {
    const a = place("A", "B");
    const b = place("B", "A");
    expect(names(placePath(a, [a, b]))).toEqual(["B"]);
  });
});

describe("placesInside / placeDescendants", () => {
  it("lists the places directly inside a world or a location", () => {
    expect(names(placesInside(westeros, ALL))).toEqual(["The North", "The Reach"]);
    expect(names(placesInside(north, ALL))).toEqual(["Winterfell", "Wolfswood"]);
    expect(placesInside(winterfell, ALL)).toEqual([]);
  });

  it("collects everything nested under a place (what its Inside picker must not offer)", () => {
    const crypts = place("Crypts", "Winterfell");
    const all = [...ALL, crypts];
    expect([...placeDescendants(north, all)].sort()).toEqual([crypts.path, winterfell.path, wolfswood.path].sort());
    expect(placeDescendants(crypts, all).size).toBe(0);
  });

  it("terminates on a loop", () => {
    const a = place("A", "B");
    const b = place("B", "A");
    expect([...placeDescendants(a, [a, b])]).toEqual([b.path]);
  });
});
