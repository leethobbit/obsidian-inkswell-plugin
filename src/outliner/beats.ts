/**
 * Pure beat-sheet operations (no Obsidian imports — unit-testable). Persistence
 * is handled by the BeatPanel via `persistInkswellData` (writes `inkswell.beats`).
 */

import {
  BeatAssignment,
  BeatDef,
  BeatSheet,
  DEFAULT_TEMPLATE,
  getTemplate,
} from "./beat-templates";

export interface MergedBeat extends BeatDef {
  assignment: BeatAssignment;
}

/** Combine a project's beat sheet with its template into display rows (in order). */
export function mergeBeats(sheet: BeatSheet | undefined): MergedBeat[] {
  const template = getTemplate(sheet?.template);
  const assignments = sheet?.assignments ?? {};
  return template.map((def) => {
    // Migrate legacy single `scene` (string) → `scenes` (string[]) on read.
    const raw = (assignments[def.id] ?? {}) as BeatAssignment & { scene?: string };
    const assignment: BeatAssignment = { ...raw };
    if (raw.scene && !assignment.scenes) assignment.scenes = [raw.scene];
    delete (assignment as { scene?: string }).scene;
    return { ...def, assignment };
  });
}

export interface BeatProgress {
  done: number;
  total: number;
  /** Beats with a note or a linked scene (started, even if not marked done). */
  started: number;
}

export function beatProgress(beats: MergedBeat[]): BeatProgress {
  let done = 0;
  let started = 0;
  for (const b of beats) {
    if (b.assignment.done) done += 1;
    if (
      b.assignment.done ||
      (b.assignment.scenes && b.assignment.scenes.length > 0) ||
      (b.assignment.note ?? "").trim()
    ) {
      started += 1;
    }
  }
  return { done, total: beats.length, started };
}

/**
 * Rewrite beat→scene links after a scene rename. Beats store their scene links
 * by title in `inkswell.beats`, a structure independent of the index scene list,
 * so a rename would otherwise leave a beat pointing at the dead old title (an
 * orphaned chip). Returns a new sheet, or null when nothing referenced
 * `oldTitle` (so callers can skip a redundant write). Also folds any legacy
 * single-`scene` link into `scenes` while it's rewriting that assignment.
 */
export function renameSceneInBeats(
  sheet: BeatSheet | undefined,
  oldTitle: string,
  newTitle: string
): BeatSheet | null {
  if (!sheet || oldTitle === newTitle) return null;
  let changed = false;
  const assignments: Record<string, BeatAssignment> = {};
  for (const [id, raw] of Object.entries(sheet.assignments)) {
    const legacy = raw as BeatAssignment & { scene?: string };
    const scenes = legacy.scenes ?? (legacy.scene ? [legacy.scene] : undefined);
    if (scenes && scenes.includes(oldTitle)) {
      changed = true;
      const next: string[] = [];
      for (const t of scenes) {
        const mapped = t === oldTitle ? newTitle : t;
        if (!next.includes(mapped)) next.push(mapped); // dedupe if newTitle already linked
      }
      const updated: BeatAssignment & { scene?: string } = { ...legacy, scenes: next };
      delete updated.scene; // drop the legacy single-scene field if present
      assignments[id] = updated;
    } else {
      assignments[id] = raw;
    }
  }
  if (!changed) return null;
  return { template: sheet.template ?? DEFAULT_TEMPLATE, assignments };
}

/** Immutably update one beat's assignment, returning a new sheet. */
export function setAssignment(
  sheet: BeatSheet | undefined,
  beatId: string,
  patch: Partial<BeatAssignment>
): BeatSheet {
  const base: BeatSheet = sheet ?? { template: DEFAULT_TEMPLATE, assignments: {} };
  const next: BeatAssignment = { ...(base.assignments[beatId] ?? {}), ...patch };
  // Drop empty fields so cleared assignments don't linger in frontmatter.
  if (!next.scenes || next.scenes.length === 0) delete next.scenes;
  if (!(next.note ?? "").trim()) delete next.note;
  if (!next.done) delete next.done;

  const assignments = { ...base.assignments };
  if (Object.keys(next).length === 0) {
    delete assignments[beatId];
  } else {
    assignments[beatId] = next;
  }
  return { template: base.template ?? DEFAULT_TEMPLATE, assignments };
}
