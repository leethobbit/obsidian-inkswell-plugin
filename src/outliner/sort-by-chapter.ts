/**
 * "Sort scenes by chapter number" (pure, Obsidian-free, tested). A one-shot
 * reorder of the manuscript — NOT a mode: manuscript order stays the index's
 * `longform.scenes` array that drag-reorder edits, and chapters keep deriving
 * their order from it (SCHEMA §C). Useful after migrating a numbered
 * manuscript whose scenes landed alphabetically (#44).
 *
 * Longform nesting is preserved: a top-level scene and its indented followers
 * move as one block, keyed by the head scene's chapter.
 */

import { IndentedScene } from "../projects/types";
import { wordToNumber } from "../lib/number-words";

/**
 * The number in a chapter label — "Chapter 12", "12", "Ch. 3: Fog" → the first
 * run of digits; "Chapter Twelve", "Twenty-Seven" → the number word; null when
 * the label has neither (or is missing).
 */
export function parseChapterNumber(label: string | undefined): number | null {
  if (!label) return null;
  const digits = /\d+/.exec(label);
  if (digits) return Number(digits[0]);
  for (const token of label.split(/[\s:,.;()]+/)) {
    const n = wordToNumber(token);
    if (n !== null) return n;
  }
  return null;
}

/** Top-level blocks: each indent-0 scene with the deeper scenes that follow it. */
function blocks(scenes: readonly IndentedScene[]): IndentedScene[][] {
  const out: IndentedScene[][] = [];
  for (const s of scenes) {
    if (s.indent === 0 || out.length === 0) out.push([s]);
    else out[out.length - 1].push(s);
  }
  return out;
}

/**
 * Stable sort of the manuscript's top-level blocks by chapter number:
 * numbered blocks ascending (ties keep manuscript order), then every
 * unnumbered block in its current order. Returns the SAME array when nothing
 * would move, so callers can skip the write.
 */
export function sortScenesByChapter(
  scenes: IndentedScene[],
  chapterOf: (title: string) => string | undefined
): IndentedScene[] {
  const keyed = blocks(scenes).map((block, i) => ({
    block,
    i,
    n: parseChapterNumber(chapterOf(block[0].title)),
  }));
  const numbered = keyed
    .filter((k) => k.n !== null)
    .sort((a, b) => (a.n as number) - (b.n as number) || a.i - b.i);
  const rest = keyed.filter((k) => k.n === null);
  const out = [...numbered, ...rest].flatMap((k) => k.block);
  const unchanged = out.length === scenes.length && out.every((s, i) => s === scenes[i]);
  return unchanged ? scenes : out;
}
