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
