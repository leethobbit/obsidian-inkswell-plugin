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
import { resolveCompileValue } from "../compile/config";
import type { CompileConfig, OutputFormat } from "../compile/types";
import { parseDraft, writeDraftToFrontmatter } from "./draft-serialization";
import {
  Draft,
  IndentedScene,
  InkswellProjectData,
  ProjectGoals,
  ProjectOverview,
  SeriesInfo,
} from "./types";
import type { BeatAssignment, BeatSheet } from "../outliner/beat-templates";
import { renameSceneInBeats, setAssignment } from "../outliner/beats";
import { rebaseSceneOrder } from "../outliner/outline";
import type { Plotline } from "../outliner/plotgrid";
import type { StructureGroup } from "../outliner/structure";
import type { RevisionDecision } from "../revisions/types";
import type { ChecklistItem, ChecklistTier, RevisionChecklistData } from "../revisions/checklist";
import { setChecklistItem } from "../revisions/checklist";
import type { StyleEntry } from "../revisions/stylesheet";

/**
 * Write a full draft object to the index note's `longform` frontmatter.
 * CREATE-TIME ONLY: this replaces the whole block with a caller-built draft, so
 * it's correct for brand-new index notes (new project, draft copy) and nothing
 * else. Live edits go through {@link updateScenes} / {@link updateDraftFields},
 * which transform the CURRENT stored draft.
 */
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
 * Parse the CURRENT draft out of a frontmatter object (inside a
 * processFrontMatter callback), or null when the note isn't a Longform index.
 */
function currentDraft(fm: Record<string, unknown>, indexFile: TFile): Draft | null {
  return parseDraft(fm["longform"], indexFile.basename);
}

/**
 * Apply a transform to the multi-scene draft's scene list and persist the
 * result. The draft — scene list included — is parsed from the file's CURRENT
 * frontmatter inside `processFrontMatter`, never taken from a caller snapshot:
 * a transform computed from a stale panel can therefore mis-position an entry
 * at worst, but can no longer drop scenes created (or resurrect scenes
 * deleted) since the panel rendered. No-op when the index isn't multi-scene.
 */
export async function updateScenes(
  app: App,
  indexFile: TFile,
  transform: (scenes: IndentedScene[]) => IndentedScene[]
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const draft = currentDraft(fm, indexFile);
    if (!draft || draft.format !== "scenes") return;
    writeDraftToFrontmatter(fm, { ...draft, scenes: transform(draft.scenes) });
  });
}

/**
 * Transform the CURRENT stored draft's non-structural fields (title, draftTitle,
 * ignoredFiles, …). Replaces whole-draft `persistDraft` calls from render-time
 * snapshots, which rewrote `longform.scenes` from stale state as a side effect.
 */
export async function updateDraftFields(
  app: App,
  indexFile: TFile,
  transform: (current: Draft) => Draft
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const draft = currentDraft(fm, indexFile);
    if (!draft) return;
    writeDraftToFrontmatter(fm, transform(draft));
  });
}

/**
 * Rename a scene everywhere the index refers to it — the `longform.scenes`
 * title and any beat→scene links — in ONE processFrontMatter transaction, all
 * computed against current state. Replaces the old two-write sequences
 * (scenes map, then beats), which left a window where a concurrent write could
 * interleave and where beats briefly pointed at a dead title.
 */
export async function renameSceneInIndex(
  app: App,
  indexFile: TFile,
  oldTitle: string,
  newTitle: string
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const draft = currentDraft(fm, indexFile);
    if (draft && draft.format === "scenes") {
      writeDraftToFrontmatter(fm, {
        ...draft,
        scenes: draft.scenes.map((s) => (s.title === oldTitle ? { ...s, title: newTitle } : s)),
      });
    }
    const inkswell = { ...asRecord(fm["inkswell"]) };
    const raw = inkswell["beats"];
    const sheet = raw && typeof raw === "object" ? (raw as BeatSheet) : undefined;
    const next = renameSceneInBeats(sheet, oldTitle, newTitle);
    if (next) {
      inkswell["beats"] = next;
      fm["inkswell"] = inkswell;
    }
  });
}

/**
 * Persist a full outline (manuscript order + acts + chapters config) in ONE
 * processFrontMatter transaction. The desired order is rebased onto the CURRENT
 * scene list ({@link rebaseSceneOrder}), so an outline serialized from a stale
 * tree can't drop concurrently-created scenes or resurrect deleted ones. The
 * acts/chapters arrays are whole-array by design — the outline editor owns
 * them; the single transaction is the mitigation for that residual.
 */
