import { describe, expect, it } from "vitest";
import {
  ListSpec,
  applyGroupedOverride,
  applyOverride,
  newListItemId,
  normalizeListOverride,
  visibleIds,
} from "../src/lib/list-override";

const shipped = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
];

describe("applyOverride", () => {
  it("returns the shipped list verbatim with no override", () => {
    const eff = applyOverride(shipped, undefined);
    expect(eff.map((i) => [i.id, i.label, i.hidden, i.custom])).toEqual([
      ["a", "Alpha", false, false],
      ["b", "Beta", false, false],
      ["c", "Gamma", false, false],
    ]);
  });

  it("hides losslessly (flagged, never dropped) and visibleIds excludes hidden", () => {
    const eff = applyOverride(shipped, { hidden: ["b"] });
    expect(eff).toHaveLength(3);
    expect(eff[1].hidden).toBe(true);
    expect(visibleIds(shipped, { hidden: ["b"] })).toEqual(["a", "c"]);
  });

  it("renames keep the id and remember the shipped label", () => {
    const eff = applyOverride(shipped, { labels: { a: "Opening" } });
    expect(eff[0]).toMatchObject({ id: "a", label: "Opening", shippedLabel: "Alpha" });
  });

  it("orders listed ids first, the rest in shipped order; customs append", () => {
    const eff = applyOverride(shipped, {
      order: ["c", "x"],
      added: [{ id: "x", label: "Custom" }],
    });
    expect(eff.map((i) => i.id)).toEqual(["c", "x", "a", "b"]);
    expect(eff[1]).toMatchObject({ custom: true, hidden: false });
  });

  it("an added item that reuses a shipped id is ignored", () => {
    expect(applyOverride(shipped, { added: [{ id: "a", label: "dupe" }] })).toHaveLength(3);
  });

  it("extras override a shipped item's list-specific fields", () => {
    const eff = applyOverride(
      [{ id: "p1", label: "Text", phase: "draft", category: "pov" }],
      { extras: { p1: { phase: "revise" } } }
    );
    expect(eff[0].extra).toEqual({ phase: "revise", category: "pov" });
  });

  it("carries list-specific extras through", () => {
    const eff = applyOverride(
      [{ id: "p1", label: "Text", phase: "draft" }],
      { added: [{ id: "wp-1", label: "Mine", phase: "revise" }] }
    );
    expect(eff[0].extra).toEqual({ phase: "draft" });
    expect(eff[1].extra).toEqual({ phase: "revise" });
  });
});

