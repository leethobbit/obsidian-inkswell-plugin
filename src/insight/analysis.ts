/**
 * Pure manuscript text analysis (no Obsidian imports — unit-testable):
 * Flesch–Kincaid readability, word frequency, and repeated-phrase (echo)
 * detection. Operates on prose with markdown stripped (via wordcount.stripMarkdown).
 */

import { stripMarkdown } from "../lib/wordcount";

const WORD_RE = /[\p{L}\p{N}'’]+/gu;

const STOPWORDS = new Set(
  ("a an the and or but if then else of to in on at by for with from as is are was were be been being " +
    "it its he she his her him they them their we us our you your i my me this that these those there here " +
    "not no so do does did has have had will would can could should may might must just into over under " +
    "out up down off about than too very can't won't don't").split(" ")
);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Rough syllable count for an English word (vowel-group heuristic, min 1). */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  let count = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith("e")) count -= 1;
  return Math.max(1, count);
}

export interface Readability {
  words: number;
  sentences: number;
  /** Flesch–Kincaid grade level. */
  grade: number;
  /** Flesch reading ease (higher = easier). */
  ease: number;
}

export function readability(text: string): Readability {
  const prose = stripMarkdown(text);
  const words = prose.match(WORD_RE) || [];
  const wordCount = words.length;
  const sentences = Math.max(1, (prose.match(/[.!?]+/g) || []).length);
  if (wordCount === 0) return { words: 0, sentences, grade: 0, ease: 0 };
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const wps = wordCount / sentences;
  const spw = syllables / wordCount;
  return {
    words: wordCount,
    sentences,
    grade: round1(0.39 * wps + 11.8 * spw - 15.59),
    ease: round1(206.835 - 1.015 * wps - 84.6 * spw),
  };
}

export interface Freq {
  word: string;
  count: number;
}

/** Top non-stopword words by frequency (length > 2). */
export function wordFrequency(text: string, topN = 20): Freq[] {
  const prose = stripMarkdown(text).toLowerCase();
  const counts = new Map<string, number>();
  for (const w of prose.match(WORD_RE) || []) {
    if (w.length <= 2 || STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, topN);
}

export interface Echo {
  phrase: string;
  count: number;
}

/** Repeated n-word phrases (default trigrams) occurring at least `min` times. */
export function findEchoes(text: string, n = 3, min = 2, topN = 15): Echo[] {
  const words = (stripMarkdown(text).toLowerCase().match(WORD_RE) || []);
  const counts = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i++) {
    const phrase = words.slice(i, i + n).join(" ");
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, topN);
}
