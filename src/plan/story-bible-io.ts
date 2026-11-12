/**
 * Gather a project's planning data from the vault and write the story bible
 * note (#50). Formatting lives in the pure `story-bible.ts`; this module only
 * reads (metadata cache + the planning note) and writes one note.
 *
 * Each section reads the draft that owns it: overview + planning note are
 * story-level (base draft), beats + outline belong to the focused draft, and
 * the codex is scoped to the whole story.
 */

import { App, TFile, normalizePath } from "obsidian";
import { getCodexEntities, resolveEntityImage } from "../codex/codex-store";
import { readProfile, resolveProfileFields } from "../codex/codex-profile";
import { filterToScope, scopeContextForProject } from "../codex/codex-scope";
import { CodexEntity, allCategories } from "../codex/types";
import { t } from "../i18n";
import { writeConflictBackup } from "../lib/conflict-backup";
import { mergeBeats } from "../outliner/beats";
import { DEFAULT_TEMPLATE, TEMPLATE_META } from "../outliner/beat-templates";
import { resolveTemplate, synthesizeBeats } from "../outliner/custom-templates";
import { buildOutline } from "../outliner/outline";
import { baseDraftFor } from "../projects/stories";
import { Project, isMultiScene } from "../projects/types";
import { confirmDestructive } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { sanitizeSegment } from "../settings/folders";
import { dateKey } from "../tracking/types";
import { OVERVIEW_FIELDS } from "./overview-panel";
import { PLAN_SECTIONS, findPlanningNote, readSection } from "./planning-note";
import {
  CodexEntryData,
  OutlineSceneInfo,
  STORY_BIBLE_MARKER,
  StoryBibleInput,
} from "./story-bible";
import type InkswellPlugin from "../../main";

/** Group id for entries whose `codex:` type no longer exists. */
export const UNCATEGORIZED = "__uncategorized";

/** "<index folder>/<Title> — Story bible.md". */
export function storyBiblePath(project: Project): string {
  const slash = project.vaultPath.lastIndexOf("/");
  const folder = slash >= 0 ? project.vaultPath.slice(0, slash) : "";
  const name = `${sanitizeSegment(project.draft.title) || "Project"} — Story bible.md`;
  return normalizePath(folder ? `${folder}/${name}` : name);
}

/** The story's codex entries in scope, grouped by type in display order (empty types omitted). */
export function codexGroups(
  plugin: InkswellPlugin,
  project: Project
): { id: string; label: string; entities: CodexEntity[] }[] {
  const s = plugin.settings;
  const entities = filterToScope(
    getCodexEntities(plugin.app),
    scopeContextForProject(project, plugin.store.getProjects())
  );
  const cats = allCategories(s.customCategories, s.categoryOverrides);
  const groups = cats
    .map((c) => ({ id: c.id, label: c.plural, entities: entities.filter((e) => e.category === c.id) }))
    .filter((g) => g.entities.length > 0);
  const known = new Set(cats.map((c) => c.id));
  const orphans = entities.filter((e) => !known.has(e.category));
  // i18n-ignore: vault text (heads the note's codex section)
  if (orphans.length) groups.push({ id: UNCATEGORIZED, label: "Uncategorized", entities: orphans });
  return groups;
}

/** One codex entry as plain data (shared by the bible and "Copy as text"). */
export function codexEntryData(plugin: InkswellPlugin, entity: CodexEntity): CodexEntryData | null {
  const app = plugin.app;
  const file = app.vault.getAbstractFileByPath(entity.path);
  if (!(file instanceof TFile)) return null;
  const { fields } = resolveProfileFields(app, plugin.settings, entity.category);
  const profile = readProfile(app, file, fields);
  const imageField = fields.find((f) => f.type === "image");
  const rawImage = imageField ? profile[imageField.key] : undefined;
  const image =
    typeof rawImage === "string" ? resolveEntityImage(app, rawImage, file.path)?.path : undefined;
  return {
    name: entity.name,
    aliases: entity.aliases,
    image,
    fields: fields
      .filter((f) => f.key !== "aliases" && f.type !== "image")
      .map((f) => ({ label: f.label, type: f.type, value: profile[f.key] })),
  };
}

