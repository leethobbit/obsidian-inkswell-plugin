import { describe, expect, it } from "vitest";
import {
  ProfileField,
  coerceValue,
  isArrayField,
  isEmptyValue,
  profileFields,
} from "../src/codex/profile-schema";
import { BuiltinCodexCategory, CODEX_CATEGORIES } from "../src/codex/types";

const field = (over: Partial<ProfileField>): ProfileField => ({
  key: "x",
  label: "X",
  type: "text",
  ...over,
});

describe("profile schema", () => {
  it("defines fields for every codex category, aliases first", () => {
    for (const cat of CODEX_CATEGORIES) {
      const fields = profileFields(cat.id);
      expect(fields.length).toBeGreaterThan(1);
      expect(fields[0].key).toBe("aliases");
    }
  });

  it("covers the roadmap-picked fields per category", () => {
    const expected: Record<BuiltinCodexCategory, string[]> = {
      character: ["image", "role", "traits", "motivation", "flaw", "backstory", "arc", "relationships"],
      location: ["image", "type", "parent", "region", "climate", "atmosphere", "significance", "history"],
      world: ["image", "geography", "culture", "politics", "magicTech", "religion", "economy", "history"],
      faction: ["image", "type", "leadership", "size", "territory", "goal", "allies", "enemies"],
      item: ["image", "type", "owner", "significance"],
      event: ["image", "date", "participants", "outcome"],
      concept: ["image", "type", "rules", "limitations", "significance"],
    };
    for (const cat of Object.keys(expected) as CodexCategory[]) {
      const keys = profileFields(cat).map((f) => f.key);
      for (const k of expected[cat]) expect(keys).toContain(k);
    }
  });

  it("only uses link fields that target a real category", () => {
    for (const cat of CODEX_CATEGORIES) {
      for (const f of profileFields(cat.id)) {
        if (f.type === "links" && f.linkCategory) {
          expect(CODEX_CATEGORIES.some((c) => c.id === f.linkCategory)).toBe(true);
        }
      }
    }
  });

  it("gives non-builtin categories the generic field set (customs and orphans alike)", () => {
    for (const cat of ["creature", "no-longer-exists"]) {
      expect(profileFields(cat).map((f) => f.key)).toEqual([
        "aliases",
        "image",
        "type",
        "description",
        "significance",
        "related",
      ]);
    }
  });

  it("exposes exactly one scalar image field, right after aliases, on every shipped set", () => {
    for (const cat of [...CODEX_CATEGORIES.map((c) => c.id), "creature"]) {
      const fields = profileFields(cat);
      const images = fields.filter((f) => f.type === "image");
      expect(images).toHaveLength(1);
      expect(fields[1]).toMatchObject({ key: "image", label: "Image", type: "image" });
      expect(isArrayField(images[0])).toBe(false);
      expect(coerceValue(images[0], "Attachments/a.png")).toBe("Attachments/a.png");
      expect(coerceValue(images[0], undefined)).toBe("");
    }
  });

  it("makes Relationships a labeled multi-link field (labels ride in the wikilink alias)", () => {
    const rel = profileFields("character").find((f) => f.key === "relationships");
    expect(rel).toMatchObject({ type: "links", linkCategory: "character", labeled: true });
    expect(rel?.single).toBeUndefined();
    // Nothing else is labeled by default.
    for (const cat of CODEX_CATEGORIES) {
      for (const f of profileFields(cat.id)) {
        if (f.key !== "relationships") expect(f.labeled).toBeUndefined();
      }
    }
  });

  it("leaves the generic Related links unrestricted (any category)", () => {
    const related = profileFields("creature").find((f) => f.key === "related");
    expect(related?.type).toBe("links");
    expect(related?.linkCategory).toBeUndefined();
  });
});

describe("isArrayField", () => {
  it("treats list and multi-links as arrays, single-links and text as scalars", () => {
    expect(isArrayField(field({ type: "list" }))).toBe(true);
    expect(isArrayField(field({ type: "links" }))).toBe(true);
    expect(isArrayField(field({ type: "links", single: true }))).toBe(false);
    expect(isArrayField(field({ type: "text" }))).toBe(false);
    expect(isArrayField(field({ type: "textarea" }))).toBe(false);
  });
});

describe("coerceValue", () => {
  it("coerces scalar fields to a string", () => {
    expect(coerceValue(field({ type: "text" }), 42)).toBe("42");
    expect(coerceValue(field({ type: "text" }), undefined)).toBe("");
    expect(coerceValue(field({ type: "links", single: true }), "[[Anna]]")).toBe("[[Anna]]");
  });

  it("coerces array fields to a string array, dropping non-strings", () => {
    expect(coerceValue(field({ type: "list" }), ["a", "b"])).toEqual(["a", "b"]);
    expect(coerceValue(field({ type: "list" }), [1, "b", null])).toEqual(["b"]);
    expect(coerceValue(field({ type: "links" }), "[[Anna]]")).toEqual(["[[Anna]]"]);
    expect(coerceValue(field({ type: "list" }), undefined)).toEqual([]);
    expect(coerceValue(field({ type: "list" }), "  ")).toEqual([]);
  });
});

describe("isEmptyValue", () => {
  it("flags blank strings and empty arrays for clearing", () => {
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue("")).toBe(true);
    expect(isEmptyValue("   ")).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue("x")).toBe(false);
    expect(isEmptyValue(["x"])).toBe(false);
  });
});
