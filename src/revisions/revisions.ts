/**
 * Obsidian I/O for revision decisions. The pure list transforms live in
 * decisions.ts (and are re-exported here for convenience); this file only adds
 * persistence, writing the new list to the index note's `inkswell.revisions`
 * frontmatter — never touching scene bodies.
 */

import { App, TFile } from "obsidian";
import { persistInkswellData } from "../projects/index-writer";
import { Project } from "../projects/types";
import { RevisionDecision } from "./types";

export * from "./decisions";

/** Write a decision list back to the project index frontmatter. */
export async function persistRevisions(
  app: App,
  project: Project,
  list: RevisionDecision[]
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(file instanceof TFile)) return;
  await persistInkswellData(app, file, { revisions: list });
}
