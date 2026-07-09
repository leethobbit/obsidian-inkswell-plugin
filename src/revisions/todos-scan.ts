/**
 * Shared to-do scan: read each scene's body and collect its inline markers
 * (`[TODO:]`, `[RESEARCH:]`, `[NOTE:]`, `[DIALOGUE:]`, `[SCENE:]`) via the pure
 * `findGaps` scanner. Frontmatter is stripped first so token offsets/line numbers
 * match the Write editor's document (its doc is the body sans frontmatter).
 *
 * Used by both the Revise → Todos sweep and the Write → Revision sidebar, so the
 * project-wide scan lives in one place.
 */

import { App, TFile } from "obsidian";
import { GapHit, findGaps } from "../lib/placeholders";
import { stripFrontmatter } from "../lib/frontmatter";

export interface SceneTodos {
  title: string;
  path: string;
  todos: GapHit[];
}

/** Scan the given scenes for inline markers, returning only scenes that have any. */
export async function scanProjectTodos(
  app: App,
  scenes: { title: string; path: string | null }[]
): Promise<SceneTodos[]> {
  const groups: SceneTodos[] = [];
  for (const scene of scenes) {
    if (!scene.path) continue;
    const file = app.vault.getAbstractFileByPath(scene.path);
    if (!(file instanceof TFile)) continue;
    const body = stripFrontmatter(await app.vault.cachedRead(file));
    const todos = findGaps(body);
    if (todos.length) groups.push({ title: scene.title, path: scene.path, todos });
  }
  return groups;
}
