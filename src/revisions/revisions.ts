/**
 * Obsidian I/O for revision decisions. The pure list transforms live in
 * decisions.ts (and are re-exported here for convenience); this file only adds
 * persistence, writing the new list to the index note's `inkswell.revisions`
 * frontmatter — never touching scene bodies.
 */

import { App, TFile } from "obsidian";
import { updateDecisions } from "../projects/index-writer";
import { Project } from "../projects/types";
import { RevisionDecision } from "./types";

export * from "./decisions";

/**
 * Transform the decision list against its CURRENT stored state (upsert/remove/
 * set-status by id, from decisions.ts) and persist the result. Callers never
 * pass a list built from a render-time snapshot — that snapshot goes stale
 * while the host defers rebuilds, and writing it wholesale erased concurrent
 * decisions (the stale-snapshot data-loss class).
 */
export async function persistRevisions(
  app: App,
  project: Project,
  transform: (current: RevisionDecision[]) => RevisionDecision[]
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(file instanceof TFile)) return;
  await updateDecisions(app, file, transform);
}
