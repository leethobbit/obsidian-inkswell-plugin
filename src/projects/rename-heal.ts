/**
 * Self-healing for manually-renamed scene files.
 *
 * The index binds scenes to files by title (`<sceneFolder>/<title>.md`), so a
 * manual file rename orphans the file and leaves the index pointing at a missing
 * one. Two pure helpers drive the recovery (kept Obsidian-free so they're
 * unit-testable; the store/explorer supply the I/O):
 *
 *  - `planSceneRename` — given a vault rename event, decide whether it's a scene
 *    rename we can heal automatically, and how (Tier 1).
 *  - `reconcileSuggestions` — given a project, surface missing scenes + orphan
 *    files so the UI can offer a relink (Tier 2).
 *
 * Plus a tiny suppression registry so the app's OWN rename (which already updates
 * the index) doesn't also trigger a heal — avoiding a redundant/racing write.
 */

import type { Project } from "./types";

export interface RenamePlan {
  /** Vault path of the index note to rewrite. */
  indexPath: string;
  /** Current scene title in the index (to be replaced). */
  oldTitle: string;
  /** New title, derived from the renamed file's basename. */
  newTitle: string;
}

/**
 * Decide whether a vault rename is a healable scene rename.
 *
 * Matches the project/scene whose resolved path equals `oldPath` (the pre-rename
 * snapshot still resolves it there). Returns null when:
 *  - the file moved to a different folder (a title rewrite wouldn't re-resolve it;
 *    Tier 2 catches it as an orphan instead),
 *  - the title is unchanged, or
 *  - the new title already exists as a scene in that project (would clobber).
 */
export function planSceneRename(
  projects: Project[],
  oldPath: string,
  newPath: string
): RenamePlan | null {
  if (dirOf(oldPath) !== dirOf(newPath)) return null;
  const oldTitle = baseNoMd(oldPath);
  const newTitle = baseNoMd(newPath);
  if (!newTitle || oldTitle === newTitle) return null;

  for (const p of projects) {
    if (!p.scenes.some((s) => s.path === oldPath)) continue;
    if (p.scenes.some((s) => s.title === newTitle)) return null; // collision — don't clobber
    return { indexPath: p.vaultPath, oldTitle, newTitle };
  }
  return null;
}

export interface ReconcileSuggestions {
  /** Index scene titles that resolve to no file. */
  missing: string[];
  /** Files in the scene folder not listed in the index (and not ignored). */
  orphans: string[];
  /** The unambiguous rename (exactly one missing + one orphan), if any. */
  autoMatch: { oldTitle: string; newBasename: string } | null;
}

/** Missing scenes + orphan files for a project, with a 1:1 auto-match when clear. */
export function reconcileSuggestions(project: Project): ReconcileSuggestions {
  const missing = project.scenes.filter((s) => s.path === null).map((s) => s.title);
  const orphans = project.unknownFiles.slice();
  const autoMatch =
    missing.length === 1 && orphans.length === 1
      ? { oldTitle: missing[0], newBasename: orphans[0] }
      : null;
  return { missing, orphans, autoMatch };
}

// --- In-app-rename suppression -------------------------------------------------
// The app's own rename (scene-actions.renameScene) updates the index itself, so
// the rename event it triggers must NOT also heal (a redundant, racing write).
// renameScene registers the expected new path here; the store consumes it.

const expectedRenames = new Set<string>();

/** Mark a new path as an app-initiated rename so the store skips healing it. */
export function expectInAppRename(newPath: string): void {
  expectedRenames.add(newPath);
  // Defensive: if the rename event never arrives, don't suppress a later manual
  // rename to the same path forever.
  setTimeout(() => expectedRenames.delete(newPath), 2000);
}

/** Returns true (and clears) if `newPath` was an app-initiated rename. */
export function consumeExpectedRename(newPath: string): boolean {
  return expectedRenames.delete(newPath);
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

function baseNoMd(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base.replace(/\.md$/i, "");
}