function templateName(id: string | undefined, plugin: InkswellPlugin): string {
  const custom = plugin.settings.customBeatTemplates.find((tpl) => tpl.id === id);
  if (custom) return custom.name;
  const meta = TEMPLATE_META.find((m) => m.id === (id ?? DEFAULT_TEMPLATE));
  return meta ? meta.label.replace(/\s*\(\d+\)$/, "") : id ?? "Beat sheet";
}

/** Read everything the bible can show. `codexTypes` null = every type. */
export async function gatherStoryBible(
  plugin: InkswellPlugin,
  project: Project,
  codexTypes: readonly string[] | null
): Promise<StoryBibleInput> {
  const app = plugin.app;
  const base = baseDraftFor(plugin.store.getProjects(), project);

  // Overview + planning-note prose (story-level).
  const overview = base.inkswell?.overview ?? {};
  const planFile = findPlanningNote(app, base);
  const planSource = planFile ? await app.vault.cachedRead(planFile) : "";
  const input: StoryBibleInput = {
    title: project.draft.title,
    generated: dateKey(new Date()),
    overview: {
      fields: OVERVIEW_FIELDS.map((f) => ({ label: f.label, value: overview[f.key] })),
      sections: PLAN_SECTIONS.map((h) => ({ heading: h, text: planSource ? readSection(planSource, h) : "" })),
    },
  };

  // Beats (focused draft) — resolved exactly as the Beats panel does; an unknown
  // template degrades to the stored assignment keys, never another template's beats.
  const sheet = project.inkswell?.beats;
  if (sheet) {
    const template =
      resolveTemplate(sheet.template, plugin.settings.customBeatTemplates) ??
      synthesizeBeats(sheet.assignments ?? {});
    input.beats = { templateName: templateName(sheet.template, plugin), beats: mergeBeats(sheet, template) };
  }

  // Outline (focused draft, multi-scene only).
  if (isMultiScene(project.draft)) {
    const scenes: Record<string, OutlineSceneInfo> = {};
    const refs = project.scenes.map((s) => {
      const f = s.path ? app.vault.getAbstractFileByPath(s.path) : null;
      const meta = f instanceof TFile ? readSceneMeta(app, f) : {};
      scenes[s.title] = { pov: meta.pov, synopsis: meta.synopsis, inactive: meta.inactive };
      return { title: s.title, path: s.path, indent: s.indent, chapter: meta.chapter, act: meta.act };
    });
    input.outline = { tree: buildOutline(project.inkswell?.acts, project.inkswell?.chapters, refs), scenes };
  }

  // Codex (story scope), filtered to the chosen types.
  const pick = codexTypes ? new Set(codexTypes) : null;
  input.codex = codexGroups(plugin, project)
    .filter((g) => !pick || pick.has(g.id))
    .map((g) => ({
      label: g.label,
      entries: g.entities
        .map((e) => codexEntryData(plugin, e))
        .filter((d): d is CodexEntryData => !!d),
    }));

  return input;
}

/**
 * Write (or replace) the story bible note. A previous bible (it carries the
 * marker) is replaced silently; any other note at that path is replaced only
 * after confirmation, with its text saved to a backup first. Returns the note,
 * or null when the writer declined.
 */
export async function writeStoryBible(app: App, project: Project, content: string): Promise<TFile | null> {
  const path = storyBiblePath(project);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    const current = await app.vault.read(existing);
    if (!current.slice(0, 300).includes(STORY_BIBLE_MARKER)) {
      const ok = await confirmDestructive(
        app,
        t("plan.bible.replaceConfirm", { path }),
        t("plan.bible.replace")
      );
      if (!ok) return null;
      await writeConflictBackup(app, existing.basename, "disk version", current);
    }
    await app.vault.modify(existing, content);
    return existing;
  }
  if (existing) throw new Error(`Can't write "${path}" — a folder with that name exists.`);
  return app.vault.create(path, content);
}
