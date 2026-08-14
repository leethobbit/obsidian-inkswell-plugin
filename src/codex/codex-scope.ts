/**
 * Codex scoping (pure, Obsidian-free, unit-tested). Decides whether an entity is
 * visible from a given project's vantage point.
 *
 * An entity is visible when it is global (no scope), or its `project` scope names
 * any draft of the active STORY (drafts sharing one `longform.title` — a codex
 * describes the book, not one draft of it), or its `series` scope is the active
 * story's series. Series membership is derived from the active project — there is
 * no separate "series selector"; the codex is shared across a series exactly
 * because every book in it resolves to the same series name. See
 * {@link ../series/series}.
 *
 * New entities are scoped to the story's BASE draft basename (see
 * {@link ../projects/stories}), so writes stay canonical while reads tolerate
 * legacy values that name any sibling draft.
 */

import { Project } from "../projects/types";
import { baseDraftFor, groupIntoStories } from "../projects/stories";
import { projectSeries } from "../series/series";
import { CodexEntity, EntityScope } from "./types";

/** The vantage point a visibility check is made from. */
export interface ScopeContext {
  /** Index-note basenames of ALL drafts of the active story ([] = no project). */
  projectNames: string[];
  /** Series name the active story belongs to, if any. */
  seriesName: string | null;
}

/** Index-note basename (no extension) from a vault path. */
export function projectName(project: Project): string {
  const base = project.vaultPath.split("/").pop() ?? project.vaultPath;
  return base.replace(/\.md$/i, "");
}

/** All drafts of the story containing `project` (or just `project` if ungrouped). */
function storyDrafts(project: Project, allProjects: Project[]): Project[] {
  const story = groupIntoStories(allProjects).find((s) =>
    s.drafts.some((d) => d.vaultPath === project.vaultPath)
  );
  return story ? story.drafts : [project];
}

/** The story's series: the base draft's wins (a byte-copied sibling can carry a
 *  stale `inkswell.series`), falling back to the first sibling that has one. */
function storySeries(project: Project, allProjects: Project[]): string | null {
  const base = baseDraftFor(allProjects, project);
  const fromBase = projectSeries(base)?.name;
  if (fromBase) return fromBase;
  for (const d of storyDrafts(project, allProjects)) {
    const s = projectSeries(d)?.name;
    if (s) return s;
  }
  return null;
}

/** Build the scope vantage point for a project (or a global one when null). */
export function scopeContextForProject(
  project: Project | null,
  allProjects: Project[]
): ScopeContext {
  if (!project) return { projectNames: [], seriesName: null };
  return {
    projectNames: storyDrafts(project, allProjects).map(projectName),
    seriesName: storySeries(project, allProjects),
  };
}

/** The scope a NEW entity should inherit when created with `project` active.
 *  Project scope is normalized to the story's BASE draft, so entities created
 *  while a later draft is active still name the canonical index note. */
export function defaultScopeForProject(
  project: Project | null,
  allProjects: Project[]
): EntityScope {
  if (!project) return {};
  // Series wins: most entities in a series book are shared across the series.
  const series = storySeries(project, allProjects);
  if (series) return { series };
  return { project: projectName(baseDraftFor(allProjects, project)) };
}

/** Whether `scope` carries any actual constraint (vs. global). */
export function isGlobalScope(scope: EntityScope | undefined): boolean {
  return !scope || (!scope.project && !scope.series);
}

/**
 * Is `entity` visible from `ctx`? Global entities are always visible; scoped ones
 * only when their project names a draft of the vantage story, or their series
 * matches the vantage series.
 */
export function isEntityVisible(entity: CodexEntity, ctx: ScopeContext): boolean {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return true;
  if (scope?.project && ctx.projectNames.includes(scope.project)) return true;
  if (scope?.series && ctx.seriesName && scope.series === ctx.seriesName) return true;
  return false;
}

/** Entities visible from `ctx`. */
export function filterToScope(entities: CodexEntity[], ctx: ScopeContext): CodexEntity[] {
  return entities.filter((e) => isEntityVisible(e, ctx));
}

/**
 * The vantage point OF an entity itself — used to scope its relationship/link
 * candidates to what that entity can actually see (a series-scoped character must
 * not link a character from another series it can't even see). Returns null for a
 * global entity: it has no scope to constrain by, so candidates aren't filtered. A
 * project-scoped entity resolves its owning STORY from `projects` — matching any
 * draft's basename — so its story- and series-mates stay linkable.
 */
export function scopeContextForEntity(
  entity: CodexEntity,
  projects: Project[]
): ScopeContext | null {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return null;
  if (scope?.series) return { projectNames: [], seriesName: scope.series };
  const owner = projects.find((p) => projectName(p) === scope?.project);
  if (!owner) {
    // Scoped to a draft that no longer exists: keep the recorded name so
    // same-scoped entities stay linkable, but no story/series to widen to.
    return { projectNames: scope?.project ? [scope.project] : [], seriesName: null };
  }
  return scopeContextForProject(owner, projects);
}
