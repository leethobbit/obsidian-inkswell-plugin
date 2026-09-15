import { describe, expect, it } from "vitest";
import { applyGroupedOverride, applyOverride, normalizeListOverride } from "../src/lib/list-override";
import {
  addGroup,
  addItem,
  patchItem,
  removeGroup,
  removeItem,
  setGroupLabel,
  setItemHidden,
  setItemLabel,
  setOrder,
} from "../src/customize/override-ops";

const shipped = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
];
const spec = { shipped, allowAdded: true, allowGroups: false, allowOrder: true };

describe("override ops", () => {
  it("rename: a shipped label equal to shipped clears the override; customs edit in place", () => {
    let o = setItemLabel(undefined, "a", "Opening", "Alpha");
    expect(o.labels).toEqual({ a: "Opening" });
    o = setItemLabel(o, "a", "Alpha", "Alpha");
    expect(normalizeListOverride(o, spec)).toBeUndefined();
    o = addItem(undefined, { id: "sc-1", label: "Mine" });
    o = setItemLabel(o, "sc-1", "Renamed", undefined);
    expect(o.added?.[0].label).toBe("Renamed");
  });

  it("hide / unhide / order / remove compose and never touch the input", () => {
    const base = addItem(undefined, { id: "sc-1", label: "Mine" });
    const hidden = setItemHidden(base, "b", true);
    expect(base.hidden).toEqual([]);
    expect(applyOverride(shipped, hidden).find((i) => i.id === "b")?.hidden).toBe(true);
    const shown = setItemHidden(hidden, "b", false);
    expect(shown.hidden).toEqual([]);
    const ordered = setOrder(shown, ["sc-1", "b", "a"]);
    expect(applyOverride(shipped, ordered).map((i) => i.id)).toEqual(["sc-1", "b", "a"]);
    const removed = removeItem(setItemHidden(ordered, "sc-1", true), "sc-1");
    expect(removed.added).toEqual([]);
    expect(removed.hidden).toEqual([]);
    expect(removed.order).toEqual(["b", "a"]);
  });

  it("patchItem updates a custom item's extras but never its id", () => {
    const o = addItem<{ phase: string }>(undefined, { id: "wp-1", label: "x", phase: "draft" });
    const p = patchItem(o, "wp-1", { phase: "revise", id: "hijack" } as never);
    expect(p.added?.[0]).toEqual({ id: "wp-1", label: "x", phase: "revise" });
  });

  it("patchItem on a SHIPPED item records an extras override (and never touches label)", () => {
    const p = patchItem<{ phase: string }>(undefined, "p1", { phase: "revise", label: "nope" } as never);
    expect(p.extras).toEqual({ p1: { phase: "revise" } });
    expect(p.labels).toEqual({});
    const again = patchItem(p, "p1", { phase: "draft" } as never);
    expect(again.extras).toEqual({ p1: { phase: "draft" } });
  });

  it("groups: rename shipped (cleared when equal), add custom, remove custom with its items", () => {
    const groups = [{ id: "g1", label: "One", items: [{ id: "a", label: "A" }] }];
    let o = setGroupLabel(undefined, "g1", "First", "One");
    expect(o.groups).toEqual([{ id: "g1", label: "First" }]);
    o = setGroupLabel(o, "g1", "One", "One");
    expect(o.groups).toEqual([]);
    o = addGroup(o, { id: "pg-x", label: "Mine" });
    o = addItem(o, { id: "pt-1", label: "Task", group: "pg-x" });
    o = setGroupLabel(o, "pg-x", "Renamed", undefined);
    expect(applyGroupedOverride(groups, o).at(-1)).toMatchObject({ id: "pg-x", label: "Renamed" });
    o = removeGroup(o, "pg-x");
    expect(o.groups).toEqual([]);
    expect(o.added).toEqual([]);
  });
});
