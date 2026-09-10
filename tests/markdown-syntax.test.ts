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
    expect(buildSyntaxIntents("a_b_c", []).filter((i) => i.type !== "line")).toEqual([]);
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

describe("buildSyntaxIntents — placeholder tokens", () => {
  it("styles a [TODO] token as a whole-token mark, never hidden", () => {
    const out = buildSyntaxIntents("a [TODO] b", []);
    expect(out).toContainEqual({ from: 2, to: 8, type: "style", cls: "cm-ph-todo" });
    expect(hides(out)).toHaveLength(0);
  });

  it("classifies the colon forms by class", () => {
    expect(styles(buildSyntaxIntents("[DIALOGUE: hi]", []), "cm-ph-dialogue")).toHaveLength(1);
    expect(styles(buildSyntaxIntents("[SCENE: x]", []), "cm-ph-scene")).toHaveLength(1);
    expect(styles(buildSyntaxIntents("[NOTE: x]", []), "cm-ph-note")).toHaveLength(1);
    expect(styles(buildSyntaxIntents("[RESEARCH: x]", []), "cm-ph-research")).toHaveLength(1);
  });

  it("does not style emphasis inside a placeholder", () => {
    const out = buildSyntaxIntents("**b** [DIALOGUE: he *runs*]", []);
    // The bold outside the token still styles…
    expect(styles(out, "cm-md-strong")).toHaveLength(1);
    // …but the emphasis inside the token is suppressed, and no markers hidden in it.
    expect(styles(out, "cm-md-em")).toHaveLength(0);
    expect(out).toContainEqual({ from: 6, to: 27, type: "style", cls: "cm-ph-dialogue" });
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

describe("buildSyntaxIntents — wikilinks", () => {
  it("styles the link content and hides the brackets when the cursor is away", () => {
    const out = buildSyntaxIntents("see [[Anna]] now", []);
    expect(out).toContainEqual({
      from: 6,
      to: 10,
      type: "style",
      cls: "cm-md-link",
      attrs: { "data-link": "Anna" },
    });
    expect(out).toContainEqual({ from: 4, to: 6, type: "hide" });
    expect(out).toContainEqual({ from: 10, to: 12, type: "hide" });
  });

  it("hides `Target|` as well for an aliased link and carries the full linktext", () => {
    const out = buildSyntaxIntents("[[Anna#Bio|sis]]", []);
    expect(out).toContainEqual({ from: 0, to: 11, type: "hide" });
    expect(styles(out, "cm-md-link")[0]).toMatchObject({
      from: 11,
      to: 14,
      attrs: { "data-link": "Anna#Bio" },
    });
    expect(out).toContainEqual({ from: 14, to: 16, type: "hide" });
  });

  it("reveals the brackets (dimmed) when the cursor touches the link", () => {
    const out = buildSyntaxIntents("[[Anna]]", [{ from: 3, to: 3 }]);
    expect(hides(out)).toHaveLength(0);
    expect(styles(out, "cm-md-mark").map((i) => [i.from, i.to])).toEqual([
      [0, 2],
      [6, 8],
    ]);
  });

  it("keeps underscores inside a link out of emphasis", () => {
    const out = buildSyntaxIntents("[[snake_case_note]] and _real_", []);
    expect(styles(out, "cm-md-em")).toHaveLength(1);
    expect(styles(out, "cm-md-link")).toHaveLength(1);
  });

  it("does not link inside inline code", () => {
    expect(styles(buildSyntaxIntents("`[[not a link]]`", []), "cm-md-link")).toHaveLength(0);
  });

  it("ignores embeds", () => {
    expect(styles(buildSyntaxIntents("![[map.png]]", []), "cm-md-link")).toHaveLength(0);
  });
});

describe("buildSyntaxIntents — line classes (manuscript typography)", () => {
  const lines = (out: SyntaxIntent[], cls: string) =>
    out.filter((i) => i.type === "line" && i.cls === cls).map((i) => i.from);

  it("emits cm-md-line-heading for heading lines only", () => {
    const out = buildSyntaxIntents("# Title\n\nProse here.", []);
    expect(lines(out, "cm-md-line-heading")).toEqual([0]);
  });

  it("marks the first prose line at document start", () => {
    expect(lines(buildSyntaxIntents("Prose.\n\nMore.", []), "cm-md-line-first")).toEqual([0]);
  });

  it("marks the first prose line after a heading, skipping blank lines", () => {
    // "# H\n\nFirst.\n\nSecond." — First. starts at 5, Second. at 12.
    const out = buildSyntaxIntents("# H\n\nFirst.\n\nSecond.", []);
    expect(lines(out, "cm-md-line-first")).toEqual([5]);
  });

  it("marks the first prose line after a thematic break", () => {
    // "A.\n\n---\n\nB." — B. starts at 9.
    const out = buildSyntaxIntents("A.\n\n---\n\nB.", []);
    expect(lines(out, "cm-md-line-hr")).toEqual([4]);
    expect(lines(out, "cm-md-line-first")).toEqual([0, 9]);
  });

  it("quote lines get cm-md-line-quote and are never first", () => {
    const out = buildSyntaxIntents("> Epigraph\n\nProse.", []);
    expect(lines(out, "cm-md-line-quote")).toEqual([0]);
    expect(lines(out, "cm-md-line-first")).toEqual([]);
  });

  it("line intents are zero-width at the line start and never hides", () => {
    const out = buildSyntaxIntents("# H\n\n*x*", []);
    for (const i of out.filter((i) => i.type === "line")) expect(i.from).toBe(i.to);
    expect(hides(out).map((i) => i.from)).toEqual([0, 5, 7]);
  });
});
