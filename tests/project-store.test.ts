/**
 * ProjectStore over the in-memory vault: vault-wide discovery via frontmatter,
 * nested-scene re-parse, unknown/ignored file classification, event-driven
 * refresh, and the Tier-1 rename self-heal (index rewritten, bodies untouched).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectStore } from "../src/projects/project-store";
import { FakeApp, flushAsync } from "./fakes/fake-app";

const ALPHA_INDEX = `---
longform:
  format: scenes
  title: Alpha Book
  sceneFolder: Scenes
  scenes:
    - First
    - - Nested A
      - Nested B
  ignoredFiles:
    - Research
inkswell:
  overview:
    theme: Grief
---
Alpha planning body.
`;

function seededApp(): FakeApp {
  return new FakeApp({
    "Books/Alpha/Alpha.md": ALPHA_INDEX,
    "Books/Alpha/Scenes/First.md": "First prose.\n",
    "Books/Alpha/Scenes/Nested A.md": "Nested A prose.\n",
    "Books/Alpha/Scenes/Nested B.md": "Nested B prose.\n",
    "Books/Alpha/Scenes/Stray.md": "Not in the index.\n",
    "Books/Alpha/Scenes/Research.md": "Ignored by the index.\n",
    "Solo.md": "---\nlongform:\n  format: single\n  title: Zolo Single\n---\nBody.\n",
    "Diary.md": "No frontmatter, not a project.\n",
  });
}

describe("ProjectStore", () => {
  let app: FakeApp;
  let store: ProjectStore;

  beforeEach(async () => {
    app = seededApp();
    store = new ProjectStore(app.asApp());
    store.load(); // Component lifecycle → onload → subscribe + initial refresh
    await flushAsync();
  });

  it("discovers projects vault-wide by the longform key, sorted by title", () => {
    const projects = store.getProjects();
    expect(projects.map((p) => p.draft.title)).toEqual(["Alpha Book", "Zolo Single"]);
    expect(projects.map((p) => p.vaultPath)).toEqual(["Books/Alpha/Alpha.md", "Solo.md"]);
  });

  it("re-parses the nested scenes array with correct indents and resolved paths", () => {
    const alpha = store.getProject("Books/Alpha/Alpha.md");
    expect(alpha?.draft.format).toBe("scenes");
    expect(alpha?.scenes).toEqual([
      { title: "First", indent: 0, path: "Books/Alpha/Scenes/First.md" },
      { title: "Nested A", indent: 1, path: "Books/Alpha/Scenes/Nested A.md" },
      { title: "Nested B", indent: 1, path: "Books/Alpha/Scenes/Nested B.md" },
    ]);
    expect(alpha?.inkswell?.overview?.theme).toBe("Grief");
  });

  it("classifies folder contents: unknown files listed, ignored files excluded", () => {
    const alpha = store.getProject("Books/Alpha/Alpha.md");
    expect(alpha?.unknownFiles).toEqual(["Stray"]);
  });

  it("findSceneByPath resolves a scene to its project", () => {
    const hit = store.findSceneByPath("Books/Alpha/Scenes/Nested B.md");
    expect(hit?.project.vaultPath).toBe("Books/Alpha/Alpha.md");
    expect(hit?.scene.title).toBe("Nested B");
  });

  it("refreshes when the index frontmatter changes (metadata event driven)", async () => {
    const index = app.file("Books/Alpha/Alpha.md");
    await app.fileManager.processFrontMatter(index as never, (fm) => {
      const lf = fm["longform"] as Record<string, unknown>;
      lf["scenes"] = ["First"];
    });
    await flushAsync();
    expect(store.getProject("Books/Alpha/Alpha.md")?.scenes.map((s) => s.title)).toEqual([
      "First",
    ]);
    // Dropped scenes become unknown files rather than silently vanishing.
    expect(store.getProject("Books/Alpha/Alpha.md")?.unknownFiles.sort()).toEqual([
      "Nested A",
      "Nested B",
      "Stray",
    ]);
  });

  it("skips notify for edits to notes no panel renders, notifies for scene changes", async () => {
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    expect(calls).toBe(1); // fires immediately with the current snapshot

    // Unrelated note: refresh runs but the fingerprint is unchanged → no notify.
    await app.vault.modify(app.file("Diary.md") as never, "Edited diary.\n");
    await flushAsync();
    expect(calls).toBe(1);

    // Scene frontmatter drives badges → must notify.
    await app.fileManager.processFrontMatter(
      app.file("Books/Alpha/Scenes/First.md") as never,
      (fm) => {
        fm["status"] = "written";
      }
    );
    await flushAsync();
    expect(calls).toBe(2);

    // A note GAINING a codex key enters the watched set → notify.
    await app.fileManager.processFrontMatter(app.file("Diary.md") as never, (fm) => {
      fm["codex"] = "character";
    });
    await flushAsync();
    expect(calls).toBe(3);

    // …and editing that codex note keeps notifying (codex panel renders it).
    await app.vault.modify(
      app.file("Diary.md") as never,
      "---\ncodex: character\n---\nBio.\n"
    );
    await flushAsync();
    expect(calls).toBe(4);
    unsub();
  });

  describe("rename self-heal (Tier 1)", () => {
    it("rewrites the scene's title in the index after an external file rename", async () => {
      const sceneBodies = {
        first: app.vault.raw("Books/Alpha/Scenes/First.md"),
        a: app.vault.raw("Books/Alpha/Scenes/Nested A.md"),
        b: app.vault.raw("Books/Alpha/Scenes/Nested B.md"),
      };
      const file = app.file("Books/Alpha/Scenes/Nested A.md");
      await app.vault.rename(file as never, "Books/Alpha/Scenes/Renamed A.md");
      await flushAsync();

      const alpha = store.getProject("Books/Alpha/Alpha.md");
      expect(alpha?.scenes.map((s) => s.title)).toEqual(["First", "Renamed A", "Nested B"]);
      // Indent level survived the title rewrite (nested-array encoding intact).
      expect(alpha?.scenes.find((s) => s.title === "Renamed A")?.indent).toBe(1);
      expect(alpha?.scenes.find((s) => s.title === "Renamed A")?.path).toBe(
        "Books/Alpha/Scenes/Renamed A.md"
      );
      // Scene bodies were never touched by the heal.
      expect(app.vault.raw("Books/Alpha/Scenes/Renamed A.md")).toBe(sceneBodies.a);
      expect(app.vault.raw("Books/Alpha/Scenes/First.md")).toBe(sceneBodies.first);
      expect(app.vault.raw("Books/Alpha/Scenes/Nested B.md")).toBe(sceneBodies.b);
    });

    it("keeps the index untouched when a NON-scene file in the folder is renamed", async () => {
      const indexBefore = app.vault.raw("Books/Alpha/Alpha.md");
      const file = app.file("Books/Alpha/Scenes/Stray.md");
      await app.vault.rename(file as never, "Books/Alpha/Scenes/Stray Renamed.md");
      await flushAsync();
      // Stray isn't in the index — no heal, no index write at all.
      expect(app.vault.raw("Books/Alpha/Alpha.md")).toBe(indexBefore);
      expect(store.getProject("Books/Alpha/Alpha.md")?.unknownFiles).toEqual([
        "Stray Renamed",
      ]);
    });

    it("does not heal a move to a different folder (Tier 2 territory)", async () => {
      const file = app.file("Books/Alpha/Scenes/Nested B.md");
      await app.vault.rename(file as never, "Books/Alpha/Nested B.md");
      await flushAsync();

      const alpha = store.getProject("Books/Alpha/Alpha.md");
      expect(alpha?.scenes.map((s) => s.title)).toEqual(["First", "Nested A", "Nested B"]);
      // Title kept, but the path no longer resolves — reconcile UI's job now.
      expect(alpha?.scenes.find((s) => s.title === "Nested B")?.path).toBeNull();
    });
  });
});
