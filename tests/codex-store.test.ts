/**
 * createEntity's filename safety: a codex entry name that sanitizes to a
 * dot-only / dot-edged segment must NOT create a hidden or folder-escaping
 * file (regression — a scene renamed to ".." once vanished from Obsidian).
 * Normal names still create as expected.
 */
import { describe, expect, it } from "vitest";
import {
  CodexSettings,
  appearancesForEntity,
  createEntity,
  createEntityForProject,
  generateCodexTemplates,
  getCodexEntities,
  resolveCodexTemplate,
  resolveEntityImage,
  scenesForEntity,
  updateEntityProjects,
  writeEntityScope,
} from "../src/codex/codex-store";
import { CategoryDef, CodexCategory, CodexEntity, EntityScope } from "../src/codex/types";
import { Project } from "../src/projects/types";
import { TFile } from "./fakes/obsidian";
import { FakeApp } from "./fakes/fake-app";
import { isEntityVisible as isVisible } from "../src/codex/codex-scope";

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

describe("getCodexEntities discovery", () => {
  it("accepts any non-empty string category (orphan safety — unknowns must not vanish)", () => {
    const app = new FakeApp();
    app.vault.seed("Codex/Smaug.md", "---\ncodex: dragon\n---\nA great wyrm.\n");
    app.vault.seed("Codex/Anna.md", "---\ncodex: character\n---\nBio.\n");
    const cats = getCodexEntities(app.asApp()).map((e) => e.category).sort();
    expect(cats).toEqual(["character", "dragon"]);
  });

  it("trims whitespace around the category value", () => {
    const app = new FakeApp();
    app.vault.seed("Codex/Smaug.md", "---\ncodex: ' dragon '\n---\n");
    expect(getCodexEntities(app.asApp())[0]?.category).toBe("dragon");
  });

  it("still skips notes whose codex key is not a usable string", () => {
    const app = new FakeApp();
    app.vault.seed("Codex/BoolKey.md", "---\ncodex: true\n---\n");
    app.vault.seed("Codex/NumKey.md", "---\ncodex: 5\n---\n");
    app.vault.seed("Codex/EmptyKey.md", "---\ncodex: ''\n---\n");
    app.vault.seed("Codex/BlankKey.md", "---\ncodex: '   '\n---\n");
    app.vault.seed("Codex/NoKey.md", "---\ntags: [x]\n---\n");
    expect(getCodexEntities(app.asApp())).toEqual([]);
  });
});

const folders = { baseFolder: "", codexFolder: "Codex", coLocateCodex: true };
const creature: CategoryDef = {
  id: "creature",
  label: "Creature",
  plural: "Creatures",
  icon: "dog",
};
const settingsWith = (over: Partial<CodexSettings> = {}): CodexSettings => ({
  ...folders,
  customCategories: [],
  categoryOverrides: {},
  ...over,
});

describe("generateCodexTemplates with custom categories", () => {
  it("writes a template note for custom types alongside the built-ins", async () => {
    const app = new FakeApp();
    const created = await generateCodexTemplates(
      app.asApp(),
      settingsWith({ customCategories: [creature] })
    );
    expect(created).toContain("Templates/Creature.md");
    expect(created).toContain("Templates/Character.md");
  });

  it("never clobbers an existing template", async () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Creature.md", "my customized template\n");
    const created = await generateCodexTemplates(
      app.asApp(),
      settingsWith({ customCategories: [creature] })
    );
    expect(created).not.toContain("Templates/Creature.md");
    expect(await app.vault.cachedRead(app.vault.getAbstractFileByPath("Templates/Creature.md") as never)).toBe(
      "my customized template\n"
    );
  });

  it("names a renamed built-in's template after the new label", async () => {
    const app = new FakeApp();
    const created = await generateCodexTemplates(
      app.asApp(),
      settingsWith({ categoryOverrides: { faction: { label: "Group", plural: "Groups" } } })
    );
    expect(created).toContain("Templates/Group.md");
    expect(created).not.toContain("Templates/Faction.md");
  });

  it("skips a renamed built-in whose shipped-name template already exists (it still resolves)", async () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Faction.md", "my factions\n");
    const created = await generateCodexTemplates(
      app.asApp(),
      settingsWith({ categoryOverrides: { faction: { label: "Group" } } })
    );
    expect(created).not.toContain("Templates/Group.md");
    expect(created).not.toContain("Templates/Faction.md");
  });
});

