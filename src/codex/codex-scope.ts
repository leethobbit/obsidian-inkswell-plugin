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
 * Book identity (#44): a `codex-project` value names a book by its index note's
 * BASENAME (`[[Novel]]`) — or, when another story's index note shares that
 * basename (Longform's `Index.md` habit), by its vault PATH without `.md`
 * (`[[Books/B/Index]]`). Readers accept both forms, case-insensitively
 * ({@link bookMatches}); writers pick the shortest unambiguous one
 * ({@link projectKey}). Never compare basenames directly.
 *
 * New entities are scoped to the story's BASE draft (see
 * {@link ../projects/stories}), so writes stay canonical while reads tolerate
 * legacy values that name any sibling draft.
 */

import { Project } from "../projects/types";
import { baseDraft, baseDraftFor, groupIntoStories } from "../projects/stories";
import { projectSeries } from "../series/series";
import { linkTarget } from "./codex";
import { CodexEntity, EntityScope } from "./types";

/** The vantage point a visibility check is made from. */
export interface ScopeContext {
  /**
   * Identity keys of ALL drafts of the active story ([] = no project): every
   * draft's index basename, then every draft's path form. Compared
   * case-insensitively (see {@link isEntityVisible}).
   */
  projectNames: string[];
  /** Series name the active story belongs to, if any. */
  seriesName: string | null;
}

/** Index-note basename (no extension) from a vault path. */
export function projectName(project: Project): string {
  const base = project.vaultPath.split("/").pop() ?? project.vaultPath;
  return base.replace(/\.md$/i, "");
}

/** Index-note vault path without `.md` — a book's unambiguous identity. */
export function pathKey(project: Project): string {
  return project.vaultPath.replace(/\.md$/i, "");
}

/** Case- and whitespace-insensitive key for comparing stored values. */
export function normKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Does a stored `codex-project` value name `project` (either identity form)? */
export function bookMatches(value: string, project: Project): boolean {
  const v = normKey(value);
  return v === normKey(projectName(project)) || v === normKey(pathKey(project));
}

/**
 * The value to WRITE for `project`: its basename, unless another story's base
 * draft shares that basename — then the path form, so two `Index.md` books stay
 * two books. Vaults without a collision keep writing the plain basename.
 */
export function projectKey(project: Project, allProjects: Project[]): string {
  const name = normKey(projectName(project));
  const clash = groupIntoStories(allProjects).some((s) => {
    if (s.drafts.some((d) => d.vaultPath === project.vaultPath)) return false; // own story
    return normKey(projectName(baseDraft(s))) === name;
  });
  return clash ? pathKey(project) : projectName(project);
}

/** Both identity forms of every project: basenames first, then path forms. */
function identityKeys(projects: readonly Project[]): string[] {
  return dedupe([...projects.map(projectName), ...projects.map(pathKey)]);
}

/** Order-preserving de-duplication. */
export function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * The book keys a `codex-project` frontmatter value names: one wikilink string
 * (the pre-1.17 form) or a YAML list of them. Blank and non-string items are
 * skipped, duplicates collapse, order is kept. Anything else → [] (global).
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
    projectNames: identityKeys(storyDrafts(project, allProjects)),
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
  return { projects: [projectKey(baseDraftFor(allProjects, project), allProjects)] };
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
  if (scope?.projects?.some((p) => ctx.projectNames.some((n) => normKey(n) === normKey(p)))) {
    return true;
  }
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
 * project-scoped entity resolves each listed book's owning STORY from `projects`
 * — matching either identity form of any draft — so its story- and series-mates
 * stay linkable; the union of those stories is its vantage. A legacy value that
 * several books share (two `Index.md` books) legitimately means all of them. A
 * book that no longer exists keeps its recorded name so same-scoped entities stay
 * linkable, but widens nothing.
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
    const owners = projects.filter((p) => bookMatches(book, p));
    if (owners.length === 0) {
      names.push(book);
      continue;
    }
    for (const owner of owners) {
      const ctx = scopeContextForProject(owner, projects);
      names.push(...ctx.projectNames);
      if (!seriesName && ctx.seriesName) seriesName = ctx.seriesName;
    }
  }
  return { projectNames: dedupe(names), seriesName };
}

/**
 * `scope` with every book key found in `byOld` (basename or path form; matched
 * case-insensitively) replaced by its new key (project rename), or null when
 * nothing in it changed. Series scopes are never touched — a series name is not
 * an index basename.
 */
export function remapScopeProjects(
  scope: EntityScope,
  byOld: ReadonlyMap<string, string>
): EntityScope | null {
  const books = scope.projects ?? [];
  if (scope.series) return null;
  const lookup = new Map(Array.from(byOld, ([from, to]) => [normKey(from), to]));
  if (!books.some((b) => lookup.has(normKey(b)))) return null;
  return { ...scope, projects: dedupe(books.map((b) => lookup.get(normKey(b)) ?? b)) };
}
