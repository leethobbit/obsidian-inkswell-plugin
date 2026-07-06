/**
 * Cover-art file handling for a project. Two ways to set a cover, both ending in
 * a single `inkswell.overview.cover` vault path:
 *   - Upload: copy an external image into the project folder as `cover.<ext>`.
 *   - Pick existing: reference an image already in the vault, in place (no copy).
 *
 * All image concerns live here so the explorer view stays a view. Cleanup only
 * ever deletes a cover file *we* created (project folder, named `cover.*`) — a
 * referenced vault image is never touched, only repointed.
 */

import { App, FuzzySuggestModal, TFile } from "obsidian";
import { Project } from "./types";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"];

function isImage(file: TFile): boolean {
  return IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
}

/** Resolve a stored cover path to a displayable `app://…?<mtime>` URL, or null if missing. */
export function resolveCoverSrc(app: App, path: string | undefined): string | null {
  if (!path) return null;
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? app.vault.getResourcePath(file) : null;
}

/** The project's folder = the index note's parent (vault root → ""). */
function projectFolder(project: Project): string {
  const slash = project.vaultPath.lastIndexOf("/");
  return slash === -1 ? "" : project.vaultPath.slice(0, slash);
}

/** True if `path` is a cover file we created (in the project folder, named `cover.*`). */
function isOwnedCover(project: Project, path: string | undefined): boolean {
  if (!path) return false;
  const folder = projectFolder(project);
  const prefix = folder ? `${folder}/cover.` : "cover.";
  return path.startsWith(prefix);
}

function extensionFor(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  if (IMAGE_EXTENSIONS.includes(ext)) return ext;
  // Fall back to the MIME subtype (e.g. image/png → png), else png.
  const sub = file.type.split("/")[1]?.toLowerCase();
  return sub && IMAGE_EXTENSIONS.includes(sub) ? sub : "png";
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

  const data = await file.arrayBuffer();
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) await app.vault.modifyBinary(existing, data);
  else await app.vault.createBinary(path, data);
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

/** Fuzzy-pick an image already in the vault. Resolves with the file, or null if dismissed. */
export function pickVaultImage(app: App): Promise<TFile | null> {
  return new Promise((resolve) => {
    const modal = new ImageSuggestModal(app, resolve);
    modal.open();
  });
}

class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile | null) => void;
  private resolved = false;

  constructor(app: App, onChoose: (file: TFile | null) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a cover image from the vault…");
  }

  getItems(): TFile[] {
    return this.app.vault.getFiles().filter(isImage);
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.resolved = true;
    this.onChoose(file);
  }

  onClose(): void {
    super.onClose();
    // A selection fires onChooseItem right around when the modal closes, and
    // Obsidian doesn't guarantee onChooseItem runs before onClose. Defer the
    // "dismissed" result to the next tick and skip it if a choice landed — else
    // onClose could resolve null before the picked file arrived, so choosing a
    // cover from the vault silently did nothing.
    window.setTimeout(() => {
      if (!this.resolved) this.onChoose(null);
    }, 0);
  }
}
