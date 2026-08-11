/**
 * Release-2 regression suite for the longform side of the stale-snapshot class:
 * scene-list transforms read the CURRENT stored draft, renames are one atomic
 * index transaction (scenes + beat links), outlines rebase onto the current
 * list, and the scaffold's four writes collapsed into one — all verified
 * against the FakeApp vault with the canonical "computed from a stale
 * pre-state; nothing concurrent is lost" shape.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  persistOutline,
  persistScaffoldIndex,
  renameSceneInIndex,
  updateBeats,
  updateDraftFields,
  updateScenes,
} from "../src/projects/index-writer";
import { parseScenes } from "../src/projects/draft-serialization";
import { rebaseSceneOrder } from "../src/outliner/outline";
import { setAssignment } from "../src/outliner/beats";
import type { BeatSheet } from "../src/outliner/beat-templates";
import { updateSceneList } from "../src/scenes/scene-meta";
import { FakeApp } from "./fakes/fake-app";

const INDEX_PATH = "Books/My Novel/My Novel.md";
const INDEX = `---
longform:
  format: scenes
  title: My Novel
  sceneFolder: Scenes
  scenes:
    - Alpha
    - Beta
    - Gamma
  ignoredFiles: []
inkswell:
  beats:
    template: save-the-cat
    assignments:
      catalyst:
        note: The letter arrives.
        scenes:
          - Beta
---
Index body prose — byte-identical after every write.
`;

function fm(app: FakeApp): Record<string, unknown> {
  const cache = app.metadataCache.getFileCache(
    app.vault.getAbstractFileByPath(INDEX_PATH) as never
  );
  return cache?.frontmatter ?? {};
}

function titles(app: FakeApp): string[] {
  const lf = fm(app)["longform"] as Record<string, unknown>;
  return parseScenes(lf["scenes"]).map((s) => s.title);
}

function beats(app: FakeApp): BeatSheet {
  return (fm(app)["inkswell"] as Record<string, unknown>)["beats"] as BeatSheet;
}

describe("longform concurrency safety", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({ [INDEX_PATH]: INDEX });
  });

  it("a reorder transform runs against the CURRENT list — a concurrent create survives", async () => {
    const file = app.file(INDEX_PATH);
    // Delta is created while a (stale) panel prepares a reverse-reorder.
    await updateScenes(app.asApp(), file, (s) => [...s, { title: "Delta", indent: 0 }]);
    await updateScenes(app.asApp(), file, (s) => [...s].reverse());
    expect(titles(app)).toEqual(["Delta", "Gamma", "Beta", "Alpha"]);
  });

  it("renameSceneInIndex rewrites the scene title AND its beat link in ONE modify", async () => {
    const file = app.file(INDEX_PATH);
    let modifies = 0;
    app.vault.on("modify", () => (modifies += 1));

    await renameSceneInIndex(app.asApp(), file, "Beta", "Beta Prime");

    expect(modifies).toBe(1); // atomic — no window with a dead beat link
    expect(titles(app)).toEqual(["Alpha", "Beta Prime", "Gamma"]);
    expect(beats(app).assignments["catalyst"].scenes).toEqual(["Beta Prime"]);
    expect(beats(app).assignments["catalyst"].note).toBe("The letter arrives.");
  });

  it("renameSceneInIndex never clobbers a beat note saved since the caller rendered", async () => {
    const file = app.file(INDEX_PATH);
    await updateBeats(app.asApp(), file, (cur) =>
      setAssignment(cur, "midpoint", { note: "Saved mid-session." })
    );
    await renameSceneInIndex(app.asApp(), file, "Beta", "Beta Prime");
    expect(beats(app).assignments["midpoint"].note).toBe("Saved mid-session.");
  });

  it("updateDraftFields patches fields without rewriting scenes from a snapshot", async () => {
    const file = app.file(INDEX_PATH);
    await updateScenes(app.asApp(), file, (s) => [...s, { title: "Delta", indent: 0 }]);
    // A rename-draft issued from a panel that rendered before Delta existed.
    await updateDraftFields(app.asApp(), file, (d) => ({ ...d, draftTitle: "Second pass" }));
    const lf = fm(app)["longform"] as Record<string, unknown>;
    expect(lf["draftTitle"]).toBe("Second pass");
    expect(titles(app)).toContain("Delta");
  });

  it("persistOutline rebases: concurrently-created scenes appended, deleted ones dropped", async () => {
    const file = app.file(INDEX_PATH);
    // The outline was computed when the book was [Alpha, Beta, Gamma]; while the
    // user dragged, Delta was created and Gamma deleted.
    await updateScenes(app.asApp(), file, (s) => [
      ...s.filter((x) => x.title !== "Gamma"),
      { title: "Delta", indent: 0 },
    ]);
    let modifies = 0;
    app.vault.on("modify", () => (modifies += 1));

    await persistOutline(app.asApp(), file, {
      order: [
        { title: "Gamma", indent: 0 }, // deleted meanwhile — must not resurrect
        { title: "Beta", indent: 0 },
        { title: "Alpha", indent: 0 },
      ],
      acts: [{ id: "a1", title: "Act I" }],
      chapters: [{ id: "c1", title: "One", actId: "a1" }],
    });

    expect(modifies).toBe(1); // scenes + acts + chapters in one transaction
    expect(titles(app)).toEqual(["Beta", "Alpha", "Delta"]);
    const ink = fm(app)["inkswell"] as Record<string, unknown>;
    expect(ink["acts"]).toEqual([{ id: "a1", title: "Act I" }]);
    expect(ink["chapters"]).toEqual([{ id: "c1", title: "One", actId: "a1" }]);
  });

  it("rebaseSceneOrder (pure): keeps order, drops deleted, appends created with indent", () => {
    const desired = [
      { title: "B", indent: 0 },
      { title: "A", indent: 0 },
      { title: "Ghost", indent: 0 },
    ];
    const current = [
      { title: "A", indent: 0 },
      { title: "B", indent: 0 },
      { title: "New", indent: 1 },
    ];
    expect(rebaseSceneOrder(desired, current)).toEqual([
      { title: "B", indent: 0 },
      { title: "A", indent: 0 },
      { title: "New", indent: 1 },
    ]);
  });

  it("persistScaffoldIndex: one transaction; dup-guarded additions; occupied beats untouched", async () => {
    const file = app.file(INDEX_PATH);
    let modifies = 0;
    app.vault.on("modify", () => (modifies += 1));

    const { addedScenes } = await persistScaffoldIndex(app.asApp(), file, {
      additions: [
        { title: "Beta", indent: 0 }, // already in the manuscript — skipped
        { title: "Opening Image", indent: 0 },
      ],
      acts: [{ id: "a1", title: "Act I" }],
      chapters: [{ id: "c1", title: "One", actId: "a1" }],
      beatLinks: new Map([
        ["catalyst", "Opening Image"], // already assigned to Beta — must stay
        ["opening-image", "Opening Image"],
      ]),
      templateId: "save-the-cat",
    });

    expect(modifies).toBe(1);
    expect(addedScenes).toBe(1);
    expect(titles(app)).toEqual(["Alpha", "Beta", "Gamma", "Opening Image"]);
    expect(beats(app).assignments["catalyst"].scenes).toEqual(["Beta"]); // not clobbered
    expect(beats(app).assignments["opening-image"].scenes).toEqual(["Opening Image"]);
    // Re-run is idempotent.
    const second = await persistScaffoldIndex(app.asApp(), file, {
      additions: [{ title: "Opening Image", indent: 0 }],
      beatLinks: new Map([["opening-image", "Opening Image"]]),
      templateId: "save-the-cat",
    });
    expect(second.addedScenes).toBe(0);
    expect(titles(app)).toEqual(["Alpha", "Beta", "Gamma", "Opening Image"]);
  });

  it("index body stays byte-identical through all of it", async () => {
    const file = app.file(INDEX_PATH);
    await renameSceneInIndex(app.asApp(), file, "Alpha", "Alpha Prime");
    await persistOutline(app.asApp(), file, {
      order: [{ title: "Alpha Prime", indent: 0 }],
      acts: [],
      chapters: [],
    });
    expect(app.vault.raw(INDEX_PATH)).toContain(
      "Index body prose — byte-identical after every write."
    );
  });
});

describe("scene link-list ops (updateSceneList)", () => {
  const SCENE_PATH = "Books/My Novel/Scenes/Alpha.md";
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({
      [SCENE_PATH]: "---\nstatus: draft\n---\nProse body stays put.\n",
    });
  });

  it("adds from two stale renders compose; remove of the first keeps the second", async () => {
    const file = app.file(SCENE_PATH);
    const add = (link: string) =>
      updateSceneList(app.asApp(), file, "characters", (cur) =>
        cur.includes(link) ? cur : [...cur, link]
      );
    await add("[[Mara]]");
    await add("[[Teo]]"); // issued from a form rendered before Mara was linked
    let cache = app.metadataCache.getFileCache(file as never);
    expect(cache?.frontmatter?.["characters"]).toEqual(["[[Mara]]", "[[Teo]]"]);

    await updateSceneList(app.asApp(), file, "characters", (cur) =>
      cur.filter((c) => c !== "[[Mara]]")
    );
    cache = app.metadataCache.getFileCache(file as never);
    expect(cache?.frontmatter?.["characters"]).toEqual(["[[Teo]]"]);
    expect(app.vault.raw(SCENE_PATH)).toContain("Prose body stays put.");
  });

  it("an emptied list deletes the key; a legacy single string folds into a list", async () => {
    const file = app.file(SCENE_PATH);
    await app.fileManager.processFrontMatter(file as never, (fmv) => {
      fmv["plotlines"] = "Main"; // legacy single-string form
    });
    await updateSceneList(app.asApp(), file, "plotlines", (cur) => [...cur, "Romance"]);
    let cache = app.metadataCache.getFileCache(file as never);
    expect(cache?.frontmatter?.["plotlines"]).toEqual(["Main", "Romance"]);

    await updateSceneList(app.asApp(), file, "plotlines", () => []);
    cache = app.metadataCache.getFileCache(file as never);
    expect(cache?.frontmatter && "plotlines" in cache.frontmatter).toBe(false);
  });
});
