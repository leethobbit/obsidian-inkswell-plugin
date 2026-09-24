/**
 * Codex discovery + creation. Entities are found by scanning the metadata cache
 * for notes with a `codex` frontmatter key (flat field — reliable in the cache).
 * Discovery is category-agnostic: any non-empty string value counts, so an
 * entity never vanishes when its category is deleted — grouping/labeling of
 * unknown categories is the panel's job ("Uncategorized").
 * Creation writes a new note with a minimal frontmatter template.
 */

import { App, TFile, normalizePath } from "obsidian";
import { detectMentions, imageRefTarget, linkTarget } from "./codex";
import { isImage } from "../lib/images";
import {
  dedupe,
  defaultScopeForProject,
  isEntityVisible,
  parseProjectScopeValue,
  scopeContextForProject,
} from "./codex-scope";
import { starterCodexTemplate, codexTemplatesReadme } from "./codex-template";
import { SCENE_TEMPLATE_BASENAME, starterSceneTemplate } from "../scenes/scene-template";
import { applyTemplateVars } from "../lib/template";
import { baseDraftFor, representativeDrafts } from "../projects/stories";
import { Project } from "../projects/types";
import {
  FolderSettings,
  resolveCodexFolder,
  resolveTemplateFolder,
  sanitizeSegment,
} from "../settings/folders";
import {
  CategoryDef,
  CategoryOverrides,
  CodexCategory,
  CodexEntity,
  EntityScope,
  SCOPE_PROJECT_KEY,
  SCOPE_SERIES_KEY,
  allCategories,
  defaultBuiltinDef,
} from "./types";
import { FIELDS_KEY } from "./profile-schema";

/** Settings the codex I/O depends on (subset of InkswellSettings). */
export interface CodexSettings extends FolderSettings {
  customCategories: CategoryDef[];
  categoryOverrides: CategoryOverrides;
}

export function getCodexEntities(app: App): CodexEntity[] {
  const out: CodexEntity[] = [];
  // Intentional whole-vault scan: codex entities may live in any folder, so we
  // can't scope this. It's cache-only (no vault.read), so the cost is the file
  // list + frontmatter cache lookups — don't "optimize" it into a folder filter.
  for (const file of app.vault.getMarkdownFiles()) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter; without it the downstream reads trip no-unsafe-assignment
    const fm = app.metadataCache.getFileCache(file)?.frontmatter as
      | Record<string, unknown>
      | undefined;
    const cat = fm?.["codex"];
    if (typeof cat !== "string" || !cat.trim()) continue;

    const rawAliases = fm?.["aliases"];
    const aliases = Array.isArray(rawAliases)
      ? rawAliases.filter((x): x is string => typeof x === "string")
      : typeof rawAliases === "string"
        ? [rawAliases]
        : [];
    const parentRaw = fm?.["parent"];
    const parent = typeof parentRaw === "string" ? linkTarget(parentRaw) : undefined;

    const scope = readEntityScope(fm);
    out.push({ path: file.path, name: file.basename, category: cat.trim(), aliases, parent, scope });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Parse scope keys from a note's frontmatter into an EntityScope (or undefined). */
function readEntityScope(fm: Record<string, unknown> | undefined): EntityScope | undefined {
  const projects = parseProjectScopeValue(fm?.[SCOPE_PROJECT_KEY]);
  const ser = fm?.[SCOPE_SERIES_KEY];
  const scope: EntityScope = {};
  if (projects.length > 0) scope.projects = projects;
  if (typeof ser === "string" && ser.trim()) scope.series = ser.trim();
  return scope.projects || scope.series ? scope : undefined;
}

/**
 * Write `scope` into a frontmatter object: at most one of the two keys — series
 * wins; a global scope clears both. One book is written as the plain wikilink
 * string (byte-identical to pre-1.17 output, which older readers understand);
 * two or more as a YAML list of wikilinks.
 */
function applyScopeToFrontmatter(fm: Record<string, unknown>, scope: EntityScope): void {
  delete fm[SCOPE_PROJECT_KEY];
  delete fm[SCOPE_SERIES_KEY];
  if (scope.series) {
    fm[SCOPE_SERIES_KEY] = scope.series;
    return;
  }
  const books = dedupe(scope.projects ?? []);
  if (books.length === 1) fm[SCOPE_PROJECT_KEY] = `[[${books[0]}]]`;
  else if (books.length > 1) fm[SCOPE_PROJECT_KEY] = books.map((b) => `[[${b}]]`);
}

/** The raw-YAML lines for `scope` in a freshly scaffolded note (same shapes as
 *  {@link applyScopeToFrontmatter}). */
function scopeYamlLines(scope: EntityScope): string[] {
  if (scope.series) return [`${SCOPE_SERIES_KEY}: ${yamlScalar(scope.series)}`];
  const books = dedupe(scope.projects ?? []);
  if (books.length === 1) return [`${SCOPE_PROJECT_KEY}: "[[${books[0]}]]"`];
  if (books.length > 1) return [`${SCOPE_PROJECT_KEY}:`, ...books.map((b) => `  - "[[${b}]]"`)];
  return [];
}

/**
 * Set (or clear) an entity's scope frontmatter. Writes at most one of the two
 * keys — series wins; an empty/global scope clears both. Untouched keys remain.
 */
export async function writeEntityScope(
  app: App,
  file: TFile,
  scope: EntityScope
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    applyScopeToFrontmatter(fm, scope);
  });
}

