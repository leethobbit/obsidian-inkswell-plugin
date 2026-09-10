import { describe, expect, it } from "vitest";
import { stripFrontmatter } from "../src/lib/frontmatter";
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

  it("reports from/to offsets that slice back to the variant", () => {
    const text = "line one\nthe regime fell";
    const [h] = scanDeviations(text, [entry({})]);
    expect(text.slice(h.from, h.to)).toBe("regime");
    expect(h.from).toBe(text.indexOf("regime"));
  });

  it("offsets and line are body-relative when the caller strips frontmatter", () => {
    const raw = "---\nstatus: draft\nsynopsis: the regime\n---\nline one\nthe regime";
    const body = stripFrontmatter(raw);
    const hits = scanDeviations(body, [entry({})]);
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(2);
    expect(hits[0].from).toBe(body.indexOf("regime"));
    expect(body.slice(hits[0].from, hits[0].to)).toBe("regime");
  });

  it("multiple hits on one line get distinct offsets", () => {
    const text = "regime after regime";
    const hits = scanDeviations(text, [entry({})]);
    expect(hits.map((h) => h.from)).toEqual([0, 13]);
    expect(hits.every((h) => h.line === 1)).toBe(true);
  });

  it("ignores a variant equal to the canonical and blank variants", () => {
    const hits = scanDeviations("color color", [
      entry({ canonical: "color", variants: ["color", "  "] }),
    ]);
    expect(hits).toEqual([]);
  });
});