describe("applyGroupedOverride", () => {
  const groups = [
    { id: "g1", label: "Group one", items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    { id: "g2", label: "Group two", items: [{ id: "c", label: "C" }] },
  ];

  it("keeps shipped groups, renames them, and appends custom groups with their items", () => {
    const eff = applyGroupedOverride(groups, {
      groups: [{ id: "g1", label: "First" }, { id: "pg-x", label: "Mine" }],
      added: [{ id: "pt-1", label: "Custom task", group: "pg-x" }],
    });
    expect(eff.map((g) => [g.id, g.label, g.custom])).toEqual([
      ["g1", "First", false],
      ["g2", "Group two", false],
      ["pg-x", "Mine", true],
    ]);
    expect(eff[2].items.map((i) => i.id)).toEqual(["pt-1"]);
  });

  it("synthesizes a group for an item whose group is unknown (never drops it)", () => {
    const eff = applyGroupedOverride(groups, { added: [{ id: "pt-2", label: "Lost", group: "gone-group" }] });
    const synth = eff.find((g) => g.id === "gone-group");
    expect(synth).toMatchObject({ label: "Gone group", custom: true });
    expect(synth?.items.map((i) => i.id)).toEqual(["pt-2"]);
  });

  it("hiddenGroups hides every member; a group whose items are all hidden reads hidden", () => {
    const eff = applyGroupedOverride(groups, { hiddenGroups: ["g1"], hidden: ["c"] });
    expect(eff[0].hidden).toBe(true);
    expect(eff[0].items.every((i) => i.hidden)).toBe(true);
    expect(eff[1].hidden).toBe(true); // its only item is hidden
  });
});

describe("normalizeListOverride", () => {
  const spec: ListSpec = {
    shipped,
    allowAdded: true,
    allowGroups: false,
    allowOrder: true,
  };

  it("returns undefined for junk or an empty override", () => {
    expect(normalizeListOverride(null, spec)).toBeUndefined();
    expect(normalizeListOverride("x", spec)).toBeUndefined();
    expect(normalizeListOverride({}, spec)).toBeUndefined();
    expect(normalizeListOverride({ hidden: ["zzz"], labels: { a: "Alpha" } }, spec)).toBeUndefined();
  });

  it("drops unknown ids, shipped-equal labels, and malformed customs", () => {
    const out = normalizeListOverride(
      {
        hidden: ["a", "nope", "a"],
        labels: { a: "Alpha", b: " Second ", zzz: "x" },
        order: ["c", "ghost", "c"],
        added: [
          { id: "sc-ok", label: "Fine" },
          { id: "a", label: "collides with shipped" },
          { id: "bad id!", label: "x" },
          { id: "sc-blank", label: "  " },
          { id: "sc-ok", label: "duplicate" },
          "not an object",
        ],
      },
      spec
    );
    expect(out).toEqual({
      labels: { b: "Second" },
      added: [{ id: "sc-ok", label: "Fine" }],
      hidden: ["a"],
      order: ["c"],
    });
  });

  it("respects spec flags (no customs, no order) and parseExtra", () => {
    const strict: ListSpec<{ phase: string }> = {
      shipped,
      allowAdded: true,
      allowGroups: false,
      allowOrder: false,
      parseExtra: (rec) => (rec["phase"] === "draft" || rec["phase"] === "revise" ? { phase: rec["phase"] } : null),
    };
    const out = normalizeListOverride(
      {
        order: ["c"],
        added: [
          { id: "wp-1", label: "ok", phase: "draft" },
          { id: "wp-2", label: "bad phase", phase: "nope" },
        ],
      },
      strict
    );
    expect(out).toEqual({ added: [{ id: "wp-1", label: "ok", phase: "draft" }] });
    expect(normalizeListOverride({ added: [{ id: "x", label: "y" }] }, { ...spec, allowAdded: false })).toBeUndefined();
  });

  it("extras: validated through parseExtra, diffed against shipped, unknown ids dropped", () => {
    const withExtra: ListSpec<{ phase: string }> = {
      shipped: [{ id: "p1", label: "One", phase: "draft" } as never, { id: "p2", label: "Two", phase: "revise" } as never],
      allowAdded: true,
      allowGroups: false,
      allowOrder: false,
      parseExtra: (rec) => (rec["phase"] === "draft" || rec["phase"] === "revise" ? { phase: rec["phase"] } : null),
    };
    const out = normalizeListOverride(
      { extras: { p1: { phase: "revise" }, p2: { phase: "revise" }, zzz: { phase: "draft" }, p3: { phase: "nope" } } },
      withExtra
    );
    expect(out).toEqual({ extras: { p1: { phase: "revise" } } });
  });

  it("uniqueLabels drops clashing renames and customs", () => {
    const out = normalizeListOverride(
      { labels: { a: "beta", c: "Delta" }, added: [{ id: "st-1", label: "DELTA" }, { id: "st-2", label: "Epsilon" }] },
      { ...spec, uniqueLabels: true }
    );
    expect(out).toEqual({ labels: { c: "Delta" }, added: [{ id: "st-2", label: "Epsilon" }] });
  });

  it("grouped specs require a real group on every custom item and accept custom groups", () => {
    const grouped: ListSpec = {
      shipped: [{ id: "a", label: "A", group: "g1" }],
      shippedGroups: [{ id: "g1", label: "One" }],
      allowAdded: true,
      allowGroups: true,
      allowOrder: true,
    };
    const out = normalizeListOverride(
      {
        groups: [{ id: "g1", label: "One" }, { id: "pg-x", label: "Mine" }, { id: "bad!", label: "x" }],
        added: [
          { id: "pt-1", label: "In custom", group: "pg-x" },
          { id: "pt-2", label: "No group" },
          { id: "pt-3", label: "Unknown group", group: "zzz" },
        ],
        hiddenGroups: ["g1", "zzz"],
      },
      grouped
    );
    expect(out).toEqual({
      groups: [{ id: "pg-x", label: "Mine" }],
      added: [{ id: "pt-1", label: "In custom", group: "pg-x" }],
      hiddenGroups: ["g1"],
    });
  });

  it("is idempotent", () => {
    const raw = { hidden: ["a"], labels: { b: "Second" }, added: [{ id: "sc-1", label: "Mine" }], order: ["sc-1", "a"] };
    const once = normalizeListOverride(raw, spec);
    expect(normalizeListOverride(once, spec)).toEqual(once);
  });
});

describe("newListItemId", () => {
  it("prefixes and never repeats", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) ids.add(newListItemId("sc"));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id.startsWith("sc-")).toBe(true);
  });
});
