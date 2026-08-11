/**
 * Persists project changes back to the index note.
 *
 * Uses `fileManager.processFrontMatter`, the only Obsidian API that edits a
 * note's frontmatter without rewriting its body. We only ever write to the index
 * note, and only its frontmatter — scene files are never touched. This upholds
 * Longform's core invariant.
 */

import { App, TFile } from "obsidian";
import { asRecord } from "../lib/frontmatter";
import { writeDraftToFrontmatter } from "./draft-serialization";
import {
  Draft,
  IndentedScene,
  MultipleSceneDraft,
  InkswellProjectData,
  ProjectGoals,
  ProjectOverview,
  SeriesInfo,
} from "./types";
import type { BeatSheet } from "../outliner/beat-templates";
import type { Plotline } from "../outliner/plotgrid";
import type { StructureGroup, StructureKind } from "../outliner/structure";
import type { RevisionDecision } from "../revisions/types";
import type { ChecklistItem, ChecklistTier, RevisionChecklistData } from "../revisions/checklist";
import { setChecklistItem } from "../revisions/checklist";
import type { StyleEntry } from "../revisions/stylesheet";

/** Write a full draft object to the index note's `longform` frontmatter. */
export async function persistDraft(
  app: App,
  indexFile: TFile,
  draft: Draft
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    writeDraftToFrontmatter(fm, draft);
  });
}

/**
 * Apply a transform to a multi-scene draft's scene list and persist the result.
 * No-op (and resolves) if the index isn't a multi-scene draft.
 */
export async function updateScenes(
  app: App,
  indexFile: TFile,
  draft: Draft,
  transform: (scenes: IndentedScene[]) => IndentedScene[]
): Promise<void> {
  if (draft.format !== "scenes") return;
  const updated: MultipleSceneDraft = {
    ...draft,
    scenes: transform(draft.scenes),
  };
  await persistDraft(app, indexFile, updated);
}

/**
 * Merge a partial Inkswell data object into the index note's `inkswell` frontmatter
 * key, leaving `longform` and other keys untouched.
 *
 * UNSAFE for panel writes: this replaces each patched sub-key WHOLESALE with a
 * value the caller built earlier — usually from a render-time `project` snapshot
 * that the host's editing-guard deferral keeps stale for an entire typing
 * session. Writing such a snapshot silently erases every sibling edit saved
 * under the same key since the panel last rendered (the beats data-loss bug).
 * Use the delta writers below (`updateBeats`, `persistChecklistItem`, …), which
 * compute against the CURRENT file state inside `processFrontMatter`. Remaining
 * callers are legacy sites scheduled for migration — do not add new ones.
 */
export async function unsafeReplaceInkswellKeys(
  app: App,
  indexFile: TFile,
  patch: Partial<InkswellProjectData>
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    fm["inkswell"] = { ...asRecord(fm["inkswell"]), ...patch };
  });
}

/**
 * Read-merge-write core for ONE `inkswell` sub-key: `compute` receives the
 * current parsed value of `inkswell[key]` (read from the file inside
 * `processFrontMatter`, never from a panel snapshot) and returns the next value
 * — or `undefined` to delete the key. Obsidian serializes `processFrontMatter`
 * per file, so the read-compute-write is atomic with respect to other writers.
 */
async function updateInkswellKey(
  app: App,
  indexFile: TFile,
  key: keyof InkswellProjectData,
  compute: (current: unknown) => unknown
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const inkswell = { ...asRecord(fm["inkswell"]) };
    const next = compute(inkswell[key]);
    if (next === undefined) delete inkswell[key];
    else inkswell[key] = next;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/** Narrow an unknown frontmatter value to an array (empty if not one). */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Stamp the draft's creation time (a scalar leaf — always safe to set). */
export async function persistDraftCreated(
  app: App,
  indexFile: TFile,
  iso: string
): Promise<void> {
  await updateInkswellKey(app, indexFile, "draftCreated", () => iso);
}

/**
 * Transform the beat sheet against its CURRENT stored state. The transform gets
 * the current sheet (undefined when none) and returns the next sheet — or null
 * to skip the write (nothing to change). Panels express edits as deltas
 * (`setAssignment(cur, beatId, patch)`) so concurrent edits to other beats
 * are never overwritten.
 */
export async function updateBeats(
  app: App,
  indexFile: TFile,
  transform: (current: BeatSheet | undefined) => BeatSheet | null
): Promise<void> {
  await updateInkswellKey(app, indexFile, "beats", (raw) => {
    const current =
      raw && typeof raw === "object" ? (raw as BeatSheet) : undefined;
    const next = transform(current);
    if (next === null) return raw; // no change — keep what's stored
    // A sheet with no assignments and the default template is still kept —
    // an explicit template choice is user state even before any notes exist.
    return next;
  });
}

/** Apply one checklist-item patch against the CURRENT stored checklist. */
export async function persistChecklistItem(
  app: App,
  indexFile: TFile,
  tier: ChecklistTier,
  id: string,
  patch: Partial<ChecklistItem>
): Promise<void> {
  await updateInkswellKey(app, indexFile, "revisionChecklist", (raw) => {
    const current =
      raw && typeof raw === "object" ? (raw as RevisionChecklistData) : undefined;
    const next = setChecklistItem(current, tier, id, patch);
    return Object.keys(next).length === 0 ? undefined : next;
  });
}

/** Transform the revision-decision list against its CURRENT stored state. */
export async function updateDecisions(
  app: App,
  indexFile: TFile,
  transform: (current: RevisionDecision[]) => RevisionDecision[]
): Promise<void> {
  await updateInkswellKey(app, indexFile, "revisions", (raw) => {
    const next = transform(asArray<RevisionDecision>(raw));
    return next.length === 0 ? undefined : next;
  });
}

/**
 * Merge a field-level goals patch against the CURRENT stored goals. A field set
 * to `undefined` is removed; an emptied goals object deletes the key.
 */
export async function persistGoalsPatch(
  app: App,
  indexFile: TFile,
  patch: Partial<ProjectGoals>
): Promise<void> {
  await updateInkswellKey(app, indexFile, "goals", (raw) => {
    const goals = { ...asRecord(raw) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) delete goals[key];
      else goals[key] = value;
    }
    return Object.keys(goals).length === 0 ? undefined : goals;
  });
}

