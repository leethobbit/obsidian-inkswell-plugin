/**
 * runCompile end-to-end over the in-memory vault: scene loading (order, missing
 * paths, chapter meta), output written through the vault API (registered file,
 * overwrite-in-place), and the error paths. The pure assembly stages are covered
 * separately in compile-assemble.test.ts.
 */
import { describe, expect, it } from "vitest";
import { OutputExistsError, runCompile } from "../src/compile/engine";
import { isOwnCompile } from "../src/compile/docx";
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
    // First line: the ownership marker that lets the next compile recognize its
    // own output; trim-blank-lines then collapses the join to one blank line.
    expect(content).toBe(
      "<!-- inkswell:compile -->\nScene one prose.\n\nScene two prose, no frontmatter.\n"
    );
    expect(content).not.toContain("status: draft"); // strip-frontmatter ran
    // The marker never inflates the word count (it's not in wordCountSource).
    expect(result.wordCountSource).not.toContain("inkswell:compile");
  });

  it("flattens links in the output (default config) without touching the source scene", async () => {
    const app = new FakeApp({
      "Book/Book.md": "---\nlongform:\n  format: scenes\n  title: Book\n  sceneFolder: Scenes\n  scenes:\n    - One\n---\n",
      "Book/Scenes/One.md":
        "She'd tell her [[Beatrice|sister]] about [[The Lattice#Origins]].\n" +
        "![[Other Scene]]\n![[map.png]]\nA [markdown link](https://example.com) too.\n",
    });
    const before = app.vault.raw("Book/Scenes/One.md");
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);

    const result = await runCompile(app.asApp(), p, CONFIG);

    expect(result.wordCountSource).toBe(
      "She'd tell her sister about The Lattice.\n\n![](map.png)\nA markdown link too.\n"
    );
    expect(app.vault.raw("Book/Scenes/One.md")).toBe(before);
  });

  it("overwrites the previous compile in place (same file identity, no duplicate)", async () => {
    const app = seededApp();
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);

    await runCompile(app.asApp(), p, CONFIG);
    const first = app.vault.getAbstractFileByPath("Book/manuscript.md");

    await app.vault.modify(app.file("Book/Scenes/One.md") as never, "Rewritten prose.\n");
    await runCompile(app.asApp(), p, CONFIG);

    const second = app.vault.getAbstractFileByPath("Book/manuscript.md");
    expect(second).toBe(first); // modified, not recreated — the marker vouched for it
    expect(app.vault.raw("Book/manuscript.md")).toBe(
      "<!-- inkswell:compile -->\nRewritten prose.\n"
    );
  });

  it("skips scenes whose file is missing instead of failing the whole compile", async () => {
    const app = seededApp();
    const p = project(app, [
      { title: "One", path: "Book/Scenes/One.md" },
      { title: "Ghost", path: null },
      { title: "Gone", path: "Book/Scenes/Gone.md" }, // listed but no file
    ]);

    const result = await runCompile(app.asApp(), p, CONFIG);
    expect(app.vault.raw(result.outputPath)).toBe(
      "<!-- inkswell:compile -->\nScene one prose.\n"
    );
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
    expect(app.vault.raw("manuscript.md")).toBe(
      "<!-- inkswell:compile -->\nThe whole story.\n"
    );
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

  it("refuses to overwrite a marker-less note at the output path (H1 guard)", async () => {
    const app = seededApp();
    app.vault.seed("Book/manuscript.md", "A hand-written note that shares the name.\n");
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);

    await expect(runCompile(app.asApp(), p, CONFIG)).rejects.toThrow(OutputExistsError);
    // The note was NOT touched.
    expect(app.vault.raw("Book/manuscript.md")).toBe(
      "A hand-written note that shares the name.\n"
    );

    // The confirmed path replaces it (the panel backs it up first).
    await runCompile(app.asApp(), p, CONFIG, { allowOverwrite: true });
    expect(app.vault.raw("Book/manuscript.md")).toContain("Scene one prose.");
  });

  it("sanitizes a path-escaping output name instead of resolving a sibling path", async () => {
    const app = seededApp();
    const p = project(app, [{ title: "One", path: "Book/Scenes/One.md" }]);
    const cfg: CompileConfig = { ...CONFIG, targetBasename: "Scenes/One" };

    const result = await runCompile(app.asApp(), p, cfg);
    // The "/" is neutralized by the same sanitizer every filename input uses —
    // the output lands in the project folder, and the SCENE FILE is untouched.
    expect(result.outputPath).toBe("Book/Scenes-One.md");
    expect(app.vault.raw("Book/Scenes/One.md")).toContain("Scene one prose.");
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

describe("runCompile (built-in docx)", () => {
  const DOCX: CompileConfig = { ...DEFAULT_COMPILE_CONFIG, format: "docx" };
  const AUTHOR = { author: { name: "Jane Writer", contact: "jane@example.com" } };
  const both = (app: FakeApp) =>
    project(app, [
      { title: "One", path: "Book/Scenes/One.md" },
      { title: "Two", path: "Book/Scenes/Two.md" },
    ]);

  it("writes a marked .docx next to the index through the binary vault API", async () => {
    const app = seededApp();
    const result = await runCompile(app.asApp(), both(app), DOCX, AUTHOR);
    expect(result.outputPath).toBe("Book/manuscript.docx");
    expect(app.vault.getAbstractFileByPath("Book/manuscript.docx")).toBeInstanceOf(TFile);
    const bytes = app.vault.binary("Book/manuscript.docx");
    expect(bytes && isOwnCompile(bytes)).toBe(true);
    expect(result.docx).toEqual({ unsupported: 0, skippedImages: [] });
  });

  it("replaces its own previous output silently", async () => {
    const app = seededApp();
    await runCompile(app.asApp(), both(app), DOCX, AUTHOR);
    await expect(runCompile(app.asApp(), both(app), DOCX, AUTHOR)).resolves.toBeTruthy();
  });

  it("refuses to overwrite a .docx it didn't write (or one re-saved in Word) unless allowed", async () => {
    const app = seededApp();
    app.vault.setBinary("Book/manuscript.docx", new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]));
    await expect(runCompile(app.asApp(), both(app), DOCX, AUTHOR)).rejects.toThrow(OutputExistsError);
    await runCompile(app.asApp(), both(app), DOCX, { ...AUTHOR, allowOverwrite: true });
    expect(isOwnCompile(app.vault.binary("Book/manuscript.docx") ?? new Uint8Array())).toBe(true);
  });

  it("embeds vault images and reports the ones it can't use, never fetching URLs", async () => {
    const app = seededApp();
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 10);
    new DataView(png.buffer).setUint32(20, 10);
    app.vault.setBinary("Book/map.png", png);
    await app.vault.modify(
      app.vault.getAbstractFileByPath("Book/Scenes/Two.md") as TFile,
      "Prose.\n\n![[Book/map.png]]\n\n![](https://example.com/x.png)\n"
    );
    const result = await runCompile(app.asApp(), both(app), DOCX, AUTHOR);
    expect(result.docx?.skippedImages).toEqual(["https://example.com/x.png"]);
  });
});
