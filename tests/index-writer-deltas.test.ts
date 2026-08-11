/**
 * Regression suite for the stale-snapshot data-loss class (the beats bug): every
 * inkswell sub-key writer must apply DELTAS against the file's CURRENT state, so
 * two edits issued from the same rendered (pre-write) state both survive. With
 * the old wholesale writers, the second write silently erased the first — these
 * tests are the canonical "fill two beat boxes, keep both" repro, per key.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  persistChecklistItem,
  persistGoalsPatch,
  updateArcTracked,
  updateBeats,
  updateDecisions,
  updateStyleEntries,
} from "../src/projects/index-writer";
import { setAssignment } from "../src/outliner/beats";
import { renameSceneInBeats } from "../src/outliner/beats";
import { upsertDecision, removeDecision, setDecisionStatus } from "../src/revisions/decisions";
import type { RevisionDecision } from "../src/revisions/types";
import type { BeatSheet } from "../src/outliner/beat-templates";
import type { StyleEntry } from "../src/revisions/stylesheet";
import { FakeApp } from "./fakes/fake-app";

const INDEX_PATH = "Books/My Novel/My Novel.md";

const INDEX = `---
longform:
  format: scenes
  title: My Novel
  sceneFolder: Scenes
  scenes:
    - Alpha
  ignoredFiles: []
---
# My Novel

Hand-written index body — must survive every write byte-for-byte.
`;

const SCENE = "---\nstatus: draft\n---\nThe lamplighter came at dusk.\n";
const SCENE_PATH = "Books/My Novel/Scenes/Alpha.md";

function inkswellOf(app: FakeApp): Record<string, unknown> {
  const cache = app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(INDEX_PATH) as never);
  return ((cache?.frontmatter?.["inkswell"] as Record<string, unknown>) ?? {});
}

function decision(id: string, text: string): RevisionDecision {
  return { id, text, scene: null, status: "pending", created: "2026-08-11T00:00:00Z" };
}

describe("inkswell delta writers (stale-snapshot regression)", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({ [INDEX_PATH]: INDEX, [SCENE_PATH]: SCENE });
  });

  it("beats: notes written box-after-box from the same pre-state both survive", async () => {
    const file = app.file(INDEX_PATH);
    // Both writes express only their own delta — like two textareas blurring in
    // sequence while the panel never re-rendered in between.
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "opening-image", { note: "NOTE ONE" })
    );
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "theme-stated", { note: "NOTE TWO" })
    );

    const beats = inkswellOf(app)["beats"] as BeatSheet;
    expect(beats.assignments["opening-image"]?.note).toBe("NOTE ONE");
    expect(beats.assignments["theme-stated"]?.note).toBe("NOTE TWO");
  });

  it("beats: template switch preserves assignments saved since the panel rendered", async () => {
    const file = app.file(INDEX_PATH);
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "catalyst", { note: "The letter arrives." })
    );
    // A stale panel switches templates knowing nothing about the note above.
    await updateBeats(app.asApp(), file, (cur) => ({
      template: "romancing-the-beat",
      assignments: cur?.assignments ?? {},
    }));

    const beats = inkswellOf(app)["beats"] as BeatSheet;
    expect(beats.template).toBe("romancing-the-beat");
    expect(beats.assignments["catalyst"]?.note).toBe("The letter arrives.");
  });

  it("beats: scene-link list ops compose (add + add + remove by title)", async () => {
    const file = app.file(INDEX_PATH);
    const link = (title: string) =>
      updateBeats(app.asApp(), file, (cur) => {
        const scenes = cur?.assignments["midpoint"]?.scenes ?? [];
        return setAssignment(cur, "midpoint", {
          scenes: scenes.includes(title) ? scenes : [...scenes, title],
        });
      });
    await link("Alpha");
    await link("Beta");
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "midpoint", {
        scenes: (cur?.assignments["midpoint"]?.scenes ?? []).filter((s) => s !== "Alpha"),
      })
    );
    const beats = inkswellOf(app)["beats"] as BeatSheet;
    expect(beats.assignments["midpoint"]?.scenes).toEqual(["Beta"]);
  });

  it("beats: a null transform result skips the write (rename with no references)", async () => {
    const file = app.file(INDEX_PATH);
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "finale", { scenes: ["Alpha"] })
    );
    const before = app.vault.raw(INDEX_PATH);
    await updateBeats(app.asApp(), file, (cur) => renameSceneInBeats(cur, "Nowhere", "Elsewhere"));
    expect(app.vault.raw(INDEX_PATH)).toBe(before);
    // And a rename that DOES match rewrites the link against current state.
    await updateBeats(app.asApp(), file, (cur) => renameSceneInBeats(cur, "Alpha", "Alpha Prime"));
    const beats = inkswellOf(app)["beats"] as BeatSheet;
    expect(beats.assignments["finale"]?.scenes).toEqual(["Alpha Prime"]);
  });

  it("checklist: ticking two checkpoints in a row keeps both ticks", async () => {
    const file = app.file(INDEX_PATH);
    await persistChecklistItem(app.asApp(), file, "story", "premise", { done: true });
    await persistChecklistItem(app.asApp(), file, "page", "adverbs", { note: "sweep ch. 3" });

    const data = inkswellOf(app)["revisionChecklist"] as Record<string, Record<string, unknown>>;
    expect(data["story"]["premise"]).toEqual({ done: true });
    expect(data["page"]["adverbs"]).toEqual({ note: "sweep ch. 3" });
  });

  it("checklist: clearing the only engaged item prunes item, tier, and key", async () => {
    const file = app.file(INDEX_PATH);
    await persistChecklistItem(app.asApp(), file, "story", "premise", { done: true });
    await persistChecklistItem(app.asApp(), file, "story", "premise", { done: false });
    expect("revisionChecklist" in inkswellOf(app)).toBe(false);
  });

  it("decisions: upsert + upsert + status change from the same pre-state all land", async () => {
    const file = app.file(INDEX_PATH);
    await updateDecisions(app.asApp(), file, (cur) => upsertDecision(cur, decision("d1", "Brother is dead.")));
    await updateDecisions(app.asApp(), file, (cur) => upsertDecision(cur, decision("d2", "Move the duel to ch. 9.")));
    await updateDecisions(app.asApp(), file, (cur) => setDecisionStatus(cur, "d1", "applied"));

    const list = inkswellOf(app)["revisions"] as RevisionDecision[];
    expect(list).toHaveLength(2);
    expect(list.find((d) => d.id === "d1")?.status).toBe("applied");
    expect(list.find((d) => d.id === "d2")?.text).toBe("Move the duel to ch. 9.");
  });

  it("decisions: removing a concurrently-removed id no-ops; emptied list deletes the key", async () => {
    const file = app.file(INDEX_PATH);
    await updateDecisions(app.asApp(), file, (cur) => upsertDecision(cur, decision("d1", "x")));
    await updateDecisions(app.asApp(), file, (cur) => removeDecision(cur, "d1"));
    await updateDecisions(app.asApp(), file, (cur) => removeDecision(cur, "d1"));
    expect("revisions" in inkswellOf(app)).toBe(false);
  });

  it("goals: target and deadline patched from the same pre-state both survive", async () => {
    const file = app.file(INDEX_PATH);
    await persistGoalsPatch(app.asApp(), file, { target: 80000 });
    await persistGoalsPatch(app.asApp(), file, { deadline: "2026-12-31" });
    expect(inkswellOf(app)["goals"]).toEqual({ target: 80000, deadline: "2026-12-31" });

    await persistGoalsPatch(app.asApp(), file, { target: undefined });
    expect(inkswellOf(app)["goals"]).toEqual({ deadline: "2026-12-31" });
    await persistGoalsPatch(app.asApp(), file, { deadline: undefined });
    expect("goals" in inkswellOf(app)).toBe(false);
  });

  it("style sheet: add + add + remove-by-id compose; emptied list deletes the key", async () => {
    const file = app.file(INDEX_PATH);
    const entry = (id: string, canonical: string): StyleEntry => ({
      id,
      canonical,
      variants: [],
      kind: "spelling",
    });
    await updateStyleEntries(app.asApp(), file, (cur) => [...cur, entry("s1", "grey")]);
    await updateStyleEntries(app.asApp(), file, (cur) => [...cur, entry("s2", "Regime")]);
    let sheet = inkswellOf(app)["styleSheet"] as { entries: StyleEntry[] };
    expect(sheet.entries.map((e) => e.canonical)).toEqual(["grey", "Regime"]);

    await updateStyleEntries(app.asApp(), file, (cur) => cur.filter((e) => e.id !== "s1"));
    sheet = inkswellOf(app)["styleSheet"] as { entries: StyleEntry[] };
    expect(sheet.entries.map((e) => e.id)).toEqual(["s2"]);
    await updateStyleEntries(app.asApp(), file, (cur) => cur.filter((e) => e.id !== "s2"));
    expect("styleSheet" in inkswellOf(app)).toBe(false);
  });

  it("arc tracked: add + add + remove compose through the wikilink codec", async () => {
    const file = app.file(INDEX_PATH);
    const codec = {
      parse: (raw: unknown) =>
        Array.isArray(raw)
          ? raw
              .filter((x): x is string => typeof x === "string")
              .map((x) => x.replace(/^\[\[|\]\]$/g, ""))
          : [],
      serialize: (names: string[]) => names.map((n) => `[[${n}]]`),
    };
    await updateArcTracked(app.asApp(), file, (names) => [...names, "Mara"], codec);
    await updateArcTracked(app.asApp(), file, (names) => [...names, "Teo"], codec);
    expect(inkswellOf(app)["arcTracked"]).toEqual(["[[Mara]]", "[[Teo]]"]);
    await updateArcTracked(app.asApp(), file, (names) => names.filter((n) => n !== "Mara"), codec);
    expect(inkswellOf(app)["arcTracked"]).toEqual(["[[Teo]]"]);
  });

  it("cross-key interleave: concurrent writes to three keys all land; bodies untouched", async () => {
    const file = app.file(INDEX_PATH);
    const sceneBefore = app.vault.raw(SCENE_PATH);
    await Promise.all([
      updateBeats(app.asApp(), file, (cur) => setAssignment(cur, "setup", { done: true })),
      persistChecklistItem(app.asApp(), file, "story", "stakes", { done: true }),
      updateDecisions(app.asApp(), file, (cur) => upsertDecision(cur, decision("d9", "z"))),
      persistGoalsPatch(app.asApp(), file, { target: 50000 }),
    ]);

    const ink = inkswellOf(app);
    expect((ink["beats"] as BeatSheet).assignments["setup"]).toEqual({ done: true });
    expect((ink["revisionChecklist"] as Record<string, unknown>)["story"]).toEqual({
      stakes: { done: true },
    });
    expect((ink["revisions"] as RevisionDecision[]).map((d) => d.id)).toEqual(["d9"]);
    expect(ink["goals"]).toEqual({ target: 50000 });

    // Gotcha #3 invariant, extended to the delta writers: scene files and the
    // index BODY are byte-identical after any index-frontmatter write.
    expect(app.vault.raw(SCENE_PATH)).toBe(sceneBefore);
    expect(app.vault.raw(INDEX_PATH)).toContain(
      "Hand-written index body — must survive every write byte-for-byte."
    );
  });
});
