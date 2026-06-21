/**
 * Pure goal/streak/projection math over the daily writing log. No Obsidian
 * imports, so it is unit-testable. The UI (status bar, stats view) renders what
 * these return.
 */

import { dateKey } from "../tracking/types";

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Compute writing streaks from a date→words map. A day "counts" when its words
 * meet `threshold`. The current streak counts consecutive counting days ending
 * today; if today hasn't met the threshold yet it's treated as in-progress (a
 * grace day) so the streak isn't prematurely broken, but it only counts once
 * earned.
 */
export function computeStreaks(
  daily: Record<string, number>,
  threshold: number,
  today: Date = new Date()
): StreakResult {
  const met = (key: string) => (daily[key] ?? 0) >= threshold;

  // Longest streak across all recorded days.
  const days = Object.keys(daily)
    .filter((k) => met(k))
    .sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of days) {
    const d = parseKey(k);
    if (prev && isNextDay(prev, d)) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  // Current streak: walk backward from today (grace if today not yet met).
  let current = 0;
  const cursor = new Date(today);
  if (!met(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1); // grace for today
  while (met(dateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

export interface Projection {
  /** Words remaining to hit the target (0 if already met). */
  remaining: number;
  /** Estimated days to finish at the given daily rate, or null if rate <= 0. */
  daysToFinish: number | null;
  /** Whether the target is already met. */
  done: boolean;
}

/** Project a finish estimate from current words, target, and a daily rate. */
export function projectFinish(
  currentWords: number,
  target: number,
  dailyRate: number
): Projection {
  const remaining = Math.max(0, target - currentWords);
  if (remaining === 0) return { remaining: 0, daysToFinish: 0, done: true };
  if (dailyRate <= 0) return { remaining, daysToFinish: null, done: false };
  return { remaining, daysToFinish: Math.ceil(remaining / dailyRate), done: false };
}

/**
 * Average words per day over the last `windowDays` calendar days ending today,
 * counting only days that have a record. Returns 0 if there are none.
 */
export function recentDailyAverage(
  daily: Record<string, number>,
  windowDays: number,
  today: Date = new Date()
): number {
  let sum = 0;
  let count = 0;
  const cursor = new Date(today);
  for (let i = 0; i < windowDays; i++) {
    const key = dateKey(cursor);
    if (key in daily) {
      sum += daily[key];
      count += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return count === 0 ? 0 : sum / count;
}

/** Words written from the start of the current week (Monday) through today. */
export function weekToDateWords(
  daily: Record<string, number>,
  today: Date = new Date()
): number {
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  let sum = 0;
  const cur = new Date(today);
  for (let i = 0; i <= dow; i++) {
    sum += daily[dateKey(cur)] ?? 0;
    cur.setDate(cur.getDate() - 1);
  }
  return sum;
}

/** Words written from the 1st of the current month through today. */
export function monthToDateWords(
  daily: Record<string, number>,
  today: Date = new Date()
): number {
  let sum = 0;
  const cur = new Date(today);
  for (let i = 0; i < today.getDate(); i++) {
    sum += daily[dateKey(cur)] ?? 0;
    cur.setDate(cur.getDate() - 1);
  }
  return sum;
}

/** Days in the current week (Mon→today) that met the habit's minimum. */
export function habitDaysMet(
  daily: Record<string, number>,
  minWords: number,
  today: Date = new Date()
): number {
  const dow = (today.getDay() + 6) % 7;
  let met = 0;
  const cur = new Date(today);
  for (let i = 0; i <= dow; i++) {
    if ((daily[dateKey(cur)] ?? 0) >= minWords) met += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return met;
}

export interface LifetimeRecords {
  totalWords: number;
  daysWritten: number;
  bestDay: { date: string; words: number } | null;
}

export function lifetimeRecords(daily: Record<string, number>): LifetimeRecords {
  let totalWords = 0;
  let daysWritten = 0;
  let bestDay: { date: string; words: number } | null = null;
  for (const [date, words] of Object.entries(daily)) {
    if (words > 0) {
      totalWords += words;
      daysWritten += 1;
      if (!bestDay || words > bestDay.words) bestDay = { date, words };
    }
  }
  return { totalWords, daysWritten, bestDay };
}

export const MILESTONES = [10000, 25000, 50000, 80000, 100000];

/** The next unreached milestone for a cumulative total, or null past the top. */
export function nextMilestone(total: number): number | null {
  return MILESTONES.find((m) => m > total) ?? null;
}

export interface HeatCell {
  key: string;
  words: number;
}

/**
 * Build a calendar heatmap as an array of week-columns (each 7 cells, Mon→Sun),
 * ending with the current week.
 */
export function heatmapWeeks(
  daily: Record<string, number>,
  weeks: number,
  today: Date = new Date()
): HeatCell[][] {
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today);
  start.setDate(start.getDate() - dow - (weeks - 1) * 7);
  const cur = new Date(start);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dateKey(cur);
      col.push({ key, words: daily[key] ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(col);
  }
  return cols;
}

export interface DayPoint {
  date: string;
  words: number;
}

/**
 * Daily word series for charting. With a numeric `days`, returns the last N
 * calendar days ending today (oldest→newest, zero-filled). With `null` ("all"),
 * returns every recorded date in ascending order.
 */
export function dailySeries(
  daily: Record<string, number>,
  days: number | null,
  today: Date = new Date()
): DayPoint[] {
  if (days === null) {
    return Object.keys(daily)
      .sort()
      .map((date) => ({ date, words: daily[date] ?? 0 }));
  }
  const out: DayPoint[] = [];
  const cur = new Date(today);
  cur.setDate(cur.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dateKey(cur);
    out.push({ date: key, words: daily[key] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isNextDay(prev: Date, next: Date): boolean {
  const expected = new Date(prev);
  expected.setDate(expected.getDate() + 1);
  return dateKey(expected) === dateKey(next);
}
