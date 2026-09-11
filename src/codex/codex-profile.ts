/**
 * Read/write structured profile fields on a codex entity note. Like
 * `scene-meta`, writes go through `fileManager.processFrontMatter` (frontmatter
 * only, never the prose body) and clear emptied keys. Only the keys in the
 * entity's resolved field list are managed; any other frontmatter is preserved.
 *
 * Which fields an entity has is resolved per call by {@link resolveProfileFields}:
 * the type's template note may carry a `codex-fields` list that replaces the
 * shipped set (see profile-schema's FIELDS_KEY); otherwise the shipped fields.
 */

import type { App, TFile } from "obsidian";
import { CodexCategory, allCategories } from "./types";
import { CodexSettings, resolveCodexTemplate } from "./codex-store";
import {
  FIELDS_KEY,
  Profile,
  ProfileField,
  coerceValue,
  isEmptyValue,
  parseFieldSpec,
  profileFields,
} from "./profile-schema";

/** The field list an entity of `category` edits with, and where it came from. */
export interface ResolvedFields {
  fields: ProfileField[];
  /** The template note whose `codex-fields` defined the list; null = shipped fields. */
  template: TFile | null;
}

/**
 * Resolve the panel's field list for a category: the type's template note
 * (`<baseFolder>/Templates/<Label>.md`) wins when it declares `codex-fields`;
 * otherwise the shipped fields for that category (generic for customs/orphans).
 * Reads only the metadata cache — cheap enough to call per render and per save.
 */
export function resolveProfileFields(
  app: App,
  settings: CodexSettings,
  category: CodexCategory
): ResolvedFields {
  const def = allCategories(settings.customCategories, settings.categoryOverrides).find(
    (c) => c.id === category
  );
  const template = def ? resolveCodexTemplate(app, settings, def) : null;
  if (!template) return { fields: profileFields(category), template: null };
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter
  const fm = app.metadataCache.getFileCache(template)?.frontmatter as
    | Record<string, unknown>
    | undefined;
  const spec = parseFieldSpec(fm?.[FIELDS_KEY]);
  if (!spec || spec.length === 0) return { fields: profileFields(category), template: null };
  return { fields: profileFields(category, spec), template };
}

/** Read a codex entity's profile fields from the metadata cache. */
export function readProfile(app: App, file: TFile, fields: ProfileField[]): Profile {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const out: Profile = {};
  for (const field of fields) {
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
  fields: ProfileField[],
  patch: Partial<Profile>
): Promise<void> {
  const managed = new Set(fields.map((f) => f.key));
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    for (const key of Object.keys(patch)) {
      if (!managed.has(key)) continue;
      const value = patch[key];
      if (isEmptyValue(value)) delete fm[key];
      else fm[key] = value;
    }
  });
}
