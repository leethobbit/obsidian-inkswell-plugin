/**
 * What the companions show for "the scene you're writing" (pure — no Obsidian
 * import, unit-tested). The views gather inputs from the metadata cache and the
 * store; these decide what to list and in what order.
 */

import { linkTarget } from "../codex/codex";
import type { CodexEntity } from "../codex/types";
import type { BeatAssignment, BeatDef } from "../outliner/beat-templates";
import { chapterRuns } from "../outliner/outline";
import type { StructureGroup } from "../outliner/structure";

/** One entry in the Codex companion's "In this scene" list. */
export interface SceneEntity {
  entity: CodexEntity;
  /** Linked from the scene's `characters` / `location` (vs only named in the prose). */
  linked: boolean;
}

/**
 * The Codex entries a scene involves: those its frontmatter links (characters,
 * locations) first, in link order, then those its prose mentions, by name. One
 * row per entry. Only entries in `visible` (already scope-filtered) are listed,
 * so a link to an entry another book owns doesn't leak in.
 */
export function entitiesInScene(
  linkValues: readonly string[],
  mentionedPaths: readonly string[],
  visible: readonly CodexEntity[]
): SceneEntity[] {
  const byName = new Map<string, CodexEntity>();
  const byPath = new Map<string, CodexEntity>();
  for (const e of visible) {
    byPath.set(e.path, e);
    if (!byName.has(e.name.toLowerCase())) byName.set(e.name.toLowerCase(), e);
  }
  const out: SceneEntity[] = [];
  const seen = new Set<string>();
  for (const value of linkValues) {
    const e = byName.get(linkTarget(value).trim().toLowerCase());
    if (e && !seen.has(e.path)) {
      seen.add(e.path);
      out.push({ entity: e, linked: true });
    }
  }
  for (const path of mentionedPaths) {
    const e = byPath.get(path);
    if (e && !seen.has(e.path)) {
      seen.add(e.path);
      out.push({ entity: e, linked: false });
    }
  }
  return out;
}

/** The chapter a scene sits in, as the manuscript runs (#58 model). */
export interface ChapterContext {
  /** Chapter id (config id or derived) and title. */
  id: string;
  title: string;
  /** The chapter's scenes, manuscript order. */
  scenes: string[];
  /** Index of the current scene within `scenes`. */
  current: number;
}

/**
 * The chapter run holding `sceneTitle`, or null when the scene isn't in the
 * manuscript or has no chapter. Uses `chapterRuns`, never a group-by on the
 * chapter string, so two same-named chapters stay apart.
 */
export function chapterOf(
  scenes: ReadonlyArray<{ title: string; chapter?: string }>,
  chapters: StructureGroup[] | undefined,
  sceneTitle: string
): ChapterContext | null {
  const index = scenes.findIndex((s) => s.title === sceneTitle);
  if (index < 0) return null;
  const run = chapterRuns(scenes, chapters).runs.find((r) => r.indices.includes(index));
  if (!run) return null;
  return {
    id: run.id,
    title: run.title,
    scenes: run.indices.map((i) => scenes[i].title),
    current: run.indices.indexOf(index),
  };
}

/** A beat that some of the given scenes realize. */
export interface BeatHere {
  beat: BeatDef;
  assignment: BeatAssignment;
}

/**
 * Beats assigned to any of `sceneTitles`, in the template's order. A beat that
 * spans several chapters shows in each. `beats` is the resolved template (or
 * the synthesized rows for an unknown one — the caller decides, gotcha 11).
 */
export function beatsForScenes(
  beats: readonly BeatDef[],
  assignments: Record<string, BeatAssignment> | undefined,
  sceneTitles: readonly string[]
): BeatHere[] {
  if (!assignments) return [];
  const titles = new Set(sceneTitles);
  const out: BeatHere[] = [];
  for (const beat of beats) {
    const a = assignments[beat.id];
    if (a?.scenes?.some((t) => titles.has(t))) out.push({ beat, assignment: a });
  }
  return out;
}
