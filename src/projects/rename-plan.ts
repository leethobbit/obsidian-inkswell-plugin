/**
 * Pure planner for "Rename project" — decides every file move and frontmatter
 * patch a story-wide title change needs, so the I/O wrapper ({@link ./rename-project})
 * only executes. Obsidian-free and unit-tested.
 *
 * A project's name is really three loosely-coupled things (see AGENTS.md gotcha):
 *   - `longform.title` on EVERY draft of the story (story grouping + plan-note name),
 *   - the base draft's folder and index basename (`<Title>/<Title>.md`, as scaffolded),
 *   - the index basename again, as a codex `scope.projects` entry.
 * The planner renames whichever of those still follow the scaffold convention and
 * leaves anything the user has customised alone (a folder called `Book` stays
 * `Book`). Stored absolute paths (`overview.planningNote`, `overview.cover`,
 * `longform.sceneTemplate`) are remapped through the moves so nothing goes stale.
 */

import { sanitizeSegment } from "../settings/folders";
import { projectFolder } from "./stories";
import { Project } from "./types";

export interface PathMove {
  from: string;
  to: string;
}

export interface DraftPatch {
  /** Index path AFTER all moves — where the frontmatter write lands. */
  indexPath: string;
  title: string;
  /** Remapped stored paths; only present when the draft carried the field. */
  planningNote?: string;
  cover?: string;
  sceneTemplate?: string;
}

export interface ProjectRenamePlan {
  oldTitle: string;
  newTitle: string;
  /** Base draft's folder move, when it followed the `<Title>/` convention. */
  folderMove: PathMove | null;
  /** Index notes + planning note to rename, paths expressed AFTER `folderMove`. */
  fileMoves: PathMove[];
  /** One patch per draft of the story. */
  patches: DraftPatch[];
  /** Codex `scope.projects` basename rewrites implied by the index renames. */
  codexRenames: PathMove[];
  /** Every old→new path pair (folder prefix + file moves), for path-keyed caches. */
  remap: (path: string) => string;
}

export type RenameBlock =
  | { kind: "empty" }
  | { kind: "unchanged" }
  | { kind: "title-taken"; title: string }
  | { kind: "path-taken"; path: string };

export interface RenameOptions {
  /** Move folder/index/plan note too (not just the frontmatter title). */
  renameFiles: boolean;
  /** Does a vault entry already exist at this path? */
  exists: (path: string) => boolean;
  /** Every project in the vault (collision check against other stories' titles). */
  allProjects: Project[];
}

const dirOf = (p: string): string => {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
};
const baseOf = (p: string): string => p.slice(p.lastIndexOf("/") + 1);
const join = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name);

/** Replace a folder prefix (exact segment boundary), else return `path` unchanged. */
function moveUnder(path: string, from: string, to: string): string {
  if (path === from) return to;
  return path.startsWith(`${from}/`) ? `${to}${path.slice(from.length)}` : path;
}

/**
 * Plan a rename of the story `drafts` (base draft first) to `rawTitle`. Returns a
 * block reason instead of a plan when the rename can't proceed safely.
 */
