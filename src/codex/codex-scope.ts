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
import { baseDraft, baseDraftFor, groupIntoStories, storyDrafts } from "../projects/stories";
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
 * Is `entity` scoped ONLY to archived books — so the Codex "All projects" list
 * can keep it out of sight with them? True only when EVERY target is archived:
 * a series scope (which wins over books, as in {@link isEntityVisible}) counts
 * when all of the series' books are; each `codex-project` key must resolve and
 * every story it names must be archived. False for a global entity, any live
 * target, and any key that resolves to no book — a deleted or renamed book is
 * not "archived", so its entries stay visible. A legacy shared basename (two
 * `Index.md` books) matching one live book keeps the entity visible.
 */
export function onlyArchivedScope(
  entity: CodexEntity,
  projects: Project[],
  isStoryArchived: (project: Project) => boolean
): boolean {
  const scope = entity.scope;
  if (isGlobalScope(scope)) return false;
  if (scope?.series) {
    const books = groupIntoStories(projects)
      .map(baseDraft)
      .filter((b) => projectSeries(b)?.name === scope.series);
    return books.length > 0 && books.every(isStoryArchived);
  }
  const keys = scope?.projects ?? [];
  for (const key of keys) {
    const owners = projects.filter((p) => bookMatches(key, p));
    if (owners.length === 0 || owners.some((o) => !isStoryArchived(o))) return false;
  }
  return keys.length > 0;
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
  if (scope.series) return null;
  const books = remapBookKeys(scope.projects ?? [], byOld);
  return books ? { ...scope, projects: books } : null;
}

/**
 * A list of book keys (scope books, pins) with every key found in `byOld`
 * replaced by its new key, or null when none matched. Duplicates collapse.
 */
export function remapBookKeys(keys: readonly string[], byOld: ReadonlyMap<string, string>): string[] | null {
  const lookup = new Map(Array.from(byOld, ([from, to]) => [normKey(from), to]));
  if (!keys.some((b) => lookup.has(normKey(b)))) return null;
  return dedupe(keys.map((b) => lookup.get(normKey(b)) ?? b));
}

// --- The Scope editor (#57) -------------------------------------------------

/** One story as the Scope editor offers it. */
export interface ScopeBook {
  /** Story title (what the writer sees). */
  label: string;
  /** What a new pick writes: the base draft's identity key (`projectKey`). */
  value: string;
  /** Every draft of the story — a stored value naming any of them names the book. */
  drafts: Project[];
  /** The story's series, if any (the editor groups by it). */
  series: string | null;
}

/** The pickable stories, one per story, alphabetical by title. */
export function scopeBooks(projects: Project[]): ScopeBook[] {
  return groupIntoStories(projects)
    .map((s) => {
      const base = baseDraft(s);
      return {
        label: s.title,
        value: projectKey(base, projects),
        drafts: s.drafts,
        series: projectSeries(base)?.name ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Does stored value `v` name this story (any draft, either identity form)? */
export function namesBook(v: string, book: ScopeBook): boolean {
  return book.drafts.some((d) => bookMatches(v, d));
}

/**
 * Turn a book off: drop every stored value naming it. A legacy ambiguous value
 * (`[[Index]]` shared by two books) also named OTHER books that were on —
 * re-pin those with their unambiguous keys so they don't vanish too.
 */
export function withoutBook(cur: readonly string[], target: ScopeBook, books: readonly ScopeBook[]): string[] {
  const kept = cur.filter((v) => !namesBook(v, target));
  for (const other of books) {
    if (other === target) continue;
    if (cur.some((v) => namesBook(v, other)) && !kept.some((v) => namesBook(v, other))) kept.push(other.value);
  }
  return kept;
}

/**
 * The editor's book picks as a delta on the CURRENT stored list (gotcha 10 —
 * never a snapshot): remove books, drop stale values, add books not yet named.
 */
export function applyBookPicks(
  cur: readonly string[],
  books: readonly ScopeBook[],
  picks: { add: readonly ScopeBook[]; remove: readonly ScopeBook[]; dropValues: readonly string[] }
): string[] {
  let next = [...cur];
  for (const b of picks.remove) next = withoutBook(next, b, books);
  const drop = new Set(picks.dropValues.map(normKey));
  next = next.filter((v) => !drop.has(normKey(v)));
  for (const b of picks.add) if (!next.some((v) => namesBook(v, b))) next.push(b.value);
  return next;
}

/**
 * One line saying where an entry is visible — the codex detail pane shows this
 * instead of the full editor (#57). `seriesBooks` gives a series' book count,
 * or null when no series has that name.
 */
export function scopeSummary(
  scope: EntityScope,
  books: readonly ScopeBook[],
  seriesBooks: (name: string) => number | null
): string {
  if (scope.series) {
    const n = seriesBooks(scope.series);
    if (n === null) return `Series · ${scope.series} (not found)`;
    return `Series · ${scope.series}${n ? ` (${n} book${n === 1 ? "" : "s"})` : ""}`;
  }
  const list = scope.projects ?? [];
  if (list.length === 0) return "Global · every project";
  const names = dedupe(list.map((v) => books.find((b) => namesBook(v, b))?.label ?? `${v} (not found)`));
  const shown = names.slice(0, 2).join(", ");
  return `Books · ${shown}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
}
