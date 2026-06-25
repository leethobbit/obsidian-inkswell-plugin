/**
 * Read/write structured profile fields on a codex entity note. Like
 * `scene-meta`, writes go through `fileManager.processFrontMatter` (frontmatter
 * only, never the prose body) and clear emptied keys. Only the keys in the
 * entity's category schema are managed; any other frontmatter is preserved.
 */

import type { App, TFile } from "obsidian";
import { CodexCategory } from "./types";
import {
  Profile,
  coerceValue,
  isEmptyValue,
  profileFields,
} from "./profile-schema";

/** Read a codex entity's profile fields from the metadata cache. */
export function readProfile(app: App, file: TFile, category: CodexCategory): Profile {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const out: Profile = {};
  for (const field of profileFields(category)) {
    out[field.key] = coerceValue(field, fm[field.key]);
  }
  return out;
}

/**
 * Merge a profile patch into an entity's frontmatter. Empty values clear the
 * key. `codex` and any unrelated keys are left untouched.
 */
export async function writeProfile(
  app: App,
  file: TFile,
  category: CodexCategory,
  patch: Partial<Profile>
): Promise<void> {
  const managed = new Set(profileFields(category).map((f) => f.key));
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    for (const key of Object.keys(patch)) {
      if (!managed.has(key)) continue;
      const value = patch[key];
      if (isEmptyValue(value)) delete fm[key];
      else fm[key] = value;
    }
  });
}
