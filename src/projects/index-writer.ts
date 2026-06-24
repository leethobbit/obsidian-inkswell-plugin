/**
 * Persists project changes back to the index note.
 *
 * Uses `fileManager.processFrontMatter`, the only Obsidian API that edits a
 * note's frontmatter without rewriting its body. We only ever write to the index
 * note, and only its frontmatter — scene files are never touched. This upholds
 * Longform's core invariant.
 */

import { App, TFile } from "obsidian";
import { writeDraftToFrontmatter } from "./draft-serialization";
import { Draft, IndentedScene, MultipleSceneDraft, InkswellProjectData, SeriesInfo } from "./types";

/** Write a full draft object to the index note's `longform` frontmatter. */
export async function persistDraft(
  app: App,
  indexFile: TFile,
  draft: Draft
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm) => {
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
 */
export async function persistInkswellData(
  app: App,
  indexFile: TFile,
  patch: Partial<InkswellProjectData>
): Promise<void> {
  await app.fileManager.processFrontMatter(indexFile, (fm) => {
    const existing =
      fm["inkswell"] && typeof fm["inkswell"] === "object" ? fm["inkswell"] : {};
    fm["inkswell"] = { ...existing, ...patch };
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
  await app.fileManager.processFrontMatter(indexFile, (fm) => {
    const inkswell: Record<string, unknown> =
      fm["inkswell"] && typeof fm["inkswell"] === "object" ? { ...fm["inkswell"] } : {};
    const publishing: Record<string, unknown> =
      inkswell["publishing"] && typeof inkswell["publishing"] === "object"
        ? { ...inkswell["publishing"] }
        : {};
    mutator(publishing);
    if (Object.keys(publishing).length === 0) delete inkswell["publishing"];
    else inkswell["publishing"] = publishing;
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
  await app.fileManager.processFrontMatter(indexFile, (fm) => {
    const existing: Record<string, unknown> =
      fm["inkswell"] && typeof fm["inkswell"] === "object" ? fm["inkswell"] : {};
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
