/**
 * Custom codex categories: the id slugifier, the load-time settings sanitizer,
 * and the merged built-in + custom category list. These guard the persistence
 * boundary — data.json is hand-editable, so normalizeCustomCategories is the
 * only thing standing between arbitrary JSON and the render paths.
 */
import { describe, expect, it } from "vitest";
import {
  CODEX_CATEGORIES,
  CategoryDef,
  allCategories,
  categoryLabel,
  isBuiltinCategory,
  normalizeCustomCategories,
  slugifyCategoryId,
} from "../src/codex/types";

const creature: CategoryDef = { id: "creature", label: "Creature", plural: "Creatures", icon: "dog" };

describe("slugifyCategoryId", () => {
  it("lowercases and dashes spaces/underscores", () => {
    expect(slugifyCategoryId("Magic System")).toBe("magic-system");
    expect(slugifyCategoryId("magic_system")).toBe("magic-system");
    expect(slugifyCategoryId("  Creature  ")).toBe("creature");
  });

  it("strips symbols and collapses/trims dashes", () => {
    expect(slugifyCategoryId("Spells & Rituals!")).toBe("spells-rituals");
    expect(slugifyCategoryId("--weird--")).toBe("weird");
  });

  it("returns empty for names with no usable characters", () => {
    expect(slugifyCategoryId("!!!")).toBe("");
    expect(slugifyCategoryId("   ")).toBe("");
  });
});

describe("normalizeCustomCategories", () => {
  it("returns [] for non-arrays", () => {
    expect(normalizeCustomCategories(undefined)).toEqual([]);
    expect(normalizeCustomCategories("nope")).toEqual([]);
    expect(normalizeCustomCategories({ id: "x" })).toEqual([]);
  });

  it("keeps well-formed entries as-is", () => {
    expect(normalizeCustomCategories([creature])).toEqual([creature]);
  });

  it("drops malformed items and non-slug ids", () => {
    expect(
      normalizeCustomCategories([null, 5, "str", { label: "No id" }, { id: "Bad Id!", label: "X" }])
    ).toEqual([]);
    // Slug must start with a letter.
    expect(normalizeCustomCategories([{ id: "9lives", label: "Nine" }])).toEqual([]);
  });

  it("requires a label", () => {
    expect(normalizeCustomCategories([{ id: "ghost", label: "  " }])).toEqual([]);
  });

  it("fills plural and icon fallbacks", () => {
    const [out] = normalizeCustomCategories([{ id: "spell", label: "Spell" }]);
    expect(out).toEqual({ id: "spell", label: "Spell", plural: "Spells", icon: "box" });
  });

  it("lowercases and trims ids", () => {
    const [out] = normalizeCustomCategories([{ id: " Spell ", label: "Spell" }]);
    expect(out.id).toBe("spell");
  });

  it("drops ids colliding with built-ins, and duplicate ids (first wins)", () => {
    const dupe = { ...creature, label: "Beastie", plural: "Beasties" };
    expect(
      normalizeCustomCategories([{ id: "character", label: "Persona" }, creature, dupe])
    ).toEqual([creature]);
  });

  it("drops labels colliding with built-ins or earlier customs (template filenames)", () => {
    expect(normalizeCustomCategories([{ id: "persona", label: "character" }])).toEqual([]);
    const relabel = { id: "beast", label: "CREATURE" };
    expect(normalizeCustomCategories([creature, relabel])).toEqual([creature]);
  });
});

describe("allCategories / categoryLabel / isBuiltinCategory", () => {
  it("lists built-ins first, then customs in stored order", () => {
    const spell: CategoryDef = { id: "spell", label: "Spell", plural: "Spells", icon: "wand" };
    const merged = allCategories([creature, spell]);
    expect(merged.slice(0, CODEX_CATEGORIES.length)).toEqual(CODEX_CATEGORIES);
    expect(merged.slice(CODEX_CATEGORIES.length).map((c) => c.id)).toEqual(["creature", "spell"]);
  });

  it("labels built-ins, customs, and falls back to the raw id for unknowns", () => {
    expect(categoryLabel("character")).toBe("Character");
    expect(categoryLabel("creature", [creature])).toBe("Creature");
    expect(categoryLabel("dragon", [creature])).toBe("dragon");
  });

  it("recognizes only the seven built-ins", () => {
    expect(isBuiltinCategory("character")).toBe(true);
    expect(isBuiltinCategory("creature")).toBe(false);
    expect(isBuiltinCategory(undefined)).toBe(false);
  });
});
