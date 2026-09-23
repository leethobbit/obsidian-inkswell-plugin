/**
 * Cover-art actions shared by the Home hero card and the project ⋯ menu:
 * upload (copy into the project folder), choose from the vault (reference in
 * place), remove. The cover is story-level, so callers pass the story's BASE
 * draft. File handling lives in cover.ts; this module is the menu + persistence.
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { cleanupOwnedCover, pickVaultImage, setCoverFromUpload } from "./cover";
import { persistOverview } from "./index-writer";
import { Project } from "./types";

/** Marks an index path as a self-write so the host softens the resulting refresh. */
type Mark = (path: string) => void;

function indexFile(app: App, project: Project): TFile | null {
  const f = app.vault.getAbstractFileByPath(project.vaultPath);
  return f instanceof TFile ? f : null;
}

/**
 * Append the cover items to `menu`. `inline` = the menu is *about* the cover
 * (hero card), so labels drop the word; otherwise they name it ("Upload cover…").
 */
export function addCoverMenuItems(
  menu: Menu,
  app: App,
  base: Project,
  mark: Mark,
  opts: { inline?: boolean } = {}
): void {
  const hasCover = !!base.inkswell?.overview?.cover;
  const label = (verb: string) => (opts.inline ? `${verb}…` : `${verb} cover…`);
  menu.addItem((i) =>
    i.setTitle(label("Upload")).setIcon("upload").onClick(() => uploadCover(app, base, mark))
  );
  menu.addItem((i) =>
    i
      .setTitle(opts.inline ? "Choose from vault…" : "Choose cover from vault…")
      .setIcon("image")
      .onClick(() => void chooseCover(app, base, mark))
  );
  if (hasCover) {
    if (opts.inline) menu.addSeparator();
    menu.addItem((i) =>
      i.setTitle("Remove cover").setIcon("trash").onClick(() => void removeCover(app, base, mark))
    );
  }
}

/** The hero card's cover menu: upload / choose from vault / remove. */
export function coverMenu(app: App, base: Project, mark: Mark): Menu {
  const menu = new Menu();
  addCoverMenuItems(menu, app, base, mark, { inline: true });
  return menu;
}

/** Open an OS file picker, copy the chosen image into the project folder, persist its path. */
export function uploadCover(app: App, base: Project, mark: Mark): void {
  const input = createEl("input", { type: "file" });
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const index = indexFile(app, base);
    if (!index) return;
    try {
      const path = await setCoverFromUpload(app, base, file);
      mark(index.path);
      await persistOverview(app, index, { cover: path });
    } catch (e) {
      console.error(e);
      new Notice("Couldn't set the cover image.");
    }
  };
  input.click();
}

export async function chooseCover(app: App, base: Project, mark: Mark): Promise<void> {
  const file = await pickVaultImage(app);
  if (!file) return;
  const index = indexFile(app, base);
  if (!index) return;
  mark(index.path);
  await tryFileOp(
    () => persistOverview(app, index, { cover: file.path }),
    "Couldn't set the cover image."
  );
}

export async function removeCover(app: App, base: Project, mark: Mark): Promise<void> {
  await tryFileOp(async () => {
    await cleanupOwnedCover(app, base);
    const index = indexFile(app, base);
    if (index) {
      mark(index.path);
      await persistOverview(app, index, { cover: "" });
    }
  }, "Couldn't remove the cover image.");
}
