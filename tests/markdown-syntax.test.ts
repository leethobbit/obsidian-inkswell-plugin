import { describe, expect, it } from "vitest";
import { SyntaxIntent, buildSyntaxIntents } from "../src/lib/markdown-syntax";

/** Style intents matching a class (e.g. all italic spans). */
const styles = (out: SyntaxIntent[], cls: string) =>
  out.filter((i) => i.type === "style" && i.cls === cls);
const hides = (out: SyntaxIntent[]) => out.filter((i) => i.type === "hide");

describe("buildSyntaxIntents — emphasis", () => {
  it("styles italic content and hides the markers when the cursor is away", () => {
    const out = buildSyntaxIntents("*hi*", []);
    expect(out).toContainEqual({ from: 1, to: 3, type: "style", cls: "cm-md-em" });
    expect(out).toContainEqual({ from: 0, to: 1, type: "hide" });
    expect(out).toContainEqual({ from: 3, to: 4, type: "hide" });
  });

  it("reveals the markers (dimmed) when the cursor is inside the span", () => {
    const out = buildSyntaxIntents("*hi*", [{ from: 2, to: 2 }]);
    expect(out).toContainEqual({ from: 0, to: 1, type: "style", cls: "cm-md-mark" });
    expect(out).toContainEqual({ from: 3, to: 4, type: "style", cls: "cm-md-mark" });
    expect(hides(out)).toHaveLength(0);
  });

  it("reveals at the inclusive boundaries (cursor just before / just after)", () => {
    for (const at of [0, 4]) {
      const out = buildSyntaxIntents("*hi*", [{ from: at, to: at }]);
      expect(hides(out)).toHaveLength(0);
    }
  });

  it("classifies bold, bold-italic and strikethrough", () => {
    expect(buildSyntaxIntents("**x**", [])).toContainEqual({
      from: 2,
      to: 3,
      type: "style",
      cls: "cm-md-strong",
    });
    expect(buildSyntaxIntents("***x***", [])).toContainEqual({
      from: 3,
      to: 4,
      type: "style",
      cls: "cm-md-strong cm-md-em",
    });
    expect(buildSyntaxIntents("~~x~~", [])).toContainEqual({
      from: 2,
      to: 3,
      type: "style",
      cls: "cm-md-strike",
    });
  });

  it("italicises underscores on word boundaries but not mid-word", () => {
    expect(styles(buildSyntaxIntents("_a_", []), "cm-md-em")).toHaveLength(1);
    // `a_b_c` — underscores sit between word chars, so no emphasis at all.
    expect(buildSyntaxIntents("a_b_c", [])).toEqual([]);
  });
});

describe("buildSyntaxIntents — inline code", () => {
  it("styles code content and hides the backticks when away", () => {
    const out = buildSyntaxIntents("`x`", []);
    expect(out).toContainEqual({ from: 1, to: 2, type: "style", cls: "cm-md-code" });
    expect(out).toContainEqual({ from: 0, to: 1, type: "hide" });
    expect(out).toContainEqual({ from: 2, to: 3, type: "hide" });
  });

  it("does not style emphasis inside a code span", () => {
    const out = buildSyntaxIntents("`*x*`", []);
    expect(styles(out, "cm-md-em")).toHaveLength(0);
    expect(out).toContainEqual({ from: 1, to: 4, type: "style", cls: "cm-md-code" });
  });
});

describe("buildSyntaxIntents — block constructs", () => {
  it("hides the heading marker when the cursor is off the line", () => {
    const out = buildSyntaxIntents("# Title", []);
    expect(out).toContainEqual({ from: 2, to: 7, type: "style", cls: "cm-md-heading cm-md-h1" });
    expect(out).toContainEqual({ from: 0, to: 2, type: "hide" }); // "# " collapsed
  });

  it("reveals only the #'s when the cursor is on the heading line", () => {
    const out = buildSyntaxIntents("# Title", [{ from: 4, to: 4 }]);
    expect(out).toContainEqual({ from: 0, to: 1, type: "style", cls: "cm-md-mark" });
    expect(hides(out)).toHaveLength(0);
  });

  it("handles blockquotes", () => {
    const out = buildSyntaxIntents("> q", []);
    expect(out).toContainEqual({ from: 2, to: 3, type: "style", cls: "cm-md-quote" });
    expect(out).toContainEqual({ from: 0, to: 2, type: "hide" }); // "> " collapsed
  });
});

describe("buildSyntaxIntents — multi-line & per-span granularity", () => {
  it("uses absolute offsets across lines", () => {
    // "# H\n*i*" — line 2 starts at offset 4.
    const out = buildSyntaxIntents("# H\n*i*", []);
    expect(out).toContainEqual({ from: 5, to: 6, type: "style", cls: "cm-md-em" });
    expect(out).toContainEqual({ from: 4, to: 5, type: "hide" });
    expect(out).toContainEqual({ from: 6, to: 7, type: "hide" });
  });

  it("reveals only the span the cursor touches, not the whole line", () => {
    // "*a* *b*" — cursor in the first span.
    const out = buildSyntaxIntents("*a* *b*", [{ from: 1, to: 1 }]);
    expect(out).toContainEqual({ from: 0, to: 1, type: "style", cls: "cm-md-mark" });
    expect(out).toContainEqual({ from: 4, to: 5, type: "hide" }); // second span stays hidden
    expect(out).toContainEqual({ from: 6, to: 7, type: "hide" });
  });

  it("returns intents sorted by start offset", () => {
    const out = buildSyntaxIntents("*a* **b**", []);
    const froms = out.map((i) => i.from);
    expect(froms).toEqual([...froms].sort((a, b) => a - b));
  });
});
