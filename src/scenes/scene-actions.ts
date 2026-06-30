/**
 * Shared scene actions + a right-click menu builder, used by the Board cards and
 * the Home scene rows. Rename updates both the file and the index entry; delete
 * trashes the file and unlinks it from the project. Edits touch frontmatter only
 * (synopsis) — never the prose body.
 */

import { App, MarkdownView, Menu, Modal, Setting, TFile, normalizePath } from "obsidian";
import { persistInkswellData, updateScenes } from "../projects/index-writer";
import { expectInAppRename } from "../projects/rename-heal";
import { renameSceneInBeats } from "../outliner/beats";
import { removeScene } from "../projects/scene-tree";
import { Project } from "../projects/types";
import { EditSceneModal } from "./edit-scene-modal";
import { readSceneMeta, writeSceneMeta } from "./scene-meta";
import type InkswellPlugin from "../../main";

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
      // Deliberate API tension: `setWarning()` is deprecated in favor of
      // `setDestructive()`, but `setDestructive()` was added in Obsidian 1.13.0 —
      // newer than our `minAppVersion` (1.7.4), so adopting it would trip
      // obsidianmd/no-unsupported-api AND throw at runtime on the floor. We keep
      // the deprecated-but-floor-safe call and silence only the deprecation here;
      // revisit if/when minAppVersion rises to ≥1.13.0.
      .addButton((b) =>
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- setWarning required by minAppVersion floor; see comment above
        b.setButtonText("Delete").setWarning().onClick(() => {
          this.ok = true;
          this.close();
        })
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose(): void {
    this.contentEl.empty();
    this.cb(this.ok);
  }
}

export function promptText(
  app: App,
  opts: { title: string; value: string; multiline: boolean; cta: string }
): Promise<string | null> {
  return new Promise((resolve) => new PromptModal(app, opts, resolve).open());
}

export function confirmDelete(app: App, message: string): Promise<boolean> {
  return new Promise((resolve) => new ConfirmModal(app, message, resolve).open());
}

/**
 * Open a scene/note for plain editing. If it's already open in a tab, just focus
 * that tab; otherwise open it in a new, focused tab (like Ctrl/Cmd-clicking a
 * wikilink). Never reuses an unrelated background tab, so navigating from
 * Inkswell never clobbers a different note the user has open.
 */
export function openScene(app: App, file: TFile): void {
  const existing = app.workspace
    .getLeavesOfType("markdown")
    .find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path);
  if (existing) {
    void app.workspace.revealLeaf(existing);
    app.workspace.setActiveLeaf(existing, { focus: true });
    return;
  }
  const leaf = app.workspace.getLeaf("tab");
  void leaf.openFile(file, { active: true });
}

export async function editSynopsis(app: App, file: TFile): Promise<void> {
  const current = readSceneMeta(app, file).synopsis ?? "";
  const value = await promptText(app, {
    title: `Synopsis — ${file.basename}`,
    value: current,
    multiline: true,
    cta: "Save",
  });
  if (value !== null) await writeSceneMeta(app, file, { synopsis: value });
}

/**
 * Rename a scene (prompt → file rename + index/beat title rewrite). Returns the
 * new vault path on success, or null if cancelled / unchanged / name-taken — so
 * a caller keyed on the scene's path (e.g. the Write editor) can re-point itself.
 */
export async function renameScene(
  app: App,
  project: Project,
  oldTitle: string,
  file: TFile
): Promise<string | null> {
  const input = await promptText(app, {
    title: "Rename scene",
    value: oldTitle,
    multiline: false,
    cta: "Rename",
  });
  if (input === null) return null;
  const next = input.trim().replace(/[\\/:*?"<>|]/g, "-");
  if (!next || next === oldTitle) return null;

  const folder = file.parent ? file.parent.path : "";
  const newPath = normalizePath(folder ? `${folder}/${next}.md` : `${next}.md`);
  if (app.vault.getAbstractFileByPath(newPath)) return null; // name taken

  // Tell the store's rename-heal this rename is app-initiated — we update the
  // index below, so the heal must not also fire (a redundant/racing write).
  expectInAppRename(newPath);
  await app.fileManager.renameFile(file, newPath);
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (indexFile instanceof TFile) {
    await updateScenes(app, indexFile, project.draft, (scenes) =>
      scenes.map((s) => (s.title === oldTitle ? { ...s, title: next } : s))
    );
    // Beats link scenes by title in a separate frontmatter structure, so rewrite
    // those links too — otherwise the rename orphans the beat's scene chip.
    const beats = renameSceneInBeats(project.inkswell?.beats, oldTitle, next);
    if (beats) await persistInkswellData(app, indexFile, { beats });
  }
  return newPath;
}

export async function deleteScene(
  app: App,
  project: Project,
  title: string,
  file: TFile
): Promise<void> {
  const ok = await confirmDelete(
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
  opts: {
    includeOpen?: boolean;
    plugin?: InkswellPlugin;
    /** Called with the new vault path after a successful rename (e.g. so a
     *  path-keyed caller can keep its selection pinned to the renamed scene). */
    onRenamed?: (newPath: string) => void;
  } = {}
): void {
  if (opts.includeOpen) {
    menu.addItem((i) =>
      i.setTitle("Open").setIcon("file-text").onClick(() => openScene(app, file))
    );
  }
  menu.addItem((i) =>
    i.setTitle("Edit scene…").setIcon("settings-2").onClick(() => new EditSceneModal(app, file, project, opts.plugin ?? null).open())
  );
  menu.addItem((i) =>
    i.setTitle("Edit synopsis…").setIcon("text").onClick(() => void editSynopsis(app, file))
  );
  menu.addItem((i) =>
    i.setTitle("Rename…").setIcon("pencil").onClick(async () => {
      const newPath = await renameScene(app, project, title, file);
      if (newPath) opts.onRenamed?.(newPath);
    })
  );
  menu.addSeparator();
  menu.addItem((i) =>
    i.setTitle("Delete scene").setIcon("trash").onClick(() => void deleteScene(app, project, title, file))
  );
}