/** Transform the style-sheet entry list against its CURRENT stored state. */
export async function updateStyleEntries(
  app: App,
  indexFile: TFile,
  transform: (current: StyleEntry[]) => StyleEntry[]
): Promise<void> {
  await updateInkswellKey(app, indexFile, "styleSheet", (raw) => {
    const entries = asArray<StyleEntry>(asRecord(raw)["entries"]);
    const next = transform(entries);
    return next.length === 0 ? undefined : { entries: next };
  });
}

/**
 * Transform the tracked-arc character list against its CURRENT stored state.
 * The stored form is wikilinks; callers work in plain names — parse/serialize
 * are injected so this module stays free of codex imports.
 */
export async function updateArcTracked(
  app: App,
  indexFile: TFile,
  transform: (currentNames: string[]) => string[],
  codec: { parse: (raw: unknown) => string[]; serialize: (names: string[]) => string[] }
): Promise<void> {
  await updateInkswellKey(app, indexFile, "arcTracked", (raw) => {
    const next = transform(codec.parse(raw));
    return next.length === 0 ? undefined : codec.serialize(next);
  });
}

/**
 * Mutate the project's `inkswell.publishing` sub-object in place via `mutator`,
 * then write it back whole. Needed because `persistInkswellData` shallow-merges —
 * patching `{ publishing }` would replace the entire sub-object, so callers that
 * change one nested field must read-merge-write (the `writeSeries` pattern).
 */
export async function persistPublishing(
  app: App,
  indexFile: TFile,
  mutator: (publishing: Record<string, unknown>) => void
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const inkswell = { ...asRecord(fm["inkswell"]) };
    const publishing = { ...asRecord(inkswell["publishing"]) };
    mutator(publishing);
    if (Object.keys(publishing).length === 0) delete inkswell["publishing"];
    else inkswell["publishing"] = publishing;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/**
 * Merge a partial overview patch into `inkswell.overview` (read-merge-write), like
 * `persistPublishing`. A raw `persistInkswellData({ overview })` would shallow-merge
 * at the top level and clobber sibling overview fields — this preserves them. Keys
 * set to empty string / undefined are dropped so cleared fields don't linger.
 */
export async function persistOverview(
  app: App,
  indexFile: TFile,
  patch: Partial<ProjectOverview>
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const inkswell = { ...asRecord(fm["inkswell"]) };
    const overview = { ...asRecord(inkswell["overview"]) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === "") delete overview[key];
      else overview[key] = value;
    }
    if (Object.keys(overview).length === 0) delete inkswell["overview"];
    else inkswell["overview"] = overview;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/**
 * Write the chapter/act config array to `inkswell.chapters` / `inkswell.acts`
 * (read-merge-write, like `persistPublishing`). An empty array deletes the key,
 * and an emptied `inkswell` object is pruned. `kind` picks the target key.
 */
export async function persistStructure(
  app: App,
  indexFile: TFile,
  kind: StructureKind,
  groups: StructureGroup[]
): Promise<void> {
  const key = kind === "act" ? "acts" : "chapters";
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const inkswell = { ...asRecord(fm["inkswell"]) };
    if (groups.length === 0) delete inkswell[key];
    else inkswell[key] = groups;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/**
 * Write the plotline config array to `inkswell.plotlines` (read-merge-write,
 * like `persistStructure`). An empty array deletes the key, and an emptied
 * `inkswell` object is pruned.
 */
export async function persistPlotlines(
  app: App,
  indexFile: TFile,
  plotlines: Plotline[]
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const inkswell = { ...asRecord(fm["inkswell"]) };
    if (plotlines.length === 0) delete inkswell["plotlines"];
    else inkswell["plotlines"] = plotlines;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/**
 * Set or clear a book's series membership under `inkswell.series`. Passing null
 * removes it (and drops the `inkswell` key entirely if nothing else remains).
 */
export async function writeSeries(
  app: App,
  indexFile: TFile,
  series: SeriesInfo | null
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const existing = asRecord(fm["inkswell"]);
    if (series && series.name.trim()) {
      existing["series"] =
        series.order != null
          ? { name: series.name.trim(), order: series.order }
          : { name: series.name.trim() };
    } else {
      delete existing["series"];
    }
    if (Object.keys(existing).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = existing;
  });
}
