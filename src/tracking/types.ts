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
}

export function emptyLog(): WritingLogData {
  return { daily: {}, baselines: {}, sprints: [] };
}

/** Local date key (YYYY-MM-DD) for a Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
