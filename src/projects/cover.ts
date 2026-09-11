/**
 * Cover-art file handling for a project. Two ways to set a cover, both ending in
 * a single `inkswell.overview.cover` vault path:
 *   - Upload: copy an external image into the project folder as `cover.<ext>`.
 *   - Pick existing: reference an image already in the vault, in place (no copy).
 *
 * The generic image plumbing (extensions, resolve-to-URL, vault picker, binary
 * write) lives in lib/images.ts and is shared with codex portraits; this module
 * owns only what is project-specific. Cleanup only ever deletes a cover file
 * *we* created (project folder, named `cover.*`) — a referenced vault image is
 * never touched, only repointed.
 */

import { App, TFile } from "obsidian";
import {
  extensionFor,
  pickVaultImage as pickImage,
  resolveImageSrc,
  writeImageBinary,
} from "../lib/images";
import { projectFolder } from "./stories";
import { Project } from "./types";

export { IMAGE_EXTENSIONS } from "../lib/images";

/** Resolve a stored cover path to a displayable `app://…?<mtime>` URL, or null if missing. */
export const resolveCoverSrc: (app: App, path: string | undefined) => string | null =
  resolveImageSrc;

/** True if `path` is a cover file we created (in the project folder, named `cover.*`). */
function isOwnedCover(project: Project, path: string | undefined): boolean {
  if (!path) return false;
  const folder = projectFolder(project);
  const prefix = folder ? `${folder}/cover.` : "cover.";
  return path.startsWith(prefix);
}

/**
 * Copy an uploaded image into the project folder as `cover.<ext>` and return its
 * vault path. Replaces an existing same-path file in place; if a previous owned
 * cover had a different extension, it's removed first so we don't orphan it.
 */
export async function setCoverFromUpload(app: App, project: Project, file: File): Promise<string> {
  const folder = projectFolder(project);
  const path = folder ? `${folder}/cover.${extensionFor(file)}` : `cover.${extensionFor(file)}`;

  const prev = project.inkswell?.overview?.cover;
  if (isOwnedCover(project, prev) && prev !== path) await removeCoverFile(app, prev);

  await writeImageBinary(app, path, file);
  return path;
}

/** Trash a cover file by path (silently ignores a missing/non-file path).
 *  Trash, not delete — recoverable, matching every other deletion in the app. */
export async function removeCoverFile(app: App, path: string | undefined): Promise<void> {
  if (!path) return;
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) await app.fileManager.trashFile(file);
}

/** If the project owns its current cover file, delete it. Called on remove/replace. */
export async function cleanupOwnedCover(app: App, project: Project): Promise<void> {
  const prev = project.inkswell?.overview?.cover;
  if (isOwnedCover(project, prev)) await removeCoverFile(app, prev);
}

/** Fuzzy-pick a cover image already in the vault. Resolves with the file, or null if dismissed. */
export function pickVaultImage(app: App): Promise<TFile | null> {
  return pickImage(app, "Choose a cover image from the vault…");
}
