/**
 * Codex scoping (pure, Obsidian-free, unit-tested). Decides whether an entity is
 * visible from a given project's vantage point.
 *
 * An entity is visible when it is global (no scope), or its `projects` scope names
 * any draft of the active STORY (drafts sharing one `longform.title` — a codex
 * describes the book, not one draft of it) for ANY of its listed books, or its
 * `series` scope is the active story's series. Series membership is derived from
 * the active project — there is no separate "series selector"; the codex is shared
 * across a series exactly because every book in it resolves to the same series
 * name. See {@link ../series/series}.
 *
 * New entities are scoped to the story's BASE draft basename (see
 * {@link ../projects/stories}), so writes stay canonical while reads tolerate
 * legacy values that name any sibling draft.
 */

import { Project } from "../projects/types";
import { baseDraftFor, groupIntoStories } from "../projects/stories";
import { projectSeries } from "../series/series";
import { linkTarget } from "./codex";
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

/** Order-preserving de-duplication. */
export function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * The book basenames a `codex-project` frontmatter value names: one wikilink
 * string (the pre-1.17 form) or a YAML list of them. Blank and non-string items
 * are skipped, duplicates collapse, order is kept. Anything else → [] (global).
 */
export function parseProjectScopeValue(raw: unknown): string[] {
  const items = Array.isArray(raw) ? raw : [raw];
  const names: string[] = [];
  for (const item of items) {
    if (typeof item !== "string" || !item.trim()) continue;
    const name = linkTarget(item);
    if (name) names.push(name);
  }
  return dedupe(names);
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
  return { projects: [projectName(baseDraftFor(allProjects, project))] };
}

/** One sentence for the UI: where a newly created entry will be tagged. */
export function describeCreateScope(scope: EntityScope): string {
  if (scope.series) return `New entries are tagged for the “${scope.series}” series.`;
  const books = scope.projects ?? [];
  if (books.length === 1) return `New entries are tagged for “${books[0]}”.`;
  if (books.length > 1) return `New entries are tagged for ${books.length} books.`;
  return "New entries are created global — no project selected.";
}

/** Whether `scope` carries any actual constraint (vs. global). */
export function isGlobalScope(scope: EntityScope | undefined): boolean {
  return !scope || ((scope.projects?.length ?? 0) === 0 && !scope.series);
}

/**
 * Is `entity` visible from `ctx`? Global entities are always visible; scoped ones
 * only when any of their books names a draft of the vantage story, or their
 * series matches the vantage series.
 */
export function isEntityVisible(entity: CodexEntity, ctx: ScopeContext): boolean {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return true;
  if (scope?.projects?.some((p) => ctx.projectNames.includes(p))) return true;
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
 * project-scoped entity resolves each listed book's owning STORY from `projects` —
 * matching any draft's basename — so its story- and series-mates stay linkable;
 * the union of those stories is its vantage. A book that no longer exists keeps
 * its recorded name so same-scoped entities stay linkable, but widens nothing.
 */
export function scopeContextForEntity(
  entity: CodexEntity,
  projects: Project[]
): ScopeContext | null {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return null;
  if (scope?.series) return { projectNames: [], seriesName: scope.series };
  const names: string[] = [];
  let seriesName: string | null = null;
  for (const book of scope?.projects ?? []) {
    const owner = projects.find((p) => projectName(p) === book);
    if (!owner) {
      names.push(book);
      continue;
    }
    const ctx = scopeContextForProject(owner, projects);
    names.push(...ctx.projectNames);
    if (!seriesName && ctx.seriesName) seriesName = ctx.seriesName;
  }
  return { projectNames: dedupe(names), seriesName };
}

/**
 * `scope` with every book basename found in `byOld` replaced by its new name
 * (project rename), or null when nothing in it changed. Series scopes are never
 * touched — a series name is not an index basename.
 */
export function remapScopeProjects(
  scope: EntityScope,
  byOld: ReadonlyMap<string, string>
): EntityScope | null {
  const books = scope.projects ?? [];
  if (scope.series || !books.some((b) => byOld.has(b))) return null;
  return { ...scope, projects: dedupe(books.map((b) => byOld.get(b) ?? b)) };
}
