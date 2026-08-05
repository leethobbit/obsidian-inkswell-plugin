/**
 * Path→category classification for word-count attribution.
 *
 * Pure on purpose: `buildClassifierIndex` reduces the project list to plain
 * sets/lists, and `classifyPath` is a lookup over them — both unit-testable
 * without Obsidian. The one impure input, "does this note carry a `codex:`
 * frontmatter key", enters as a boolean (codex membership is governed by that
 * key, never by folder — see codex-store.ts).
 *
 * Classification runs per keystroke (editor-change → applyCount), so the index
 * is prebuilt once per project-list change and lookups stay a few Set hits.
 */

import { resolveCompileConfig } from "../compile/config";
import { planningNotePath } from "../plan/planning-note";
import { isAncestorFolder, projectFolder } from "../projects/stories";
import { Project, isMultiScene } from "../projects/types";
import { WordCategory } from "./types";

export interface ClassifierIndex {
  /** Resolved multi-scene file paths + single-note projects' own files. */
  scenePaths: Set<string>;
  /** Stored `overview.planningNote` pointers ∪ each project's default path. */
  planningPaths: Set<string>;
  /** Multi-scene index notes (classify as "other", never manuscript). */
  indexPaths: Set<string>;
  /** Markdown compile outputs — a recompile must never count as writing. */
  compileOutputs: Set<string>;
  /** Project folders (index-note parents). Vault root ("") is excluded so a
   * root-indexed project can't swallow the whole vault into "other". */
  projectFolders: string[];
  /** Resolved scene folders, same root guard. */
  sceneFolders: string[];
}

/** Dirname of a vault path ("" for root-level files). */
function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Scene folder for a multi-scene project (mirrors ProjectStore.resolveSceneFolder). */
function sceneFolderOf(project: Project, sceneFolder: string): string {
  const base = projectFolder(project);
  const rel = (sceneFolder || "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!rel) return base;
  return base ? `${base}/${rel}` : rel;
}

export function buildClassifierIndex(projects: Project[]): ClassifierIndex {
  const index: ClassifierIndex = {
    scenePaths: new Set(),
    planningPaths: new Set(),
    indexPaths: new Set(),
    compileOutputs: new Set(),
    projectFolders: [],
    sceneFolders: [],
  };
  const folders = new Set<string>();
  const sceneFolders = new Set<string>();

  for (const p of projects) {
    if (isMultiScene(p.draft)) {
      for (const scene of p.scenes) {
        if (scene.path) index.scenePaths.add(scene.path);
      }
      index.indexPaths.add(p.vaultPath);
      sceneFolders.add(sceneFolderOf(p, p.draft.sceneFolder));
    } else {
      // A single-note project's file IS the manuscript.
      index.scenePaths.add(p.vaultPath);
    }

    const stored = p.inkswell?.overview?.planningNote;
    if (stored && stored.trim()) index.planningPaths.add(stored);
    index.planningPaths.add(planningNotePath(p));

    const folder = projectFolder(p);
    const basename = resolveCompileConfig(p).targetBasename;
    if (basename) {
      index.compileOutputs.add(folder ? `${folder}/${basename}.md` : `${basename}.md`);
    }
    folders.add(folder);
  }

  // Root guard: "" (vault root) would make every path project-adjacent.
  folders.delete("");
  sceneFolders.delete("");
  index.projectFolders = [...folders];
  index.sceneFolders = [...sceneFolders];
  return index;
}

/**
 * Classify a markdown file path, first match wins:
 *   compile output → null · scene → planning → codex → other → null.
 *
 * Codex beats "other" so co-located codex notes count as codex, but loses to
 * scene/planning so a listed scene with a stray `codex:` key stays manuscript.
 * Returns null for files unrelated to any project — those are never logged.
 */
export function classifyPath(
  path: string,
  index: ClassifierIndex,
  isCodex: boolean
): WordCategory | null {
  if (index.compileOutputs.has(path)) return null;
  if (index.scenePaths.has(path)) return "scene";
  if (index.planningPaths.has(path)) return "planning";
  if (isCodex) return "codex";
  if (index.indexPaths.has(path)) return "other";
  const parent = parentOf(path);
  for (const folder of index.projectFolders) {
    if (isAncestorFolder(folder, parent)) return "other";
  }
  for (const folder of index.sceneFolders) {
    if (isAncestorFolder(folder, parent)) return "other";
  }
  return null;
}
