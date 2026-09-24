/**
 * The "Sort scenes by chapter number" action (Structure toolbar, a book's ⋯
 * menu, the command palette). Confirms, then rewrites ONLY the index note's
 * scene order through `updateScenes` — the transform re-reads the CURRENT
 * stored list (AGENTS.md gotcha 10), scene bodies are never touched.
 */

import { App, Notice, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { updateScenes } from "../projects/index-writer";
import { Project, isMultiScene } from "../projects/types";
import { confirmDestructive } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { parseChapterNumber, sortScenesByChapter } from "./sort-by-chapter";
import type InkswellPlugin from "../../main";

export async function sortProjectByChapter(
  app: App,
  plugin: InkswellPlugin,
  project: Project
): Promise<void> {
  if (!isMultiScene(project.draft)) {
    new Notice("Sorting by chapter applies to multi-scene projects.");
    return;
  }
  const chapterOf = (title: string): string | undefined => {
    const scene = project.scenes.find((s) => s.title === title);
    const f = scene?.path ? app.vault.getAbstractFileByPath(scene.path) : null;
    return f instanceof TFile ? readSceneMeta(app, f).chapter : undefined;
  };
  const current = project.draft.scenes;
  if (sortScenesByChapter(current, chapterOf) === current) {
    new Notice("Scenes are already in chapter order.");
    return;
  }
  const numbered = current.filter((s) => parseChapterNumber(chapterOf(s.title)) !== null).length;
  const unnumbered = current.length - numbered;
  const ok = await confirmDestructive(
    app,
    `Reorder ${current.length} scenes by chapter number? ${numbered} carry a number` +
      (unnumbered > 0 ? `; the other ${unnumbered} keep their order at the end.` : ".") +
      " This replaces the current manuscript order (nothing is deleted).",
    "Reorder"
  );
  if (!ok) return;
  const index = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(index instanceof TFile)) return;
  plugin.selfWrites.mark(index.path);
  const done = await tryFileOp(
    () => updateScenes(app, index, (cur) => sortScenesByChapter(cur, chapterOf)),
    "Couldn't reorder the scenes."
  );
  if (done !== null) new Notice("Scenes reordered by chapter number.");
}
