import { describe, expect, it } from "vitest";
import { EditorPlaces } from "../src/views/editor-place";
import {
  DEFAULT_WRITE_LAYOUT,
  EDITOR_WIDTH_MIN,
  SIDE_WIDTH_MAX,
  SIDE_WIDTH_MIN,
  clampSideWidth,
  parseWriteLayout,
} from "../src/views/write-layout";

describe("EditorPlaces (where you were in each scene)", () => {
  const place = (over: Partial<{ anchor: number; head: number; docLength: number; scroll: string | null; focus: boolean }> = {}) => ({
    anchor: 40,
    head: 52,
    docLength: 100,
    scroll: "snapshot" as string | null,
    focus: false,
    ...over,
  });

  it("returns nothing for a scene it hasn't seen", () => {
    expect(new EditorPlaces<string>().recall("a.md", 10)).toBeNull();
  });

  it("gives back the selection and the scroll for the same text", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place());
    expect(places.recall("a.md", 100)).toEqual({ anchor: 40, head: 52, scroll: "snapshot", focus: false });
  });

  it("keeps scenes apart", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place({ anchor: 1, head: 1 }));
    places.remember("b.md", place({ anchor: 9, head: 9 }));
    expect(places.recall("a.md", 100)?.head).toBe(1);
    expect(places.recall("b.md", 100)?.head).toBe(9);
  });

  it("drops the scroll and clamps the selection when the text changed length", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place({ anchor: 80, head: 95 }));
    expect(places.recall("a.md", 90)).toEqual({ anchor: 80, head: 90, scroll: null, focus: false });
    places.remember("a.md", place({ anchor: 80, head: 95 }));
    expect(places.recall("a.md", 0)).toEqual({ anchor: 0, head: 0, scroll: null, focus: false });
  });

  it("hands focus back once, not on every later rebuild", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place({ focus: true }));
    expect(places.recall("a.md", 100)?.focus).toBe(true);
    expect(places.recall("a.md", 100)?.focus).toBe(false);
  });

  it("a newer place replaces the older one", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place({ head: 5 }));
    places.remember("a.md", place({ head: 70 }));
    expect(places.recall("a.md", 100)?.head).toBe(70);
  });

  it("forgets the scene used longest ago past its limit", () => {
    const places = new EditorPlaces<string>(2);
    places.remember("a.md", place());
    places.remember("b.md", place());
    places.remember("a.md", place()); // a is now the most recent
    places.remember("c.md", place());
    expect(places.recall("b.md", 100)).toBeNull();
    expect(places.recall("a.md", 100)).not.toBeNull();
    expect(places.recall("c.md", 100)).not.toBeNull();
  });

  it("forget removes one scene", () => {
    const places = new EditorPlaces<string>();
    places.remember("a.md", place());
    places.forget("a.md");
    expect(places.recall("a.md", 100)).toBeNull();
  });
});

describe("clampSideWidth (Write's side panel)", () => {
  it("keeps a width inside the limits", () => {
    expect(clampSideWidth(300)).toBe(300);
    expect(clampSideWidth(10)).toBe(SIDE_WIDTH_MIN);
    expect(clampSideWidth(5000)).toBe(SIDE_WIDTH_MAX);
  });

  it("rounds to whole pixels", () => {
    expect(clampSideWidth(300.6)).toBe(301);
  });

  it("leaves the editor its minimum when it knows the room", () => {
    expect(clampSideWidth(600, 800)).toBe(800 - EDITOR_WIDTH_MIN);
    expect(clampSideWidth(300, 2000)).toBe(300);
  });

  it("never goes below the minimum, even in a room too small for both", () => {
    expect(clampSideWidth(400, 400)).toBe(SIDE_WIDTH_MIN);
  });
});

describe("parseWriteLayout", () => {
  it("defaults when nothing usable is stored", () => {
    for (const raw of [null, undefined, "", "not json", "[]", "42", "null"]) {
      expect(parseWriteLayout(raw)).toEqual(DEFAULT_WRITE_LAYOUT);
    }
  });

  it("reads a stored layout", () => {
    const stored = {
      sideWidth: 340,
      sideCollapsed: true,
      sidePanel: "codex",
      navCollapsed: true,
      nextUpFolded: true,
    };
    expect(parseWriteLayout(JSON.stringify(stored))).toEqual(stored);
  });

  it("clamps a stored width and ignores fields of the wrong type", () => {
    const raw = JSON.stringify({ sideWidth: 9000, sideCollapsed: "yes", sidePanel: 3 });
    expect(parseWriteLayout(raw)).toEqual({
      ...DEFAULT_WRITE_LAYOUT,
      sideWidth: SIDE_WIDTH_MAX,
    });
    expect(parseWriteLayout(JSON.stringify({ sideWidth: "wide" })).sideWidth).toBeNull();
  });

  it("reads a layout saved before the scene list and next-up note could be hidden", () => {
    const old = JSON.stringify({ sideWidth: 300, sideCollapsed: false, sidePanel: "plan" });
    expect(parseWriteLayout(old)).toEqual({
      sideWidth: 300,
      sideCollapsed: false,
      sidePanel: "plan",
      navCollapsed: false,
      nextUpFolded: false,
    });
    expect(parseWriteLayout(JSON.stringify({ navCollapsed: "yes", nextUpFolded: 1 }))).toEqual(
      DEFAULT_WRITE_LAYOUT
    );
  });

  it("returns a fresh object each time", () => {
    const a = parseWriteLayout(null);
    a.sideCollapsed = true;
    expect(parseWriteLayout(null).sideCollapsed).toBe(false);
  });
});