/**
 * Delta writer for the book list of a project-scoped entity: `fn` receives the
 * CURRENT list parsed inside `processFrontMatter` (never a panel snapshot, so two
 * quick book-pill toggles both survive — AGENTS.md gotcha 10) and returns the
 * next one. The result is project-scoped, so any series tag is cleared; an empty
 * result makes the entity global.
 */
export async function updateEntityProjects(
  app: App,
  file: TFile,
  fn: (current: string[]) => string[]
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    const next = dedupe(fn(parseProjectScopeValue(fm[SCOPE_PROJECT_KEY])));
    applyScopeToFrontmatter(fm, { projects: next });
  });
}

/** Does this scene's `characters`/`location` frontmatter link to `entityName`?
 *  Both keys accept one link or a list (SCHEMA §B); matching is case-insensitive
 *  like Obsidian's own link resolution. */
function referencesByFrontmatter(app: App, file: TFile, entityName: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter; without it the reads below trip no-unsafe-assignment
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!fm) return false;
  const refs: string[] = [];
  for (const key of ["characters", "location"]) {
    const raw = fm[key];
    if (Array.isArray(raw)) refs.push(...raw.filter((x): x is string => typeof x === "string"));
    else if (typeof raw === "string") refs.push(raw);
  }
  const want = entityName.trim().toLowerCase();
  return refs.some((r) => linkTarget(r).trim().toLowerCase() === want);
}

/**
 * Scenes that reference an entity, for its "Appears in" list. A scene counts when
 * its body text mentions the entity's name or an alias (whole-word, via
 * {@link detectMentions}) OR it carries an explicit `characters`/`location`
 * frontmatter link — so deliberate links still count when the name isn't in the
 * prose. Automatic: no manual tagging step, and every codex category is covered.
 *
 * Scoped to scenes the entity can see: a global entity scans every project; a
 * project/series-scoped one only its own book(s), so a same-named entity in an
 * unrelated book doesn't cross-match. Stories are collapsed to ONE draft each
 * (the active one, else the base) — every draft copies the same scene titles,
 * so scanning them all would list each appearance once per draft. Body text is
 * read via `cachedRead` (Obsidian-cached), so re-scans on a panel re-render
 * are cheap.
 */
export async function scenesForEntity(
  app: App,
  projects: Project[],
  entity: CodexEntity,
  activePath: string | null = null
): Promise<TFile[]> {
  const books = await appearancesForEntity(app, projects, entity, activePath);
  const out = books.flatMap((b) => b.scenes.map((s) => s.file));
  out.sort((a, b) => a.basename.localeCompare(b.basename));
  return out;
}

/** One scene an entity appears in, how it got there, and whether it's the POV character. */
export interface SceneAppearance {
  file: TFile;
  /** The scene's `pov` names this entity (by name or alias). */
  pov: boolean;
  /**
   * True when the scene's metadata names the entity (`characters`, `location`
   * or `pov`) — the writer put it there. False = the text merely mentions the
   * name (someone talks about them). Kept apart on purpose (#44).
   */
  linked: boolean;
}

