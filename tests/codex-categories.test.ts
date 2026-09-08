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
  builtinCategories,
  categoryLabel,
  isBuiltinCategory,
  normalizeCategoryOverrides,
  normalizeCustomCategories,
  slugifyCategoryId,
  takenLabelsForBuiltin,
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

describe("built-in display overrides", () => {
  const renamed = {
    faction: { label: "Group", plural: "Groups" },
    concept: { label: "Magic", icon: "wand" },
  };

  it("builtinCategories applies label/plural/icon while keeping ids and order", () => {
    const cats = builtinCategories(renamed);
    expect(cats.map((c) => c.id)).toEqual(CODEX_CATEGORIES.map((c) => c.id));
    const faction = cats.find((c) => c.id === "faction");
    expect(faction).toEqual({ id: "faction", label: "Group", plural: "Groups", icon: "users" });
    const concept = cats.find((c) => c.id === "concept");
    expect(concept).toEqual({ id: "concept", label: "Magic", plural: "Concepts", icon: "wand" });
    // Untouched built-ins are the shipped objects.
    expect(cats[0]).toBe(CODEX_CATEGORIES[0]);
  });

  it("allCategories / categoryLabel honor overrides", () => {
    expect(allCategories([creature], renamed).map((c) => c.label)).toContain("Group");
    expect(categoryLabel("faction", [], renamed)).toBe("Group");
    expect(categoryLabel("faction")).toBe("Faction");
    expect(categoryLabel("creature", [creature], renamed)).toBe("Creature");
  });

  it("normalizeCategoryOverrides drops junk, unknown ids, blanks, and no-op values", () => {
    expect(normalizeCategoryOverrides(undefined)).toEqual({});
    expect(normalizeCategoryOverrides([])).toEqual({});
    expect(normalizeCategoryOverrides("x")).toEqual({});
    expect(
      normalizeCategoryOverrides({
        dragon: { label: "Wyrm" }, // not a built-in
        faction: { label: "  ", plural: 5, icon: "" }, // all unusable → omitted
        concept: { label: "Concept", plural: "Concepts", icon: "sparkles" }, // equals shipped → omitted
        item: { label: " Artifact ", extra: true },
      })
    ).toEqual({ item: { label: "Artifact" } });
  });

  it("rejects an override label equal to another built-in's shipped name", () => {
    expect(normalizeCategoryOverrides({ faction: { label: "character" } })).toEqual({});
    // Plural/icon on the same entry still survive.
    expect(normalizeCategoryOverrides({ faction: { label: "Character", icon: "crown" } })).toEqual({
      faction: { icon: "crown" },
    });
  });

  it("rejects two overrides taking the same label (first in built-in order wins)", () => {
    expect(normalizeCategoryOverrides({ faction: { label: "Group" }, concept: { label: "group" } })).toEqual({
      faction: { label: "Group" },
    });
  });

  it("normalizeCustomCategories checks labels against the EFFECTIVE built-ins", () => {
    const builtins = builtinCategories({ faction: { label: "Group" } });
    // "Group" is now taken by the renamed built-in…
    expect(normalizeCustomCategories([{ id: "gang", label: "Group" }], builtins)).toEqual([]);
    // …while the shipped "Faction" label is free for a custom type.
    expect(normalizeCustomCategories([{ id: "guild", label: "Faction" }], builtins)).toHaveLength(1);
    // Ids are still reserved regardless of label.
    expect(normalizeCustomCategories([{ id: "faction", label: "Other" }], builtins)).toEqual([]);
  });

  it("takenLabelsForBuiltin reserves shipped names, other current names, and customs", () => {
    const taken = takenLabelsForBuiltin("faction", [creature], { concept: { label: "Magic" } });
    expect(taken).toContain("character");
    expect(taken).toContain("concept"); // shipped name stays reserved even though renamed
    expect(taken).toContain("magic");
    expect(taken).toContain("creature");
    expect(taken).not.toContain("faction"); // its own name is fine
  });
});
