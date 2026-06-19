import { describe, expect, it } from "vitest";
import {
  ProfileField,
  coerceValue,
  isArrayField,
  isEmptyValue,
  profileFields,
} from "../src/codex/profile-schema";
import { CODEX_CATEGORIES, CodexCategory } from "../src/codex/types";

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
    const expected: Record<CodexCategory, string[]> = {
      character: ["role", "traits", "motivation", "flaw", "backstory", "arc", "relationships"],
      location: ["type", "parent", "region", "climate", "atmosphere", "significance", "history"],
      world: ["geography", "culture", "politics", "magicTech", "religion", "economy", "history"],
      faction: ["type", "leadership", "size", "territory", "goal", "allies", "enemies"],
      item: ["type", "owner", "significance"],
      event: ["date", "participants", "outcome"],
      concept: ["type", "rules", "limitations", "significance"],
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