/** An entity's appearances in one book (one representative draft per story). */
export interface BookAppearances {
  project: Project;
  /** The book's title (`longform.title`). */
  title: string;
  /** Scenes in MANUSCRIPT order. */
  scenes: SceneAppearance[];
  povCount: number;
  /** How many of `scenes` are linked (metadata), the rest being text mentions. */
  linkedCount: number;
}

/** Does this scene's `pov` frontmatter name the entity (name or alias, link or plain)? */
function isPovOf(app: App, file: TFile, entity: CodexEntity): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
  const raw = fm?.["pov"];
  if (typeof raw !== "string" || !raw.trim()) return false;
  const pov = linkTarget(raw).trim().toLowerCase();
  if (pov === entity.name.toLowerCase()) return true;
  return entity.aliases.some((a) => a.trim().toLowerCase() === pov);
}

/**
 * {@link scenesForEntity} grouped BY BOOK, each scene flagged when the entity is
 * its POV character — so a series character's "Appears in" reads "Book 2: POV
 * in 4, appears in 9" instead of one alphabetical pile across six books (#40).
 * Books with no appearances are omitted; the active book's story comes first.
 */
export async function appearancesForEntity(
  app: App,
  projects: Project[],
  entity: CodexEntity,
  activePath: string | null = null
): Promise<BookAppearances[]> {
  const out: BookAppearances[] = [];
  const seen = new Set<string>();
  for (const project of representativeDrafts(projects, activePath)) {
    if (!isEntityVisible(entity, scopeContextForProject(project, projects))) continue;
    const scenes: SceneAppearance[] = [];
    for (const scene of project.scenes) {
      if (!scene.path || seen.has(scene.path)) continue;
      const file = app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      seen.add(scene.path);
      // "Linked" = the writer said so in the scene's metadata (characters /
      // location / pov); otherwise a text scan decides whether it's mentioned.
      // The distinction is kept (#44): a name dropped in dialogue is a mention,
      // not a presence.
      const pov = isPovOf(app, file, entity);
      const linked = pov || referencesByFrontmatter(app, file, entity.name);
      if (linked) {
        scenes.push({ file, pov, linked: true });
        continue;
      }
      const text = await app.vault.cachedRead(file);
      if (detectMentions(text, [entity]).length > 0) scenes.push({ file, pov, linked: false });
    }
    if (scenes.length > 0) {
      out.push({
        project,
        title: project.draft.title,
        scenes,
        povCount: scenes.filter((s) => s.pov).length,
        linkedCount: scenes.filter((s) => s.linked).length,
      });
    }
  }
  return out;
}

/**
 * Create a codex entity note (or return the existing one with that name).
 * `scope` (when non-global) is written into the new note's frontmatter so the
 * entry is tagged for the current series/project at creation time.
 */
export async function createEntity(
  app: App,
  category: CodexCategory,
  name: string,
  folder: string,
  scope: EntityScope = {},
  templateFile?: TFile | null
): Promise<TFile | null> {
  const safe = sanitizeSegment(name);
  if (!safe) return null; // empty, or a dot-only name that isn't a usable file name

  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }
  const path = normalizePath(folder ? `${folder}/${safe}.md` : `${safe}.md`);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;

  // Template path: scaffold from the user's template note, then force the
  // app-managed keys on top so Inkswell's contract always wins (and YAML stays
  // valid). Falls through to the default scaffold when no template is given.
  if (templateFile instanceof TFile) {
    const raw = applyTemplateVars(await app.vault.cachedRead(templateFile), { title: safe });
    const file = await app.vault.create(path, raw);
    await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
      fm["codex"] = category; // app marker always wins
      delete fm[FIELDS_KEY]; // template-only directive — never part of an entry
      if (!Array.isArray(fm["aliases"])) fm["aliases"] = [];
      // Series wins over project; force exactly one (or neither) scope key.
      applyScopeToFrontmatter(fm, scope);
    });
    return file;
  }

  // Series wins over project (mirrors writeEntityScope / isEntityVisible).
  const lines = [`codex: ${category}`, "aliases: []", ...scopeYamlLines(scope)];
  const fm = `---\n${lines.join("\n")}\n---\n\n# ${safe}\n`;
  return app.vault.create(path, fm);
}

/**
 * The image file an entry's `image` value points at, or null when unset,
 * unresolvable, or not an image. Accepts a plain vault path (what the panel
 * writes) as well as `[[…]]` / `![[…]]` / `![](…)` forms written by hand or by
 * Obsidian's Properties UI; links resolve relative to the entry like any
 * Obsidian link, so a bare `anna.png` finds the attachment wherever it lives.
 */
