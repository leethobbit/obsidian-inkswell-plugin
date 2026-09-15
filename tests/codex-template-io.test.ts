/**
 * Template-note I/O behind Customize → Codex types: creating a type's template
 * on first edit (never clobbering), writing `codex-fields` and reading it back,
 * and body edits that leave the frontmatter bytes untouched. The fake metadata
 * cache is LIVE (it parses file content), so the real-Obsidian cache lag after a
 * write is not reproduced here — the editor renders from writeTemplateFields'
 * return value for that reason.
 */
import { describe, expect, it } from "vitest";
import { CodexSettings } from "../src/codex/codex-store";
import { resolveProfileFields } from "../src/codex/codex-profile";
import {
  ensureCodexTemplate,
  readTemplateBody,
  writeTemplateBody,
  writeTemplateFields,
} from "../src/codex/codex-template-io";
import { FIELDS_KEY } from "../src/codex/profile-schema";
import { CODEX_CATEGORIES, CategoryDef } from "../src/codex/types";
import { replaceBody } from "../src/lib/frontmatter";
import { FakeApp } from "./fakes/fake-app";

const settings = (over: Partial<CodexSettings> = {}): CodexSettings => ({
  baseFolder: "",
  codexFolder: "Codex",
  coLocateCodex: true,
  customCategories: [],
  categoryOverrides: {},
  ...over,
});

const faction = CODEX_CATEGORIES.find((c) => c.id === "faction") as CategoryDef;
const creature: CategoryDef = { id: "creature", label: "Creature", plural: "Creatures", icon: "bug" };

describe("ensureCodexTemplate", () => {
  it("creates a starter note for a type with none, then returns that same note", async () => {
    const fake = new FakeApp();
    const app = fake.asApp();
    const s = settings({ customCategories: [creature] });
    const made = await ensureCodexTemplate(app, s, creature);
    expect(made.path).toBe("Templates/Creature.md");
    expect(await app.vault.cachedRead(made)).toContain("# {{title}}");
    const again = await ensureCodexTemplate(app, s, creature);
    expect(again.path).toBe(made.path);
  });

  it("never clobbers: an existing template (even under a renamed built-in's shipped name) is reused", async () => {
    const fake = new FakeApp({ "Templates/Faction.md": "---\ntags: [faction]\n---\nMINE\n" });
    const app = fake.asApp();
    const s = settings({ categoryOverrides: { faction: { label: "Group" } } });
    const group = { ...faction, label: "Group" };
    const file = await ensureCodexTemplate(app, s, group);
    expect(file.path).toBe("Templates/Faction.md");
    expect(await app.vault.cachedRead(file)).toContain("MINE");
    expect(app.vault.getAbstractFileByPath("Templates/Group.md")).toBeNull();
  });
});

describe("writeTemplateFields", () => {
  it("writes the spec, returns it normalized, and the panel resolves it", async () => {
    const fake = new FakeApp({ "Templates/Faction.md": "---\ntags: [faction]\n---\n# {{title}}\n" });
    const app = fake.asApp();
    const file = fake.file("Templates/Faction.md");
    const written = await writeTemplateFields(app, file, [
      { key: "type", type: "text" },
      { key: "motto", type: "text", label: "Motto or creed" },
      { key: "leadership", type: "links:character" },
    ]);
    expect(written).toEqual([
      { key: "type", type: "text" },
      { key: "motto", type: "text", label: "Motto or creed" },
      { key: "leadership", type: "links:character" },
    ]);
    const { fields, template } = resolveProfileFields(app, settings(), "faction");
    expect(template?.path).toBe("Templates/Faction.md");
    expect(fields.map((f) => f.label)).toEqual(["Aliases", "Type", "Motto or creed", "Leadership"]);
    // Other frontmatter survives.
    expect(app.metadataCache.getFileCache(file)?.frontmatter?.["tags"]).toEqual(["faction"]);
  });

  it("an empty spec deletes the key → shipped fields again", async () => {
    const fake = new FakeApp({
      "Templates/Faction.md": `---\n${FIELDS_KEY}:\n  type: text\n---\nBody\n`,
    });
    const app = fake.asApp();
    const file = fake.file("Templates/Faction.md");
    expect(await writeTemplateFields(app, file, [])).toEqual([]);
    expect(app.metadataCache.getFileCache(file)?.frontmatter?.[FIELDS_KEY]).toBeUndefined();
    expect(resolveProfileFields(app, settings(), "faction").template).toBeNull();
    expect(await readTemplateBody(app, file)).toBe("Body\n");
  });
});

describe("template body", () => {
  it("writeTemplateBody keeps the frontmatter bytes verbatim", async () => {
    const head = `---\ntags:\n  - faction\n${FIELDS_KEY}: [type, goal]\n---\n`;
    const fake = new FakeApp({ "Templates/Faction.md": `${head}# {{title}}\n` });
    const app = fake.asApp();
    const file = fake.file("Templates/Faction.md");
    await writeTemplateBody(app, file, "# {{title}}\n\n## Goals\n");
    expect(await app.vault.cachedRead(file)).toBe(`${head}# {{title}}\n\n## Goals\n`);
    expect(await readTemplateBody(app, file)).toBe("# {{title}}\n\n## Goals\n");
  });

  it("replaceBody: CRLF frontmatter, no frontmatter, and a body-leading divider", () => {
    expect(replaceBody("---\r\na: 1\r\n---\r\nold", "new")).toBe("---\r\na: 1\r\n---\r\nnew");
    expect(replaceBody("just prose", "new")).toBe("new");
    // A leading `---` scene divider is prose, not frontmatter — it is replaced with the body.
    expect(replaceBody("---\n\nOpening line.\n\n---\nNext.\n", "new")).toBe("new");
  });
});
