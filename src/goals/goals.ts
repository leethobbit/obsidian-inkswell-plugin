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

// --- Deadline pace calculator (B3) -----------------------------------------

export type PaceStatus = "ahead" | "on-track" | "behind" | "met" | "no-deadline";

export interface PaceResult {
  remaining: number;
  /** Calendar days from today to the deadline (0 if past/none). */
  calendarDays: number;
  /** Writing days remaining = calendarDays × daysPerWeek/7 (≥1 when time remains). */
  writingDays: number;
  /** Words/writing-day needed to hit the target by the deadline. */
  requiredRate: number;
  status: PaceStatus;
}

/**
 * Compare the rate you need (to hit `target` by `deadline`, writing `daysPerWeek`
 * days a week) against your actual `recentRate`. Pure; inject `today` in tests.
 */
export function computePace(
  currentWords: number,
  target: number,
  deadline: string | null,
  daysPerWeek: number,
  recentRate: number,
  today: Date = new Date()
): PaceResult {
  const remaining = Math.max(0, target - currentWords);
  if (target <= 0 || remaining === 0) {
    return { remaining, calendarDays: 0, writingDays: 0, requiredRate: 0, status: remaining === 0 && target > 0 ? "met" : "no-deadline" };
  }
  if (!deadline) {
    return { remaining, calendarDays: 0, writingDays: 0, requiredRate: 0, status: "no-deadline" };
  }
  const d = parseKey(deadline);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const calendarDays = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (calendarDays <= 0) {
    return { remaining, calendarDays: 0, writingDays: 0, requiredRate: remaining, status: "behind" };
  }
  const perWeek = Math.min(7, Math.max(1, daysPerWeek || 7));
  const writingDays = Math.max(1, Math.round((calendarDays * perWeek) / 7));
  const requiredRate = Math.ceil(remaining / writingDays);
  const status: PaceStatus =
    recentRate >= requiredRate * 1.1 ? "ahead" : recentRate >= requiredRate ? "on-track" : "behind";
  return { remaining, calendarDays, writingDays, requiredRate, status };
}

/** Rule of thumb: ~1 week per 10k words (minimum 1). */
export function suggestedDeadlineWeeks(target: number): number {
  return Math.max(1, Math.ceil(target / 10000));
}

// --- Draft-progress milestone zones (B5, light-touch coaching) -------------

export interface DraftZone {
  /** Lower-bound percent through the draft this zone begins at. */
  pct: number;
  label: string;
  note: string;
}

export const DRAFT_ZONES: DraftZone[] = [
  { pct: 0, label: "Starting line", note: "Name why this story excites you, then write fast and forward." },
  { pct: 10, label: "Catalyst check", note: "Has the inciting incident hit yet? If not, push it now." },
  { pct: 20, label: "Into Act 2", note: "The hero commits. Keep momentum — don't restart." },
  { pct: 30, label: "The Muddle", note: "The hardest stretch. Doubt is normal; keep drafting forward." },
  { pct: 40, label: "Shiny new idea", note: "Tempted by a new project? Log it and finish this draft." },
  { pct: 50, label: "Halfway", note: "Reconnect with why you started. Push through the midpoint." },
  { pct: 60, label: "Discipline over inspiration", note: "Write regardless of how it feels today." },
  { pct: 70, label: "Victory in sight", note: "30% to go. Resist revising — capture ideas and move on." },
  { pct: 80, label: "Home stretch", note: "Start aiming at the ending. Save revision ideas as fuel." },
  { pct: 90, label: "Winding down", note: "Stop chasing perfection — there's just where you stop." },
  { pct: 100, label: "Draft complete", note: "Celebrate. Don't judge it yet — that's Future You's job." },
];

/** The draft-progress zone for the current word count against a target. */
export function draftMilestone(
  currentWords: number,
  target: number
): { pct: number; zone: DraftZone | null } {
  if (target <= 0) return { pct: 0, zone: null };
  const pct = Math.min(100, Math.round((currentWords / target) * 100));
  let zone: DraftZone | null = null;
  for (const z of DRAFT_ZONES) if (pct >= z.pct) zone = z;
  return { pct, zone };
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