export function resolveEntityImage(
  app: App,
  raw: string | undefined,
  sourcePath: string
): TFile | null {
  if (!raw || !raw.trim()) return null;
  const target = imageRefTarget(raw);
  if (!target) return null;
  const file =
    app.metadataCache.getFirstLinkpathDest(target, sourcePath) ??
    app.vault.getAbstractFileByPath(target);
  return file instanceof TFile && isImage(file) ? file : null;
}

/**
 * The ONE "new entry for the active project" pipeline, shared by the Codex
 * panel's New button and Quick Codex in the Write editor: the entry inherits
 * the active project's scope (its series, else the book itself; global with no
 * project), lands in the STORY's codex folder (base draft — never inside a
 * `Drafts/<name>/` copy, which would strand it when that draft is deleted), and
 * is scaffolded from the type's template note when one exists. Returns the
 * existing note when one with that name is already there.
 */
export async function createEntityForProject(
  app: App,
  settings: CodexSettings,
  projects: Project[],
  active: Project | null,
  def: CategoryDef,
  name: string
): Promise<TFile | null> {
  const scope = defaultScopeForProject(active, projects);
  const folder = resolveCodexFolder(
    settings,
    scope,
    active ? baseDraftFor(projects, active).vaultPath : undefined
  );
  return createEntity(app, def.id, name, folder, scope, resolveCodexTemplate(app, settings, def));
}

/**
 * Template-note basenames a category resolves, most specific first: its current
 * label, then — for a renamed built-in — its shipped label, so renaming
 * "Faction" to "Group" keeps using an existing `Faction.md`. The shipped name is
 * skipped when another type now carries it as ITS label (that note is theirs).
 */
function templateBasenames(settings: CodexSettings, category: CategoryDef): string[] {
  const names = [category.label];
  const shipped = defaultBuiltinDef(category.id);
  if (shipped && shipped.label.toLowerCase() !== category.label.toLowerCase()) {
    const claimed = allCategories(settings.customCategories, settings.categoryOverrides).some(
      (c) => c.id !== category.id && c.label.toLowerCase() === shipped.label.toLowerCase()
    );
    if (!claimed) names.push(shipped.label);
  }
  return names;
}

/**
 * Resolve the template note for a category — `<baseFolder>/Templates/<Label>.md`
 * (falling back to a renamed built-in's shipped `<Label>.md`) — or null when
 * none exists (→ caller uses the default scaffold).
 */
export function resolveCodexTemplate(
  app: App,
  settings: CodexSettings,
  category: CategoryDef
): TFile | null {
  const folder = resolveTemplateFolder(settings);
  for (const basename of templateBasenames(settings, category)) {
    const path = normalizePath(folder ? `${folder}/${basename}.md` : `${basename}.md`);
    const f = app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) return f;
  }
  return null;
}

/**
 * Scaffold a starter template note for every codex category (plus a README) into
 * `<baseFolder>/Templates/`. Idempotent: only writes files that don't yet exist
 * (a renamed built-in whose shipped-name note exists counts as existing), so it
 * never clobbers a user's edits. Returns the paths actually created.
 */
export async function generateCodexTemplates(
  app: App,
  settings: CodexSettings
): Promise<string[]> {
  const folder = resolveTemplateFolder(settings);
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }
  const created: string[] = [];
  const write = async (basename: string, content: string): Promise<void> => {
    const p = normalizePath(folder ? `${folder}/${basename}.md` : `${basename}.md`);
    if (app.vault.getAbstractFileByPath(p)) return; // never clobber
    await app.vault.create(p, content);
    created.push(p);
  };
  const categories = allCategories(settings.customCategories, settings.categoryOverrides);
  for (const cat of categories) {
    if (resolveCodexTemplate(app, settings, cat)) continue; // this type already has a template
    await write(cat.label, starterCodexTemplate(cat));
  }
  await write(SCENE_TEMPLATE_BASENAME, starterSceneTemplate());
  await write("_Inkswell Templates", codexTemplatesReadme(categories));
  return created;
}

/** Quote a YAML scalar when it could otherwise be misparsed; bare-safe strings pass through. */
function yamlScalar(value: string): string {
  return /^[A-Za-z0-9 ._-]+$/.test(value) ? value : JSON.stringify(value);
}
