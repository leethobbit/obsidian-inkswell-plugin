/**
 * Create a brand-new writing project from scratch. Inkswell otherwise only
 * *discovers* projects (notes with a `longform` key), with no way to bootstrap
 * one — this modal + helper close that gap. It writes a fresh `longform` block to
 * a new index note via the same `persistDraft` path the rest of the app uses, so
 * the project is immediately Longform-compatible. A book can be born into a
 * series (the dialog embeds the shared series fields).
 */

import { App, Notice, Setting, TFile, normalizePath } from "obsidian";
import { persistDraft, writeSeries } from "./index-writer";
import { MultipleSceneDraft, SeriesInfo } from "./types";
import { FolderSettings, joinPath, projectFolder, sanitizeSegment } from "../settings/folders";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { Series } from "../series/series";
import { SeriesFieldsHandle, renderSeriesFields } from "../series/series-modal";

export interface NewProjectOptions {
  title: string;
  /** Base/parent folder; the project gets its own subfolder here ("" = vault root). */
  baseFolder: string;
  /** Scene folder, relative to the project folder ("/" = the project folder itself). */
  sceneFolder: string;
  /** Folder layout settings (codex subfolder name + co-location). */
  folders: FolderSettings;
  /** Series membership to write on the new index note (null/undefined = standalone). */
  series?: SeriesInfo | null;
}

/** Prefill for the dialog (e.g. "New book in this series"). */
export interface NewProjectPreset {
  series?: SeriesInfo | null;
}

export interface NewProjectModalOptions {
  folders: FolderSettings;
  /** Existing series, for the picker. */
  series: Series[];
  preset?: NewProjectPreset;
}

const trimSlashes = (s: string): string => s.trim().replace(/^\/+|\/+$/g, "");

/** Create a vault folder if it doesn't already exist (swallows exists/race). */
async function ensureFolder(app: App, path: string): Promise<void> {
  if (path && !app.vault.getAbstractFileByPath(path)) {
    try {
      await app.vault.createFolder(path);
    } catch {
      /* exists / race */
    }
  }
}

/**
 * Scaffold a new multi-scene project in its own folder: `<base>/<Title>/` holding
 * the index note, a `Scenes/` subfolder, and (when co-location is on) a codex
 * subfolder. Returns the index TFile, or null if the title was empty or the note
 * already exists.
 */
export async function createProject(
  app: App,
  opts: NewProjectOptions
): Promise<TFile | null> {
  const safe = sanitizeSegment(opts.title);
  if (!safe) {
    new Notice("Enter a project title.");
    return null;
  }

  const projFolder = projectFolder(opts.baseFolder, safe);
  await ensureFolder(app, projFolder);

  const indexPath = normalizePath(joinPath(projFolder, `${safe}.md`));
  if (app.vault.getAbstractFileByPath(indexPath)) {
    new Notice(`A note named "${safe}" already exists here.`);
    return null;
  }

  const sceneFolder = trimSlashes(opts.sceneFolder) || "/";
  return tryFileOp(async () => {
    const file = await app.vault.create(indexPath, "");
    const draft: MultipleSceneDraft = {
      format: "scenes",
      title: safe,
      titleInFrontmatter: true,
      draftTitle: null,
      workflow: null,
      sceneFolder,
      scenes: [],
      ignoredFiles: [],
      sceneTemplate: null,
    };
    await persistDraft(app, file, draft);
    if (opts.series) await writeSeries(app, file, opts.series);

    // Scene subfolder (relative to the project folder) when it's not the folder itself.
    if (sceneFolder !== "/") {
      await ensureFolder(app, normalizePath(joinPath(projFolder, sceneFolder)));
    }

    // Pre-create the project's codex folder so it's ready when co-location is on.
    if (opts.folders.coLocateCodex) {
      await ensureFolder(app, normalizePath(joinPath(projFolder, opts.folders.codexFolder || "Codex")));
    }

    return file;
  }, `Couldn't create the project "${safe}".`);
}

export class NewProjectModal extends FormModal {
  private title = "";
  private baseFolder: string;
  private sceneFolder = "Draft 1";
  private seriesFields!: SeriesFieldsHandle;

  constructor(
    app: App,
    private opts: NewProjectModalOptions,
    private onCreated: (file: TFile) => void
  ) {
    super(app);
    this.baseFolder = opts.folders.baseFolder;
    this.cta = "Create";
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "New project" });

    // FormModal autofocuses this first input and submits on Enter.
    new Setting(contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("My Novel").onChange((v) => (this.title = v));
    });

    new Setting(contentEl)
      .setName("Base folder")
      .setDesc("The project gets its own subfolder here. Blank = vault root.")
      .addText((t) =>
        t
          .setPlaceholder("(vault root)")
          .setValue(this.baseFolder)
          .onChange((v) => (this.baseFolder = v))
      );

    new Setting(contentEl)
      .setName("Scene folder")
      .setDesc('Where scene files live, relative to the project folder. "/" = the folder itself.')
      .addText((t) => t.setValue(this.sceneFolder).onChange((v) => (this.sceneFolder = v)));

    this.seriesFields = renderSeriesFields(contentEl, {
      series: this.opts.series,
      preset: this.opts.preset?.series ?? null,
    });
  }

  protected async submit(): Promise<boolean | void> {
    const series = this.seriesFields.read();
    if (series === false) return false;
    const file = await createProject(this.app, {
      title: this.title,
      baseFolder: this.baseFolder,
      sceneFolder: this.sceneFolder,
      folders: this.opts.folders,
      series,
    });
    if (!file) return false; // createProject already surfaced the reason
    this.onCreated(file);
  }
}
