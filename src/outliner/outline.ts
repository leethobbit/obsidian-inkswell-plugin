/**
 * The Act › Chapter › Scene outline tree (pure, Obsidian-free, unit-tested).
 *
 * This is the authoritative structural model. The manuscript's flat, ordered
 * scene list (`longform.scenes`) and each scene's `act`/`chapter` strings are
 * DERIVED output that Inkswell writes from this tree — not the source of truth.
 * Compatibility is preserved: `serializeOutline` still yields a valid indented
 * scene list and the StoryLine-compatible scene strings.
 *
 * Identity: acts/chapters by stable `id` (from structure.ts); scenes by `title`
 * (a scene's title is its file basename — unique within a project, as Longform
 * requires). Nesting is optional — a chapter may be act-less (loose) and a scene
 * may be chapter-less (unassigned); those live in dedicated buckets.
 */

import { IndentedScene } from "../projects/types";
import { StructureGroup, newStructureId } from "./structure";

export interface SceneRef {
  title: string;
  path: string | null;
  indent: number;
}
export interface ChapterNode {
  id: string;
  title: string;
  targetWords?: number;
  scenes: SceneRef[];
}
export interface ActNode {
  id: string;
  title: string;
  chapters: ChapterNode[];
}
export interface OutlineTree {
  acts: ActNode[];
  /** Chapters not assigned to any act. */
  looseChapters: ChapterNode[];
  /** Scenes not assigned to any chapter. */
  unassignedScenes: SceneRef[];
}

/**
 * Reconstruct the tree from the stored config arrays + the manuscript scenes.
 *
 * The config arrays are authoritative for id/target/`actId` and for the order of
 * configured entries. But existing projects carry chapter/act *strings* on scenes
 * with little or no config — so we also **adopt** any chapter title or act string
 * that appears on a scene but isn't configured yet: derived chapters get a stable
 * title-based id (`c:<title>`), and a derived chapter's act is *inferred* from its
 * scenes' `act` string (a derived act gets id `a:<title>`). This makes the first
 * render mirror the project's current implicit structure; once the user drags or
 * edits, `applyOutline` persists everything explicitly. Deterministic (no random),
 * so it's unit-testable.
 *
 * Ordering: chapters sort by their first scene's manuscript position (empty ones
 * last, in config order); acts by config order, then derived acts by first
 * appearance. A scene with no (known) chapter is unassigned.
 */
