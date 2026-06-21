/**
 * Pure presentation helpers for the Track page (no Obsidian imports — tested).
 */

export const READING_WPM = 250;

/** Human read-time estimate for a word count, e.g. "0m", "<1m", "12m", "1h 5m". */
export function formatReadTime(words: number, wpm: number = READING_WPM): string {
  if (words <= 0) return "0m";
  const min = Math.round(words / wpm);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export type HeatLevel = 0 | 1 | 2 | 3;

/** Heatmap intensity bucket for a day's words relative to the period max. */
export function heatLevel(words: number, max: number): HeatLevel {
  if (words <= 0) return 0;
  if (words >= max * 0.66) return 3;
  if (words >= max * 0.33) return 2;
  return 1;
}
