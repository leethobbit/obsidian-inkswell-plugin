/**
 * Obsidian I/O for draft management — the wrapper around the pure planner in
 * {@link ./draft-plan}. "New draft" is a *full copy* of an existing draft: the
 * index note is duplicated (carrying its `inkswell` planning data and body along
 * for free), its `longform` block is rewritten for the new draft, and every scene
 * file is copied byte-identically so the original manuscript is never touched —
 * Longform's core invariant.
 */

import { App, Notice, TFile, normalizePath } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { confirmDelete } from "../scenes/scene-actions";
import { DraftDeletePlan, planDraftCopy, planDraftDelete } from "./draft-plan";
import { persistDraft, persistDraftCreated, updateDraftFields } from "./index-writer";
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
 * Create a new draft of `source` named `newName` (a full copy). `anchor` is the
 * story's base draft — the copy is placed under ITS folder's `Drafts/`, so
 * creating a draft from a copied draft never nests (`Drafts/A/Drafts/B/…`).
 * `originalName` names the original draft when it had no `draftTitle` yet (the
 * lone original being split). Returns the new index note, or null if it
 * couldn't be created.
 */
export async function createDraft(
  app: App,
  source: Project,
  anchor: Project,
  newName: string,
  originalName: string
): Promise<TFile | null> {
  const plan = planDraftCopy(source, anchor, newName, originalName);

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

  const newIndex = await tryFileOp(async () => {
    // Copy the index note first: this brings its `inkswell` planning block and body
    // with it. persistDraft then overwrites only the `longform` block for the copy.
    // (read+create rather than Vault.copy, which needs Obsidian 1.8.7 > our floor.)
    const index = await app.vault.create(plan.indexPath, await app.vault.read(sourceIndex));
    await persistDraft(app, index, plan.newDraft);
    // The copy inherited the source's `inkswell` block (byte copy above), so overwrite
    // draftCreated with *now* — otherwise the new draft would carry the source's stamp.
    await persistDraftCreated(app, index, new Date().toISOString());

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
        await persistDraftCreated(app, sourceIndex, new Date().toISOString());
      }
    }
    return index;
  }, `Couldn't create draft "${newName.trim()}" — some files may have been partly written; check the "${plan.indexPath}" folder.`);
  if (!newIndex) return null;

  new Notice(`Created draft "${newName.trim()}".`);
  return newIndex;
}

/** Rename a draft by rewriting its `draftTitle` (file/folder left as-is). */
export async function renameDraft(app: App, project: Project, newName: string): Promise<void> {
  const index = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(index instanceof TFile)) return;
  // Field-level transform of the CURRENT draft — a whole-draft write from the
  // panel snapshot would rewrite `longform.scenes` from stale state too.
  await tryFileOp(
    () =>
      updateDraftFields(app, index, (d) => ({
        ...d,
        draftTitle: newName.trim(),
        titleInFrontmatter: true,
      })),
    "Couldn't rename the draft."
  );
}

/** The confirm text for deleting a draft, naming any scene files that stay. */
function deleteDraftMessage(label: string, plan: DraftDeletePlan): string {
  const head = `Delete draft "${label}"?`;
  const kept = plan.kept.length;
  if (kept === 0) return `${head} Its index note and scene files move to trash (recoverable).`;
  if (plan.trash.length === 0) {
    return `${head} Its index note moves to trash (recoverable). Its scene files stay: another draft uses the same ones.`;
  }
  const trashed = plan.trash.length;
  return (
    `${head} Its index note and ${trashed} scene ${trashed === 1 ? "file" : "files"} move to trash (recoverable). ` +
    `${kept} other scene ${kept === 1 ? "file stays" : "files stay"}: another draft uses ${kept === 1 ? "it" : "them"} too.`
  );
}

/**
 * Delete a draft: trash its index note and scene files (recoverable). Blocked when
 * it's the story's only draft (that's deleting the whole project). Files are
 * trashed individually — never whole folders — and a scene file another project
 * also resolves to is left alone ({@link planDraftDelete}): a sync conflict copy
 * of an index shares the real draft's scene folder. `getProjects` is read again
 * after the confirm, so a file that became shared while the dialog was open is
 * kept too. Returns whether the delete happened.
 */
export async function deleteDraft(
  app: App,
  project: Project,
  isOnlyDraft: boolean,
  getProjects: () => readonly Project[]
): Promise<boolean> {
  if (isOnlyDraft) {
    new Notice("This is the story's only draft — delete the project from the file explorer instead.");
    return false;
  }
  const label = project.draft.draftTitle ?? project.draft.title;
  const plan = planDraftDelete(project, getProjects());
  if (!(await confirmDelete(app, deleteDraftMessage(label, plan)))) return false;

  // Trash only what the dialog promised AND is still unshared now.
  const stillUnshared = new Set(planDraftDelete(project, getProjects()).trash);
  const trash = plan.trash.filter((p) => stillUnshared.has(p));
  const done = await tryFileOp(async () => {
    const index = app.vault.getAbstractFileByPath(project.vaultPath);
    if (index instanceof TFile) await app.fileManager.trashFile(index);
    for (const path of trash) {
      const f = app.vault.getAbstractFileByPath(path);
      if (f instanceof TFile) await app.fileManager.trashFile(f);
    }
  }, `Couldn't delete draft "${label}".`);
  return done !== null;
}
