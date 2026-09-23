import { describe, expect, it } from "vitest";
import { assembleManuscript } from "../src/compile/assemble";
import { convertHtmlAlignment, htmlAlignApplies } from "../src/compile/html-align";
import { CompileConfig, CompileScene } from "../src/compile/types";

// The exact block from issue #40: reader-facing POV / date / location lines.
const DATELINE = '<p align="right"> POV | DATE\n<br>\nLocation</p>\n\nFirst prose paragraph.';
const CONVERTED =
  '::: {custom-style="Right Aligned"}\nPOV | DATE\n\nLocation\n:::\n\nFirst prose paragraph.\n';

function config(overrides: Partial<CompileConfig> = {}): CompileConfig {
  return {
    sceneSteps: [{ id: "html-align", options: {} }],
    manuscriptSteps: [{ id: "trim-blank-lines", options: {} }],
    separator: "\n\n",
    targetBasename: "manuscript",
    format: "md",
    ...overrides,
  };
}
const scene = (contents: string): CompileScene[] => [{ title: "S", indent: 0, contents }];
const pandoc = (to: string): Partial<CompileConfig> => ({
  format: "pandoc",
  pandoc: { to, extension: to, extraArgs: [] },
});

describe("htmlAlignApplies", () => {
  it("applies to pandoc targets whose writer drops raw HTML, not to md/html/epub", () => {
    expect(htmlAlignApplies({ format: "pandoc", target: "docx" })).toBe(true);
    expect(htmlAlignApplies({ format: "pandoc", target: "pdf" })).toBe(true);
    expect(htmlAlignApplies({ format: "pandoc", target: "epub" })).toBe(false);
    expect(htmlAlignApplies({ format: "md" })).toBe(false);
    expect(htmlAlignApplies({ format: "html" })).toBe(false);
  });
});

describe("html-align step through the pipeline", () => {
  it("rewrites the dateline as a styled div with one paragraph per <br> segment (docx)", () => {
    expect(assembleManuscript(scene(DATELINE), config(pandoc("docx")))).toBe(CONVERTED);
  });

  it("is a no-op for Markdown, HTML and EPUB output (raw HTML renders there)", () => {
    const expected = `${DATELINE}\n`;
    expect(assembleManuscript(scene(DATELINE), config())).toBe(expected);
    expect(assembleManuscript(scene(DATELINE), config({ format: "html" }))).toBe(expected);
    expect(assembleManuscript(scene(DATELINE), config(pandoc("epub")))).toBe(expected);
  });

  it("runs after flatten-links and before prepend-title in registry order", () => {
    const out = assembleManuscript(
      scene('<p align="right">See [[Anna|her]]</p>'),
      config({
        ...pandoc("docx"),
        sceneSteps: [
          { id: "flatten-links", options: {} },
          { id: "html-align", options: {} },
          { id: "prepend-title", options: { level: 1 } },
        ],
      })
    );
    expect(out).toBe('# S\n\n::: {custom-style="Right Aligned"}\nSee her\n:::\n');
  });
});

describe("convertHtmlAlignment", () => {
  it("maps each alignment to its Word style name", () => {
    expect(convertHtmlAlignment('<div align="center">x</div>')).toContain('custom-style="Centered"');
    expect(convertHtmlAlignment("<center>x</center>")).toContain('custom-style="Centered"');
    expect(convertHtmlAlignment('<p style="text-align: left">x</p>')).toContain('custom-style="Left Aligned"');
    expect(convertHtmlAlignment("<p align=justify>x</p>")).toContain('custom-style="Justified"');
  });

  it("an unclosed block ends at the first blank line", () => {
    expect(convertHtmlAlignment('<p align="right">A\nB\n\nC')).toBe(
      '\n::: {custom-style="Right Aligned"}\nA B\n:::\n\n\nC'
    );
  });

  it("keeps inline markdown inside segments", () => {
    expect(convertHtmlAlignment('<p align="right">POV | *DATE*</p>')).toContain("POV | *DATE*");
  });

  it("leaves unaligned <p>/<div>, inline tags and prose untouched", () => {
    const text = "<p>plain</p>\nA <b>bold</b> line<br>\nProse < not a tag.";
    expect(convertHtmlAlignment(text)).toBe(text);
  });

  it("keeps text that follows the close tag on the same line", () => {
    expect(convertHtmlAlignment('<p align="right">A</p> after')).toBe(
      '\n::: {custom-style="Right Aligned"}\nA\n:::\n\nafter'
    );
  });

  it("drops a block with no visible text", () => {
    expect(convertHtmlAlignment('<p align="right"><br></p>\nB')).toBe("B");
  });
});
