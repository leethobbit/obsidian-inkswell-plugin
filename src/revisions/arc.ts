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