export async function persistOutline(
  app: App,
  indexFile: TFile,
  outline: { order: IndentedScene[]; acts: StructureGroup[]; chapters: StructureGroup[] }
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const draft = currentDraft(fm, indexFile);
    if (draft && draft.format === "scenes") {
      writeDraftToFrontmatter(fm, {
        ...draft,
        scenes: rebaseSceneOrder(outline.order, draft.scenes),
      });
    }
    const inkswell = { ...asRecord(fm["inkswell"]) };
    if (outline.acts.length === 0) delete inkswell["acts"];
    else inkswell["acts"] = outline.acts;
    if (outline.chapters.length === 0) delete inkswell["chapters"];
    else inkswell["chapters"] = outline.chapters;
    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
}

/**
 * Persist a beat-scaffold's index changes — appended scenes, optional
 * acts/chapters config, and beat→scene links — in ONE transaction (previously
 * four sequential writes). Everything is checked against CURRENT state: scene
 * additions are dup-guarded by title, and a beat link is only applied where the
 * current assignment is empty (a note or link saved while the scaffold ran is
 * never overwritten). Returns how many scenes were actually appended.
 */
export async function persistScaffoldIndex(
  app: App,
  indexFile: TFile,
  patch: {
    additions: IndentedScene[];
    acts?: StructureGroup[];
    chapters?: StructureGroup[];
    /** beat id → scene title to link (skipped where already assigned). */
    beatLinks: ReadonlyMap<string, string>;
    /** Template id for a sheet created from scratch by the links. */
    templateId: string;
  }
): Promise<{ addedScenes: number }> {
  let addedScenes = 0;
  await app.fileManager.processFrontMatter(indexFile, (fm: Record<string, unknown>) => {
    const draft = currentDraft(fm, indexFile);
    if (draft && draft.format === "scenes") {
      const have = new Set(draft.scenes.map((s) => s.title));
      const additions = patch.additions.filter((s) => !have.has(s.title));
      addedScenes = additions.length;
      writeDraftToFrontmatter(fm, { ...draft, scenes: [...draft.scenes, ...additions] });
    }

    const inkswell = { ...asRecord(fm["inkswell"]) };
    if (patch.acts) {
      if (patch.acts.length === 0) delete inkswell["acts"];
      else inkswell["acts"] = patch.acts;
    }
    if (patch.chapters) {
      if (patch.chapters.length === 0) delete inkswell["chapters"];
      else inkswell["chapters"] = patch.chapters;
    }

    const raw = inkswell["beats"];
    let sheet: BeatSheet =
      raw && typeof raw === "object"
        ? (raw as BeatSheet)
        : { template: patch.templateId, assignments: {} };
    let linked = false;
    for (const [beatId, title] of patch.beatLinks) {
      const cur = sheet.assignments[beatId] as
        | (BeatAssignment & { scene?: string })
        | undefined;
      if (cur?.scenes?.length || cur?.scene) continue;
      sheet = setAssignment(sheet, beatId, { scenes: [title] });
      linked = true;
    }
    if (linked) inkswell["beats"] = sheet;

    if (Object.keys(inkswell).length === 0) delete fm["inkswell"];
    else fm["inkswell"] = inkswell;
  });
  return { addedScenes };
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

/**
 * Mutate the compile config against its CURRENT stored value (or a fresh
 * default seeded with `fallbackFormat`). The mutator receives a clone, edits it
 * in place, and the result is written back — two panel edits issued from the
 * same rendered state therefore compose instead of overwriting each other.
 */
export async function updateCompile(
  app: App,
  indexFile: TFile,
  fallbackFormat: OutputFormat,
  mutate: (config: CompileConfig) => void
): Promise<void> {
  await updateInkswellKey(app, indexFile, "compile", (raw) => {
    const config = resolveCompileValue(raw, fallbackFormat);
    mutate(config);
    return config;
  });
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
 * Transform the plotline config list against its CURRENT stored state (the
 * Plot Grid's pure ops — upsert/move/remove by stable id — compose here, so a
 * color change and a reorder issued from the same rendered grid both land).
 * A transform returning its input unchanged skips the write; an emptied list
 * deletes the key.
 */
export async function updatePlotlines(
  app: App,
  indexFile: TFile,
  transform: (current: Plotline[]) => Plotline[]
): Promise<void> {
  await updateInkswellKey(app, indexFile, "plotlines", (raw) => {
    const current = asArray<Plotline>(raw);
    const next = transform(current);
    if (next === current) return raw; // pure-op no-op — keep what's stored
    return next.length === 0 ? undefined : next;
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
