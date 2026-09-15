/**
 * The shipped lists become functions of the writer's overrides. These pin the
 * invariants every consumer relies on: hiding is lossless and counts toward
 * nothing, stale ids are ignored, resets restore the shipped list, custom items
 * appear, and the status enum stays frozen while its display bends.
 */
import { describe, expect, it } from "vitest";
import {
  PAGE_CHECK_IDS,
  SCENE_CHECK_IDS,
  STORY_CHECKPOINTS,
  auditProgress,
  pageCheckIds,
  pageGroups,
  sceneAuditRollup,
  sceneCheckIds,
  sceneCheckpoints,
  storyCheckpoints,
} from "../src/revisions/audit";
import { checklistProgress } from "../src/revisions/checklist";
import { PUBLISHING_CHECKLIST, publishingChecklist } from "../src/publishing/checklist-def";
import { overallProgress, phaseProgress } from "../src/publishing/publishing-data";
import { WRITING_PROMPTS, pickPrompt, promptId, writingPrompts } from "../src/ideation/prompts";
import {
  SCENE_STATUSES,
  defaultNewSceneStatus,
  sceneStatuses,
  statusLabel,
  visibleStatuses,
} from "../src/scenes/scene-meta";
import { buildColumns } from "../src/outliner/board";
import { normalizeListOverrides } from "../src/settings/overridable-lists";

describe("revision checkpoints", () => {
  it("hide is lossless and a hidden-but-ticked check counts toward neither done nor total", () => {
    const o = { hidden: ["paced"] };
    expect(sceneCheckpoints(o)).toHaveLength(13);
    const ids = sceneCheckIds(o);
    expect(auditProgress({ paced: true, shift: true }, ids)).toEqual({ done: 1, total: 13 });
    // Reset (no override) → the shipped 14 again.
    expect(sceneCheckIds(undefined)).toEqual(SCENE_CHECK_IDS);
  });

  it("custom checkpoints appear with their label and count; stale ids in state are ignored", () => {
    const o = { added: [{ id: "sc-x", label: "Earns its ending" }] };
    expect(sceneCheckpoints(o).at(-1)).toEqual({ id: "sc-x", label: "Earns its ending" });
    const rollup = sceneAuditRollup(
      [{ title: "S", path: null, checks: { "sc-x": true, "sc-old": true } }],
      sceneCheckIds(o)
    );
    expect(rollup.rows[0]).toMatchObject({ done: 1, total: 15 });
  });

  it("story tier: rename + order; progress follows the effective ids", () => {
    const o = { labels: { structure: "Shape holds" }, order: ["stakes"] };
    const items = storyCheckpoints(o);
    expect(items[0].id).toBe("stakes");
    expect(items.find((c) => c.id === "structure")?.label).toBe("Shape holds");
    expect(items).toHaveLength(STORY_CHECKPOINTS.length);
    const ids = items.map((c) => c.id);
    expect(checklistProgress({ story: { stakes: { done: true } } }, "story", ids)).toEqual({ done: 1, total: 18 });
  });

  it("prose tier: hide a group, rename one, add a custom group with an item", () => {
    const o = {
      hiddenGroups: ["adverbs-and-such"],
      groups: [{ id: "paragraphs", label: "Paragraph strength" }, { id: "pg-mine", label: "My pass" }],
      added: [{ id: "pr-1", label: "Read aloud", group: "pg-mine" }],
      hidden: ["telling"],
    };
    const groups = pageGroups(o);
    expect(groups.find((g) => g.id === "paragraphs")?.label).toBe("Paragraph strength");
    expect(groups.at(-1)).toMatchObject({ id: "pg-mine", items: [{ id: "pr-1", label: "Read aloud" }] });
    expect(pageCheckIds(o)).toHaveLength(PAGE_CHECK_IDS.length); // -telling +pr-1
    expect(pageCheckIds(o)).not.toContain("telling");
  });
});

describe("publishing checklist", () => {
  it("shipped by default; custom phase + task count; hidden phase excluded", () => {
    expect(publishingChecklist(undefined)).toEqual(PUBLISHING_CHECKLIST);
    const o = {
      groups: [{ id: "pg-arc", label: "ARC campaign" }],
      added: [{ id: "pt-1", label: "Recruit ARC readers", group: "pg-arc", optional: true }],
      hiddenGroups: ["writing"],
    };
    const phases = publishingChecklist(o);
    expect(phases.some((p) => p.id === "writing")).toBe(false);
    const arc = phases.find((p) => p.id === "pg-arc");
    expect(arc?.tasks).toEqual([{ id: "pt-1", label: "Recruit ARC readers", optional: true }]);
    const data = { checklist: { "pg-arc": { "pt-1": { done: true } }, writing: { draft: { done: true } } } };
    expect(phaseProgress(data, "pg-arc", phases)).toEqual({ done: 1, total: 1 });
    // The hidden phase's tick counts toward nothing.
    const shippedTotal = PUBLISHING_CHECKLIST.reduce((n, p) => n + p.tasks.length, 0);
    expect(overallProgress(data, phases)).toEqual({ done: 1, total: shippedTotal - 1 + 1 });
  });

  it("deepLink survives on shipped tasks and can't be set on customs", () => {
    const preflight = publishingChecklist({})
      .flatMap((p) => p.tasks)
      .find((t) => t.id === "preflight");
    expect(preflight?.deepLink).toBe("compile");
  });
});

