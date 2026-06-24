/**
 * Pure character-arc timeline logic (no Obsidian imports — unit-testable).
 * Implements the Reviser's Workbook "does your hero transform?" diagnostic:
 * track each tracked character's internal state (flaw) and external state
 * (problem) scene by scene, flag flat stretches (no change across N scenes), and
 * compare the first vs. last snapshot for an at-a-glance transform check.
 *
 * Per-scene snapshots are stored in scene frontmatter (`revArc`); this module just
 * assembles the plain data into rows + diagnostics.
 */

import { linkTarget, toLink } from "../codex/codex";

export interface ArcSnapshot {
  /** Internal state / flaw at this scene. */
  internal?: string;
  /** External state / problem at this scene. */
  external?: string;
}

export interface ArcCell {
  title: string;
  /** Null when the character has no recorded state in this scene. */
  snapshot: ArcSnapshot | null;
}

export interface ArcRow {
  character: string;
  cells: ArcCell[];
}

function hasContent(s: ArcSnapshot | undefined): boolean {
  return !!s && (!!(s.internal ?? "").trim() || !!(s.external ?? "").trim());
}

function snapKey(s: ArcSnapshot | null): string {
  if (!s) return "";
  return `${(s.internal ?? "").trim()}|${(s.external ?? "").trim()}`;
}

/** Build a character × scene grid (rows in `characters` order, cols in scene order). */
export function buildArcTimeline(
  scenes: { title: string; arc: Record<string, ArcSnapshot> }[],
  characters: string[]
): ArcRow[] {
  return characters.map((character) => ({
    character,
    cells: scenes.map((s) => {
      const snap = s.arc[character];
      return { title: s.title, snapshot: hasContent(snap) ? snap : null };
    }),
  }));
}

export interface FlatStretch {
  character: string;
  /** Titles of the consecutive scenes whose snapshot never changed. */
  scenes: string[];
}

/**
 * Find runs of `minRun`+ consecutive recorded scenes where the character's
 * snapshot is identical — a stalled arc. Scenes with no data are skipped (they
 * don't break or extend a run; only recorded scenes are compared in sequence).
 */
export function flatStretches(row: ArcRow, minRun = 3): FlatStretch[] {
  const present = row.cells.filter((c) => c.snapshot);
  const out: FlatStretch[] = [];
  let i = 0;
  while (i < present.length) {
    let j = i + 1;
    while (j < present.length && snapKey(present[j].snapshot) === snapKey(present[i].snapshot)) j++;
    if (j - i >= minRun) {
      out.push({ character: row.character, scenes: present.slice(i, j).map((c) => c.title) });
    }
    i = j;
  }
  return out;
}

export interface TransformDelta {
  character: string;
  /** True when first and last recorded snapshots differ. */
  changed: boolean;
  first: ArcSnapshot | null;
  last: ArcSnapshot | null;
  /** How many scenes have recorded state for this character. */
  recorded: number;
}

/** Compare a character's first vs. last recorded snapshot. */
export function transformDelta(row: ArcRow): TransformDelta {
  const present = row.cells.filter((c) => c.snapshot);
  const first = present[0]?.snapshot ?? null;
  const last = present[present.length - 1]?.snapshot ?? null;
  return {
    character: row.character,
    changed: present.length > 1 && snapKey(first) !== snapKey(last),
    first,
    last,
    recorded: present.length,
  };
}

// --- Storage (de)serialization ---------------------------------------------
// On disk, a scene's arc is a LIST of entries whose `character` is a WIKILINK
// value, so Obsidian rewrites it when the character note is renamed. In memory
// it's a plain-name → snapshot record (what the UI and the functions above use).
// Tracked characters are likewise stored as wikilinks, resolved to plain names
// on read. Both readers also accept the legacy plain-name-keyed object/array.

export interface StoredArcEntry {
  /** Wikilink to the character, e.g. "[[Mara Vance]]". */
  character: string;
  internal?: string;
  external?: string;
}

function snapshotFrom(v: unknown): ArcSnapshot | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const internal = typeof o.internal === "string" ? o.internal.trim() : "";
  const external = typeof o.external === "string" ? o.external.trim() : "";
  if (!internal && !external) return null;
  const snap: ArcSnapshot = {};
  if (internal) snap.internal = internal;
  if (external) snap.external = external;
  return snap;
}

/**
 * Parse stored `revArc` into a plain-name → snapshot record. Accepts the current
 * list form (`[{character: "[[Name]]", …}]`) and the legacy object form keyed by
 * (possibly wikilinked) name.
 */
export function parseSceneArc(raw: unknown): Record<string, ArcSnapshot> {
  const out: Record<string, ArcSnapshot> = {};
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const character = (entry as Record<string, unknown>).character;
      if (typeof character !== "string") continue;
      const name = linkTarget(character);
      const snap = snapshotFrom(entry);
      if (name && snap) out[name] = snap;
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
      const name = linkTarget(key);
      const snap = snapshotFrom(v);
      if (name && snap) out[name] = snap;
    }
  }
  return out;
}

/** Serialize a plain-name → snapshot record into the stored list (wikilinked). */
export function serializeSceneArc(record: Record<string, ArcSnapshot>): StoredArcEntry[] {
  const out: StoredArcEntry[] = [];
  for (const [name, snap] of Object.entries(record)) {
    const internal = (snap.internal ?? "").trim();
    const external = (snap.external ?? "").trim();
    if (!internal && !external) continue;
    const entry: StoredArcEntry = { character: toLink(name) };
    if (internal) entry.internal = internal;
    if (external) entry.external = external;
    out.push(entry);
  }
  return out;
}

/** Resolve stored `arcTracked` (wikilinks, or legacy plain names) to plain names. */
export function parseTracked(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => linkTarget(x))
    .filter((x) => x.length > 0);
}

/** Store tracked character names as wikilinks (rename-safe). */
export function serializeTracked(names: string[]): string[] {
  return names.map((n) => toLink(n));
}
