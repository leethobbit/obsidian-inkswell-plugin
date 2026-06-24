import { describe, expect, it } from "vitest";
import {
  PAGE_CHECK_IDS,
  SCENE_CHECK_IDS,
  STORY_CHECKPOINTS,
  auditProgress,
  sceneAuditRollup,
} from "../src/revisions/audit";

describe("checkpoint definitions", () => {
  it("has the expected counts", () => {
    expect(SCENE_CHECK_IDS).toHaveLength(14);
    expect(STORY_CHECKPOINTS).toHaveLength(18);
    expect(PAGE_CHECK_IDS).toHaveLength(32);
  });

  it("uses unique ids within each tier", () => {
    expect(new Set(SCENE_CHECK_IDS).size).toBe(SCENE_CHECK_IDS.length);
    expect(new Set(PAGE_CHECK_IDS).size).toBe(PAGE_CHECK_IDS.length);
    const storyIds = STORY_CHECKPOINTS.map((c) => c.id);
    expect(new Set(storyIds).size).toBe(storyIds.length);
  });
});

describe("auditProgress", () => {
  it("counts only true checks among the given ids", () => {
    expect(auditProgress({ startsRight: true, shift: true }, SCENE_CHECK_IDS)).toEqual({
      done: 2,
      total: 14,
    });
  });

  it("treats undefined checks as zero done", () => {
    expect(auditProgress(undefined, SCENE_CHECK_IDS)).toEqual({ done: 0, total: 14 });
  });

  it("ignores keys outside the checkpoint set", () => {
    expect(auditProgress({ bogusKey: true } as never, SCENE_CHECK_IDS)).toEqual({
      done: 0,
      total: 14,
    });
  });

  it("ignores false values", () => {
    expect(auditProgress({ startsRight: false, shift: true }, SCENE_CHECK_IDS).done).toBe(1);
  });
});

describe("sceneAuditRollup", () => {
  it("computes per-scene rows and flags unaudited / complete scenes", () => {
    const full: Record<string, boolean> = {};
    for (const id of SCENE_CHECK_IDS) full[id] = true;

    const rollup = sceneAuditRollup([
      { title: "One", path: "a.md", checks: {} },
      { title: "Two", path: "b.md", checks: { shift: true } },
      { title: "Three", path: "c.md", checks: full },
    ]);

    expect(rollup.rows.map((r) => r.done)).toEqual([0, 1, 14]);
    expect(rollup.rows.map((r) => r.audited)).toEqual([false, true, true]);
    expect(rollup.unaudited).toBe(1);
    expect(rollup.complete).toBe(1);
  });

  it("preserves scene order and carries path/title through", () => {
    const rollup = sceneAuditRollup([{ title: "Solo", path: null, checks: {} }]);
    expect(rollup.rows[0]).toMatchObject({ title: "Solo", path: null, total: 14 });
  });
});
