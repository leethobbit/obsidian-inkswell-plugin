/**
 * Obsidian I/O for draft management — the wrapper around the pure planner in
 * {@link ./draft-plan}. "New draft" is a *full copy* of an existing draft: the
 * index note is duplicated (carrying its `inkswell` planning data and body along
 * for free), its `longform` block is rewritten for the new draft, and every scene
 * file is copied byte-identically so the original manuscript is never touched —
 * Longform's core invariant.
 */

import { App, Notice, TFile, normalizePath } from "obsidian";
import { confirmDelete } from "../scenes/scene-actions";
import { planDraftCopy } from "./draft-plan";
import { persistDraft, persistInkswellData } from "./index-writer";
import { Project } from "./types";

/** Create a folder and any missing ancestors (mkdir -p), swallowing races. */
async function ensureFolderDeep(app: App, path: string): Promise<void> {
  const parts = normalizePath(path).split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cur)) {
      try {
        await app.vault.createFolder(cur);
      } catch {
        /* exists / race */
      }
    }
  }
}

/**
 * Create a new draft of `source` named `newName` (a full copy). `originalName`
 * names the original draft when it had no `draftTitle` yet (the lone original
 * being split). Returns the new index note, or null if it couldn't be created.
 */
export async function createDraft(
  app: App,
  source: Project,
  newName: string,
  originalName: string
): Promise<TFile | null> {
  const plan = planDraftCopy(source, newName, originalName);

  if (app.vault.getAbstractFileByPath(plan.indexPath)) {
    new Notice(`A draft note already exists at "${plan.indexPath}".`);
    return null;
  }
  const sourceIndex = app.vault.getAbstractFileByPath(plan.indexFrom);
  if (!(sourceIndex instanceof TFile)) {
    new Notice("Source draft index note not found.");
    return null;
  }

  for (const folder of plan.folders) await ensureFolderDeep(app, folder);

  // Copy the index note first: this brings its `inkswell` planning block and body
  // with it. persistDraft then overwrites only the `longform` block for the copy.
  // (read+create rather than Vault.copy, which needs Obsidian 1.8.7 > our floor.)
  const newIndex = await app.vault.create(plan.indexPath, await app.vault.read(sourceIndex));
  await persistDraft(app, newIndex, plan.newDraft);
  // The copy inherited the source's `inkswell` block (byte copy above), so overwrite
  // draftCreated with *now* — otherwise the new draft would carry the source's stamp.
  await persistInkswellData(app, newIndex, { draftCreated: new Date().toISOString() });

  // Copy each scene file (prose + scene frontmatter preserved verbatim).
  for (const c of plan.sceneCopies) {
    const f = app.vault.getAbstractFileByPath(c.from);
    if (f instanceof TFile) await app.vault.create(c.to, await app.vault.read(f));
  }

  // First split: give the original a name so both drafts read clearly in the switcher.
  if (plan.renameOriginalTo) {
    await persistDraft(app, sourceIndex, {
      ...source.draft,
      draftTitle: plan.renameOriginalTo,
      titleInFrontmatter: true,
    });
    // Backfill the original's creation stamp only if it never had one — never
    // clobber a real earlier value. Absent stays absent (pre-existing/unknown).
    if (!source.inkswell?.draftCreated) {
      await persistInkswellData(app, sourceIndex, { draftCreated: new Date().toISOString() });
    }
  }

  new Notice(`Created draft "${newName.trim()}".`);
  return newIndex;
}

/** Rename a draft by rewriting its `draftTitle` (file/folder left as-is). */
export async function renameDraft(app: App, project: Project, newName: string): Promise<void> {
  const index = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(index instanceof TFile)) return;
  await persistDraft(app, index, {
    ...project.draft,
    draftTitle: newName.trim(),
    titleInFrontmatter: true,
  });
}

/**
 * Delete a draft: trash its index note and scene files (recoverable). Blocked when
 * it's the story's only draft (that's deleting the whole project). Files are
 * trashed individually — never whole folders — so a sibling draft's content can
 * never be caught up in it. Returns whether the delete happened.
 */
export async function deleteDraft(
  app: App,
  project: Project,
  isOnlyDraft: boolean
): Promise<boolean> {
  if (isOnlyDraft) {
    new Notice("This is the story's only draft — delete the project from the file explorer instead.");
    return false;
  }
  const label = project.draft.draftTitle ?? project.draft.title;
  const ok = await confirmDelete(
    app,
    `Delete draft "${label}"? Its index note and scene files move to trash (recoverable).`
  );
  if (!ok) return false;

  const index = app.vault.getAbstractFileByPath(project.vaultPath);
  if (index instanceof TFile) await app.fileManager.trashFile(index);
  for (const s of project.scenes) {
    if (!s.path) continue;
    const f = app.vault.getAbstractFileByPath(s.path);
    if (f instanceof TFile) await app.fileManager.trashFile(f);
  }
  return true;
}
