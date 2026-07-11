import { describe, expect, it } from "vitest";
import { applyTemplateVars } from "../src/lib/template";
import { codexTemplatesReadme, starterCodexTemplate } from "../src/codex/codex-template";
import { CODEX_CATEGORIES, CategoryDef, allCategories } from "../src/codex/types";

const builtin = (id: string): CategoryDef => {
  const def = CODEX_CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`no builtin ${id}`);
  return def;
};
const creature: CategoryDef = { id: "creature", label: "Creature", plural: "Creatures", icon: "dog" };

describe("applyTemplateVars", () => {
  it("replaces {{title}} in body and frontmatter, all occurrences", () => {
    const raw = "---\nalias: {{title}}\n---\n# {{title}}\n\nNotes on {{title}}.";
    expect(applyTemplateVars(raw, { title: "Anna" })).toBe(
      "---\nalias: Anna\n---\n# Anna\n\nNotes on Anna."
    );
  });

  it("tolerates inner whitespace and case", () => {
    expect(applyTemplateVars("{{ Title }} and {{TITLE}}", { title: "X" })).toBe("X and X");
  });

  it("is a no-op when the token is absent", () => {
    expect(applyTemplateVars("# Plain note", { title: "Anna" })).toBe("# Plain note");
  });
});

describe("starterCodexTemplate", () => {
  it("defaults the tag to the category id (the requested #character)", () => {
    const t = starterCodexTemplate(builtin("character"));
    expect(t).toContain("tags:");
    expect(t).toContain("- character");
  });

  it("uses the {{title}} placeholder for the name", () => {
    expect(starterCodexTemplate(builtin("location"))).toContain("# {{title}}");
  });

  it("omits a codex: key so the template isn't discovered as an entity", () => {
    // No top-level `codex:` line (the app stamps it on creation).
    const t = starterCodexTemplate(builtin("faction"));
    expect(t.split("\n").some((line) => /^codex:/.test(line))).toBe(false);
  });

  it("documents the category's profile fields", () => {
    // Character-specific field labels appear in the guidance comment.
    expect(starterCodexTemplate(builtin("character"))).toContain("Motivation");
  });

  it("builds a custom type's template from its def and the generic fields", () => {
    const t = starterCodexTemplate(creature);
    expect(t).toContain("- creature"); // tag defaults to the custom id
    expect(t).toContain("codex: creature"); // guidance names the stamped key
    expect(t).toContain("every new Creature");
    expect(t).toContain("Significance"); // generic profile fields are listed
    expect(t.split("\n").some((line) => /^codex:/.test(line))).toBe(false);
  });
});

describe("codexTemplatesReadme", () => {
  it("lists every codex type and its template filename", () => {
    const r = codexTemplatesReadme();
    expect(r).toContain("Character.md");
    expect(r).toContain("Concept.md");
  });

  it("includes custom types when given the merged list", () => {
    expect(codexTemplatesReadme(allCategories([creature]))).toContain("Creature.md");
  });
});
