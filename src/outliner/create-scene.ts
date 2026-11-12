/**
 * Create a single scene (vs scaffold.ts, which creates one per beat). Creates the
 * scene file with seeded frontmatter via the audited writeSceneMeta path, then
 * inserts it into the project index via updateScenes — same persistence spine as
 * scaffold.ts, so it's Longform-compatible. Touches the new scene file's
 * frontmatter + the index only.
 */

import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import { t } from "../i18n";
import { updateScenes } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { SceneMeta, defaultNewSceneStatus, writeSceneMeta } from "../scenes/scene-meta";
import { sceneTemplateCandidates } from "../scenes/scene-template";
import { SCENE_FIELDS_KEY } from "../scenes/scene-fields";
import { FIELDS_KEY } from "../codex/profile-schema";
import { StructureGroup } from "./structure";
import { FolderSettings, sanitizeSegment } from "../settings/folders";
import type { ListOverrideSettings } from "../settings/overridable-lists";
import { applyTemplateVars } from "../lib/template";
import { splitFrontmatter } from "../lib/frontmatter";
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
  /** Prose for the new scene instead of the template's body (Split scene). */
  body?: string;
  /** Id of an EMPTY chapter this scene opens: written as that chapter's
   *  `firstScene` in the same index transaction, so the scene can't fold into a
   *  same-named chapter just before it (#58). */
  anchorChapter?: string;
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
  settings: FolderSettings & Partial<ListOverrideSettings>,
  draft: { sceneTemplate?: string | null },
  path: string,
  title: string,
  patch: Partial<SceneMeta> = {},
  /** Prose for the new scene in place of the template's body (Split scene,
   *  #54). The template's frontmatter still applies. */
  prose?: string
): Promise<TFile> {
  const template = resolveSceneTemplate(app, settings, draft);
  const scaffold = template
    ? applyTemplateVars(await app.vault.cachedRead(template), { title })
    : "";
  const body = prose === undefined ? scaffold : splitFrontmatter(scaffold).frontmatter + prose;
  const file = await app.vault.create(path, body);
  // The app never writes a status the writer hid (Customize → Scene statuses):
  // with `idea` hidden, a new scene simply starts without one.
  const defaultStatus = defaultNewSceneStatus(settings.listOverrides?.["scene.status"]);
  // The template's field definitions are template-only — never copy them into
  // a scene (a custom codex type labelled "Scene" shares this note too).
  await writeSceneMeta(app, file, patch, defaultStatus ? { status: defaultStatus } : {}, [
    SCENE_FIELDS_KEY,
    FIELDS_KEY,
  ]);
  return file;
}

/** Anchor the chapter `chapterId` on `sceneTitle` — only while it's still
 *  empty (an anchor already set means the chapter gained a scene meanwhile). */
function anchorChapter(
  chapters: StructureGroup[] | undefined,
  chapterId: string,
  sceneTitle: string
): StructureGroup[] | null {
  if (!chapters?.some((c) => c?.id === chapterId && !c.firstScene)) return null;
  return chapters.map((c) => (c?.id === chapterId ? { ...c, firstScene: sceneTitle } : c));
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
    new Notice(t("outline.newScene.exists", { name: title }));
    return null; // name taken
  }

  return tryFileOp(async () => {
    const file = await createSceneFile(app, settings, draft, path, title, opts.meta ?? {}, opts.body);

    await updateScenes(
      app,
      indexFile,
      (scenes) => {
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
      },
      opts.anchorChapter ? (cur) => anchorChapter(cur, opts.anchorChapter!, title) : undefined
    );

    return file;
  }, t("outline.newScene.createFailed", { name: title }));
}

export interface NewSceneOptions {
  /** Insert after this index entry (inheriting its indent); else append at root. */
  afterTitle?: string;
  /** Seeds the new scene's frontmatter. */
  meta?: Partial<SceneMeta>;
  /** Id of an empty chapter the new scene opens (see CreateSceneOptions). */
  anchorChapter?: string;
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
    contentEl.createEl("h3", { text: t("outline.newScene.title") });
    this.input = contentEl.createEl("input", { type: "text", cls: "inkswell-prompt__input" });
    this.input.placeholder = t("outline.newScene.placeholder");
    this.input.onkeydown = (e) => {
      if (e.key === "Enter") void this.create(true);
    };
    window.setTimeout(() => {
      this.input.focus();
      this.input.select();
    }, 0);

    new Setting(contentEl)
      .addButton((b) => b.setButtonText(t("common.create")).setCta().onClick(() => void this.create(true)))
      .addButton((b) => b.setButtonText(t("outline.newScene.createAnother")).onClick(() => void this.create(false)))
      .addButton((b) => b.setButtonText(t("common.cancel")).onClick(() => this.close()));
  }

  /** Create the scene; dismiss the modal when `close`, else reset for another. */
  private async create(close: boolean): Promise<void> {
    const title = sanitizeSegment(this.input.value);
    if (!title) {
      new Notice(t("outline.newScene.enterTitle"));
      this.input.focus();
      return;
    }
    const file = await createScene(this.app, this.store, this.settings, this.project, {
      title,
      afterTitle: this.opts.afterTitle,
      meta: this.opts.meta,
      anchorChapter: this.opts.anchorChapter,
    });
    // "Create another" adds scenes after this one, inside the chapter it opened.
    if (file && this.opts.anchorChapter) {
      this.opts = { ...this.opts, afterTitle: title, anchorChapter: undefined };
    }
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
      new Notice(t("outline.newScene.created", { name: title }));
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