describe("resolveCodexTemplate", () => {
  const group: CategoryDef = { id: "faction", label: "Group", plural: "Groups", icon: "users" };

  it("resolves the template by the type's current label", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Group.md", "---\naliases: []\n---\n");
    const s = settingsWith({ categoryOverrides: { faction: { label: "Group" } } });
    expect(resolveCodexTemplate(app.asApp(), s, group)?.path).toBe("Templates/Group.md");
  });

  it("falls back to a renamed built-in's shipped-name template", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Faction.md", "---\naliases: []\n---\n");
    const s = settingsWith({ categoryOverrides: { faction: { label: "Group" } } });
    expect(resolveCodexTemplate(app.asApp(), s, group)?.path).toBe("Templates/Faction.md");
  });

  it("prefers the current-label note when both exist", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Faction.md", "old\n");
    app.vault.seed("Templates/Group.md", "new\n");
    const s = settingsWith({ categoryOverrides: { faction: { label: "Group" } } });
    expect(resolveCodexTemplate(app.asApp(), s, group)?.path).toBe("Templates/Group.md");
  });

  it("does not steal a shipped-name note that a custom type now owns by label", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Faction.md", "the custom type's template\n");
    const customFaction: CategoryDef = { id: "guild", label: "Faction", plural: "Factions", icon: "box" };
    const s = settingsWith({
      categoryOverrides: { faction: { label: "Group" } },
      customCategories: [customFaction],
    });
    expect(resolveCodexTemplate(app.asApp(), s, group)).toBeNull();
    expect(resolveCodexTemplate(app.asApp(), s, customFaction)?.path).toBe("Templates/Faction.md");
  });

  it("returns null when no template exists", () => {
    const app = new FakeApp();
    expect(resolveCodexTemplate(app.asApp(), settingsWith(), group)).toBeNull();
  });
});

describe("createEntity from a template", () => {
  it("copies the template but strips codex-fields and stamps codex + scope", async () => {
    const app = new FakeApp();
    const tpl = app.vault.seed(
      "Templates/Character.md",
      "---\ntags:\n  - character\naliases: []\nspecies: \ncodex-fields: [species, birthday]\n---\n# {{title}}\n"
    );
    const file = await createEntity(
      app.asApp(),
      "character",
      "Anna",
      "Codex",
      { projects: ["Book"] },
      tpl as never
    );
    const fm = app.metadataCache.getFileCache(file as never)?.frontmatter ?? {};
    expect(fm["codex"]).toBe("character");
    expect(fm["codex-fields"]).toBeUndefined();
    expect(fm["codex-project"]).toBe("[[Book]]");
    expect("species" in fm).toBe(true); // template-seeded key survives
    expect(await app.vault.cachedRead(file as never)).toContain("# Anna");
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

describe("createEntityForProject (shared New / Quick Codex pipeline)", () => {
  const character: CategoryDef = {
    id: "character",
    label: "Character",
    plural: "Characters",
    icon: "user",
  };

  it("co-locates a book-scoped entry beside the project and tags it for the book", async () => {
    const app = new FakeApp();
    app.vault.seed("Books/Lamplight/Lamplight.md", "---\nlongform:\n  format: scenes\n---\n");
    const project = makeProject("Books/Lamplight/Lamplight.md", []);
    const file = await createEntityForProject(
      app.asApp(),
      settingsWith({ baseFolder: "Writing" }),
      [project],
      project,
      character,
      "Anna"
    );
    expect(file?.path).toBe("Books/Lamplight/Codex/Anna.md");
    const fm = app.metadataCache.getFileCache(file as never)?.frontmatter;
    expect(fm?.["codex"]).toBe("character");
    expect(fm?.["codex-project"]).toBe("[[Lamplight]]");
  });

  it("creates a global entry under the base folder with no active project", async () => {
    const app = new FakeApp();
    const file = await createEntityForProject(
      app.asApp(),
      settingsWith({ baseFolder: "Writing" }),
      [],
      null,
      character,
      "Anna"
    );
    expect(file?.path).toBe("Writing/Codex/Anna.md");
    const fm = app.metadataCache.getFileCache(file as never)?.frontmatter;
    expect(fm?.["codex-project"]).toBeUndefined();
  });

  it("returns the existing note instead of overwriting it", async () => {
    const app = new FakeApp();
    app.vault.seed("Writing/Codex/Anna.md", "---\ncodex: character\n---\nOriginal.\n");
    const file = await createEntityForProject(
      app.asApp(),
      settingsWith({ baseFolder: "Writing" }),
      [],
      null,
      character,
      "Anna"
    );
    expect(file?.path).toBe("Writing/Codex/Anna.md");
    expect(await app.vault.read(file as never)).toContain("Original.");
  });
});

describe("resolveEntityImage", () => {
  const seeded = () => {
    const app = new FakeApp();
    app.vault.seed("Codex/Anna.md", "---\ncodex: character\n---\n");
    app.vault.seed("Attachments/anna.png", "<binary>");
    return app;
  };

  it("resolves a plain vault path", () => {
    const app = seeded();
    expect(resolveEntityImage(app.asApp(), "Attachments/anna.png", "Codex/Anna.md")?.path).toBe(
      "Attachments/anna.png"
    );
  });

  it("resolves wikilink / embed forms by shortest path, relative to the entry", () => {
    const app = seeded();
    for (const raw of ["[[anna.png]]", "![[anna.png|200]]", "![Anna](Attachments/anna.png)"]) {
      expect(resolveEntityImage(app.asApp(), raw, "Codex/Anna.md")?.path, raw).toBe(
        "Attachments/anna.png"
      );
    }
  });

  it("returns null for unset, missing, and non-image targets", () => {
    const app = seeded();
    expect(resolveEntityImage(app.asApp(), undefined, "Codex/Anna.md")).toBeNull();
    expect(resolveEntityImage(app.asApp(), "   ", "Codex/Anna.md")).toBeNull();
    expect(resolveEntityImage(app.asApp(), "Attachments/gone.png", "Codex/Anna.md")).toBeNull();
    expect(resolveEntityImage(app.asApp(), "[[Anna]]", "Codex/Anna.md")).toBeNull(); // a note, not an image
  });
});

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

  it("counts a location link in either form — plain string or list — case-insensitively (#44)", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", '---\nlocation: "[[the docks]]"\n---\nFog rolled in.\n');
    app.vault.seed("BookA/s2.md", '---\nlocation:\n  - "[[Tower]]"\n  - "[[The Docks]]"\n---\nBells.\n');
    app.vault.seed("BookA/s3.md", '---\nlocation: "[[Tower]]"\n---\nNo docks here.\n');
    const projects = [makeProject("BookA/BookA.md", ["BookA/s1.md", "BookA/s2.md", "BookA/s3.md"])];
    expect(await appearsIn(app, projects, entity("The Docks", "location"))).toEqual(["s1", "s2"]);
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
      entity("Amulet", "item", { scope: { projects: ["BookA"] } })
    );
    expect(scoped.map((s) => s.path)).toEqual(["BookA/s1.md"]);
  });
});

