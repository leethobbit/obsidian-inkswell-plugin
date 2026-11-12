/**
 * Pure presentation helpers for the Track page (no Obsidian imports — tested).
 * Text goes through `t()` (src/i18n, also Obsidian-free).
 */

import { t } from "../i18n";

export const READING_WPM = 250;

/** Human read-time estimate for a word count, e.g. "0m", "<1m", "12m", "1h 5m". */
export function formatReadTime(words: number, wpm: number = READING_WPM): string {
  if (words <= 0) return t("stats.minutesShort", { minutes: 0 });
  const min = Math.round(words / wpm);
  if (min < 1) return t("stats.readTime.underMinute");
  if (min < 60) return t("stats.minutesShort", { minutes: min });
  return t("stats.readTime.hours", { hours: Math.floor(min / 60), minutes: min % 60 });
}

export type HeatLevel = 0 | 1 | 2 | 3;

/** Heatmap intensity bucket for a day's words relative to the period max. */
export function heatLevel(words: number, max: number): HeatLevel {
  if (words <= 0) return 0;
  if (words >= max * 0.66) return 3;
  if (words >= max * 0.33) return 2;
  return 1;
}
