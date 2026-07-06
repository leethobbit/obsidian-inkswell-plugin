/**
 * runCompile end-to-end over the in-memory vault: scene loading (order, missing
 * paths, chapter meta), output written through the vault API (registered file,
 * overwrite-in-place), and the error paths. The pure assembly stages are covered
 * separately in compile-assemble.test.ts.
 */
import { describe, expect, it } from "vitest";
import { runCompile } from "../src/compile/engine";
import { CompileConfig, DEFAULT_COMPILE_CONFIG } from "../src/compile/types";
import { Project } from "../src/projects/types";
import { TFile } from "./fakes/obsidian";
import { FakeApp } from "./fakes/fake-app";

const CONFIG: CompileConfig = { ...DEFAULT_COMPILE_CONFIG }; // md, strip-frontmatter etc.

function seededApp(): FakeApp {
  return new FakeApp({
    "Book/Book.md": "---\nlongform:\n  format: scenes\n  title: Book\n  sceneFolder: Scenes\n  scenes:\n    - One\n    - Two\n---\n",
    "Book/Scenes/One.md": "---\nstatus: draft\nchapter: Part I\n---\nScene one prose.\n",
    "Book/Scenes/Two.md": "Scene two prose, no frontmatter.\n",
  });
}

function project(app: FakeApp, scenes: Array<{ title: string; path: string | null }>): Project {
  return {
    vaultPath: "Book/Book.md",
    draft: {
      format: "scenes",
      title: "Book",
      titleInFrontmatter: true,
      draftTitle: null,
      workflow: null,
      sceneFolder: "Scenes",
      scenes: scenes.map((s) => ({ title: s.title, indent: 0 })),
      ignoredFiles: [],
      sceneTemplate: null,
    },
    scenes: scenes.map((s) => ({ title: s.title, indent: 0, path: s.path })),
    unknownFiles: [],
    inkswell: null,
  };
}

describe("runCompile (md)", () => {
  it("assembles scenes in order, strips their frontmatter, and writes a registered vault file", async () => {
    const app = seededApp();
    const p = project(app, [
      { title: "One", path: "Book/Scenes/One.md" },
      { title: "Two", path: "Book/Scenes/Two.md" },
    ]);

    const result = await runCompile(app.asApp(), p, CONFIG);

    expect(result.outputPath).toBe("Book/manuscript.md");
    // Written through the vault API: the file is REGISTERED, not just bytes on disk.
    const out = app.vault.getAbstractFileByPath("Book/manuscript.md");
    expect(out).toBeInstanceOf(TFile);
    const content = app.vault.raw("Book/manuscript.md") ?? "";
    // trim-blank-lines (default manuscript step) collapses the join to one blank line.
    expect(content).toBe("Scene one prose.\n\nScene two prose, no frontmatter.\n");
    expect(content).not.toContain("status: draft"); // strip-frontmatter ran
  });

  it("overwrites the previous compile in place (same file identity, no duplicate)", async () => {
    const app = seededApp();
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);

    await runCompile(app.asApp(), p, CONFIG);
    const first = app.vault.getAbstractFileByPath("Book/manuscript.md");

    await app.vault.modify(app.file("Book/Scenes/One.md") as never, "Rewritten prose.\n");
    await runCompile(app.asApp(), p, CONFIG);

    const second = app.vault.getAbstractFileByPath("Book/manuscript.md");
    expect(second).toBe(first); // modified, not recreated
    expect(app.vault.raw("Book/manuscript.md")).toBe("Rewritten prose.\n");
  });

  it("skips scenes whose file is missing instead of failing the whole compile", async () => {
    const app = seededApp();
    const p = project(app, [
      { title: "One", path: "Book/Scenes/One.md" },
      { title: "Ghost", path: null },
      { title: "Gone", path: "Book/Scenes/Gone.md" }, // listed but no file
    ]);

    const result = await runCompile(app.asApp(), p, CONFIG);
    expect(app.vault.raw(result.outputPath)).toBe("Scene one prose.\n");
  });

  it("compiles a single-scene draft from the index note itself", async () => {
    const app = new FakeApp({
      "Solo.md": "---\nlongform:\n  format: single\n  title: Solo\n---\nThe whole story.\n",
    });
    const p: Project = {
      vaultPath: "Solo.md",
      draft: {
        format: "single",
        title: "Solo",
        titleInFrontmatter: true,
        draftTitle: null,
        workflow: null,
      },
      scenes: [],
      unknownFiles: [],
      inkswell: null,
    };

    const result = await runCompile(app.asApp(), p, CONFIG);
    expect(result.outputPath).toBe("manuscript.md"); // index at vault root
    expect(app.vault.raw("manuscript.md")).toBe("The whole story.\n");
  });

  it("throws the no-scenes error when nothing resolves to content", async () => {
    const app = seededApp();
    const p = project(app, [{ title: "Ghost", path: null }]);
    await expect(runCompile(app.asApp(), p, CONFIG)).rejects.toThrow(
      "No scenes with content to compile."
    );
  });

  it("refuses to write over a folder at the output path", async () => {
    const app = seededApp();
    await app.vault.createFolder("Book/manuscript.md");
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);
    await expect(runCompile(app.asApp(), p, CONFIG)).rejects.toThrow(
      /folder with that name exists/
    );
  });

  it("never modifies the scene files it reads", async () => {
    const app = seededApp();
    const before = {
      one: app.vault.raw("Book/Scenes/One.md"),
      two: app.vault.raw("Book/Scenes/Two.md"),
      index: app.vault.raw("Book/Book.md"),
    };
    const p = project(app, [
      { title: "One", path: "Book/Scenes/One.md" },
      { title: "Two", path: "Book/Scenes/Two.md" },
    ]);
    await runCompile(app.asApp(), p, CONFIG);
    expect(app.vault.raw("Book/Scenes/One.md")).toBe(before.one);
    expect(app.vault.raw("Book/Scenes/Two.md")).toBe(before.two);
    expect(app.vault.raw("Book/Book.md")).toBe(before.index);
  });
});
