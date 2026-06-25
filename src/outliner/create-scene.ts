/**
 * Create a single scene (vs scaffold.ts, which creates one per beat). Creates the
 * scene file with seeded frontmatter via the audited writeSceneMeta path, then
 * inserts it into the project index via updateScenes — same persistence spine as
 * scaffold.ts, so it's Longform-compatible. Touches the new scene file's
 * frontmatter + the index only.
 */

import { App, Notice, TFile, normalizePath } from "obsidian";
import { updateScenes } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { SceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { promptText } from "../scenes/scene-actions";

export interface CreateSceneOptions {
  title: string;
  /** Scene folder; defaults to the project's resolved scene folder. */
  folder?: string;
  /** Insert after this index entry (inheriting its indent); else append at root. */
  afterTitle?: string;
  /** Seeds the new scene's frontmatter (status defaults to "idea"). */
  meta?: Partial<SceneMeta>;
  /** Indent for the new entry when not derived from afterTitle. */
  indent?: number;
}

function sanitizeTitle(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

/**
 * Create one scene and add it to the project. Returns the new TFile, or null if
 * the project isn't multi-scene, the title is empty, or a file of that name
 * already exists at the target path (callers surface a Notice).
 */
export async function createScene(
  app: App,
  store: ProjectStore,
  project: Project,
  opts: CreateSceneOptions
): Promise<TFile | null> {
  if (!isMultiScene(project.draft)) return null;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(indexFile instanceof TFile)) return null;

  const title = sanitizeTitle(opts.title);
  if (!title) return null;

  const folder = opts.folder ?? store.resolveSceneFolder(indexFile, project.draft.sceneFolder);
  if (folder && folder !== "/" && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* already exists / race — ignore */
    }
  }

  const path = normalizePath(folder === "/" ? `${title}.md` : `${folder}/${title}.md`);
  if (app.vault.getAbstractFileByPath(path)) return null; // name taken

  const file = await app.vault.create(path, "");
  await writeSceneMeta(app, file, { status: "idea", ...opts.meta });

  await updateScenes(app, indexFile, project.draft, (scenes) => {
    if (scenes.some((s) => s.title === title)) return scenes;
    if (opts.afterTitle) {
      const at = scenes.findIndex((s) => s.title === opts.afterTitle);
      if (at >= 0) {
        const indent = opts.indent ?? scenes[at].indent;
        const next = scenes.slice();
        next.splice(at + 1, 0, { title, indent });
        return next;
      }
    }
    return [...scenes, { title, indent: opts.indent ?? 0 }];
  });

  return file;
}

/**
 * Prompt for a title and create a scene. Returns the new TFile, or null if the
 * user cancelled or creation failed (a Notice explains the latter).
 */
export async function promptNewScene(
  app: App,
  store: ProjectStore,
  project: Project,
  opts?: { afterTitle?: string; meta?: Partial<SceneMeta> }
): Promise<TFile | null> {
  const title = await promptText(app, {
    title: "New scene",
    value: "",
    multiline: false,
    cta: "Create",
  });
  if (title === null) return null;
  if (!sanitizeTitle(title)) {
    new Notice("Enter a scene title.");
    return null;
  }
  const file = await createScene(app, store, project, {
    title,
    afterTitle: opts?.afterTitle,
    meta: opts?.meta,
  });
  if (!file) new Notice(`Couldn't create "${title}" — a scene with that name may already exist.`);
  return file;
}
