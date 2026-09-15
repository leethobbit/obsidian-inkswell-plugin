/**
 * I/O for a codex type's TEMPLATE NOTE (`<base>/Templates/<Label>.md`) — the
 * source of truth for which fields the Codex panel shows for the type
 * (`codex-fields` frontmatter) and what a new entry starts with (the body).
 * The Customize editor is a front door to this note; hand-editing it in
 * Obsidian keeps working.
 *
 * Cache-lag rule: `resolveProfileFields` reads the metadata cache, which
 * updates AFTER a write. Render from the spec {@link writeTemplateFields}
 * returns (your model), and re-read from the cache only after
 * {@link awaitCacheUpdate}. The vitest fake cache is live, so a violation can't
 * be caught by tests — AGENTS.md gotcha 18.
 */

import { App, TFile, normalizePath } from "obsidian";
import { replaceBody, stripFrontmatter } from "../lib/frontmatter";
import { resolveTemplateFolder, sanitizeSegment } from "../settings/folders";
import { CodexSettings, resolveCodexTemplate } from "./codex-store";
import { starterCodexTemplate } from "./codex-template";
import { FIELDS_KEY, FieldSpec, parseFieldSpec, serializeFieldSpec } from "./profile-schema";
import { CategoryDef } from "./types";

/**
 * The type's template note: the existing one (current label, or a renamed
 * built-in's shipped-name note), else a freshly created starter at
 * `<templateFolder>/<current label>.md`. Never clobbers.
 */
export async function ensureCodexTemplate(
  app: App,
  settings: CodexSettings,
  def: CategoryDef
): Promise<TFile> {
  const existing = resolveCodexTemplate(app, settings, def);
  if (existing) return existing;
  const folder = resolveTemplateFolder(settings);
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }
  const basename = sanitizeSegment(def.label) || def.id;
  const path = normalizePath(folder ? `${folder}/${basename}.md` : `${basename}.md`);
  const f = app.vault.getAbstractFileByPath(path);
  if (f instanceof TFile) return f;
  return app.vault.create(path, starterCodexTemplate(def));
}

/** The template's body (everything after the frontmatter block). */
export async function readTemplateBody(app: App, file: TFile): Promise<string> {
  return stripFrontmatter(await app.vault.cachedRead(file));
}

/** Replace the template's body, keeping its frontmatter bytes untouched. */
export async function writeTemplateBody(app: App, file: TFile, body: string): Promise<void> {
  await app.vault.process(file, (text) => replaceBody(text, body));
}

/**
 * Write `spec` as the template's `codex-fields` (an empty spec DELETES the key →
 * the type falls back to Inkswell's shipped fields). Returns the normalized spec
 * as the parser will read it — render from this, not from the cache.
 */
export async function writeTemplateFields(
  app: App,
  file: TFile,
  spec: readonly FieldSpec[]
): Promise<FieldSpec[]> {
  const value = spec.length > 0 ? serializeFieldSpec(spec) : null;
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    if (value === null) delete fm[FIELDS_KEY];
    else fm[FIELDS_KEY] = value;
  });
  return value === null ? [] : parseFieldSpec(value) ?? [];
}

/**
 * Resolves once the metadata cache reports `file` re-indexed (or after
 * `timeoutMs` — the cache normally catches up within a few hundred ms).
 */
export function awaitCacheUpdate(app: App, file: TFile, timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let timer = 0;
    const finish = (): void => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      app.metadataCache.offref(ref);
      resolve();
    };
    const ref = app.metadataCache.on("changed", (changed) => {
      if (changed.path === file.path) finish();
    });
    timer = window.setTimeout(finish, timeoutMs);
  });
}
