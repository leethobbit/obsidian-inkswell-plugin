import { describe, expect, it } from "vitest";
import { LinkedFilesOptions, NoteLinkRef, linkPathOf, linkedFiles } from "../src/codex/linked-files";

const SELF = "Codex/Characters/Mara.md";
const CODEX = new Set([SELF, "Codex/Characters/Tomas.md", "Codex/Locations/Thornwick.md"]);

const opts = (shownKeys: string[] = ["codex-project", "codex-series", "codex-pinned", "image", "allies"]): LinkedFilesOptions => ({
  self: SELF,
  shownKeys: new Set(shownKeys),
  isCodexEntry: (p) => CODEX.has(p),
});

describe("linkPathOf", () => {
  it("drops a heading or block subpath", () => {
    expect(linkPathOf("Research#Ideas")).toBe("Research");
    expect(linkPathOf("Research#^abc123")).toBe("Research");
    expect(linkPathOf("Moodboard.canvas")).toBe("Moodboard.canvas");
  });
  it("is empty for a link to a heading in the same note", () => {
    expect(linkPathOf("#Backstory")).toBe("");
  });
});

describe("linkedFiles", () => {
  it("lists a canvas linked from a property or the note text (#74)", () => {
    const refs: NoteLinkRef[] = [
      { link: "Mara moodboard.canvas", key: "moodboard", resolved: "Boards/Mara moodboard.canvas" },
      { link: "Old letters.pdf", resolved: "Research/Old letters.pdf" },
    ];
    expect(linkedFiles(refs, opts())).toEqual([
      { path: "Boards/Mara moodboard.canvas", linkpath: "Mara moodboard.canvas" },
      { path: "Research/Old letters.pdf", linkpath: "Old letters.pdf" },
    ]);
  });

  it("skips properties the panel already shows: link fields, the portrait, scope and pins", () => {
    const refs: NoteLinkRef[] = [
      { link: "Book One", key: "codex-project", resolved: "Books/Book One/Index.md" },
      { link: "Book One", key: "codex-pinned.0", resolved: "Books/Book One/Index.md" },
      { link: "mara.png", key: "image", resolved: "Art/mara.png" },
      { link: "Guild Hall", key: "allies.1", resolved: "Notes/Guild Hall.md" },
      { link: "Board.canvas", key: "boards.0", resolved: "Boards/Board.canvas" },
    ];
    expect(linkedFiles(refs, opts())).toEqual([{ path: "Boards/Board.canvas", linkpath: "Board.canvas" }]);
  });

  it("matches a skipped key exactly, not by prefix", () => {
    const refs: NoteLinkRef[] = [{ link: "Sketch.png", key: "imageRefs", resolved: "Art/Sketch.png" }];
    expect(linkedFiles(refs, opts())).toEqual([{ path: "Art/Sketch.png", linkpath: "Sketch.png" }]);
  });

  it("leaves out other codex entries and the note itself", () => {
    const refs: NoteLinkRef[] = [
      { link: "Tomas", resolved: "Codex/Characters/Tomas.md" },
      { link: "Thornwick", key: "home", resolved: "Codex/Locations/Thornwick.md" },
      { link: "Mara", resolved: SELF },
      { link: "#Backstory", resolved: null },
      { link: "Map.canvas", resolved: "Boards/Map.canvas" },
    ];
    expect(linkedFiles(refs, opts())).toEqual([{ path: "Boards/Map.canvas", linkpath: "Map.canvas" }]);
  });

  it("lists each file once, however often it's linked", () => {
    const refs: NoteLinkRef[] = [
      { link: "Map.canvas", key: "board", resolved: "Boards/Map.canvas" },
      { link: "Map.canvas#Coast", resolved: "Boards/Map.canvas" },
      { link: "Boards/Map.canvas", resolved: "Boards/Map.canvas" },
    ];
    expect(linkedFiles(refs, opts())).toEqual([{ path: "Boards/Map.canvas", linkpath: "Map.canvas" }]);
  });

  it("lists links to missing files after the found ones, once each, case-insensitively", () => {
    const refs: NoteLinkRef[] = [
      { link: "Mara moodboard", key: "moodboard", resolved: null },
      { link: "Map.canvas", resolved: "Boards/Map.canvas" },
      { link: "mara moodboard", resolved: null },
    ];
    expect(linkedFiles(refs, opts())).toEqual([
      { path: "Boards/Map.canvas", linkpath: "Map.canvas" },
      { path: null, linkpath: "Mara moodboard" },
    ]);
  });

  it("lists canvases that hold the entry's card after the note's own links, before missing ones", () => {
    const refs: NoteLinkRef[] = [
      { link: "Sketches", resolved: null },
      { link: "Old letters.pdf", resolved: "Research/Old letters.pdf" },
    ];
    expect(linkedFiles(refs, { ...opts(), linkedFrom: ["Boards/Cast.canvas"] })).toEqual([
      { path: "Research/Old letters.pdf", linkpath: "Old letters.pdf" },
      { path: "Boards/Cast.canvas", linkpath: "Boards/Cast.canvas" },
      { path: null, linkpath: "Sketches" },
    ]);
  });

  it("lists a canvas once when the note links it and it holds the note", () => {
    const refs: NoteLinkRef[] = [{ link: "Cast.canvas", key: "moodboard", resolved: "Boards/Cast.canvas" }];
    expect(linkedFiles(refs, { ...opts(), linkedFrom: ["Boards/Cast.canvas"] })).toEqual([
      { path: "Boards/Cast.canvas", linkpath: "Cast.canvas" },
    ]);
  });

  it("is empty when the note links nothing extra", () => {
    expect(linkedFiles([], opts())).toEqual([]);
  });
});
