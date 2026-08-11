/**
 * Never-clobbering backup notes for displaced prose. Used at the two forced-
 * displacement moments (Write-editor conflict resolution, compile overwrite)
 * and when a teardown save fails: whichever version of the text is about to be
 * replaced is first written to a visible vault folder, so no resolution choice
 * can silently destroy words. A visible folder (not `.trash`) — nothing was
 * deleted, the note syncs with the vault, and a Notice can name the exact file.
 */

import { App, normalizePath } from "obsidian";

export const CONFLICT_FOLDER = "Inkswell conflicts";

export type BackupLabel = "disk version" | "unsaved editor text";

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/** Filesystem-safe local timestamp, e.g. "2026-08-11 14.32.07". */
function stamp(now: Date): string {
  return (
    `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ` +
    `${two(now.getHours())}.${two(now.getMinutes())}.${two(now.getSeconds())}`
  );
}

/**
 * Write `content` to a new note under the conflicts folder and return its
 * path. Never overwrites: name collisions get a numeric suffix, and creation
 * races fall through to the next candidate. Throws only when every candidate
 * fails (surface that to the user — the text is about to be displaced).
 */
export async function writeConflictBackup(
  app: App,
  basename: string,
  label: BackupLabel,
  content: string
): Promise<string> {
  if (!app.vault.getAbstractFileByPath(CONFLICT_FOLDER)) {
    try {
      await app.vault.createFolder(CONFLICT_FOLDER);
    } catch {
      /* already exists / race — fine */
    }
  }
  const base = `${basename} (${label} ${stamp(new Date())})`;
  for (let n = 0; n < 50; n++) {
    const name = n === 0 ? base : `${base} ${n + 1}`;
    const path = normalizePath(`${CONFLICT_FOLDER}/${name}.md`);
    if (app.vault.getAbstractFileByPath(path)) continue;
    try {
      return (await app.vault.create(path, content)).path;
    } catch {
      /* creation race — try the next suffix */
    }
  }
  throw new Error(`Couldn't create a backup note in "${CONFLICT_FOLDER}".`);
}
