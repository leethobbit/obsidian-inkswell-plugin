/**
 * Pure planning for "create a new draft" (a full copy of an existing draft).
 *
 * This computes the target layout — folders to create, file copies to make, and
 * the cloned {@link Draft} to persist — WITHOUT touching the vault, so it's
 * unit-testable. The Obsidian I/O that executes the plan lives beside it in
 * {@link ./draft-actions} (the pure/wrapper split the codebase enforces).
 *
 * A new draft lives at `<storyFolder>/Drafts/<name>/` with its own index note
 * (`<Title> — <name>.md`, a unique basename — the store groups drafts by the
 * frontmatter `title`, never the filename) and a `Scenes/` subfolder. Scene files
 * keep their titles/basenames, so the index's `scenes` list and any title-keyed
 * Inkswell data (revision log, beat assignments) still resolve in the copy.
 */

import { joinPath, parentFolder } from "../settings/folders";
import { Draft, Project } from "./types";

const sanitize = (name: string): string => name.trim().replace(/[\\/:*?"<>|]/g, "-");

/** Scene folder (relative to the new index note) that copied scenes land in. */
const DRAFT_SCENE_FOLDER = "Scenes";

export interface DraftCopyPlan {
  /** Source index note to copy (carries frontmatter + body, incl. `inkswell`). */
  indexFrom: string;
  /** New index note path. */
  indexPath: string;
  /** Folders that must exist before the copies run. */
  folders: string[];
  /** Scene-file copies (multi-scene only); empty for single-format drafts. */
  sceneCopies: { from: string; to: string }[];
  /** The cloned draft to write to the new index's `longform` frontmatter. */
  newDraft: Draft;
  /**
   * Name to give the *original* draft's `draftTitle` when it was previously unset
   * (the lone original being split), so both drafts read as named in the switcher.
   * Null when the original already has a `draftTitle`.
   */
  renameOriginalTo: string | null;
}

/**
 * Build the plan for copying `source` into a new draft named `newName`.
 * `originalName` is applied to the original draft only when it has no `draftTitle`.
 */
export function planDraftCopy(
  source: Project,
  newName: string,
  originalName: string
): DraftCopyPlan {
  const storyFolder = parentFolder(source.vaultPath);
  const draftFolder = joinPath(storyFolder, "Drafts", sanitize(newName));
  const indexPath = joinPath(draftFolder, `${sanitize(`${source.draft.title} — ${newName}`)}.md`);

  const renameOriginalTo = source.draft.draftTitle == null ? originalName.trim() : null;

  if (source.draft.format === "single") {
    return {
      indexFrom: source.vaultPath,
      indexPath,
      folders: [draftFolder],
      sceneCopies: [],
      newDraft: { ...source.draft, draftTitle: newName.trim(), titleInFrontmatter: true },
      renameOriginalTo,
    };
  }

  const sceneFolderPath = joinPath(draftFolder, DRAFT_SCENE_FOLDER);
  const sceneCopies = source.scenes
    .filter((s): s is typeof s & { path: string } => s.path != null)
    .map((s) => ({ from: s.path, to: joinPath(sceneFolderPath, `${s.title}.md`) }));

  return {
    indexFrom: source.vaultPath,
    indexPath,
    folders: [draftFolder, sceneFolderPath],
    sceneCopies,
    newDraft: {
      ...source.draft,
      draftTitle: newName.trim(),
      titleInFrontmatter: true,
      sceneFolder: DRAFT_SCENE_FOLDER,
    },
    renameOriginalTo,
  };
}