describe("writing prompts", () => {
  it("ids are unique, content-derived, and stable under reordering", () => {
    const ids = WRITING_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of WRITING_PROMPTS) expect(p.id).toBe(promptId(p));
    const shuffled = [...WRITING_PROMPTS].reverse();
    expect(shuffled.map((p) => promptId(p)).sort()).toEqual([...ids].sort());
  });

  it("hides, renames, and adds prompts; pickPrompt draws from the effective bank", () => {
    const first = WRITING_PROMPTS[0];
    const o = {
      hidden: [first.id],
      labels: { [WRITING_PROMPTS[1].id]: "Reworded" },
      added: [{ id: "wp-1", label: "Let {pov} lose the argument.", phase: "draft" as const, category: "dialogue" as const }],
    };
    const bank = writingPrompts(o);
    expect(bank.some((p) => p.id === first.id)).toBe(false);
    expect(bank.find((p) => p.id === WRITING_PROMPTS[1].id)?.text).toBe("Reworded");
    expect(bank.at(-1)).toMatchObject({ id: "wp-1", phase: "draft", category: "dialogue" });
    const picked = pickPrompt({ phase: "draft", category: "dialogue", pov: "Mara" }, () => 0.999, bank);
    expect(picked?.text).toBe("Let Mara lose the argument.");
    expect(pickPrompt({ phase: "draft" }, Math.random, [])).toBeNull();
  });
});

describe("scene statuses (rename / hide / reorder only)", () => {
  it("stored values never change; labels, visibility, and order do", () => {
    const o = { labels: { draft: "Draft 1" }, hidden: ["idea"], order: ["final", "revised"] };
    const all = sceneStatuses(o);
    expect(all.map((s) => s.id).sort()).toEqual([...SCENE_STATUSES].sort());
    expect(all[0].id).toBe("final");
    expect(statusLabel("draft", o)).toBe("Draft 1");
    expect(statusLabel("draft")).toBe("Draft");
    expect(visibleStatuses(o).some((s) => s.id === "idea")).toBe(false);
    expect(defaultNewSceneStatus(o)).toBeUndefined();
    expect(defaultNewSceneStatus(undefined)).toBe("idea");
  });

  it("board columns: visible in order; a hidden status gets a column only when scenes carry it", () => {
    const statuses = sceneStatuses({ hidden: ["idea", "outlined"] });
    const items = [
      { title: "A", path: "a.md", status: "idea" as const },
      { title: "B", path: "b.md", status: "draft" as const },
    ];
    const cols = buildColumns(items, "status", statuses);
    expect(cols.map((c) => c.key)).toEqual(["draft", "written", "revised", "final", "idea", ""]);
    expect(cols.find((c) => c.key === "idea")?.label).toBe("Idea (hidden)");
    expect(cols.some((c) => c.key === "outlined")).toBe(false);
  });
});

describe("normalizeListOverrides", () => {
  it("drops unknown list ids, strips customs from statuses, validates prompt extras", () => {
    const out = normalizeListOverrides({
      bogus: { hidden: ["x"] },
      "scene.status": { added: [{ id: "ss-1", label: "Polish" }], labels: { draft: "Draft 1" } },
      prompts: {
        added: [
          { id: "wp-1", label: "ok", phase: "revise", category: "tension" },
          { id: "wp-2", label: "bad", phase: "nope", category: "tension" },
        ],
      },
      "audit.story": { added: [{ id: "structure", label: "collides" }] },
    });
    expect(out).toEqual({
      "scene.status": { labels: { draft: "Draft 1" } },
      prompts: { added: [{ id: "wp-1", label: "ok", phase: "revise", category: "tension" }] },
    });
    expect(normalizeListOverrides(null)).toEqual({});
  });

  it("publishing customs need a real phase; only the optional flag survives as extra", () => {
    const out = normalizeListOverrides({
      publishing: {
        added: [
          { id: "pt-1", label: "ok", group: "editing", optional: true, deepLink: "compile" },
          { id: "pt-2", label: "no phase" },
        ],
      },
    });
    expect(out.publishing).toEqual({ added: [{ id: "pt-1", label: "ok", group: "editing", optional: true }] });
  });
});
