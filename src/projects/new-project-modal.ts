/**
 * Create a brand-new writing project from scratch. Inkswell otherwise only
 * *discovers* projects (notes with a `longform` key), with no way to bootstrap
 * one — this modal + helper close that gap. It writes a fresh `longform` block to
 * a new index note via the same `persistDraft` path the rest of the app uses, so
 * the project is immediately Longform-compatible.
 */

import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import { persistDraft } from "./index-writer";
import { MultipleSceneDraft } from "./types";

export interface NewProjectOptions {
  title: string;
  /** Folder for the index note (vault-relative; "" = vault root). */
  folder: string;
  /** Scene folder, relative to the index note ("/" = same folder as the index). */
  sceneFolder: string;
}

const sanitize = (name: string): string => name.trim().replace(/[\\/:*?"<>|]/g, "-");
const trimSlashes = (s: string): string => s.trim().replace(/^\/+|\/+$/g, "");

/**
 * Create the index note for a new multi-scene project (and its scene folder).
 * Returns the index TFile, or null if the title was empty or the note exists.
 */
export async function createProject(
  app: App,
  opts: NewProjectOptions
): Promise<TFile | null> {
  const safe = sanitize(opts.title);
  if (!safe) {
    new Notice("Enter a project title.");
    return null;
  }

  const folder = trimSlashes(opts.folder);
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }

  const indexPath = normalizePath(folder ? `${folder}/${safe}.md` : `${safe}.md`);
  if (app.vault.getAbstractFileByPath(indexPath)) {
    new Notice(`A note named "${safe}" already exists here.`);
    return null;
  }

  const sceneFolder = trimSlashes(opts.sceneFolder) || "/";
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

  // Create the scene folder (resolved relative to the index) when it's a subfolder.
  if (sceneFolder !== "/") {
    const base = file.parent ? file.parent.path : "";
    const scenePath = normalizePath(base ? `${base}/${sceneFolder}` : sceneFolder);
    if (!app.vault.getAbstractFileByPath(scenePath)) {
      try {
        await app.vault.createFolder(scenePath);
      } catch {
        /* exists / race */
      }
    }
  }

  return file;
}

export class NewProjectModal extends Modal {
  private title = "";
  private folder = "";
  private sceneFolder = "/";
  private onCreated: (file: TFile) => void;

  constructor(app: App, onCreated: (file: TFile) => void) {
    super(app);
    this.onCreated = onCreated;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "New project" });

    new Setting(contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("My Novel").onChange((v) => (this.title = v));
      window.setTimeout(() => t.inputEl.focus(), 0);
      t.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") void this.submit();
      };
    });

    new Setting(contentEl)
      .setName("Folder")
      .setDesc("Where the project index note lives. Leave blank for the vault root.")
      .addText((t) => t.setPlaceholder("(vault root)").onChange((v) => (this.folder = v)));

    new Setting(contentEl)
      .setName("Scene folder")
      .setDesc('Where scene files live, relative to the index. "/" = same folder.')
      .addText((t) => t.setValue("/").onChange((v) => (this.sceneFolder = v)));

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Create")
        .setCta()
        .onClick(() => void this.submit())
    );
  }

  private async submit(): Promise<void> {
    const file = await createProject(this.app, {
      title: this.title,
      folder: this.folder,
      sceneFolder: this.sceneFolder,
    });
    if (!file) return; // createProject already surfaced the reason
    this.close();
    this.onCreated(file);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
