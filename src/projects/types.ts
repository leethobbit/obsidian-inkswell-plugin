/**
 * Project / draft data model.
 *
 * Mirrors Longform's `Draft` shape (stored under the `longform` frontmatter key
 * on an index note) so existing Longform projects load drop-in. Inkswell-only data
 * lives under a separate `inkswell` key — see {@link InkswellProjectData} — and is
 * NEVER nested inside `longform`.
 */

import type { CompileConfig } from "../compile/types";
import type { BeatSheet } from "../outliner/beat-templates";
import type { PublishingData } from "../publishing/publishing-data";
import type { RevisionChecklistData } from "../revisions/checklist";
import type { StyleSheetData } from "../revisions/stylesheet";
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
  /** Deadline (YYYY-MM-DD) for the pace calculator. */
  deadline?: string;
  /** Writing days per week (1–7) for the pace calculator. Default 7. */
  daysPerWeek?: number;
}

/** Series membership for a book (project). A series is the set of books sharing a `name`. */
export interface SeriesInfo {
  /** Series display name. Books with the same name form one series. */
  name: string;
  /** Position within the series (1-based). Unset books sort after numbered ones. */
  order?: number;
}

export interface InkswellProjectData {
  compile?: CompileConfig;
  goals?: ProjectGoals;
  revisions?: RevisionDecision[];
  /** Story- and Page-level revision checklists (Revise → Audit). */
  revisionChecklist?: RevisionChecklistData;
  /** Character names whose arc is tracked in the Audit dashboard grid. */
  arcTracked?: string[];
  /** Style sheet (preferred spellings/terms) for the consistency scan. */
  styleSheet?: StyleSheetData;
  /** Self-publishing checklist, metadata, launch plan & trackers. */
  publishing?: PublishingData;
  beats?: BeatSheet;
  series?: SeriesInfo;
}

export function isMultiScene(draft: Draft): draft is MultipleSceneDraft {
  return draft.format === "scenes";
}
