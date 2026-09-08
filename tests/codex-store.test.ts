/**
 * createEntity's filename safety: a codex entry name that sanitizes to a
 * dot-only / dot-edged segment must NOT create a hidden or folder-escaping
 * file (regression — a scene renamed to ".." once vanished from Obsidian).
 * Normal names still create as expected.
 */
import { describe, expect, it } from "vitest";
import {
  CodexSettings,
  createEntity,
  generateCodexTemplates,
  getCodexEntities,
  resolveCodexTemplate,
  scenesForEntity,
} from "../src/codex/codex-store";
import { CategoryDef, CodexCategory, CodexEntity, EntityScope } from "../src/codex/types";
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
      { project: "Book" },
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
