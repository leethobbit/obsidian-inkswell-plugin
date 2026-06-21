/**
 * Pure aggregation over completed sprint records (no Obsidian imports — unit
 * tested). WPM uses actual elapsed time when recorded, falling back to the
 * configured duration for older records.
 */

import { SprintRecord } from "../tracking/types";

export interface SprintStats {
  count: number;
  totalWords: number;
  totalSec: number;
  /** Mean words per sprint. */
  avgWords: number;
  /** Overall words-per-minute across all sprint time. */
  avgWpm: number;
  /** Most words in a single sprint. */
  bestWords: number;
  /** Best single-sprint words-per-minute. */
  bestWpm: number;
  /** Sprints that had a word goal set. */
  goalCount: number;
  /** Of those, how many met the goal. */
  goalsMet: number;
  /** goalsMet / goalCount (0 when no goal'd sprints). */
  hitRate: number;
}

/** Seconds a sprint actually ran — actual elapsed if recorded, else configured. */
export function sprintSeconds(r: SprintRecord): number {
  return r.elapsedSec ?? r.durationSec;
}

/** Words-per-minute for a single sprint. */
export function sprintWpm(r: SprintRecord): number {
  const sec = sprintSeconds(r);
  return sec > 0 ? (r.words / sec) * 60 : 0;
}

export function sprintStats(records: SprintRecord[]): SprintStats {
  const count = records.length;
  if (count === 0) {
    return {
      count: 0,
      totalWords: 0,
      totalSec: 0,
      avgWords: 0,
      avgWpm: 0,
      bestWords: 0,
      bestWpm: 0,
      goalCount: 0,
      goalsMet: 0,
      hitRate: 0,
    };
  }

  let totalWords = 0;
  let totalSec = 0;
  let bestWords = 0;
  let bestWpm = 0;
  let goalCount = 0;
  let goalsMet = 0;

  for (const r of records) {
    totalWords += r.words;
    totalSec += sprintSeconds(r);
    bestWords = Math.max(bestWords, r.words);
    bestWpm = Math.max(bestWpm, sprintWpm(r));
    if (r.goal != null && r.goal > 0) {
      goalCount += 1;
      if (r.words >= r.goal) goalsMet += 1;
    }
  }

  return {
    count,
    totalWords,
    totalSec,
    avgWords: totalWords / count,
    avgWpm: totalSec > 0 ? (totalWords / totalSec) * 60 : 0,
    bestWords,
    bestWpm,
    goalCount,
    goalsMet,
    hitRate: goalCount > 0 ? goalsMet / goalCount : 0,
  };
}
