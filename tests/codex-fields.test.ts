/**
 * Template-driven Codex panel fields: a type's template note may carry a
 * `codex-fields` list that replaces the shipped field set. Covers the pure spec
 * parser + resolver (profile-schema) and the I/O resolver that reads the
 * template's frontmatter (codex-profile), including the "no spec → shipped
 * fields, exactly as before" guarantee existing users rely on.
 */
import { describe, expect, it } from "vitest";
import {
  FIELDS_KEY,
  humanizeKey,
  parseFieldSpec,
  profileFields,
} from "../src/codex/profile-schema";
import { readProfile, resolveProfileFields, writeProfile } from "../src/codex/codex-profile";
import { CodexSettings } from "../src/codex/codex-store";
import { FakeApp } from "./fakes/fake-app";

const settings = (over: Partial<CodexSettings> = {}): CodexSettings => ({
  baseFolder: "",
  codexFolder: "Codex",
  coLocateCodex: true,
  customCategories: [],
  categoryOverrides: {},
  ...over,
});

describe("parseFieldSpec", () => {
  it("returns null for an absent or unusable value (→ shipped fields)", () => {
    expect(parseFieldSpec(undefined)).toBeNull();
    expect(parseFieldSpec(null)).toBeNull();
    expect(parseFieldSpec(42)).toBeNull();
    expect(parseFieldSpec(true)).toBeNull();
  });

  it("accepts a list of keys", () => {
    expect(parseFieldSpec(["species", "birthday"])).toEqual([{ key: "species" }, { key: "birthday" }]);
  });

  it("accepts a key → type map, keeping order", () => {
    expect(parseFieldSpec({ species: "text", history: "textarea", allies: "links:faction" })).toEqual([
      { key: "species", type: "text" },
      { key: "history", type: "textarea" },
      { key: "allies", type: "links:faction" },
    ]);
  });

  it("accepts single-key maps inside a list (YAML `- key: type`)", () => {
    expect(parseFieldSpec([{ species: "text" }, "birthday", { home: "link:location" }])).toEqual([
      { key: "species", type: "text" },
      { key: "birthday" },
      { key: "home", type: "link:location" },
    ]);
  });

  it("accepts a comma-separated scalar", () => {
    expect(parseFieldSpec("species, birthday")).toEqual([{ key: "species" }, { key: "birthday" }]);
  });

  it("skips reserved keys, blanks, non-strings, and duplicates", () => {
    expect(
      parseFieldSpec(["codex", "codex-series", "codex-project", FIELDS_KEY, "aliases", "", "  ", 7, "species", "species"])
    ).toEqual([{ key: "species" }]);
  });

  it("treats a blank type as no hint", () => {
    expect(parseFieldSpec({ species: "", birthday: null })).toEqual([{ key: "species" }, { key: "birthday" }]);
  });
});

describe("profileFields with a spec", () => {
  it("falls back to the shipped fields for a null/empty spec (existing behavior)", () => {
    const shipped = profileFields("character");
    expect(profileFields("character", null)).toEqual(shipped);
    expect(profileFields("character", [])).toEqual(shipped);
    expect(profileFields("character", undefined)).toEqual(shipped);
  });

  it("always puts aliases first, then exactly the listed keys in order", () => {
    const fields = profileFields("character", [{ key: "species" }, { key: "birthday" }, { key: "motivation" }]);
    expect(fields.map((f) => f.key)).toEqual(["aliases", "species", "birthday", "motivation"]);
  });

  it("gives unknown keys a text type and a humanized label", () => {
    const [, species, birthDate] = profileFields("character", [{ key: "species" }, { key: "birthDate" }]);
    expect(species).toEqual({ key: "species", label: "Species", type: "text" });
    expect(birthDate.label).toBe("Birth date");
    expect(birthDate.type).toBe("text");
  });

  it("reuses the shipped definition for a known key (label, type, picker)", () => {
    const [, rel] = profileFields("character", [{ key: "relationships" }]);
    expect(rel.label).toBe("Relationships");
    expect(rel.type).toBe("links");
    expect(rel.linkCategory).toBe("character");
    // A key shipped under ANOTHER category is found too (owner is an Item field).
    const [, owner] = profileFields("creature", [{ key: "owner" }]);
    expect(owner.type).toBe("links");
    expect(owner.single).toBe(true);
    expect(owner.linkCategory).toBe("character");
    // Generic set is consulted for customs.
    const [, desc] = profileFields("creature", [{ key: "description" }]);
    expect(desc.type).toBe("textarea");
  });

  it("lets an explicit type hint override the shipped type", () => {
    const [, rel] = profileFields("character", [{ key: "relationships", type: "textarea" }]);
    expect(rel.type).toBe("textarea");
    expect(rel.linkCategory).toBeUndefined();
    expect(rel.single).toBeUndefined();
  });

  it("parses the link type hints", () => {
    const [, allies, home, tags, notes] = profileFields("creature", [
      { key: "allies", type: "links:faction" },
      { key: "home", type: "link:location" },
      { key: "tags", type: "list" },
      { key: "notes", type: "textarea" },
    ]);
    expect(allies).toMatchObject({ type: "links", linkCategory: "faction" });
    expect(allies.single).toBeUndefined();
    expect(home).toMatchObject({ type: "links", linkCategory: "location", single: true });
    expect(tags.type).toBe("list");
    expect(notes.type).toBe("textarea");
  });

  it("ignores an unknown type hint (keeps the shipped or default type)", () => {
    const [, species, rel] = profileFields("character", [
      { key: "species", type: "wibble" },
      { key: "relationships", type: "wibble" },
    ]);
    expect(species.type).toBe("text");
    expect(rel.type).toBe("links");
  });

  it("de-duplicates repeated keys", () => {
    const fields = profileFields("character", [{ key: "species" }, { key: "species" }]);
    expect(fields.map((f) => f.key)).toEqual(["aliases", "species"]);
  });
});

