import { describe, expect, it } from "vitest";
import {
  arraysToIndentedScenes,
  indentedScenesToArrays,
  parseDraft,
  parseScenes,
  writeDraftToFrontmatter,
} from "../src/projects/draft-serialization";
import { IndentedScene, MultipleSceneDraft } from "../src/projects/types";

const SAMPLE: IndentedScene[] = [
  { title: "a", indent: 0 },
  { title: "b", indent: 1 },
  { title: "c", indent: 1 },
  { title: "d", indent: 0 },
];

describe("scene indent encoding (Longform-compatible)", () => {
  it("encodes nested scenes as nested arrays", () => {
    expect(indentedScenesToArrays(SAMPLE)).toEqual(["a", ["b", "c"], "d"]);
  });

  it("decodes nested arrays back to indented scenes", () => {
    expect(arraysToIndentedScenes(["a", ["b", "c"], "d"])).toEqual(SAMPLE);
  });

  it("round-trips through parseScenes without mutating the source", () => {
    const encoded = indentedScenesToArrays(SAMPLE);
    const snapshot = JSON.stringify(encoded);
    const decoded = parseScenes(encoded);
    expect(decoded).toEqual(SAMPLE);
    // parseScenes must deep-clone: the caller's array is untouched.
    expect(JSON.stringify(encoded)).toBe(snapshot);
  });

  it("handles a flat list and deep nesting", () => {
    const flat: IndentedScene[] = [
      { title: "one", indent: 0 },
      { title: "two", indent: 0 },
    ];
    expect(parseScenes(indentedScenesToArrays(flat))).toEqual(flat);

    const deep: IndentedScene[] = [
      { title: "x", indent: 0 },
      { title: "y", indent: 1 },
      { title: "z", indent: 2 },
    ];
    expect(parseScenes(indentedScenesToArrays(deep))).toEqual(deep);
  });
});

describe("parseDraft", () => {
  it("parses a multi-scene draft", () => {
    const draft = parseDraft(
      {
        format: "scenes",
        title: "My Novel",
        sceneFolder: "scenes",
        scenes: ["a", ["b"]],
        ignoredFiles: ["notes"],
      },
      "Index"
    );
    expect(draft?.format).toBe("scenes");
    expect(draft?.title).toBe("My Novel");
    expect((draft as MultipleSceneDraft).scenes).toEqual([
      { title: "a", indent: 0 },
      { title: "b", indent: 1 },
    ]);
  });

  it("falls back to the basename when title is not in frontmatter", () => {
    const draft = parseDraft({ format: "single" }, "Chapter Index");
    expect(draft?.title).toBe("Chapter Index");
    expect(draft?.titleInFrontmatter).toBe(false);
  });

  it("returns null for a non-object", () => {
    expect(parseDraft(null, "x")).toBeNull();
    expect(parseDraft("nope", "x")).toBeNull();
  });
});

describe("writeDraftToFrontmatter", () => {
  it("omits title when not authored in frontmatter, includes scene fields", () => {
    const draft: MultipleSceneDraft = {
      format: "scenes",
      title: "Derived",
      titleInFrontmatter: false,
      draftTitle: null,
      workflow: null,
      sceneFolder: "scenes",
      scenes: SAMPLE,
      ignoredFiles: [],
      sceneTemplate: null,
    };
    const fm: Record<string, any> = { inkswell: { keepme: true } };
    writeDraftToFrontmatter(fm, draft);
    expect(fm.longform.title).toBeUndefined();
    expect(fm.longform.scenes).toEqual(["a", ["b", "c"], "d"]);
    expect(fm.longform.sceneFolder).toBe("scenes");
    // Sibling keys are preserved.
    expect(fm.inkswell).toEqual({ keepme: true });
  });
});