export function planProjectRename(
  drafts: Project[],
  base: Project,
  rawTitle: string,
  opts: RenameOptions
): ProjectRenamePlan | RenameBlock {
  const newTitle = sanitizeSegment(rawTitle);
  if (!newTitle) return { kind: "empty" };
  const oldTitle = base.draft.title;
  if (newTitle === oldTitle) return { kind: "unchanged" };
  const storyPaths = new Set(drafts.map((d) => d.vaultPath));
  if (opts.allProjects.some((p) => !storyPaths.has(p.vaultPath) && p.draft.title === newTitle)) {
    return { kind: "title-taken", title: newTitle };
  }
  const oldSafe = sanitizeSegment(oldTitle);

  // --- Folder move (base draft only; sub-drafts live under its Drafts/) -------
  let folderMove: PathMove | null = null;
  const baseFolder = projectFolder(base);
  if (opts.renameFiles && baseFolder && baseOf(baseFolder) === oldSafe) {
    const to = join(dirOf(baseFolder), newTitle);
    if (opts.exists(to)) return { kind: "path-taken", path: to };
    folderMove = { from: baseFolder, to };
  }
  const afterFolder = (p: string): string =>
    folderMove ? moveUnder(p, folderMove.from, folderMove.to) : p;

  // --- File moves: index notes + planning note -------------------------------
  const fileMoves: PathMove[] = [];
  const codexRenames: PathMove[] = [];
  const addIndexMove = (draft: Project, newBase: string): void => {
    const from = afterFolder(draft.vaultPath);
    const to = join(dirOf(from), `${newBase}.md`);
    if (from === to) return;
    fileMoves.push({ from, to });
    codexRenames.push({ from: baseOf(draft.vaultPath).replace(/\.md$/i, ""), to: newBase });
  };
  if (opts.renameFiles) {
    for (const d of drafts) {
      const basename = baseOf(d.vaultPath).replace(/\.md$/i, "");
      if (basename === oldSafe) addIndexMove(d, newTitle);
      else if (basename.startsWith(`${oldSafe} — `)) {
        addIndexMove(d, `${newTitle}${basename.slice(oldSafe.length)}`);
      }
    }
    // Planning note: the stored pointer, else the conventional sibling — only
    // when it actually exists (it's created lazily on first Overview save).
    const stored = base.inkswell?.overview?.planningNote?.trim();
    const planNow = stored || join(projectFolder(base), `${oldSafe} — Plan.md`);
    if (baseOf(planNow) === `${oldSafe} — Plan.md` && opts.exists(planNow)) {
      const planFrom = afterFolder(planNow);
      fileMoves.push({ from: planFrom, to: join(dirOf(planFrom), `${newTitle} — Plan.md`) });
    }
  }
  const afterFiles = (p: string): string => {
    const q = afterFolder(p);
    return fileMoves.find((m) => m.from === q)?.to ?? q;
  };
  // Collision check on every destination against the vault AS IT IS NOW: map
  // each post-folder-move path back to where it currently lives. A path that is
  // itself a move source merely gets out of the way — not a collision.
  const preOf = (p: string): string =>
    folderMove ? moveUnder(p, folderMove.to, folderMove.from) : p;
  const currentSources = new Set(fileMoves.map((m) => preOf(m.from)));
  for (const m of fileMoves) {
    const now = preOf(m.to);
    if (!currentSources.has(now) && opts.exists(now)) return { kind: "path-taken", path: m.to };
  }

  // --- Frontmatter patches ---------------------------------------------------
  const patches: DraftPatch[] = drafts.map((d) => {
    const patch: DraftPatch = { indexPath: afterFiles(d.vaultPath), title: newTitle };
    const ov = d.inkswell?.overview;
    if (ov?.planningNote) patch.planningNote = afterFiles(ov.planningNote);
    if (ov?.cover) patch.cover = afterFiles(ov.cover);
    if (d.draft.format === "scenes" && d.draft.sceneTemplate) {
      patch.sceneTemplate = afterFiles(d.draft.sceneTemplate);
    }
    return patch;
  });

  // Path-form codex keys (`[[Books/B/Index]]`, written when index basenames
  // clash — see codex-scope.ts) go stale on ANY index move, folder rename
  // included, not only on a basename change.
  for (const d of drafts) {
    const to = afterFiles(d.vaultPath);
    if (to !== d.vaultPath) {
      codexRenames.push({ from: d.vaultPath.replace(/\.md$/i, ""), to: to.replace(/\.md$/i, "") });
    }
  }

  return { oldTitle, newTitle, folderMove, fileMoves, patches, codexRenames, remap: afterFiles };
}

export function isRenameBlock(x: ProjectRenamePlan | RenameBlock): x is RenameBlock {
  return "kind" in x;
}

/** Human message for a block reason. */
export function describeBlock(b: RenameBlock): string {
  switch (b.kind) {
    case "empty":
      return "Enter a project title.";
    case "unchanged":
      return "That's already the project's title.";
    case "title-taken":
      return `Another project is already called "${b.title}".`;
    case "path-taken":
      return `Something already exists at "${b.path}".`;
  }
}
