import { describe, expect, it } from "vitest";
import {
  CUSTOMIZE_CATALOG,
  CUSTOMIZE_GROUP_ORDER,
  DEFAULT_SECTION,
  catalogByGroup,
  catalogEntry,
} from "../src/customize/catalog";
import { OPTIONAL_FEATURES } from "../src/features";

describe("customize catalog", () => {
  it("has unique ids and an icon per entry", () => {
    const ids = CUSTOMIZE_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of CUSTOMIZE_CATALOG) expect(e.icon).toBeTruthy();
  });

  it("assigns every entry to a known group, in contiguous runs", () => {
    const known = CUSTOMIZE_GROUP_ORDER.map((g) => g.id);
    for (const e of CUSTOMIZE_CATALOG) expect(known).toContain(e.group);
    const runs: string[] = [];
    for (const e of CUSTOMIZE_CATALOG) if (runs[runs.length - 1] !== e.group) runs.push(e.group);
    // Each group appears once, uninterrupted, in declared order (empty groups may be skipped).
    expect(runs).toEqual(known.filter((g) => runs.includes(g)));
  });

  it("only references real optional features", () => {
    const features = new Set(OPTIONAL_FEATURES.map((f) => f.id));
    for (const e of CUSTOMIZE_CATALOG) if (e.feature) expect(features.has(e.feature)).toBe(true);
  });

  it("opens on the codex section by default", () => {
    expect(catalogEntry(DEFAULT_SECTION)?.group).toBe("codex");
    expect(catalogByGroup()[0].group.id).toBe("codex");
  });

  it("buckets entries by group without losing any", () => {
    const total = catalogByGroup().reduce((n, g) => n + g.entries.length, 0);
    expect(total).toBe(CUSTOMIZE_CATALOG.length);
  });
});
