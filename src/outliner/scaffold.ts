/**
 * "Scaffold structure": materialize a beat template as a full Act › Chapter ›
 * Scene skeleton — acts from the template's act boundaries, one generically
 * numbered chapter per beat ("Chapter One", …), one placeholder scene per beat
 * (titled after it, synopsis from its blurb) — and link every beat to its scene.
 *
 * Structure is scaffolded only into an EMPTY outline (no acts/chapters
 * configured, no scene tagged into a chapter); otherwise this degrades to the
 * original behavior — create missing scene files only — and never touches a
 * hand-built outline. Existing scene files are always skipped, so it's safe to
 * re-run. Scene bodies are never written beyond initial creation.
 *
 * Split into analyze (a pure-read dry run, also rendered as the confirmation
 * dialog's preview) and execute (materializes an analysis), so what the dialog
 * shows and what the button does can't drift apart.
 */

import { App, TFile, normalizePath } from "obsidian";
import { persistInkswellData, persistStructure, updateScenes } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { FolderSettings, sanitizeSegment } from "../settings/folders";
import { BeatAssignment, getTemplate, templateActs } from "./beat-templates";
import { setAssignment } from "./beats";
import { buildOutline } from "./outline";
import { ScaffoldPlan, planScaffold } from "./scaffold-plan";
import { createSceneFile } from "./create-scene";
import { newStructureId } from "./structure";

/** One beat's slice of the dry run: the scene file it maps to and where it lands. */
export interface ScaffoldItem {
  beatId: string;
  /** Sanitized scene title (= file basename). */
  title: string;
  path: string;
  /** File already present — will be skipped (or adopted, in structure mode). */
  exists: boolean;
  synopsis: string;
  /** Structure mode only. */
  chapterTitle?: string;
  actTitle?: string;
}

export interface ScaffoldAnalysis {
  /** Empty outline → the full structure will be written. */
  structured: boolean;
  plan: ScaffoldPlan | null;
  items: ScaffoldItem[];
  /** Scene files that would be created. */
  newScenes: number;
  /** Beats that would gain a scene link (assignment currently empty). */
  willLink: number;
  folder: string;
}

/**
 * Dry-run: what would scaffolding this template do right now? Cache-only reads,
 * no writes. Returns null when the project can't be scaffolded (single-scene
 * format or missing index note).
 */
export function analyzeScaffold(
  app: App,
  store: ProjectStore,
  project: Project,
  templateId: string
): ScaffoldAnalysis | null {
  if (!isMultiScene(project.draft)) return null;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(indexFile instanceof TFile)) return null;

  const folder = store.resolveSceneFolder(indexFile, project.draft.sceneFolder);

  // Structure mode only when the outline is empty. Configured-but-sceneless
  // chapters count as structure (buildOutline surfaces them), so any existing
  // config or chapter-tagged scene routes to the scenes-only fallback.
  // Pre-existing chapterless scenes don't block.
  const metas = project.scenes.map((s) => {
    const f = s.path ? app.vault.getAbstractFileByPath(s.path) : null;
    const m = f instanceof TFile ? readSceneMeta(app, f) : {};
    return { title: s.title, path: s.path, indent: s.indent, chapter: m.chapter, act: m.act };
  });
  const tree = buildOutline(project.inkswell?.acts, project.inkswell?.chapters, metas);
  const structured = tree.acts.length === 0 && tree.looseChapters.length === 0;

  const template = getTemplate(templateId);
  // planScaffold emits one entry per beat, so plan.scenes[i] pairs with template[i].
  const plan: ScaffoldPlan | null = structured
    ? planScaffold(template, templateActs(templateId))
    : null;

  const assignments = project.inkswell?.beats?.assignments ?? {};
  const items: ScaffoldItem[] = [];
  let newScenes = 0;
  let willLink = 0;
  for (let i = 0; i < template.length; i++) {
    const beat = template[i];
    const title = sanitizeSegment(beat.name);
    if (!title) continue;
    const path = normalizePath(folder === "/" ? `${title}.md` : `${folder}/${title}.md`);
    const exists = app.vault.getAbstractFileByPath(path) instanceof TFile;
    const planScene = plan?.scenes[i];
    items.push({
      beatId: beat.id,
      title,
      path,
      exists,
      synopsis: beat.blurb,
      ...(planScene ? { chapterTitle: planScene.chapterTitle, actTitle: planScene.actTitle } : {}),
    });
    if (!exists) newScenes += 1;
    const cur = assignments[beat.id] as (BeatAssignment & { scene?: string }) | undefined;
    if (!cur?.scenes?.length && !cur?.scene) willLink += 1;
  }

  return { structured, plan, items, newScenes, willLink, folder };
}