export function buildOutline(
  acts: StructureGroup[] | undefined,
  chapters: StructureGroup[] | undefined,
  scenes: Array<{ title: string; path: string | null; indent: number; chapter?: string; act?: string }>
): OutlineTree {
  const chapterCfg = chapters ?? [];
  const actCfg = acts ?? [];
  const cfgByTitle = new Map(chapterCfg.map((c) => [c.title, c] as const));
  const actCfgById = new Map(actCfg.map((a) => [a.id, a] as const));
  const actCfgByTitle = new Map(actCfg.map((a) => [a.title, a] as const));

  // 1. Gather chapters: scenes (manuscript order), first index, and an act guess
  //    from the scenes' act strings (first non-blank wins).
  interface Agg { scenes: SceneRef[]; firstIdx: number; actGuess?: string }
  const byChapter = new Map<string, Agg>();
  const unassignedScenes: SceneRef[] = [];
  scenes.forEach((s, i) => {
    const ref: SceneRef = { title: s.title, path: s.path, indent: s.indent };
    const ch = (s.chapter ?? "").trim();
    if (!ch) {
      unassignedScenes.push(ref);
      return;
    }
    const agg = byChapter.get(ch) ?? { scenes: [], firstIdx: i };
    agg.scenes.push(ref);
    if (agg.actGuess === undefined && (s.act ?? "").trim()) agg.actGuess = (s.act ?? "").trim();
    byChapter.set(ch, agg);
  });
  // Configured chapters with no scenes yet (planned/empty).
  for (const c of chapterCfg) {
    if (!byChapter.has(c.title)) byChapter.set(c.title, { scenes: [], firstIdx: Number.POSITIVE_INFINITY });
  }

  // 2. Resolve each chapter's node + its act id (config wins; else inferred).
  const derivedActId = (title: string) => `a:${title}`;
  const chapterActId = new Map<string, string | null>();
  const chapterNode = new Map<string, ChapterNode>();
  const orderedTitles = [...byChapter.keys()].sort((a, b) => byChapter.get(a)!.firstIdx - byChapter.get(b)!.firstIdx);
  for (const title of orderedTitles) {
    const cfg = cfgByTitle.get(title);
    const agg = byChapter.get(title)!;
    let actId: string | null = null;
    if (cfg?.actId && actCfgById.has(cfg.actId)) actId = cfg.actId;
    else if (agg.actGuess) actId = actCfgByTitle.get(agg.actGuess)?.id ?? derivedActId(agg.actGuess);
    chapterActId.set(title, actId);
    chapterNode.set(title, {
      id: cfg?.id ?? `c:${title}`,
      title,
      ...(cfg?.targetWords ? { targetWords: cfg.targetWords } : {}),
      scenes: agg.scenes,
    });
  }

  // 3. Build the act list: configured acts (array order) + derived acts (by first
  //    appearance among chapters), then attach chapters. Chapters with no act are loose.
  const actNodeById = new Map<string, ActNode>();
  const actOrder: ActNode[] = [];
  const ensureAct = (id: string, title: string) => {
    let node = actNodeById.get(id);
    if (!node) {
      node = { id, title, chapters: [] };
      actNodeById.set(id, node);
      actOrder.push(node);
    }
    return node;
  };
  for (const a of actCfg) ensureAct(a.id, a.title); // configured acts first, in array order
  const looseChapters: ChapterNode[] = [];
  for (const title of orderedTitles) {
    const node = chapterNode.get(title)!;
    const actId = chapterActId.get(title);
    if (!actId) {
      looseChapters.push(node);
      continue;
    }
    const actTitle = actCfgById.get(actId)?.title ?? actId.replace(/^a:/, "");
    ensureAct(actId, actTitle).chapters.push(node);
  }

  return { acts: actOrder, looseChapters, unassignedScenes };
}

export interface OutlineWrites {
  /** New manuscript order (flattened tree). */
  order: IndentedScene[];
  /** sceneTitle → chapter string to write ("" clears). */
  sceneChapter: Map<string, string>;
  /** sceneTitle → act string to write ("" clears). */
  sceneAct: Map<string, string>;
  /** Rebuilt acts config array (order preserved). */
  acts: StructureGroup[];
  /** Rebuilt chapters config array (order = acts' chapters then loose; actId set). */
  chapters: StructureGroup[];
}

/**
 * Flatten the tree back into the derived writes. Manuscript order is
 * act→chapter→scene, then loose chapters' scenes, then unassigned scenes. Each
 * scene keeps its own `indent`. Scene strings are denormalized: a scene's
 * `chapter` = its chapter title, its `act` = that chapter's act title (blank when
 * loose/unassigned).
 */
export function serializeOutline(tree: OutlineTree): OutlineWrites {
  const order: IndentedScene[] = [];
  const sceneChapter = new Map<string, string>();
  const sceneAct = new Map<string, string>();
  const acts: StructureGroup[] = [];
  const chapters: StructureGroup[] = [];

  const emitChapter = (c: ChapterNode, actTitle: string, actId: string | undefined) => {
    chapters.push({
      id: c.id,
      title: c.title,
      ...(c.targetWords ? { targetWords: c.targetWords } : {}),
      ...(actId ? { actId } : {}),
    });
    for (const s of c.scenes) {
      order.push({ title: s.title, indent: s.indent });
      sceneChapter.set(s.title, c.title);
      sceneAct.set(s.title, actTitle);
    }
  };

  for (const a of tree.acts) {
    acts.push({ id: a.id, title: a.title });
    for (const c of a.chapters) emitChapter(c, a.title, a.id);
  }
  for (const c of tree.looseChapters) emitChapter(c, "", undefined);
  for (const s of tree.unassignedScenes) {
    order.push({ title: s.title, indent: s.indent });
    sceneChapter.set(s.title, "");
    sceneAct.set(s.title, "");
  }

  return { order, sceneChapter, sceneAct, acts, chapters };
}

