import { describe, expect, it } from "vitest";
import { StyleEntry, scanDeviations } from "../src/revisions/stylesheet";

const entry = (over: Partial<StyleEntry>): StyleEntry => ({
  id: "1",
  canonical: "Regime",
  variants: ["regime"],
  kind: "name",
  ...over,
});

describe("scanDeviations", () => {
  it("flags a variant occurrence with line + excerpt", () => {
    const hits = scanDeviations("The regime fell.", [entry({})]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ canonical: "Regime", variant: "regime", line: 1 });
    expect(hits[0].excerpt).toBe("The regime fell.");
  });

  it("does not flag the canonical form", () => {
    expect(scanDeviations("The Regime fell.", [entry({})])).toEqual([]);
  });

  it("respects word boundaries (no substring matches)", () => {
    expect(scanDeviations("regimental records", [entry({})])).toEqual([]);
  });

  it("reports correct line numbers across newlines", () => {
    const hits = scanDeviations("line one\nthe regime\nline three", [entry({})]);
    expect(hits[0].line).toBe(2);
  });

  it("finds multiple variants from one entry", () => {
    const hits = scanDeviations("colour and color", [
      entry({ canonical: "color", variants: ["colour", "colur"] }),
    ]);
    expect(hits.map((h) => h.variant)).toEqual(["colour"]);
  });

  it("ignores a variant equal to the canonical and blank variants", () => {
    const hits = scanDeviations("color color", [
      entry({ canonical: "color", variants: ["color", "  "] }),
    ]);
    expect(hits).toEqual([]);
  });
});
