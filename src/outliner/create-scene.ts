/**
 * Create a single scene (vs scaffold.ts, which creates one per beat). Creates the
 * scene file with seeded frontmatter via the audited writeSceneMeta path, then
 * inserts it into the project index via updateScenes — same persistence spine as
 * scaffold.ts, so it's Longform-compatible. Touches the new scene file's
 * frontmatter + the index only.
 */

import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import { updateScenes } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { SceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { sceneTemplateCandidates } from "../scenes/scene-template";
import { FolderSettings, sanitizeSegment } from "../settings/folders";
import { applyTemplateVars } from "../lib/template";
import { tryFileOp } from "../lib/notify";

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

/**
 * Resolve the template note new scenes scaffold from — the project's
 * `sceneTemplate` first, else the vault-wide `Templates/Scene.md` — or null
 * (→ the default empty scaffold). Mirrors resolveCodexTemplate.
 */
export function resolveSceneTemplate(
  app: App,
  settings: FolderSettings,
  draft: { sceneTemplate?: string | null }
): TFile | null {
  for (const path of sceneTemplateCandidates(settings, draft.sceneTemplate)) {
    const f = app.vault.getAbstractFileByPath(normalizePath(path));
    if (f instanceof TFile) return f;
  }
  return null;
}

/**
 * Create one scene file, scaffolded from the resolved template note when one
 * exists (`{{title}}` substituted), then merge `patch` into its frontmatter.
 * `status: idea` applies only when neither the template nor the patch set one.
 */
export async function createSceneFile(
  app: App,
  settings: FolderSettings,
  draft: { sceneTemplate?: string | null },
  path: string,
  title: string,
  patch: Partial<SceneMeta> = {}
): Promise<TFile> {
  const template = resolveSceneTemplate(app, settings, draft);
  const body = template
    ? applyTemplateVars(await app.vault.cachedRead(template), { title })
    : "";
  const file = await app.vault.create(path, body);
  await writeSceneMeta(app, file, patch, { status: "idea" });
  return file;
}

/**
 * Create one scene and add it to the project. Returns the new TFile, or null if
 * the project isn't multi-scene, the title is empty, or a file of that name
 * already exists at the target path (callers surface a Notice).
 */
export async function createScene(
  app: App,
  store: ProjectStore,
  settings: FolderSettings,
  project: Project,
  opts: CreateSceneOptions
): Promise<TFile | null> {
  const draft = project.draft;
  if (!isMultiScene(draft)) return null;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(indexFile instanceof TFile)) return null;

  const title = sanitizeSegment(opts.title);
  if (!title) return null;

  const folder = opts.folder ?? store.resolveSceneFolder(indexFile, draft.sceneFolder);
  if (folder && folder !== "/" && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* already exists / race — ignore */
    }
  }

  const path = normalizePath(folder === "/" ? `${title}.md` : `${folder}/${title}.md`);
  if (app.vault.getAbstractFileByPath(path)) {
    new Notice(`A scene named "${title}" already exists.`);
    return null; // name taken
  }

  return tryFileOp(async () => {
    const file = await createSceneFile(app, settings, draft, path, title, opts.meta ?? {});

    await updateScenes(app, indexFile, draft, (scenes) => {
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
  }, `Couldn't create the scene "${title}".`);
}

export interface NewSceneOptions {
  /** Insert after this index entry (inheriting its indent); else append at root. */
  afterTitle?: string;
  /** Seeds the new scene's frontmatter. */
  meta?: Partial<SceneMeta>;
  /** Called once per scene successfully created (fires repeatedly for "Create another"). */
  onCreated?: (file: TFile) => void;
}

/**
 * Modal to create a scene by title. "Create" creates and closes; "Create
 * another" creates and stays open (cleared + refocused) for back-to-back entry.
 * Each successful create fires `onCreated`, so callers can react to every scene
 * (e.g. select it, attach it to a beat) — not just the last one.
 */
class NewSceneModal extends Modal {
  private input!: HTMLInputElement;

  constructor(
    app: App,
    private store: ProjectStore,
    private settings: FolderSettings,
    private project: Project,
    private opts: NewSceneOptions
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "New scene" });
    this.input = contentEl.createEl("input", { type: "text", cls: "inkswell-prompt__input" });
    this.input.placeholder = "Scene title";
    this.input.onkeydown = (e) => {
      if (e.key === "Enter") void this.create(true);
    };
    window.setTimeout(() => {
      this.input.focus();
      this.input.select();
    }, 0);

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Create").setCta().onClick(() => void this.create(true)))
      .addButton((b) => b.setButtonText("Create another").onClick(() => void this.create(false)))
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  /** Create the scene; dismiss the modal when `close`, else reset for another. */
  private async create(close: boolean): Promise<void> {
    const title = sanitizeSegment(this.input.value);
    if (!title) {
      new Notice("Enter a scene title.");
      this.input.focus();
      return;
    }
    const file = await createScene(this.app, this.store, this.settings, this.project, {
      title,
      afterTitle: this.opts.afterTitle,
      meta: this.opts.meta,
    });
    if (!file) {
      // createScene surfaced the reason (name taken / write failure). Keep the
      // dialog open so the user can adjust and retry instead of losing the title.
      this.input.focus();
      this.input.select();
      return;
    }
    this.opts.onCreated?.(file);
    if (close) {
      this.close();
    } else {
      new Notice(`Created "${title}".`);
      this.input.value = "";
      this.input.focus();
    }
  }
}

/**
 * Open the New scene modal for a multi-scene project. No-op for single-draft
 * projects (they have no scene list). Per-scene side effects go through
 * `opts.onCreated`.
 */
export function promptNewScene(
  app: App,
  store: ProjectStore,
  settings: FolderSettings,
  project: Project,
  opts?: NewSceneOptions
): void {
  if (!isMultiScene(project.draft)) return;
  new NewSceneModal(app, store, settings, project, opts ?? {}).open();
}
