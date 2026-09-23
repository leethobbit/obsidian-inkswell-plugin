import { describe, expect, it } from "vitest";
import { preflight } from "../src/compile/preflight";

const ruleIds = (s: { text: string; title: string }[]) =>
  preflight(s).map((f) => f.rule);

describe("preflight", () => {
  it("returns nothing for clean prose", () => {
    expect(preflight([{ title: "A", text: "Clean prose, single spaced.\n" }])).toEqual([]);
  });

  it("ignores frontmatter and %% comments (stripped before linting)", () => {
    const s = [
      { title: "A", text: "---\nstatus: draft\n---\nClean prose. %% a note with  double space %%" },
    ];
    // The double space lives inside the stripped comment, so no finding.
    expect(preflight(s)).toEqual([]);
  });

  it("flags tabs, double spaces, raw HTML, page breaks", () => {
    const s = [
      { title: "A", text: "A line.\twith tab.\nToo  many spaces.\n<center>x</center>\n\\pagebreak" },
    ];
    const ids = ruleIds(s);
    expect(ids).toContain("tabs");
    expect(ids).toContain("double-space");
    expect(ids).toContain("html");
    expect(ids).toContain("page-break");
  });

  it("counts every allowlisted HTML tag, including <em>/<strong>", () => {
    expect(ruleIds([{ title: "A", text: "An <em>x</em> here." }])).toContain("html");
    // Not a tag the editor or the compile know — not counted either.
    expect(ruleIds([{ title: "A", text: "An <Insert name> here." }])).not.toContain("html");
  });

  it("flags empty scenes", () => {
    const found = preflight([
      { title: "Blank", text: "---\nstatus: idea\n---\n   " },
      { title: "Full", text: "Words." },
    ]);
    const empty = found.find((f) => f.rule === "empty")!;
    expect(empty.scenes).toEqual(["Blank"]);
  });

  it("flags mixed scene-break markers but not a single consistent one", () => {
    const consistent = preflight([
      { title: "A", text: "One.\n\n* * *\n\nTwo." },
      { title: "B", text: "Three.\n\n* * *\n\nFour." },
    ]);
    expect(consistent.map((f) => f.rule)).not.toContain("scene-break");

    const mixed = preflight([
      { title: "A", text: "One.\n\n* * *\n\nTwo." },
      { title: "B", text: "Three.\n\n---\n\nFour." },
    ]);
    const f = mixed.find((x) => x.rule === "scene-break")!;
    expect(f.detail).toContain("* * *");
    expect(f.detail).toContain("---");
  });

  it("flags unresolved drafting markers across kinds", () => {
    const f = preflight([
      { title: "A", text: "He paused. [NOTE: check timeline] and walked on." },
      { title: "B", text: "[TODO]\nLater: [SCENE: the big fight]" },
      { title: "Clean", text: "Nothing to defer here." },
    ]).find((x) => x.rule === "todos")!;
    expect(f.count).toBe(3);
    expect(f.scenes).toEqual(["A", "B"]);
  });

  it("aggregates counts and affected scene titles", () => {
    const f = preflight([
      { title: "A", text: "tab\there" },
      { title: "B", text: "tab\there\ttoo" },
    ]).find((x) => x.rule === "tabs")!;
    expect(f.count).toBe(3);
    expect(f.scenes).toEqual(["A", "B"]);
  });
});

describe("preflight: embeds", () => {
  it("flags embedded notes/PDFs (dropped by flatten-links) but not image embeds", () => {
    const found = preflight([
      { title: "A", text: "Prose ![[Other Scene]] and ![[Other#Part|x]] and ![[paper.pdf]]." },
      { title: "B", text: "A map: ![[city.png|300]] and ![alt](x.jpg)." },
      { title: "C", text: "A normal [[wikilink]] is fine." },
    ]);
    const f = found.find((x) => x.rule === "embeds")!;
    expect(f.count).toBe(3);
    expect(f.scenes).toEqual(["A"]);
  });
});
