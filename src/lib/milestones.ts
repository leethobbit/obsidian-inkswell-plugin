/**
 * Word-count milestones inside one scene (pure, no Obsidian imports): where the
 * running count crosses each multiple of N. Tokenizes the masked document so
 * offsets index the real text and the numbers agree with `countWords` — the
 * same tokenizer, the same stripping rules.
 */

import { maskMarkdown, tokenizeWordsWithOffsets } from "./wordcount";

export interface Milestone {
  /** Offset of the first character of the word that reaches the milestone. */
  offset: number;
  /** The running count at that word (a multiple of `every`). */
  words: number;
}

/** Above this the per-keystroke scan isn't worth it (a novel-length single note). */
const MAX_DOC_LENGTH = 400_000;

/** Every `every`-th word's offset and count; [] when disabled (`every` ≤ 0) or the doc is huge. */
export function milestoneOffsets(doc: string, every: number): Milestone[] {
  if (!doc || !Number.isFinite(every) || every <= 0 || doc.length > MAX_DOC_LENGTH) return [];
  const step = Math.floor(every);
  if (step <= 0) return [];
  const tokens = tokenizeWordsWithOffsets(maskMarkdown(doc));
  const out: Milestone[] = [];
  for (let i = step - 1; i < tokens.length; i += step) {
    out.push({ offset: tokens[i].from, words: i + 1 });
  }
  return out;
}

/** Compact label for a gutter tag: 500 → "500", 1000 → "1k", 1500 → "1.5k". */
export function formatMilestone(words: number): string {
  if (words < 1000) return `${words}`;
  const k = words / 1000;
  return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
}
