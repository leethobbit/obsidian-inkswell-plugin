/**
 * Codex discovery + creation. Entities are found by scanning the metadata cache
 * for notes with a `codex` frontmatter key (flat field — reliable in the cache).
 * Creation writes a new note with a minimal frontmatter template.
 */

import { App, TFile, normalizePath } from "obsidian";
import { linkTarget } from "./codex";
import {
  CodexCategory,
  CodexEntity,
  EntityScope,
  SCOPE_PROJECT_KEY,
  SCOPE_SERIES_KEY,
  isCodexCategory,
} from "./types";

export function getCodexEntities(app: App): CodexEntity[] {
  const out: CodexEntity[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter as
      | Record<string, unknown>
      | undefined;
    const cat = fm?.["codex"];
    if (!isCodexCategory(cat)) continue;

    const rawAliases = fm?.["aliases"];
    const aliases = Array.isArray(rawAliases)
      ? rawAliases.filter((x): x is string => typeof x === "string")
      : typeof rawAliases === "string"
        ? [rawAliases]
        : [];
    const parentRaw = fm?.["parent"];
    const parent = typeof parentRaw === "string" ? linkTarget(parentRaw) : undefined;

    const scope = readEntityScope(fm);
    out.push({ path: file.path, name: file.basename, category: cat, aliases, parent, scope });
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

/**
 * Scenes that reference an entity by name through their `characters`/`location`
 * frontmatter wikilinks. Cheap metadata-cache scan; returns matching files.
 */
export function scenesReferencing(app: App, entityName: string): TFile[] {
  const out: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter as
      | Record<string, unknown>
      | undefined;
    if (!fm) continue;
    const refs: string[] = [];
    const chars = fm["characters"];
    if (Array.isArray(chars)) refs.push(...chars.filter((x): x is string => typeof x === "string"));
    else if (typeof chars === "string") refs.push(chars);
    if (typeof fm["location"] === "string") refs.push(fm["location"]);
    if (refs.some((r) => linkTarget(r) === entityName)) out.push(file);
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
  scope: EntityScope = {}
): Promise<TFile | null> {
  const safe = name.trim().replace(/[\\/:*?"<>|]/g, "-");
  if (!safe) return null;

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

  const lines = [`codex: ${category}`, "aliases: []"];
  // Series wins over project (mirrors writeEntityScope / isEntityVisible).
  if (scope.series) lines.push(`${SCOPE_SERIES_KEY}: ${yamlScalar(scope.series)}`);
  else if (scope.project) lines.push(`${SCOPE_PROJECT_KEY}: "[[${scope.project}]]"`);
  const fm = `---\n${lines.join("\n")}\n---\n\n# ${safe}\n`;
  return app.vault.create(path, fm);
}

/** Quote a YAML scalar when it could otherwise be misparsed; bare-safe strings pass through. */
function yamlScalar(value: string): string {
  return /^[A-Za-z0-9 ._-]+$/.test(value) ? value : JSON.stringify(value);
}
