/**
 * Archive / unarchive — "out of sight" only. An archived story leaves Home's
 * shelves and the project picker; nothing is deleted, and goals, history,
 * compile, search and codex scope all keep working.
 *
 * The flag is story-level and written to EVERY draft (read off the base draft):
 * a new draft byte-copies its source's index, so it is born with the right
 * state, and a stale sibling can never resurrect the old state if the base
 * draft is deleted. Writes go through the `writeArchived` delta writer (one
 * `inkswell` key, current state inside processFrontMatter — gotcha 10).
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { Series } from "../series/series";
import { writeArchived } from "./index-writer";
import { storyDrafts } from "./stories";
import { Project } from "./types";

/** Every index path to write: all drafts of each given book's story, deduped. */
function draftPaths(books: readonly Project[], projects: Project[]): string[] {
  const paths = new Set<string>();
  for (const b of books) for (const d of storyDrafts(b, projects)) paths.add(d.vaultPath);
  return [...paths];
}

async function writeAll(
  app: App,
  paths: string[],
  archived: boolean,
  mark: (path: string) => void,
  failure: string
): Promise<boolean> {
  for (const p of paths) mark(p);
  const ok = await tryFileOp(async () => {
    for (const p of paths) {
      const f = app.vault.getAbstractFileByPath(p);
      if (f instanceof TFile) await writeArchived(app, f, archived);
    }
    return true;
  }, failure);
  return ok === true;
}

/** Archive or unarchive the story containing `project` (all its drafts). */
export function setStoryArchived(
  app: App,
  projects: Project[],
  project: Project,
  archived: boolean,
  mark: (path: string) => void = () => {}
): Promise<boolean> {
  return writeAll(
    app,
    draftPaths([project], projects),
    archived,
    mark,
    archived ? `Couldn't archive "${project.draft.title}".` : `Couldn't unarchive "${project.draft.title}".`
  );
}

/** Archive or unarchive every book of a series (all drafts of each). */
export function setSeriesArchived(
  app: App,
  projects: Project[],
  series: Series,
  archived: boolean,
  mark: (path: string) => void = () => {}
): Promise<boolean> {
  return writeAll(
    app,
    draftPaths(series.books, projects),
    archived,
    mark,
    archived ? `Couldn't archive the "${series.name}" series.` : `Couldn't unarchive the "${series.name}" series.`
  );
}