describe("appearancesForEntity (per book, POV flagged — #40)", () => {
  it("groups by book in manuscript order, counts POV scenes, omits books with no hits", async () => {
    const app = new FakeApp();
    app.vault.seed("BookA/s1.md", "---\npov: \"[[Anna]]\"\n---\nAnna ran.\n");
    app.vault.seed("BookA/s2.md", "---\npov: Ben\ncharacters:\n  - \"[[Anna]]\"\n---\nHe waited.\n");
    app.vault.seed("BookA/s3.md", "No one here.\n");
    app.vault.seed("BookB/s1.md", "---\npov: annie\n---\nAnnie again.\n");
    app.vault.seed("BookC/s1.md", "Someone else entirely.\n");
    const projects = [
      makeProject("BookA/BookA.md", ["BookA/s1.md", "BookA/s2.md", "BookA/s3.md"]),
      makeProject("BookB/BookB.md", ["BookB/s1.md"]),
      makeProject("BookC/BookC.md", ["BookC/s1.md"]),
    ];
    const books = await appearancesForEntity(
      app.asApp(),
      projects,
      entity("Anna", "character", { aliases: ["Annie"] })
    );
    expect(books.map((b) => b.title)).toEqual(["BookA/BookA.md", "BookB/BookB.md"]);
    expect(books[0].scenes.map((s) => [s.file.basename, s.pov])).toEqual([
      ["s1", true],
      ["s2", false],
    ]);
    expect(books[0].povCount).toBe(1);
    // Alias match on pov, case-insensitive, plain (unlinked) value.
    expect(books[1].scenes.map((s) => [s.file.basename, s.pov])).toEqual([["s1", true]]);
    // The flat wrapper still returns every file, sorted by basename.
    const flat = await scenesForEntity(app.asApp(), projects, entity("Anna", "character", { aliases: ["Annie"] }));
    expect(flat.map((f) => f.path).sort()).toEqual(["BookA/s1.md", "BookA/s2.md", "BookB/s1.md"]);
  });
});

