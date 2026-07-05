/**
 * Persisted writing telemetry. Stored in the plugin's data.json (NOT in vault
 * notes) because it's session data, not content. Keyed by local date string.
 */

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
 * `path` to the day of `now`.
 *
 * Returns:
 * - `null` — first sighting of the file: the baseline is set but NO words are
 *   attributed, so pre-existing prose is never logged as "written today"
 *   (opening a vault must not log thousands of phantom words). The caller
 *   should still persist the new baseline.
 * - `0` — count unchanged; nothing to attribute or persist.
 * - non-zero — the delta (can be negative) that was added to today's entry.
 */
export function applyCountToLog(
  log: WritingLogData,
  path: string,
  count: number,
  now: Date = new Date()
): number | null {
  const prev = log.baselines[path];
  log.baselines[path] = count;

  if (prev === undefined) return null;
  const delta = count - prev;
  if (delta === 0) return 0;

  const key = dateKey(now);
  log.daily[key] = (log.daily[key] ?? 0) + delta;
  return delta;
}
