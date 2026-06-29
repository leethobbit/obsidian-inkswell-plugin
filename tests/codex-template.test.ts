import { describe, expect, it } from "vitest";
import { applyTemplateVars } from "../src/lib/template";
import { codexTemplatesReadme, starterCodexTemplate } from "../src/codex/codex-template";

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
    const t = starterCodexTemplate("character");
    expect(t).toContain("tags:");
    expect(t).toContain("- character");
  });

  it("uses the {{title}} placeholder for the name", () => {
    expect(starterCodexTemplate("location")).toContain("# {{title}}");
  });

  it("omits a codex: key so the template isn't discovered as an entity", () => {
    // No top-level `codex:` line (the app stamps it on creation).
    const t = starterCodexTemplate("faction");
    expect(t.split("\n").some((line) => /^codex:/.test(line))).toBe(false);
  });

  it("documents the category's profile fields", () => {
    // Character-specific field labels appear in the guidance comment.
    expect(starterCodexTemplate("character")).toContain("Motivation");
  });
});

describe("codexTemplatesReadme", () => {
  it("lists every codex type and its template filename", () => {
    const r = codexTemplatesReadme();
    expect(r).toContain("Character.md");
    expect(r).toContain("Concept.md");
  });
});
