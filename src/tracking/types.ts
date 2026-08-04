/**
 * Persisted writing telemetry. Stored in the plugin's data.json (NOT in vault
 * notes) because it's session data, not content. Keyed by local date string.
 */

/**
 * What kind of project note a word delta came from. Attribution is per-category
 * so the "what counts toward goals" toggles can be applied retroactively to
 * everything logged since this shipped. Files unrelated to any project are
 * never logged at all (category `null` at the call sites).
 */
export const WORD_CATEGORIES = ["scene", "planning", "codex", "other"] as const;
export type WordCategory = (typeof WORD_CATEGORIES)[number];

/** A completed sprint. */
export interface SprintRecord {
  /** ISO timestamp when the sprint started. */
  start: string;
  /** Configured duration in seconds. */
  durationSec: number;
  /** Actual seconds the sprint ran (≤ durationSec for early-ended sprints).
   * Optional for back-compat with older records, which only stored durationSec. */
  elapsedSec?: number;
  /** Net words written during the sprint. */
  words: number;
  /** Word goal for the sprint, if any. */
  goal: number | null;
}

export interface WritingLogData {
  /** Local date (YYYY-MM-DD) → net words written that day. */
  daily: Record<string, number>;
  /**
   * Local date → per-category share of that day's `daily` total. Absent for
   * days logged before category attribution shipped (unclassifiable legacy
   * history, which always counts toward goals). Invariant for post-upgrade
   * writing: `daily[d] = legacy remainder + Σ dailyBy[d][cat]`.
   */
  dailyBy?: Record<string, Partial<Record<WordCategory, number>>>;
  /** File path → last observed word count, used to compute deltas. */
  baselines: Record<string, number>;
  /** Completed sprints, most recent last. */
  sprints: SprintRecord[];
  /** Optional daily mood (1–10), keyed by local date. Light-touch coaching. */
  mood?: Record<string, number>;
  /** A single rolling "what to write next" breadcrumb for the next session. */
  nextUp?: string;
}

export function emptyLog(): WritingLogData {
  return { daily: {}, baselines: {}, sprints: [], mood: {} };
}

/** Local date key (YYYY-MM-DD) for a Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Core word-delta attribution (pure; the WritingTracker wraps it with events +
 * persistence). Updates the per-file baseline and attributes the net change for
 * `path` to the day of `now`, bucketed under `category`.
 *
 * `category` is the kind of project note the file is, or `null` for files
 * unrelated to any project. Unrelated files still get baseline bookkeeping —
 * otherwise a note that later joins a project (added as a scene, given a
 * `codex:` key) would dump its whole word count as a phantom delta — but their
 * words are never attributed anywhere.
 *
 * Returns:
 * - `null` — nothing attributed, but the baseline changed and should be
 *   persisted. Two cases: first sighting of the file (pre-existing prose is
 *   never logged as "written today" — opening a vault must not log thousands
 *   of phantom words), or an unrelated file (`category === null`).
 * - `0` — count unchanged; nothing to attribute or persist.
 * - non-zero — the delta (can be negative) added to today's entry and to
 *   today's `category` bucket. Disabled categories are still logged here; the
 *   goal toggles are applied at read time (see {@link projectedDayWords}).
 */
export function applyCountToLog(
  log: WritingLogData,
  path: string,
  count: number,
  category: WordCategory | null,
  now: Date = new Date()
): number | null {
  const prev = log.baselines[path];
  log.baselines[path] = count;

  if (prev === undefined) return null;
  const delta = count - prev;
  if (delta === 0) return 0;
  if (category === null) return null;

  // One key for both writes so a midnight-straddling call can't split them.
  const key = dateKey(now);
  log.daily[key] = (log.daily[key] ?? 0) + delta;
  const day = ((log.dailyBy ??= {})[key] ??= {});
  day[category] = (day[category] ?? 0) + delta;
  return delta;
}

/**
 * One day's words counting toward goals: the stored total minus the disabled
 * categories' buckets. Legacy days (no `dailyBy` entry) subtract nothing and
 * count fully. Deliberately unclamped — a negative disabled bucket must add
 * back (deleting codex words with codex off can't erase scene progress), and
 * consumers already tolerate negative day totals.
 */
export function projectedDayWords(
  log: Pick<WritingLogData, "daily" | "dailyBy">,
  key: string,
  disabled: ReadonlySet<WordCategory>
): number {
  let words = log.daily[key] ?? 0;
  const day = log.dailyBy?.[key];
  if (day) {
    for (const cat of disabled) words -= day[cat] ?? 0;
  }
  return words;
}

/**
 * The full date→words map with the disabled categories subtracted, shaped for
 * the pure goal math in goals.ts. Always a copy, never the live log object.
 */
export function projectedDaily(
  log: Pick<WritingLogData, "daily" | "dailyBy">,
  disabled: ReadonlySet<WordCategory>
): Record<string, number> {
  if (disabled.size === 0) return { ...log.daily };
  const out: Record<string, number> = {};
  for (const key of Object.keys(log.daily)) {
    out[key] = projectedDayWords(log, key, disabled);
  }
  return out;
}
