/**
 * Codex discovery + creation. Entities are found by scanning the metadata cache
 * for notes with a `codex` frontmatter key (flat field — reliable in the cache).
 * Discovery is category-agnostic: any non-empty string value counts, so an
 * entity never vanishes when its category is deleted — grouping/labeling of
 * unknown categories is the panel's job ("Uncategorized").
 * Creation writes a new note with a minimal frontmatter template.
 */

import { App, TFile, normalizePath } from "obsidian";
import { detectMentions, linkTarget } from "./codex";
import { isEntityVisible, scopeContextForProject } from "./codex-scope";
import { starterCodexTemplate, codexTemplatesReadme } from "./codex-template";
import { SCENE_TEMPLATE_BASENAME, starterSceneTemplate } from "../scenes/scene-template";
import { applyTemplateVars } from "../lib/template";
import { Project } from "../projects/types";
import { FolderSettings, resolveTemplateFolder, sanitizeSegment } from "../settings/folders";
import {
  CategoryDef,
  CodexCategory,
  CodexEntity,
  EntityScope,
  SCOPE_PROJECT_KEY,
  SCOPE_SERIES_KEY,
  allCategories,
} from "./types";

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
  const proj = fm?.[SCOPE_PROJECT_KEY];
  const ser = fm?.[SCOPE_SERIES_KEY];
  const scope: EntityScope = {};
  if (typeof proj === "string" && proj.trim()) scope.project = linkTarget(proj);
  if (typeof ser === "string" && ser.trim()) scope.series = ser.trim();
  return scope.project || scope.series ? scope : undefined;
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
    delete fm[SCOPE_PROJECT_KEY];
    delete fm[SCOPE_SERIES_KEY];
    if (scope.series) fm[SCOPE_SERIES_KEY] = scope.series;
    else if (scope.project) fm[SCOPE_PROJECT_KEY] = `[[${scope.project}]]`;
  });
}

/** Does this scene's `characters`/`location` frontmatter link to `entityName`? */
function referencesByFrontmatter(app: App, file: TFile, entityName: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter; without it the reads below trip no-unsafe-assignment
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!fm) return false;
  const refs: string[] = [];
  const chars = fm["characters"];
  if (Array.isArray(chars)) refs.push(...chars.filter((x): x is string => typeof x === "string"));
  else if (typeof chars === "string") refs.push(chars);
  if (typeof fm["location"] === "string") refs.push(fm["location"]);
  return refs.some((r) => linkTarget(r) === entityName);
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
 * unrelated book doesn't cross-match. Body text is read via `cachedRead`
 * (Obsidian-cached), so re-scans on a panel re-render are cheap.
 */
export async function scenesForEntity(
  app: App,
  projects: Project[],
  entity: CodexEntity
): Promise<TFile[]> {
  const files: TFile[] = [];
  const seen = new Set<string>();
  for (const project of projects) {
    if (!isEntityVisible(entity, scopeContextForProject(project))) continue;
    for (const scene of project.scenes) {
      if (!scene.path || seen.has(scene.path)) continue;
      const f = app.vault.getAbstractFileByPath(scene.path);
      if (f instanceof TFile) {
        seen.add(scene.path);
        files.push(f);
      }
    }
  }

  const out: TFile[] = [];
  for (const file of files) {
    if (referencesByFrontmatter(app, file, entity.name)) {
      out.push(file);
      continue;
    }
    const text = await app.vault.cachedRead(file);
    if (detectMentions(text, [entity]).length > 0) out.push(file);
  }
  out.sort((a, b) => a.basename.localeCompare(b.basename));
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
      if (!Array.isArray(fm["aliases"])) fm["aliases"] = [];
      // Series wins over project; force exactly one (or neither) scope key.
      delete fm[SCOPE_SERIES_KEY];
      delete fm[SCOPE_PROJECT_KEY];
      if (scope.series) fm[SCOPE_SERIES_KEY] = scope.series;
      else if (scope.project) fm[SCOPE_PROJECT_KEY] = `[[${scope.project}]]`;
    });
    return file;
  }

  const lines = [`codex: ${category}`, "aliases: []"];
  // Series wins over project (mirrors writeEntityScope / isEntityVisible).
  if (scope.series) lines.push(`${SCOPE_SERIES_KEY}: ${yamlScalar(scope.series)}`);
  else if (scope.project) lines.push(`${SCOPE_PROJECT_KEY}: "[[${scope.project}]]"`);
  const fm = `---\n${lines.join("\n")}\n---\n\n# ${safe}\n`;
  return app.vault.create(path, fm);
}

/**
 * Resolve the template note for a category — `<baseFolder>/Templates/<Label>.md`
 * — or null when it doesn't exist (→ caller uses the default scaffold).
 */
export function resolveCodexTemplate(
  app: App,
  settings: FolderSettings,
  category: CategoryDef
): TFile | null {
  const folder = resolveTemplateFolder(settings);
  const path = normalizePath(
    folder ? `${folder}/${category.label}.md` : `${category.label}.md`
  );
  const f = app.vault.getAbstractFileByPath(path);
  return f instanceof TFile ? f : null;
}

/**
 * Scaffold a starter template note for every codex category (plus a README) into
 * `<baseFolder>/Templates/`. Idempotent: only writes files that don't yet exist,
 * so it never clobbers a user's edits. Returns the paths actually created.
 */
export async function generateCodexTemplates(
  app: App,
  settings: FolderSettings,
  customs: CategoryDef[] = []
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
  const categories = allCategories(customs);
  for (const cat of categories) await write(cat.label, starterCodexTemplate(cat));
  await write(SCENE_TEMPLATE_BASENAME, starterSceneTemplate());
  await write("_Inkswell Templates", codexTemplatesReadme(categories));
  return created;
}

/** Quote a YAML scalar when it could otherwise be misparsed; bare-safe strings pass through. */
function yamlScalar(value: string): string {
  return /^[A-Za-z0-9 ._-]+$/.test(value) ? value : JSON.stringify(value);
}
