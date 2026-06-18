/**
 * Project / draft data model.
 *
 * Mirrors Longform's `Draft` shape (stored under the `longform` frontmatter key
 * on an index note) so existing Longform projects load drop-in. Inkswell-only data
 * lives under a separate `inkswell` key — see {@link InkswellProjectData} — and is
 * NEVER nested inside `longform`.
 */

import type { BeatSheet } from "../outliner/beat-templates";
import type { RevisionDecision } from "../revisions/types";

/** A scene with its nesting depth (0 = top level). */
export interface IndentedScene {
  title: string;
  indent: number;
}

interface CommonDraftFields {
  /** Display title of the project. */
  title: string;
  /** Whether `title` is authored in frontmatter (vs derived from filename). */
  titleInFrontmatter: boolean;
  /** Optional name distinguishing this draft from others of the same project. */
  draftTitle: string | null;
  /** Named compile workflow, or null for the default. */
  workflow: string | null;
}

export interface MultipleSceneDraft extends CommonDraftFields {
  format: "scenes";
  /** Folder (relative to the index note) holding scene files. */
  sceneFolder: string;
  /** Ordered, indented scene list. */
  scenes: IndentedScene[];
  /** Files in the scene folder Longform should ignore. */
  ignoredFiles: string[];
  /** Optional template note applied to new scenes. */
  sceneTemplate: string | null;
}

export interface SingleSceneDraft extends CommonDraftFields {
  format: "single";
}

export type Draft = MultipleSceneDraft | SingleSceneDraft;

/**
 * A project as Inkswell sees it at runtime: the parsed draft plus derived,
 * non-persisted fields. `vaultPath` and `unknownFiles` are computed, not stored.
 */
export interface Project {
  /** Vault path of the index note declaring this project. */
  vaultPath: string;
  draft: Draft;
  /**
   * Resolved scene entries for multi-scene projects: each indented scene paired
   * with the vault path it maps to (null when no matching file exists).
   */
  scenes: ResolvedScene[];
  /** Files in the scene folder not listed in `scenes` and not ignored. */
  unknownFiles: string[];
  /** Inkswell-only data attached to this project, if any. */
  inkswell: InkswellProjectData | null;
}

export interface ResolvedScene extends IndentedScene {
  /** Vault path the scene resolves to, or null if the file is missing. */
  path: string | null;
}

/**
 * Inkswell-specific per-project data, persisted under the `inkswell` frontmatter key
 * on the same index note. Grown across phases (compile config, goals, revisions).
 */
export interface ProjectGoals {
  /** Total word target for the project (e.g. 80000). */
  target?: number;
}

export interface InkswellProjectData {
  compile?: unknown; // CompileConfig — typed in src/compile
  goals?: ProjectGoals;
  revisions?: RevisionDecision[];
  beats?: BeatSheet;
}

export function isMultiScene(draft: Draft): draft is MultipleSceneDraft {
  return draft.format === "scenes";
}
