import { describe, expect, it } from "vitest";
import { numberWord, wordToNumber } from "../src/lib/number-words";
import { parseChapterNumber, sortScenesByChapter } from "../src/outliner/sort-by-chapter";
import { IndentedScene } from "../src/projects/types";

describe("number words", () => {
  it("round-trips every number 1–99", () => {
    for (let n = 1; n <= 99; n++) expect(wordToNumber(numberWord(n))).toBe(n);
  });

  it("is case-insensitive and accepts a space between tens and ones", () => {
    expect(wordToNumber("twelve")).toBe(12);
    expect(wordToNumber("TWENTY-SEVEN")).toBe(27);
    expect(wordToNumber("thirty one")).toBe(31);
    expect(wordToNumber("forty")).toBe(40);
  });

  it("rejects non-numbers and malformed compounds", () => {
    expect(wordToNumber("Chapter")).toBeNull();
    expect(wordToNumber("")).toBeNull();
    expect(wordToNumber("twenty-twelve")).toBeNull();
    expect(wordToNumber("one-two")).toBeNull();
  });
});

describe("parseChapterNumber", () => {
  it("takes the first run of digits", () => {
    expect(parseChapterNumber("Chapter 12")).toBe(12);
    expect(parseChapterNumber("12")).toBe(12);
    expect(parseChapterNumber("Ch. 3: Fog on 5th Street")).toBe(3);
  });

  it("falls back to a number word anywhere in the label", () => {
    expect(parseChapterNumber("Chapter Twelve")).toBe(12);
    expect(parseChapterNumber("Twenty-Seven")).toBe(27);
    expect(parseChapterNumber("Part Two: The Docks")).toBe(2);
  });

  it("is null for labels without a number, or no label", () => {
    expect(parseChapterNumber("Prologue")).toBeNull();
    expect(parseChapterNumber("")).toBeNull();
    expect(parseChapterNumber(undefined)).toBeNull();
  });
});

describe("sortScenesByChapter", () => {
  const s = (title: string, indent = 0): IndentedScene => ({ title, indent });
  const chapters: Record<string, string | undefined> = {
    Alpha: "Chapter 3",
    Beta: "Chapter 1",
    "Beta note": "Chapter 1",
    Gamma: "Two",
    Prologue: undefined,
    Epilogue: "Coda",
  };
  const chapterOf = (t: string) => chapters[t];

  it("orders top-level blocks by chapter number, unnumbered last in their own order", () => {
    const scenes = [s("Prologue"), s("Alpha"), s("Beta"), s("Beta note", 1), s("Epilogue"), s("Gamma")];
    expect(sortScenesByChapter(scenes, chapterOf).map((x) => x.title)).toEqual([
      "Beta",
      "Beta note", // indented follower travels with its head
      "Gamma",
      "Alpha",
      "Prologue",
      "Epilogue",
    ]);
  });

  it("is stable for equal numbers and returns the SAME array when already sorted", () => {
    const sorted = [s("Beta"), s("Beta note", 1), s("Gamma"), s("Alpha"), s("Prologue")];
    expect(sortScenesByChapter(sorted, chapterOf)).toBe(sorted);
    const tie = [s("B1"), s("B2"), s("A")];
    const tieOf = (t: string) => (t === "A" ? "1" : "2");
    expect(sortScenesByChapter(tie, tieOf).map((x) => x.title)).toEqual(["A", "B1", "B2"]);
  });

  it("does not mutate its input", () => {
    const scenes = [s("Alpha"), s("Beta")];
    const before = JSON.stringify(scenes);
    sortScenesByChapter(scenes, chapterOf);
    expect(JSON.stringify(scenes)).toBe(before);
  });
});
