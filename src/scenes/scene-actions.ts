/**
 * Shared scene actions + a right-click menu builder, used by the Board cards and
 * the Home scene rows. Rename updates both the file and the index entry; delete
 * trashes the file and unlinks it from the project. Edits touch frontmatter only
 * (synopsis) — never the prose body.
 */

import { App, Menu, Modal, Setting, TFile, normalizePath } from "obsidian";
import { updateScenes } from "../projects/index-writer";
import { removeScene } from "../projects/scene-tree";
import { Project } from "../projects/types";
import { readSceneMeta, writeSceneMeta } from "./scene-meta";

class PromptModal extends Modal {
  private result: string | null = null;
  constructor(
    app: App,
    private opts: { title: string; value: string; multiline: boolean; cta: string },
    private cb: (value: string | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.opts.title });
    let getValue: () => string;

    if (this.opts.multiline) {
      const ta = contentEl.createEl("textarea", { cls: "inkswell-prompt__input" });
      ta.rows = 4;
      ta.value = this.opts.value;
      getValue = () => ta.value;
      window.setTimeout(() => ta.focus(), 0);
    } else {
      const inp = contentEl.createEl("input", { type: "text", cls: "inkswell-prompt__input" });
      inp.value = this.opts.value;
      getValue = () => inp.value;
      inp.onkeydown = (e) => {
        if (e.key === "Enter") this.submit(getValue());
      };
      window.setTimeout(() => {
        inp.focus();
        inp.select();
      }, 0);
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText(this.opts.cta).setCta().onClick(() => this.submit(getValue())))
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  private submit(value: string): void {
    this.result = value;
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    this.cb(this.result);
  }
}

class ConfirmModal extends Modal {
  private ok = false;
  constructor(app: App, private message: string, private cb: (ok: boolean) => void) {
    super(app);
  }
  onOpen(): void {
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Delete").setWarning().onClick(() => {
        this.ok = true;
        this.close();
      }))
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose(): void {
    this.contentEl.empty();
    this.cb(this.ok);
  }
}

function prompt(
  app: App,
  opts: { title: string; value: string; multiline: boolean; cta: string }
): Promise<string | null> {
  return new Promise((resolve) => new PromptModal(app, opts, resolve).open());
}

function confirm(app: App, message: string): Promise<boolean> {
  return new Promise((resolve) => new ConfirmModal(app, message, resolve).open());
}

/** Open a scene in an editor tab (reusing one, never the Inkswell host). */
export function openScene(app: App, file: TFile): void {
  const editors = app.workspace.getLeavesOfType("markdown");
  const leaf = editors[0] ?? app.workspace.getLeaf("tab");
  leaf.openFile(file);
}

export async function editSynopsis(app: App, file: TFile): Promise<void> {
  const current = readSceneMeta(app, file).synopsis ?? "";
  const value = await prompt(app, {
    title: `Synopsis — ${file.basename}`,
    value: current,
    multiline: true,
    cta: "Save",
  });
  if (value !== null) await writeSceneMeta(app, file, { synopsis: value });
}

export async function renameScene(
  app: App,
  project: Project,
  oldTitle: string,
  file: TFile
): Promise<void> {
  const input = await prompt(app, {
    title: "Rename scene",
    value: oldTitle,
    multiline: false,
    cta: "Rename",
  });
  if (input === null) return;
  const next = input.trim().replace(/[\\/:*?"<>|]/g, "-");
  if (!next || next === oldTitle) return;

  const folder = file.parent ? file.parent.path : "";
  const newPath = normalizePath(folder ? `${folder}/${next}.md` : `${next}.md`);
  if (app.vault.getAbstractFileByPath(newPath)) return; // name taken

  await app.fileManager.renameFile(file, newPath);
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (indexFile instanceof TFile) {
    await updateScenes(app, indexFile, project.draft, (scenes) =>
      scenes.map((s) => (s.title === oldTitle ? { ...s, title: next } : s))
    );
  }
}

export async function deleteScene(
  app: App,
  project: Project,
  title: string,
  file: TFile
): Promise<void> {
  const ok = await confirm(
    app,
    `Delete scene "${title}"? It will be moved to trash and removed from the project.`
  );
  if (!ok) return;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (indexFile instanceof TFile) {
    await updateScenes(app, indexFile, project.draft, (scenes) => removeScene(scenes, title));
  }
  await app.fileManager.trashFile(file);
}

/** Add the common scene items (Open / Edit synopsis / Rename / Delete) to a menu. */
export function addSceneMenuItems(
  menu: Menu,
  app: App,
  project: Project,
  title: string,
  file: TFile,
  opts: { includeOpen?: boolean } = {}
): void {
  if (opts.includeOpen) {
    menu.addItem((i) =>
      i.setTitle("Open").setIcon("file-text").onClick(() => openScene(app, file))
    );
  }
  menu.addItem((i) =>
    i.setTitle("Edit synopsis…").setIcon("text").onClick(() => void editSynopsis(app, file))
  );
  menu.addItem((i) =>
    i.setTitle("Rename…").setIcon("pencil").onClick(() => void renameScene(app, project, title, file))
  );
  menu.addSeparator();
  menu.addItem((i) =>
    i.setTitle("Delete scene").setIcon("trash").onClick(() => void deleteScene(app, project, title, file))
  );
}
