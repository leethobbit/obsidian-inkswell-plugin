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
  return template.map((def) => ({ ...def, assignment: assignments[def.id] ?? {} }));
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
    if (b.assignment.done || b.assignment.scene || (b.assignment.note ?? "").trim()) {
      started += 1;
    }
  }
  return { done, total: beats.length, started };
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
  if (next.scene == null || next.scene === "") delete next.scene;
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
