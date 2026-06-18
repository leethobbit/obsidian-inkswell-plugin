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
import { Draft, IndentedScene, MultipleSceneDraft, InkswellProjectData } from "./types";

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
