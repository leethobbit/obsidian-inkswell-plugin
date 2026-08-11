/**
 * splitFrontmatter is THE definition of "peel the frontmatter off a note" for
 * the Write editor, word counts, compile, todos, and search — so its rule must
 * match Obsidian's: a leading fenced block is frontmatter ONLY when it parses
 * as a YAML mapping. The H2 bug: a novelist's body-leading `---` scene divider
 * matched the old regex, making the opening passage invisible in the editor
 * and silently dropping it from compiled output.
 */
import { describe, expect, it } from "vitest";
import { splitFrontmatter, stripFrontmatter } from "../src/lib/frontmatter";
import { countWords } from "../src/lib/wordcount";

describe("splitFrontmatter", () => {
  it("splits a real YAML mapping and reattaches byte-identically", () => {
    const text = "---\nstatus: draft\npov: Mara\n---\nThe lamplighter came at dusk.\n";
    const { frontmatter, body } = splitFrontmatter(text);
    expect(frontmatter).toBe("---\nstatus: draft\npov: Mara\n---\n");
    expect(body).toBe("The lamplighter came at dusk.\n");
    expect(frontmatter + body).toBe(text);
  });

  it("a body-leading `---` scene divider is PROSE, not frontmatter (the H2 bug)", () => {
    const text = "---\n\nShe closed the door for the last time.\n\n---\n\nThe next morning…\n";
    const { frontmatter, body } = splitFrontmatter(text);
    expect(frontmatter).toBe("");
    expect(body).toBe(text); // the opening passage stays visible and compilable
  });

  it("invalid YAML between fences falls through to all-body (matches Obsidian)", () => {
    const text = "---\nstatus draft: [unclosed\n---\nBody.\n";
    expect(splitFrontmatter(text)).toEqual({ frontmatter: "", body: text });
  });

  it("a YAML scalar or array between fences is not frontmatter", () => {
    expect(splitFrontmatter("---\njust a sentence\n---\nBody.\n").frontmatter).toBe("");
    expect(splitFrontmatter("---\n- a\n- b\n---\nBody.\n").frontmatter).toBe("");
  });

  it("handles CRLF fences", () => {
    const text = "---\r\nstatus: draft\r\n---\r\nCRLF body.\r\n";
    const { frontmatter, body } = splitFrontmatter(text);
    expect(frontmatter).toBe("---\r\nstatus: draft\r\n---\r\n");
    expect(body).toBe("CRLF body.\r\n");
  });

  it("no frontmatter / empty file → all body", () => {
    expect(splitFrontmatter("Plain prose.")).toEqual({ frontmatter: "", body: "Plain prose." });
    expect(splitFrontmatter("")).toEqual({ frontmatter: "", body: "" });
  });

  it("frontmatter closed at EOF (no trailing newline after the fence)", () => {
    const text = "---\nstatus: draft\n---";
    const { frontmatter, body } = splitFrontmatter(text);
    expect(frontmatter).toBe("---\nstatus: draft\n---");
    expect(body).toBe("");
  });

  it("divider-led prose COUNTS as words now (goals/compile consistency)", () => {
    const divided = "---\n\nFive words of opening prose.\n\n---\n\nMore.\n";
    expect(stripFrontmatter(divided)).toBe(divided);
    expect(countWords(divided)).toBe(6);
    // …while a real frontmatter block still doesn't count.
    expect(countWords("---\nstatus: draft\n---\nOnly these three.\n")).toBe(3);
  });
});
