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

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isNextDay(prev: Date, next: Date): boolean {
  const expected = new Date(prev);
  expected.setDate(expected.getDate() + 1);
  return dateKey(expected) === dateKey(next);
}
