/**
 * Codex discovery + creation. Entities are found by scanning the metadata cache
 * for notes with a `codex` frontmatter key (flat field — reliable in the cache).
 * Creation writes a new note with a minimal frontmatter template.
 */

import { App, TFile, normalizePath } from "obsidian";
import { linkTarget } from "./codex";
import { CodexCategory, CodexEntity, isCodexCategory } from "./types";

export function getCodexEntities(app: App): CodexEntity[] {
  const out: CodexEntity[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
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

    out.push({ path: file.path, name: file.basename, category: cat, aliases, parent });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Create a codex entity note (or return the existing one with that name). */
export async function createEntity(
  app: App,
  category: CodexCategory,
  name: string,
  folder: string
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

  const fm = `---\ncodex: ${category}\naliases: []\n---\n\n# ${safe}\n`;
  return app.vault.create(path, fm);
}
