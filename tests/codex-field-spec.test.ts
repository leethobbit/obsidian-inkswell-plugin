/**
 * The Customize fields editor writes `codex-fields` back to the template note;
 * these tests pin the serializer ↔ parser round trip (the riskiest piece of the
 * feature), the additive `{ type, label }` value form, and the editor's row model.
 */
import { describe, expect, it } from "vitest";
import {
  FieldSpec,
  fieldToSpec,
  fieldTypeHint,
  parseFieldSpec,
  profileFields,
  serializeFieldSpec,
} from "../src/codex/profile-schema";
import {
  FIELD_KINDS,
  FIELD_KIND_LABELS,
  isValidNewKey,
  keyFromLabel,
  rowTypeHint,
  rowsFromFields,
  rowsToSpec,
} from "../src/customize/field-spec";

const CATEGORIES = ["character", "location", "world", "faction", "item", "event", "concept", "creature"];

describe("serializeFieldSpec ↔ parseFieldSpec", () => {
  it("round-trips every shipped field set (labels, pickers, :labeled, link:<cat>, image)", () => {
    for (const cat of CATEGORIES) {
      const shipped = profileFields(cat);
      const spec = shipped.slice(1).map((f) => fieldToSpec(f, cat)); // aliases is implicit
      const written = serializeFieldSpec(spec);
      const parsed = parseFieldSpec(written);
      expect(parsed).not.toBeNull();
      expect(profileFields(cat, parsed)).toEqual(shipped);
    }
  });

  it("writes the compact map form: bare hints for shipped labels, objects only for custom labels", () => {
    const written = serializeFieldSpec([
      { key: "role", type: "text" },
      { key: "species", type: "text", label: "Species name" },
      { key: "notes" },
    ]) as Record<string, unknown>;
    expect(written).toEqual({
      role: "text",
      species: { type: "text", label: "Species name" },
      notes: null,
    });
    expect(parseFieldSpec(written)).toEqual([
      { key: "role", type: "text" },
      { key: "species", type: "text", label: "Species name" },
      { key: "notes" },
    ]);
  });

  it("a { type, label } value sets the panel label", () => {
    const spec = parseFieldSpec({ species: { type: "text", label: "Species name" }, home: { type: "link:location" } });
    const fields = profileFields("character", spec);
    expect(fields.map((f) => f.label)).toEqual(["Aliases", "Species name", "Home"]);
    expect(fields[2]).toMatchObject({ type: "links", single: true, linkCategory: "location" });
  });

  it("falls back to the order-safe list form when a key is all digits", () => {
    const written = serializeFieldSpec([{ key: "1999", type: "text" }, { key: "era", type: "text" }]);
    expect(Array.isArray(written)).toBe(true);
    expect(parseFieldSpec(written)?.map((s) => s.key)).toEqual(["1999", "era"]);
  });

  it("drops reserved, blank, and duplicate keys like the parser does", () => {
    const written = serializeFieldSpec([
      { key: "codex" },
      { key: "aliases" },
      { key: "  " },
      { key: "role", type: "text" },
      { key: "role", type: "textarea" },
    ]) as Record<string, unknown>;
    expect(Object.keys(written)).toEqual(["role"]);
  });

  it("a number field round-trips through the spec and normalizes hand-written synonyms", () => {
    const written = serializeFieldSpec([{ key: "age", type: "number" }, { key: "role", type: "text" }]);
    const fields = profileFields("character", parseFieldSpec(written));
    expect(fields.find((f) => f.key === "age")).toMatchObject({ type: "number", label: "Age" });
    const viaInt = profileFields("character", parseFieldSpec({ age: "int" }));
    expect(fieldToSpec(viaInt.find((f) => f.key === "age")!, "character")).toEqual({ key: "age", type: "number" });
  });

  it("fieldTypeHint is the inverse of the hint grammar", () => {
    expect(fieldTypeHint({ key: "k", label: "L", type: "number" })).toBe("number");
    expect(fieldTypeHint({ key: "k", label: "L", type: "textarea" })).toBe("textarea");
    expect(fieldTypeHint({ key: "k", label: "L", type: "links" })).toBe("links");
    expect(fieldTypeHint({ key: "k", label: "L", type: "links", linkCategory: "faction" })).toBe("links:faction");
    expect(
      fieldTypeHint({ key: "k", label: "L", type: "links", linkCategory: "character", labeled: true })
    ).toBe("links:character:labeled");
    expect(fieldTypeHint({ key: "k", label: "L", type: "links", linkCategory: "world", single: true })).toBe(
      "link:world"
    );
  });
});

