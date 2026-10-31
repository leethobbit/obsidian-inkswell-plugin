/**
 * The stream draws scenes that aren't being edited as plain HTML built from
 * these lines. They must show what the editor shows with no caret in the
 * scene (markup hidden, styles applied), and every run must map back to its
 * exact place in the source — a click there puts the caret at that offset.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKERS } from "../src/lib/placeholders";
import { staticLines } from "../src/lib/static-lines";

const visible = (text: string): string[] =>
  staticLines(text, DEFAULT_MARKERS).map((l) => l.runs.map((r) => r.text).join(""));

const runWith = (text: string, word: string) =>
  staticLines(text, DEFAULT_MARKERS)
    .flatMap((l) => l.runs)
    .find((r) => r.text === word);

describe("staticLines", () => {
  it("hides emphasis markup and styles the words", () => {
    const text = "Some **bold** and *soft* words.";
    expect(visible(text)).toEqual(["Some bold and soft words."]);
    expect(runWith(text, "bold")?.cls).toContain("cm-md-strong");
    expect(runWith(text, "soft")?.cls).toContain("cm-md-em");
    expect(runWith(text, "Some ")?.cls).toEqual([]);
  });

  it("hides a heading's #, styles the line and the title", () => {
    const [line] = staticLines("## The Harbour", DEFAULT_MARKERS);
    expect(line.runs.map((r) => r.text).join("")).toBe("The Harbour");
    expect(line.cls.some((c) => c.includes("heading"))).toBe(true);
    expect(line.runs.flatMap((r) => r.cls)).toContain("cm-md-h2");
  });

  it("keeps a to-do marker visible and classed like the editor's", () => {
    const text = "She waited. [TODO: check the tide]";
    expect(visible(text)).toEqual([text]);
    expect(runWith(text, "[TODO: check the tide]")?.cls).toContain("cm-ph-todo");
  });

  it("maps every run back to its exact place in the source", () => {
    const text = "# Title\n\nOne *two* three.\n\n> A quote with **weight**.\n";
    const source = text.split("\n");
    for (const [i, line] of staticLines(text, DEFAULT_MARKERS).entries()) {
      expect(text.slice(line.from, line.to)).toBe(source[i]);
      for (const run of line.runs) {
        expect(text.slice(run.from, run.from + run.text.length)).toBe(run.text);
        expect(run.from).toBeGreaterThanOrEqual(line.from);
        expect(run.from + run.text.length).toBeLessThanOrEqual(line.to);
      }
    }
  });

  it("gives an empty line no runs, and counts lines like the editor (one per \\n)", () => {
    const lines = staticLines("a\n\nb\n", DEFAULT_MARKERS);
    expect(lines.map((l) => [l.from, l.to])).toEqual([
      [0, 1],
      [2, 2],
      [3, 4],
      [5, 5],
    ]);
    expect(lines[1].runs).toEqual([]);
    expect(lines[3].runs).toEqual([]);
  });

  it("carries a link's attributes onto its run", () => {
    const text = "Ask [[Old Bess]] first.";
    const link = staticLines(text, DEFAULT_MARKERS)[0].runs.find((r) => r.cls.includes("cm-md-link"));
    expect(link).toBeDefined();
    expect(Object.keys(link?.attrs ?? {}).length).toBeGreaterThan(0);
  });
});
