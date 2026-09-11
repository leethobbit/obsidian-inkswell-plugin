/**
 * Shared vault-image helpers: what counts as an image, resolving a stored path
 * to a displayable URL, picking an existing image with a fuzzy modal, and
 * writing an uploaded File into the vault. Used by project covers
 * (projects/cover.ts) and codex entry portraits (codex/codex-panel.ts).
 */

import { App, FuzzySuggestModal, TFile } from "obsidian";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"];

export function isImage(file: TFile): boolean {
  return IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
}

/** Resolve a stored vault path to a displayable `app://…?<mtime>` URL, or null if missing. */
export function resolveImageSrc(app: App, path: string | undefined): string | null {
  if (!path) return null;
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? app.vault.getResourcePath(file) : null;
}

/** File extension for an uploaded image: from its name, else its MIME subtype, else png. */
export function extensionFor(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  if (IMAGE_EXTENSIONS.includes(ext)) return ext;
  const sub = file.type.split("/")[1]?.toLowerCase();
  return sub && IMAGE_EXTENSIONS.includes(sub) ? sub : "png";
}

/** Write an uploaded image to `path` (replacing a same-path file in place). */
export async function writeImageBinary(app: App, path: string, file: File): Promise<TFile> {
  const data = await file.arrayBuffer();
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.vault.modifyBinary(existing, data);
    return existing;
  }
  return app.vault.createBinary(path, data);
}

/** Fuzzy-pick an image already in the vault. Resolves with the file, or null if dismissed. */
export function pickVaultImage(
  app: App,
  placeholder = "Choose an image from the vault…"
): Promise<TFile | null> {
  return new Promise((resolve) => {
    new ImageSuggestModal(app, placeholder, resolve).open();
  });
}

class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile | null) => void;
  private resolved = false;

  constructor(app: App, placeholder: string, onChoose: (file: TFile | null) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(placeholder);
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
    // onClose could resolve null before the picked file arrived, so choosing
    // from the vault silently did nothing.
    window.setTimeout(() => {
      if (!this.resolved) this.onChoose(null);
    }, 0);
  }
}