describe("humanizeKey", () => {
  it("splits camelCase, snake_case, and kebab-case into a sentence-case label", () => {
    expect(humanizeKey("species")).toBe("Species");
    expect(humanizeKey("birthDate")).toBe("Birth date");
    expect(humanizeKey("birth_date")).toBe("Birth date");
    expect(humanizeKey("birth-date")).toBe("Birth date");
    expect(humanizeKey("magicTechLevel")).toBe("Magic tech level");
  });
});

describe("resolveProfileFields (template lookup)", () => {
  it("uses the shipped fields when there is no template", () => {
    const app = new FakeApp();
    const { fields, template } = resolveProfileFields(app.asApp(), settings(), "character");
    expect(template).toBeNull();
    expect(fields).toEqual(profileFields("character"));
  });

  it("uses the shipped fields when the template has no codex-fields (pre-existing templates)", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Character.md", "---\ntags: [character]\naliases: []\nspecies: \n---\n# {{title}}\n");
    const { fields, template } = resolveProfileFields(app.asApp(), settings(), "character");
    expect(template).toBeNull();
    expect(fields).toEqual(profileFields("character"));
  });

  it("takes the field list from the template's codex-fields", () => {
    const app = new FakeApp();
    app.vault.seed(
      "Templates/Character.md",
      "---\naliases: []\ncodex-fields:\n  species: text\n  history: textarea\n  relationships:\n---\n"
    );
    const { fields, template } = resolveProfileFields(app.asApp(), settings(), "character");
    expect(template?.path).toBe("Templates/Character.md");
    expect(fields.map((f) => f.key)).toEqual(["aliases", "species", "history", "relationships"]);
    expect(fields[2].type).toBe("textarea");
    expect(fields[3].type).toBe("links");
  });

  it("honors the base folder and a custom type's template", () => {
    const app = new FakeApp();
    app.vault.seed("Writing/Templates/Creature.md", "---\ncodex-fields: [habitat, diet]\n---\n");
    const s = settings({
      baseFolder: "Writing",
      customCategories: [{ id: "creature", label: "Creature", plural: "Creatures", icon: "dog" }],
    });
    const { fields } = resolveProfileFields(app.asApp(), s, "creature");
    expect(fields.map((f) => f.key)).toEqual(["aliases", "habitat", "diet"]);
  });

  it("follows a renamed built-in to its shipped-name template", () => {
    const app = new FakeApp();
    app.vault.seed("Templates/Faction.md", "---\ncodex-fields: [motto]\n---\n");
    const s = settings({ categoryOverrides: { faction: { label: "Group" } } });
    const { fields, template } = resolveProfileFields(app.asApp(), s, "faction");
    expect(template?.path).toBe("Templates/Faction.md");
    expect(fields.map((f) => f.key)).toEqual(["aliases", "motto"]);
  });

  it("gives an orphan category (no def) the generic fields", () => {
    const app = new FakeApp();
    const { fields, template } = resolveProfileFields(app.asApp(), settings(), "dragon");
    expect(template).toBeNull();
    expect(fields.map((f) => f.key)).toEqual(["aliases", "type", "description", "significance", "related"]);
  });
});

describe("readProfile / writeProfile with a resolved field list", () => {
  it("reads only the resolved keys and writes only them, preserving the rest", async () => {
    const app = new FakeApp();
    const file = app.vault.seed(
      "Codex/Anna.md",
      "---\ncodex: character\naliases: []\nrole: Hero\nspecies: elf\ntags:\n  - character\n---\nBody.\n"
    );
    const fields = profileFields("character", [{ key: "species" }, { key: "birthday" }]);
    const profile = readProfile(app.asApp(), file as never, fields);
    expect(profile).toEqual({ aliases: [], species: "elf", birthday: "" });

    await writeProfile(app.asApp(), file as never, fields, { birthday: "Midsummer", role: "Villain" });
    const fm = app.metadataCache.getFileCache(file as never)?.frontmatter ?? {};
    expect(fm["birthday"]).toBe("Midsummer");
    expect(fm["role"]).toBe("Hero"); // not in the resolved list → untouched
    expect(fm["tags"]).toEqual(["character"]);
    expect(await app.vault.cachedRead(file as never)).toContain("Body.");
  });
});