export interface ScaffoldResult {
  /** Scene files newly added to the manuscript index. */
  scenes: number;
  /** Chapters / acts written (0 when the outline already had structure). */
  chapters: number;
  acts: number;
  /** Whether the full structure was scaffolded (empty outline) or scenes only. */
  structured: boolean;
}

const NOTHING: ScaffoldResult = { scenes: 0, chapters: 0, acts: 0, structured: false };

/** Materialize an analysis (from {@link analyzeScaffold}, same project/template). */
export async function scaffoldFromTemplate(
  app: App,
  store: ProjectStore,
  settings: FolderSettings,
  project: Project,
  templateId: string,
  analysis?: ScaffoldAnalysis | null
): Promise<ScaffoldResult> {
  const draft = project.draft;
  if (!isMultiScene(draft)) return NOTHING;
  const a = analysis ?? analyzeScaffold(app, store, project, templateId);
  if (!a) return NOTHING;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(indexFile instanceof TFile)) return NOTHING;

  const { folder, plan } = a;
  if (folder && folder !== "/" && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* already exists / race — ignore */
    }
  }

  const beatScene = new Map<string, string>(); // beat id → existing scene title
  for (const item of a.items) {
    const structurePatch = item.chapterTitle
      ? { chapter: item.chapterTitle, act: item.actTitle }
      : {};
    if (!item.exists) {
      await createSceneFile(app, settings, draft, item.path, item.title, {
        synopsis: item.synopsis,
        ...structurePatch,
      });
    } else if (item.chapterTitle) {
      // Adopt a pre-existing beat-named scene into its chapter. Safe: an empty
      // outline guarantees no scene carries a chapter string yet.
      const f = app.vault.getAbstractFileByPath(item.path);
      if (f instanceof TFile) await writeSceneMeta(app, f, structurePatch);
    }
    beatScene.set(item.beatId, item.title);
  }

  let createdCount = 0;
  await updateScenes(app, indexFile, draft, (scenes) => {
    const have = new Set(scenes.map((s) => s.title));
    const additions = a.items
      .filter((it) => !have.has(it.title))
      .map((it) => ({ title: it.title, indent: 0 }));
    createdCount = additions.length;
    return [...scenes, ...additions];
  });

  // Persist the acts/chapters config (empty outline ⇒ writing whole arrays is
  // safe — there is nothing to merge with). Appending scenes in template order
  // above already leaves the manuscript act→chapter→scene contiguous.
  if (plan) {
    const actGroups = plan.acts.map((act) => ({ id: newStructureId(), title: act.title }));
    const chapterGroups = plan.chapters.map((c) => ({
      id: newStructureId(),
      title: c.title,
      actId: actGroups[c.actIndex].id,
    }));
    await persistStructure(app, indexFile, "act", actGroups);
    await persistStructure(app, indexFile, "chapter", chapterGroups);
  }

  // Link each beat to its scene (both modes) — but never clobber an assignment
  // that already points at scenes (including the legacy single-`scene` form).
  let sheet = project.inkswell?.beats ?? { template: templateId, assignments: {} };
  let linked = false;
  for (const [beatId, title] of beatScene) {
    const cur = sheet.assignments[beatId] as
      | (BeatAssignment & { scene?: string })
      | undefined;
    if (cur?.scenes?.length || cur?.scene) continue;
    sheet = setAssignment(sheet, beatId, { scenes: [title] });
    linked = true;
  }
  if (linked) await persistInkswellData(app, indexFile, { beats: sheet });

  return {
    scenes: createdCount,
    chapters: plan?.chapters.length ?? 0,
    acts: plan?.acts.length ?? 0,
    structured: a.structured,
  };
}
