import { describe, expect, it } from "vitest";
import {
  FolderSettings,
  joinPath,
  parentFolder,
  projectFolder,
  resolveCodexFolder,
  sanitizeSegment,
} from "../src/settings/folders";
import { EntityScope } from "../src/codex/types";

const settings = (over: Partial<FolderSettings> = {}): FolderSettings => ({
  baseFolder: "",
  codexFolder: "Codex",
  coLocateCodex: true,
  ...over,
});

describe("joinPath", () => {
  it("joins non-empty segments and trims stray slashes", () => {
    expect(joinPath("Inkswell", "Book One", "Codex")).toBe("Inkswell/Book One/Codex");
    expect(joinPath("/Inkswell/", "/Codex/")).toBe("Inkswell/Codex");
  });

  it("drops empty/blank segments (vault root → '')", () => {
    expect(joinPath("", "Codex")).toBe("Codex");
    expect(joinPath("", "", "")).toBe("");
    expect(joinPath(undefined, null, "Codex")).toBe("Codex");
  });
});

describe("sanitizeSegment", () => {
  it("strips characters illegal in file names", () => {
    expect(sanitizeSegment('A/B\\C:D*E?F"G<H>I|J')).toBe("A-B-C-D-E-F-G-H-I-J");
    expect(sanitizeSegment("  Plain Title  ")).toBe("Plain Title");
  });

  it("rejects path-traversal segments ('.' / '..') by sanitizing to ''", () => {
    expect(sanitizeSegment(".")).toBe("");
    expect(sanitizeSegment("..")).toBe("");
    expect(sanitizeSegment(" .. ")).toBe("");
    expect(sanitizeSegment("...")).toBe("");
  });

  it("strips leading/trailing dots (hidden files, Windows-invalid names)", () => {
    expect(sanitizeSegment(".hidden")).toBe("hidden");
    expect(sanitizeSegment("Chapter 1.")).toBe("Chapter 1");
    expect(sanitizeSegment("Dr. Strange")).toBe("Dr. Strange");
  });
});

describe("parentFolder", () => {
  it("returns the folder above a path, '' for root-level files", () => {
    expect(parentFolder("Inkswell/Book One/Book One.md")).toBe("Inkswell/Book One");
    expect(parentFolder("Book One.md")).toBe("");
  });
});

describe("projectFolder", () => {
  it("gives each project its own sanitized subfolder under the base", () => {
    expect(projectFolder("Inkswell", "My Novel")).toBe("Inkswell/My Novel");
    expect(projectFolder("", "My Novel")).toBe("My Novel");
    expect(projectFolder("Inkswell", "A/B: C")).toBe("Inkswell/A-B- C");
  });
});

describe("resolveCodexFolder", () => {
  const book: EntityScope = { project: "Book One" };
  const series: EntityScope = { series: "Saga" };
  const global: EntityScope = {};
  const indexPath = "Inkswell/Book One/Book One.md";

  it("co-locates a book-scoped entry in its project folder", () => {
    expect(resolveCodexFolder(settings({ baseFolder: "Inkswell" }), book, indexPath)).toBe(
      "Inkswell/Book One/Codex"
    );
  });

  it("sends series/global entries to the shared base codex even when co-locating", () => {
    const s = settings({ baseFolder: "Inkswell" });
    expect(resolveCodexFolder(s, series, indexPath)).toBe("Inkswell/Codex");
    expect(resolveCodexFolder(s, global, indexPath)).toBe("Inkswell/Codex");
  });

  it("uses the shared base codex for everything when co-location is off", () => {
    const s = settings({ baseFolder: "Inkswell", coLocateCodex: false });
    expect(resolveCodexFolder(s, book, indexPath)).toBe("Inkswell/Codex");
  });

  it("falls back to the shared codex when a book scope has no active project path", () => {
    expect(resolveCodexFolder(settings({ baseFolder: "Inkswell" }), book, null)).toBe(
      "Inkswell/Codex"
    );
  });

  it("defaults match today's behavior (vault-root 'Codex') with blank base", () => {
    expect(resolveCodexFolder(settings(), global)).toBe("Codex");
    expect(resolveCodexFolder(settings({ codexFolder: "" }), global)).toBe("Codex");
  });
});