// --- Tree transforms (pure; each returns a new tree) ------------------------

/** All chapter nodes across acts + loose, in display order. */
function allChapters(tree: OutlineTree): ChapterNode[] {
  return [...tree.acts.flatMap((a) => a.chapters), ...tree.looseChapters];
}

/** Deep-ish clone so callers can treat transforms as immutable. */
function clone(tree: OutlineTree): OutlineTree {
  return {
    acts: tree.acts.map((a) => ({ ...a, chapters: a.chapters.map((c) => ({ ...c, scenes: [...c.scenes] })) })),
    looseChapters: tree.looseChapters.map((c) => ({ ...c, scenes: [...c.scenes] })),
    unassignedScenes: [...tree.unassignedScenes],
  };
}

/** Remove a scene from wherever it lives; returns [tree, removedRef|null]. */
function detachScene(tree: OutlineTree, title: string): SceneRef | null {
  let found: SceneRef | null = null;
  const pull = (list: SceneRef[]) => {
    const i = list.findIndex((s) => s.title === title);
    if (i >= 0) {
      found = list[i];
      list.splice(i, 1);
    }
  };
  for (const a of tree.acts) for (const c of a.chapters) pull(c.scenes);
  for (const c of tree.looseChapters) pull(c.scenes);
  pull(tree.unassignedScenes);
  return found;
}

/**
 * Move a scene into a chapter (`targetChapterId`) or the unassigned bucket
 * (null), inserting before `beforeTitle` (or appended when null/not found).
 */
export function moveScene(
  tree: OutlineTree,
  sceneTitle: string,
  targetChapterId: string | null,
  beforeTitle: string | null = null
): OutlineTree {
  const next = clone(tree);
  const ref = detachScene(next, sceneTitle);
  if (!ref) return tree;
  const dest =
    targetChapterId === null
      ? next.unassignedScenes
      : allChapters(next).find((c) => c.id === targetChapterId)?.scenes;
  if (!dest) return tree;
  insertBefore(dest, ref, (s) => s.title === beforeTitle);
  return next;
}

/** Move a chapter into an act (`targetActId`) or the loose bucket (null). */
export function moveChapter(
  tree: OutlineTree,
  chapterId: string,
  targetActId: string | null,
  beforeChapterId: string | null = null
): OutlineTree {
  const next = clone(tree);
  let moved: ChapterNode | null = null;
  const pull = (list: ChapterNode[]) => {
    const i = list.findIndex((c) => c.id === chapterId);
    if (i >= 0) {
      moved = list[i];
      list.splice(i, 1);
    }
  };
  for (const a of next.acts) pull(a.chapters);
  pull(next.looseChapters);
  if (!moved) return tree;
  const dest =
    targetActId === null ? next.looseChapters : next.acts.find((a) => a.id === targetActId)?.chapters;
  if (!dest) return tree;
  insertBefore(dest, moved, (c) => c.id === beforeChapterId);
  return next;
}

/** Reorder an act before `beforeActId` (or append when null). */
export function moveAct(tree: OutlineTree, actId: string, beforeActId: string | null = null): OutlineTree {
  const next = clone(tree);
  const i = next.acts.findIndex((a) => a.id === actId);
  if (i < 0) return tree;
  const [moved] = next.acts.splice(i, 1);
  insertBefore(next.acts, moved, (a) => a.id === beforeActId);
  return next;
}

function insertBefore<T>(list: T[], item: T, isBefore: (x: T) => boolean): void {
  const i = list.findIndex(isBefore);
  if (i < 0) list.push(item);
  else list.splice(i, 0, item);
}

/** A fresh empty chapter node (for "+ Add chapter"). */
export function newChapterNode(title: string): ChapterNode {
  return { id: newStructureId(), title, scenes: [] };
}
/** A fresh empty act node (for "+ Add act"). */
export function newActNode(title: string): ActNode {
  return { id: newStructureId(), title, chapters: [] };
}