describe("codex-project scope: one book or several (#40)", () => {
  const fmOf = (app: FakeApp, path: string) =>
    app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(path) as never)?.frontmatter ?? {};
  const scopeOf = (app: FakeApp, name: string) =>
    getCodexEntities(app.asApp()).find((e) => e.name === name)?.scope;

  it("reads the pre-1.17 single wikilink, a list, a list with junk, and ignores a non-string scalar", () => {
    const app = new FakeApp();
    app.vault.seed("Codex/One.md", '---\ncodex: character\ncodex-project: "[[Book A]]"\n---\n');
    app.vault.seed(
      "Codex/Two.md",
      '---\ncodex: character\ncodex-project:\n  - "[[Book A]]"\n  - "[[Book B]]"\n---\n'
    );
    app.vault.seed(
      "Codex/Junk.md",
      '---\ncodex: character\ncodex-project:\n  - "[[Book A]]"\n  - 42\n  - ""\n  - "[[Book A]]"\n---\n'
    );
    app.vault.seed("Codex/Num.md", "---\ncodex: character\ncodex-project: 42\n---\n");
    expect(scopeOf(app, "One")).toEqual({ projects: ["Book A"] });
    expect(scopeOf(app, "Two")).toEqual({ projects: ["Book A", "Book B"] });
    expect(scopeOf(app, "Junk")).toEqual({ projects: ["Book A"] });
    expect(scopeOf(app, "Num")).toBeUndefined(); // global, not a crash
  });

  it("series still wins when both keys are present", () => {
    const app = new FakeApp();
    app.vault.seed(
      "Codex/Both.md",
      '---\ncodex: character\ncodex-series: Saga\ncodex-project: "[[Book A]]"\n---\n'
    );
    const scope = scopeOf(app, "Both");
    expect(scope?.series).toBe("Saga");
    const ctx = { projectNames: ["Other"], seriesName: "Saga" };
    expect(getCodexEntities(app.asApp()).filter((e) => e.scope && isVisible(e, ctx)).length).toBe(1);
  });

  it("writes one book as the plain wikilink string (1.16-compatible) and several as a list", async () => {
    const app = new FakeApp();
    const file = app.vault.seed("Codex/Anna.md", "---\ncodex: character\n---\n");
    await writeEntityScope(app.asApp(), file as never, { projects: ["Book A"] });
    expect(fmOf(app, "Codex/Anna.md")["codex-project"]).toBe("[[Book A]]");
    await writeEntityScope(app.asApp(), file as never, { projects: ["Book A", "Book B", "Book A"] });
    expect(fmOf(app, "Codex/Anna.md")["codex-project"]).toEqual(["[[Book A]]", "[[Book B]]"]);
    expect(app.vault.raw("Codex/Anna.md")).toContain('- "[[Book A]]"');
    // Series clears the book list; global clears both.
    await writeEntityScope(app.asApp(), file as never, { series: "Saga" });
    expect(fmOf(app, "Codex/Anna.md")["codex-project"]).toBeUndefined();
    expect(fmOf(app, "Codex/Anna.md")["codex-series"]).toBe("Saga");
    await writeEntityScope(app.asApp(), file as never, {});
    expect(fmOf(app, "Codex/Anna.md")["codex-series"]).toBeUndefined();
    await writeEntityScope(app.asApp(), file as never, { projects: [] });
    expect("codex-project" in fmOf(app, "Codex/Anna.md")).toBe(false);
  });

  it("updateEntityProjects: add, add, remove round-trip; two adds from the same pre-state both survive", async () => {
    const app = new FakeApp();
    const file = app.vault.seed(
      "Codex/Anna.md",
      '---\ncodex: character\ncodex-series: Saga\ncodex-project: "[[Book A]]"\n---\n'
    );
    // Fired back-to-back without awaiting — each transform must see the other's result.
    const p1 = updateEntityProjects(app.asApp(), file as never, (cur) => [...cur, "Book B"]);
    const p2 = updateEntityProjects(app.asApp(), file as never, (cur) => [...cur, "Book C"]);
    await Promise.all([p1, p2]);
    expect(fmOf(app, "Codex/Anna.md")["codex-project"]).toEqual([
      "[[Book A]]",
      "[[Book B]]",
      "[[Book C]]",
    ]);
    expect(fmOf(app, "Codex/Anna.md")["codex-series"]).toBeUndefined(); // now book-scoped
    await updateEntityProjects(app.asApp(), file as never, (cur) => cur.filter((b) => b !== "Book A"));
    await updateEntityProjects(app.asApp(), file as never, (cur) => cur.filter((b) => b !== "Book C"));
    expect(fmOf(app, "Codex/Anna.md")["codex-project"]).toBe("[[Book B]]"); // back to the string form
    await updateEntityProjects(app.asApp(), file as never, () => []);
    expect("codex-project" in fmOf(app, "Codex/Anna.md")).toBe(false); // global
  });

  it("createEntity (no template) scaffolds a multi-book scope that parses back", async () => {
    const app = new FakeApp();
    const file = await createEntity(app.asApp(), "character", "Anna", "Codex", {
      projects: ["Book A", "Book B"],
    });
    expect(app.vault.raw(file!.path)).toContain('codex-project:\n  - "[[Book A]]"\n  - "[[Book B]]"');
    expect(scopeOf(app, "Anna")).toEqual({ projects: ["Book A", "Book B"] });
    const one = await createEntity(app.asApp(), "character", "Solo", "Codex", { projects: ["Book A"] });
    expect(app.vault.raw(one!.path)).toContain('codex-project: "[[Book A]]"');
  });
});
