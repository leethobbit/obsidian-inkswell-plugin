/**
 * Codex scoping (pure, Obsidian-free, unit-tested). Decides whether an entity is
 * visible from a given project's vantage point.
 *
 * An entity is visible when it is global (no scope), or its `project` scope is the
 * active book, or its `series` scope is the active book's series. Series membership
 * is derived from the active project — there is no separate "series selector"; the
 * codex is shared across a series exactly because every book in it resolves to the
 * same series name. See {@link ../series/series}.
 */

import { Project } from "../projects/types";
import { projectSeries } from "../series/series";
import { CodexEntity, EntityScope } from "./types";

/** The vantage point a visibility check is made from. */
export interface ScopeContext {
  /** Index-note basename of the active/owning project (null = no project). */
  projectName: string | null;
  /** Series name the active project belongs to, if any. */
  seriesName: string | null;
}

/** Index-note basename (no extension) from a vault path. */
export function projectName(project: Project): string {
  const base = project.vaultPath.split("/").pop() ?? project.vaultPath;
  return base.replace(/\.md$/i, "");
}

/** Build the scope vantage point for a project (or a global one when null). */
export function scopeContextForProject(project: Project | null): ScopeContext {
  if (!project) return { projectName: null, seriesName: null };
  return {
    projectName: projectName(project),
    seriesName: projectSeries(project)?.name ?? null,
  };
}

/** The scope a NEW entity should inherit when created with `project` active. */
export function defaultScopeForProject(project: Project | null): EntityScope {
  if (!project) return {};
  const series = projectSeries(project)?.name;
  // Series wins: most entities in a series book are shared across the series.
  if (series) return { series };
  return { project: projectName(project) };
}

/** Whether `scope` carries any actual constraint (vs. global). */
export function isGlobalScope(scope: EntityScope | undefined): boolean {
  return !scope || (!scope.project && !scope.series);
}

/**
 * Is `entity` visible from `ctx`? Global entities are always visible; scoped ones
 * only when their project or series matches the vantage point.
 */
export function isEntityVisible(entity: CodexEntity, ctx: ScopeContext): boolean {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return true;
  if (scope?.project && ctx.projectName && scope.project === ctx.projectName) return true;
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
 * project-scoped entity resolves its series from `projects` so its series-mates
 * stay linkable.
 */
export function scopeContextForEntity(
  entity: CodexEntity,
  projects: Project[]
): ScopeContext | null {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return null;
  if (scope?.series) return { projectName: null, seriesName: scope.series };
  const owner = projects.find((p) => projectName(p) === scope?.project);
  return {
    projectName: scope?.project ?? null,
    seriesName: owner ? projectSeries(owner)?.name ?? null : null,
  };
}
