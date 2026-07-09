/**
 * createEntity's filename safety: a codex entry name that sanitizes to a
 * dot-only / dot-edged segment must NOT create a hidden or folder-escaping
 * file (regression — a scene renamed to ".." once vanished from Obsidian).
 * Normal names still create as expected.
 */
import { describe, expect, it } from "vitest";
import { createEntity, scenesForEntity } from "../src/codex/codex-store";
import { CodexCategory, CodexEntity, EntityScope } from "../src/codex/types";
import { Project } from "../src/projects/types";
import { TFile } from "./fakes/obsidian";
import { FakeApp } from "./fakes/fake-app";

describe("createEntity filename safety", () => {
  it('rejects ".." / "." / dot-only names without creating any file', async () => {
    const app = new FakeApp();
    for (const bad of ["..", ".", "...", "  ..  "]) {
      const before = app.vault.getMarkdownFiles().length;
      const result = await createEntity(app.asApp(), "character", bad, "Codex");
      expect(result, `name ${JSON.stringify(bad)} should be rejected`).toBeNull();
      expect(app.vault.getMarkdownFiles().length).toBe(before);
    }
  });

  it("strips leading/trailing dots so the file isn't hidden", async () => {
    const app = new FakeApp();
    const file = await createEntity(app.asApp(), "character", ".Gandalf.", "Codex");
    expect(file).toBeInstanceOf(TFile);
    expect(file?.path).toBe("Codex/Gandalf.md");
  });

  it("creates a normal entry at the expected path", async () => {
    const app = new FakeApp();
    const file = await createEntity(app.asApp(), "location", "The Shire", "Codex");
    expect(file?.path).toBe("Codex/The Shire.md");
    expect(app.metadataCache.getFileCache(file as never)?.frontmatter?.["codex"]).toBe(
      "location"
    );
  });
});

/** Minimal multi-scene project pointing at already-seeded scene files. */
function makeProject(vaultPath: string, scenePaths: string[]): Project {
  return {
    vaultPath,
    draft: {
      format: "scenes",
      title: vaultPath,
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
      sceneFolder: "",
      scenes: scenePaths.map((p) => ({ title: p, indent: 0 })),
      ignoredFiles: [],
      sceneTemplate: null,
    },
    scenes: scenePaths.map((p) => ({ title: p, indent: 0, path: p })),
    unknownFiles: [],
    inkswell: null,
  };
}

function entity(
  name: string,
  category: CodexCategory,
  opts: { aliases?: string[]; scope?: EntityScope } = {}
): CodexEntity {
  return { path: `Codex/${name}.md`, name, category, aliases: opts.aliases ?? [], scope: opts.scope };
}

/** basenames of the returned scene files, for order-independent assertions. */
async function appearsIn(
  app: FakeApp,
  projects: Project[],
  e: CodexEntity
): Promise<string[]> {
  const scenes = await scenesForEntity(app.asApp(), projects, e);
  return scenes.map((s) => s.basename).sort();
}

describe("scenesForEntity", () => {
  it("finds a scene that mentions an ITEM in body text (the reported bug)", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", "The Amulet glowed in the dark.\n");
    app.vault.seed("BookA/s2.md", "Nothing of note happened here.\n");
    const projects = [makeProject("BookA/BookA.md", ["BookA/s1.md", "BookA/s2.md"])];
    expect(await appearsIn(app, projects, entity("Amulet", "item"))).toEqual(["s1"]);
  });

  it("matches an alias and is case-insensitive", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", "They called it the relic of old.\n");
    const projects = [makeProject("BookA/BookA.md", ["BookA/s1.md"])];
    expect(
      await appearsIn(app, projects, entity("Amulet", "item", { aliases: ["Relic"] }))
    ).toEqual(["s1"]);
  });

  it("does not match a name buried inside a larger word", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", "Amuletic runes lined the wall.\n"); // 'Amulet' inside 'Amuletic'
    const projects = [makeProject("BookA/BookA.md", ["BookA/s1.md"])];
    expect(await appearsIn(app, projects, entity("Amulet", "item"))).toEqual([]);
  });

  it("counts an explicit characters frontmatter link even without a body mention", async () => {
    const app = new FakeApp();
    // Body never names Anna (she's 'she'), but the scene links her explicitly.
    app.vault.seed("BookA/s1.md", '---\ncharacters:\n  - "[[Anna]]"\n---\nShe drew her blade.\n');
    const projects = [makeProject("BookA/BookA.md", ["BookA/s1.md"])];
    expect(await appearsIn(app, projects, entity("Anna", "character"))).toEqual(["s1"]);
  });

  it("scopes to visible books: a project-scoped entity ignores other books", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", "The Amulet was here.\n");
    app.vault.seed("BookB/s1.md", "The Amulet appears here too.\n");
    const projects = [
      makeProject("BookA/BookA.md", ["BookA/s1.md"]),
      makeProject("BookB/BookB.md", ["BookB/s1.md"]),
    ];
    // Global entity: appears in both books.
    const global = await scenesForEntity(app.asApp(), projects, entity("Amulet", "item"));
    expect(global.map((s) => s.path).sort()).toEqual(["BookA/s1.md", "BookB/s1.md"]);
    // Scoped to BookA: BookB's identically-named hit is excluded.
    const scoped = await scenesForEntity(
      app.asApp(),
      projects,
      entity("Amulet", "item", { scope: { project: "BookA" } })
    );
    expect(scoped.map((s) => s.path)).toEqual(["BookA/s1.md"]);
  });
});
