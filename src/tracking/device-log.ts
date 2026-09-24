/**
 * Per-device writing-log notes (pure, Obsidian-free, tested). The opt-in
 * cross-device history mirrors each device's `data.json` log into ONE markdown
 * note per device — markdown because it is the only file type every vault sync
 * (Obsidian Sync, iCloud, Syncthing, git…) carries without extra settings — and
 * merges every device's note for display. Only the owning device writes its
 * note, so there is nothing to conflict.
 *
 * Note shape (see SCHEMA.md §F):
 *
 *     ---
 *     inkswell-log: "<device id>"
 *     device: "iPad"
 *     updated: "2026-09-23T18:00:00.000Z"
 *     ---
 *     <one explanatory line>
 *     ```json
 *     {"daily":{…},"dailyBy":{…},"sprints":[…]}
 *     ```
 */

import { SprintRecord, WORD_CATEGORIES, WordCategory, WritingLogData } from "./types";

/** Frontmatter key that marks a note as a device log; its value is the device id. */
export const LOG_KEY = "inkswell-log";

export type DailyBy = Record<string, Partial<Record<WordCategory, number>>>;

export interface DeviceLogSnapshot {
  id: string;
  name: string;
  updated?: string;
  daily: Record<string, number>;
  dailyBy?: DailyBy;
  sprints: SprintRecord[];
}

/** Every device's history summed — what Track, goals and streaks read. */
export interface MergedLog {
  daily: Record<string, number>;
  dailyBy: DailyBy;
  sprints: SprintRecord[];
}

/** This device's log as a snapshot for serialization. */
export function snapshotOf(
  id: string,
  name: string,
  log: Pick<WritingLogData, "daily" | "dailyBy" | "sprints">,
  updated?: string
): DeviceLogSnapshot {
  return { id, name, updated, daily: log.daily, dailyBy: log.dailyBy, sprints: log.sprints };
}

/** A double-quoted scalar is valid YAML and survives any device name. */
const yaml = (s: string): string => JSON.stringify(s);

export function serializeDeviceLog(snap: DeviceLogSnapshot): string {
  const body = { daily: snap.daily, dailyBy: snap.dailyBy ?? {}, sprints: snap.sprints };
  return [
    "---",
    `${LOG_KEY}: ${yaml(snap.id)}`,
    `device: ${yaml(snap.name)}`,
    ...(snap.updated ? [`updated: ${yaml(snap.updated)}`] : []),
    "---",
    "",
    `Inkswell writing history for **${snap.name}**. Machine-written — Inkswell merges every ` +
      "device's log on the Track dashboard. Don't edit the block below; rename the device via " +
      "the `device` property, and delete this note if the device is gone.",
    "",
    "```json",
    JSON.stringify(body),
    "```",
    "",
  ].join("\n");
}

/** A frontmatter scalar without its quotes (double, single, or bare). */
function unquote(raw: string): string {
  const s = raw.trim();
  if (s.startsWith('"')) {
    try {
      const v: unknown = JSON.parse(s);
      if (typeof v === "string") return v;
    } catch {
      /* fall through */
    }
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function numberMap(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function dailyByMap(raw: unknown): DailyBy | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: DailyBy = {};
  for (const [day, buckets] of Object.entries(raw as Record<string, unknown>)) {
    if (!buckets || typeof buckets !== "object") continue;
    const entry: Partial<Record<WordCategory, number>> = {};
    for (const cat of WORD_CATEGORIES) {
      const v = (buckets as Record<string, unknown>)[cat];
      if (typeof v === "number" && Number.isFinite(v)) entry[cat] = v;
    }
    out[day] = entry;
  }
  return out;
}

function isSprint(x: unknown): x is SprintRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.start === "string" &&
    typeof r.durationSec === "number" &&
    typeof r.words === "number" &&
    (r.goal === null || typeof r.goal === "number")
  );
}

/** Parse a device-log note; null when it isn't one (or its block is unreadable). */
export function parseDeviceLog(text: string): DeviceLogSnapshot | null {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) return null;
  const field = (name: string): string | null => {
    const m = new RegExp(`^${name}:[ \\t]*(.+)$`, "m").exec(fm[1]);
    return m ? unquote(m[1]) : null;
  };
  const id = field(LOG_KEY);
  if (!id) return null;
  const block = /```json\r?\n([\s\S]*?)\r?\n```/.exec(text);
  if (!block) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(block[1]);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const daily = numberMap(r.daily);
  if (!daily) return null;
  return {
    id,
    name: field("device") ?? "Unknown device",
    updated: field("updated") ?? undefined,
    daily,
    dailyBy: dailyByMap(r.dailyBy),
    sprints: Array.isArray(r.sprints) ? r.sprints.filter(isSprint) : [],
  };
}

/**
 * Sum this device's log with every other device's snapshot: per-day totals and
 * per-category buckets add; sprints are pooled, sorted by start, and
 * de-duplicated on `start + durationSec` (a device whose id was re-minted may
 * leave an orphan note echoing its own history).
 */
export function mergeLogs(
  own: Pick<WritingLogData, "daily" | "dailyBy" | "sprints">,
  others: readonly DeviceLogSnapshot[]
): MergedLog {
  const daily: Record<string, number> = { ...own.daily };
  const dailyBy: DailyBy = {};
  for (const [day, buckets] of Object.entries(own.dailyBy ?? {})) dailyBy[day] = { ...buckets };
  const sprints = new Map<string, SprintRecord>();
  for (const s of own.sprints) sprints.set(`${s.start}|${s.durationSec}`, s);
  for (const o of others) {
    for (const [day, n] of Object.entries(o.daily)) daily[day] = (daily[day] ?? 0) + n;
    for (const [day, buckets] of Object.entries(o.dailyBy ?? {})) {
      const entry = (dailyBy[day] ??= {});
      for (const [cat, n] of Object.entries(buckets) as [WordCategory, number][]) {
        entry[cat] = (entry[cat] ?? 0) + n;
      }
    }
    for (const s of o.sprints) {
      const k = `${s.start}|${s.durationSec}`;
      if (!sprints.has(k)) sprints.set(k, s);
    }
  }
  return {
    daily,
    dailyBy,
    sprints: [...sprints.values()].sort((a, b) => a.start.localeCompare(b.start)),
  };
}
