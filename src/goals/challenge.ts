/**
 * Writing challenge math (pure, Obsidian-free, tested): one date window + a word
 * target ("50,000 words in November"), measured against the same goal-counted
 * `daily` map as the Month ring — every word written in the window, whichever
 * project it went to. The UI (Track card, status bar, Write count) renders what
 * `challengeProgress` returns.
 */

import { dateKey } from "../tracking/types";

export interface WritingChallenge {
  name: string;
  /** YYYY-MM-DD, local, inclusive. */
  start: string;
  /** YYYY-MM-DD, local, inclusive, >= start. */
  end: string;
  /** Words, > 0. */
  target: number;
}

export type ChallengePhase = "upcoming" | "active" | "ended";

export interface ChallengeProgress {
  phase: ChallengePhase;
  /** The challenge's word target. */
  target: number;
  /** end − start + 1. */
  totalDays: number;
  /** 1-based day of the window today is; 0 when upcoming, totalDays when ended. */
  dayIndex: number;
  /** Days left including today; 0 when ended. */
  daysLeft: number;
  /** Days until the start (upcoming only, else 0). */
  startsIn: number;
  /** Words written in the window so far (through today). */
  written: number;
  /** Words written today (active only, else 0). */
  today: number;
  /** Where you "should" be by the end of today: target × dayIndex / totalDays. */
  par: number;
  /** Words to write today to stay on pace for the rest of the window. Measured
   *  from the start of today, so it doesn't shrink as you type (active only). */
  neededToday: number;
  status: "met" | "ahead" | "behind" | "upcoming";
  /** Best day within the window so far, if any words were written. */
  bestDay: { date: string; words: number } | null;
}

/** Longest window accepted (keeps the per-keystroke status-bar sum trivially cheap). */
export const MAX_CHALLENGE_DAYS = 400;

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
function isDateKey(v: unknown): v is string {
  return typeof v === "string" && KEY_RE.test(v) && dateKey(parseKey(v)) === v;
}

/** Every date key from `start` through `end`, walked by calendar day (DST-safe). */
export function windowKeys(start: string, end: string): string[] {
  const keys: string[] = [];
  const cursor = parseKey(start);
  for (let key = dateKey(cursor); key <= end && keys.length <= MAX_CHALLENGE_DAYS; ) {
    keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
    key = dateKey(cursor);
  }
  return keys;
}

/** Validate a stored challenge; null when anything is off (never throws). */
export function normalizeChallenge(raw: unknown): WritingChallenge | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isDateKey(r.start) || !isDateKey(r.end) || r.end < r.start) return null;
  if (typeof r.target !== "number" || !Number.isFinite(r.target) || r.target < 1) return null;
  if (windowKeys(r.start, r.end).length > MAX_CHALLENGE_DAYS) return null;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : "Writing challenge";
  return { name, start: r.start, end: r.end, target: Math.floor(r.target) };
}

/** A new challenge's defaults: November (this year's, or next year's once it
 *  has passed), 50,000 words. */
export function novemberPreset(today: Date = new Date()): WritingChallenge {
  const year = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  return { name: "November novel", start: `${year}-11-01`, end: `${year}-11-30`, target: 50_000 };
}

export function challengeProgress(
  daily: Record<string, number>,
  ch: WritingChallenge,
  now: Date = new Date()
): ChallengeProgress {
  const todayKey = dateKey(now);
  const keys = windowKeys(ch.start, ch.end);
  const totalDays = Math.max(1, keys.length);
  const phase: ChallengePhase =
    todayKey < ch.start ? "upcoming" : todayKey > ch.end ? "ended" : "active";

  let written = 0;
  let bestDay: ChallengeProgress["bestDay"] = null;
  for (const key of keys) {
    if (key > todayKey) break;
    const words = daily[key] ?? 0;
    written += words;
    if (words > 0 && (!bestDay || words > bestDay.words)) bestDay = { date: key, words };
  }

  const dayIndex =
    phase === "upcoming" ? 0 : phase === "ended" ? totalDays : keys.indexOf(todayKey) + 1;
  const daysLeft = phase === "active" ? totalDays - dayIndex + 1 : phase === "upcoming" ? totalDays : 0;
  let startsIn = 0;
  if (phase === "upcoming") {
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (dateKey(cursor) < ch.start && startsIn <= MAX_CHALLENGE_DAYS * 10) {
      cursor.setDate(cursor.getDate() + 1);
      startsIn += 1;
    }
  }
  const today = phase === "active" ? daily[todayKey] ?? 0 : 0;
  const par = Math.round((ch.target * dayIndex) / totalDays);
  const neededToday =
    phase === "active" && written < ch.target
      ? Math.max(0, Math.ceil((ch.target - (written - today)) / daysLeft))
      : 0;
  const status: ChallengeProgress["status"] =
    written >= ch.target ? "met" : phase === "upcoming" ? "upcoming" : written >= par ? "ahead" : "behind";

  return { phase, target: ch.target, totalDays, dayIndex, daysLeft, startsIn, written, today, par, neededToday, status, bestDay };
}

/** Today's word target: what a running challenge needs today, otherwise the
 *  daily goal. The one source for every "today N / target" display. */
export function todayTarget(dailyGoal: number, progress: ChallengeProgress | null): number {
  return progress?.phase === "active" ? progress.neededToday : dailyGoal;
}

/** Whether an ended challenge's result card is still shown (7 days after the end). */
export function showEndedResult(ch: WritingChallenge, now: Date = new Date()): boolean {
  const cutoff = parseKey(ch.end);
  cutoff.setDate(cutoff.getDate() + 7);
  return dateKey(now) <= dateKey(cutoff);
}
