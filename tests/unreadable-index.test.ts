/**
 * Index notes Inkswell can't read (#69): the pure diagnosis behind Home's
 * "Inkswell can't read this book" notice. Parses with the same `yaml` package
 * Obsidian uses, so the line numbers are the real parser's.
 */
import { describe, expect, it } from "vitest";
import * as YAML from "yaml";
import {
  declaresLongform,
  diagnoseUnparsedIndex,
  frontmatterBlock,
  looksLikeBookBlock,
  yamlErrorLine,
} from "../src/projects/unreadable-index";

const parse = (y: string): unknown => YAML.parse(y);

// Line 10 of the note ("   - Scene C") is one space out of line, as a bad merge leaves it.
const MISALIGNED = [
  "---",
  "longform:",
  "  format: scenes",
  "  title: Sync Sim",
  "  workflow: Default Workflow",
  "  sceneFolder: Draft 1",
  "  scenes:",
  "    - Scene A",
  "    - Scene B",
  "   - Scene C",
  "  ignoredFiles: []",
  "---",
  "",
].join("\n");

// The scene list twice (line 10 repeats line 7's key).
const DUPLICATED = [
  "---",
  "longform:",
  "  format: scenes",
  "  title: Sync Sim",
  "  sceneFolder: Draft 1",
  "  scenes:",
  "    - Scene A",
  "    - Scene B2",
  "  scenes:",
  "    - Scene A",
  "    - Scene B",
  "---",
  "",
].join("\n");

describe("frontmatterBlock", () => {
  it("returns the YAML between the fences, LF or CRLF", () => {
    expect(frontmatterBlock("---\na: 1\n---\nbody")).toBe("a: 1");
    expect(frontmatterBlock("---\r\na: 1\r\n---\r\nbody")).toBe("a: 1");
  });

  it("is null without a leading frontmatter block", () => {
    expect(frontmatterBlock("just prose\n---\na: 1\n---")).toBeNull();
    expect(frontmatterBlock("")).toBeNull();
  });
});

describe("declaresLongform", () => {
  it("finds a top-level longform key, even in YAML that won't parse", () => {
    expect(declaresLongform("title: x\nlongform:\n  format: scenes")).toBe(true);
    expect(declaresLongform("longform :\n  - broken")).toBe(true);
  });

  it("ignores nested keys and look-alikes", () => {
    expect(declaresLongform("meta:\n  longform: true")).toBe(false);
    expect(declaresLongform("longformish: 1")).toBe(false);
  });
});

describe("yamlErrorLine", () => {
  it("turns the parser's line (counted inside the fences) into the note's line", () => {
    expect(yamlErrorLine(new Error("Bad thing at line 9, column 1:\n\n   - Scene C\n^"))).toBe(10);
  });

  it("is undefined when the error names no line", () => {
    expect(yamlErrorLine(new Error("Something went wrong"))).toBeUndefined();
    expect(yamlErrorLine(undefined)).toBeUndefined();
    expect(yamlErrorLine({ message: "at line 3" })).toBeUndefined();
  });
});

describe("diagnoseUnparsedIndex", () => {
  it("reports a misaligned scene list at the line the writer sees", () => {
    expect(diagnoseUnparsedIndex("Book/Book.md", MISALIGNED, parse)).toEqual({
      path: "Book/Book.md",
      reason: "yaml",
      line: 10,
    });
  });

  it("reports a duplicated key (a merge artifact) at the repeated key", () => {
    expect(diagnoseUnparsedIndex("Book/Book.md", DUPLICATED, parse)).toEqual({
      path: "Book/Book.md",
      reason: "yaml",
      line: 9,
    });
  });

  it("leaves the line out when the parser gives none", () => {
    const throws = (): unknown => {
      throw new Error("no position");
    };
    expect(diagnoseUnparsedIndex("B.md", "---\nlongform:\n  x\n---\n", throws)).toEqual({
      path: "B.md",
      reason: "yaml",
    });
  });

  it("ignores notes that aren't a book's index", () => {
    const brokenNote = "---\ntags:\n  - a\n - b\n---\nbody";
    expect(diagnoseUnparsedIndex("Note.md", brokenNote, parse)).toBeNull();
    expect(diagnoseUnparsedIndex("Note.md", "no frontmatter at all", parse)).toBeNull();
  });

  it("is null when the block parses (the metadata cache just hasn't caught up)", () => {
    const fine = "---\nlongform:\n  format: scenes\n  scenes: []\n---\n";
    expect(diagnoseUnparsedIndex("Book.md", fine, parse)).toBeNull();
  });
});

describe("looksLikeBookBlock", () => {
  it("is true for an object or an empty `longform:`", () => {
    expect(looksLikeBookBlock({ title: "x" })).toBe(true);
    expect(looksLikeBookBlock(null)).toBe(true);
  });

  it("is false for another tool's scalar or list property", () => {
    expect(looksLikeBookBlock(true)).toBe(false);
    expect(looksLikeBookBlock("yes")).toBe(false);
    expect(looksLikeBookBlock(["a"])).toBe(false);
  });
});
