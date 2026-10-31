/**
 * Write → Stream planning: what the filter keeps, where chapters start (the
 * jump targets), and the placeholder height estimates.
 */
import { describe, expect, it } from "vitest";
import {
  StreamRow,
  applyFilter,
  calibrate,
  chapterStep,
  chapterStops,
  estimateHeight,
  filterOptions,
  neighbour,
  rowMatches,
} from "../src/lib/stream-plan";

const ch = (id: string, title = id) => ({ id, title });
const row = (path: string, over: Partial<StreamRow> = {}): StreamRow => ({
  path,
  title: path,
  run: null,
  ...over,
});

// Two chapters, a chapterless interlude, and a second run titled like the first.
const BOOK: StreamRow[] = [
  row("a1", { run: ch("c1", "Arrival"), pov: "Mira", plotlines: ["The heist"], characters: ["[[Mira]]"], status: "draft" }),
  row("a2", { run: ch("c1", "Arrival"), pov: "Tobias", characters: ["[[Tobias|Toby]]", "[[mira]]"] }),
  row("a3", { run: ch("c1", "Arrival"), pov: "mira", plotlines: ["The letters"] }),
  row("i1", { pov: "Anwen" }),
  row("b1", { run: ch("c2", "Flood"), pov: "Mira", status: "final" }),
  row("b2", { run: ch("c2", "Flood"), pov: "Corin" }),
  row("c1", { run: ch("c3", "Arrival"), pov: "Mira" }),
];

describe("rowMatches / applyFilter", () => {
  it("keeps everything without a filter", () => {
    expect(applyFilter(BOOK, null)).toHaveLength(BOOK.length);
  });

  it("matches POV case-insensitively", () => {
    expect(applyFilter(BOOK, { field: "pov", value: "MIRA" }).map((r) => r.path)).toEqual(["a1", "a3", "b1", "c1"]);
  });

  it("matches a character whether linked, aliased or differently cased", () => {
    expect(applyFilter(BOOK, { field: "character", value: "Mira" }).map((r) => r.path)).toEqual(["a1", "a2"]);
    expect(rowMatches(BOOK[1], { field: "character", value: "tobias" })).toBe(true);
  });

  it("matches a plotline among several, a status, and a chapter by its run", () => {
    expect(applyFilter(BOOK, { field: "plotline", value: "the letters" }).map((r) => r.path)).toEqual(["a3"]);
    expect(applyFilter(BOOK, { field: "status", value: "final" }).map((r) => r.path)).toEqual(["b1"]);
    // c1 and c3 share the title "Arrival" but are different chapters.
    expect(applyFilter(BOOK, { field: "chapter", value: "c3" }).map((r) => r.path)).toEqual(["c1"]);
  });

  it("never matches a scene that lacks the field", () => {
    expect(rowMatches(BOOK[3], { field: "chapter", value: "c1" })).toBe(false);
    expect(rowMatches(BOOK[3], { field: "plotline", value: "The heist" })).toBe(false);
  });
});

describe("filterOptions", () => {
  it("lists chapters in book order, numbering a repeated title", () => {
    expect(filterOptions(BOOK, "chapter")).toEqual([
      { value: "c1", label: "Arrival" },
      { value: "c2", label: "Flood" },
      { value: "c3", label: "Arrival (2)" },
    ]);
  });

  it("lists other values alphabetically, merging case variants under the first spelling", () => {
    expect(filterOptions(BOOK, "pov").map((o) => o.value)).toEqual(["Anwen", "Corin", "Mira", "Tobias"]);
    expect(filterOptions(BOOK, "character").map((o) => o.value)).toEqual(["Mira", "Tobias"]);
  });

  it("is empty when no scene has the field", () => {
    expect(filterOptions([row("x")], "plotline")).toEqual([]);
  });
});

describe("chapterStops", () => {
  it("is each chapter's first shown scene, skipping chapterless scenes", () => {
    expect(chapterStops(BOOK)).toEqual([
      { runId: "c1", title: "Arrival", path: "a1" },
      { runId: "c2", title: "Flood", path: "b1" },
      { runId: "c3", title: "Arrival", path: "c1" },
    ]);
  });

  it("starts a chapter at its first scene the filter kept", () => {
    const shown = applyFilter(BOOK, { field: "pov", value: "Tobias" });
    expect(chapterStops(shown)).toEqual([{ runId: "c1", title: "Arrival", path: "a2" }]);
  });
});

describe("chapterStep", () => {
  it("goes to the next chapter's start", () => {
    expect(chapterStep(BOOK, "a2", 1)).toBe("b1");
    expect(chapterStep(BOOK, "i1", 1)).toBe("b1");
  });

  it("goes back to this chapter's start from mid-chapter, and to the previous one from a start", () => {
    expect(chapterStep(BOOK, "b2", -1)).toBe("b1");
    expect(chapterStep(BOOK, "b1", -1)).toBe("a1");
    expect(chapterStep(BOOK, "i1", -1)).toBe("a1");
  });

  it("is null past either end, or for a scene that isn't shown", () => {
    expect(chapterStep(BOOK, "c1", 1)).toBeNull();
    expect(chapterStep(BOOK, "a1", -1)).toBeNull();
    expect(chapterStep(BOOK, "nope", 1)).toBeNull();
  });
});

describe("neighbour", () => {
  it("is the shown scene before or after, null at the ends", () => {
    expect(neighbour(BOOK, "a3", 1)).toBe("i1");
    expect(neighbour(BOOK, "a3", -1)).toBe("a2");
    expect(neighbour(BOOK, "a1", -1)).toBeNull();
    expect(neighbour(BOOK, "c1", 1)).toBeNull();
    expect(neighbour(BOOK, "nope", 1)).toBeNull();
  });
});

describe("height estimates", () => {
  it("scales with length, with a floor for an empty scene", () => {
    expect(estimateHeight(1000, 0.5)).toBe(500);
    expect(estimateHeight(0, 0.5)).toBe(40);
  });

  it("learns pixels per character from drawn scenes, ignoring empty samples", () => {
    expect(calibrate([])).toBeNull();
    expect(calibrate([{ chars: 0, px: 300 }])).toBeNull();
    expect(calibrate([{ chars: 1000, px: 400 }, { chars: 3000, px: 1200 }, { chars: 0, px: 50 }])).toBeCloseTo(0.4);
  });
});