describe("fields editor row model", () => {
  it("rowsFromFields drops Aliases and maps single links to the 'link' kind", () => {
    const rows = rowsFromFields(profileFields("location"));
    expect(rows[0].key).toBe("image");
    expect(rows.find((r) => r.key === "parent")).toMatchObject({ kind: "link", linkCategory: "world" });
    expect(rows.some((r) => r.key === "aliases")).toBe(false);
  });

  it("rowsToSpec writes a label only when it differs from the default, and round-trips", () => {
    const rows = rowsFromFields(profileFields("character"));
    const spec: FieldSpec[] = rowsToSpec(rows, "character");
    expect(spec.every((s) => s.label === undefined)).toBe(true);
    expect(profileFields("character", parseFieldSpec(serializeFieldSpec(spec)))).toEqual(
      profileFields("character")
    );
    const renamed = rows.map((r) => (r.key === "flaw" ? { ...r, label: "Fatal flaw" } : r));
    expect(rowsToSpec(renamed, "character").find((s) => s.key === "flaw")).toEqual({
      key: "flaw",
      type: "text",
      label: "Fatal flaw",
    });
  });

  it("FIELD_KINDS (dropdown order) covers exactly the labelled kinds", () => {
    expect([...FIELD_KINDS].sort()).toEqual(Object.keys(FIELD_KIND_LABELS).sort());
    expect(FIELD_KIND_LABELS.number).toBe("Number");
  });

  it("rowsFromFields maps a number field to the number kind", () => {
    const rows = rowsFromFields(profileFields("character", [{ key: "age", type: "number" }]));
    expect(rows).toEqual([{ id: "age", key: "age", label: "Age", kind: "number" }]);
  });

  it("rowTypeHint mirrors fieldTypeHint for every kind", () => {
    expect(rowTypeHint({ id: "a", key: "a", label: "A", kind: "number" })).toBe("number");
    expect(rowTypeHint({ id: "a", key: "a", label: "A", kind: "text" })).toBe("text");
    expect(rowTypeHint({ id: "a", key: "a", label: "A", kind: "links", linkCategory: "character", labeled: true })).toBe(
      "links:character:labeled"
    );
    expect(rowTypeHint({ id: "a", key: "a", label: "A", kind: "link", linkCategory: "world" })).toBe("link:world");
    expect(rowTypeHint({ id: "a", key: "a", label: "A", kind: "link" })).toBe("link");
  });

  it("keyFromLabel derives camelCase keys and rejects unusable labels", () => {
    expect(keyFromLabel("Birth date")).toBe("birthDate");
    expect(keyFromLabel("POV in scene")).toBe("povInScene");
    expect(keyFromLabel("  home-base_of operations ")).toBe("homeBaseOfOperations");
    expect(keyFromLabel("42")).toBe("");
    expect(keyFromLabel("!!!")).toBe("");
  });

  it("isValidNewKey blocks reserved, duplicate, and malformed keys", () => {
    expect(isValidNewKey("codex", [])).toMatchObject({ ok: false });
    expect(isValidNewKey("role", ["role"])).toMatchObject({ ok: false });
    expect(isValidNewKey("bad key", [])).toMatchObject({ ok: false });
    expect(isValidNewKey("", [])).toMatchObject({ ok: false });
    expect(isValidNewKey("birthDate", ["role"])).toEqual({ ok: true });
  });

  it("a digit-leading label gets a reason that names the rule, a blank one asks for a label", () => {
    expect(isValidNewKey(keyFromLabel("5 stars"), [], "5 stars")).toEqual({
      ok: false,
      reason: "Start the label with a letter.",
    });
    expect(isValidNewKey(keyFromLabel("2024"), [], "2024")).toMatchObject({ reason: "Start the label with a letter." });
    expect(isValidNewKey("", [], "   ")).toMatchObject({ reason: "Enter a label." });
    expect(isValidNewKey("", [])).toMatchObject({ reason: "Enter a label." });
    expect(isValidNewKey(keyFromLabel("Level 5"), [], "Level 5")).toEqual({ ok: true });
  });
});
