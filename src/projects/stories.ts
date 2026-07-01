/**
 * Story grouping — the runtime view that turns the store's flat project list into
 * "stories with drafts".
 *
 * A *story* is the set of index notes sharing one `longform.title`; each member is
 * a *draft*, distinguished by its `draftTitle` (Longform's native multi-draft
 * model — see {@link ../projects/draft-serialization}). Grouping is derived here,
 * not persisted: there is no new frontmatter key, only the existing `title` +
 * `draftTitle` pair. Pure (no Obsidian deps) so it's unit-testable.
 */

import { Project } from "./types";

export interface Story {
  /** The shared `longform.title` that identifies this story. */
  title: string;
  /** Drafts of the story, in store order (which is title-sorted, then file order). */
  drafts: Project[];
}

/**
 * Group a flat project list into stories by shared `draft.title`, preserving the
 * incoming order within each group and ordering stories by first appearance.
 */
export function groupIntoStories(projects: Project[]): Story[] {
  const byTitle = new Map<string, Story>();
  for (const p of projects) {
    const title = p.draft.title;
    const existing = byTitle.get(title);
    if (existing) existing.drafts.push(p);
    else byTitle.set(title, { title, drafts: [p] });
  }
  return [...byTitle.values()];
}

/**
 * Human label for a draft within its story. Uses the authored `draftTitle` when
 * set; otherwise falls back to a positional `"Draft N"` so unnamed drafts are
 * still distinguishable in a switcher.
 */
export function draftLabel(project: Project, indexInStory: number): string {
  const dt = project.draft.draftTitle;
  if (dt && dt.trim()) return dt.trim();
  return `Draft ${indexInStory + 1}`;
}

/** The story owning the active draft (by index path), or null if none matches. */
export function storyOf(stories: Story[], activePath: string | null): Story | null {
  if (!activePath) return null;
  return stories.find((s) => s.drafts.some((d) => d.vaultPath === activePath)) ?? null;
}

/** Dirname of a draft's index path ("" for vault root). */
function draftFolder(p: Project): string {
  const i = p.vaultPath.lastIndexOf("/");
  return i === -1 ? "" : p.vaultPath.slice(0, i);
}

/** True if folder `a` is an ancestor of (or equal to) folder `b`. */
function isAncestorFolder(a: string, b: string): boolean {
  return a === "" || a === b || b.startsWith(`${a}/`);
}

/**
 * A story's *base draft* — the single source of truth for story-level metadata
 * (cover, overview, goals) that every draft should share. New drafts are copied
 * into a `Drafts/` subfolder of their source, so the original draft's folder is
 * an ancestor of every sibling; that draft is the base. Falls back to the first
 * draft when no single ancestor exists (e.g. drafts manually moved apart).
 */
export function baseDraft(story: Story): Project {
  for (const cand of story.drafts) {
    const cf = draftFolder(cand);
    if (story.drafts.every((d) => isAncestorFolder(cf, draftFolder(d)))) return cand;
  }
  return story.drafts[0];
}

/** The base draft of the story containing `project` (or `project` itself if ungrouped). */
export function baseDraftFor(projects: Project[], project: Project): Project {
  const story = groupIntoStories(projects).find((s) =>
    s.drafts.some((d) => d.vaultPath === project.vaultPath)
  );
  return story ? baseDraft(story) : project;
}
