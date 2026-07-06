/**
 * Word-count statistics for projects, cached by file mtime so the explorer can
 * render counts cheaply on every refresh.
 */

import { App, TFile } from "obsidian";
import { countWords } from "../lib/wordcount";
import { readSceneMeta } from "../scenes/scene-meta";
import { StructureKind, sumGroupWords } from "../outliner/structure";
import { Project, isMultiScene } from "./types";

interface CacheEntry {
  mtime: number;
  words: number;
}

export class ProjectStats {
  private app: App;
  private cache = new Map<string, CacheEntry>();

  constructor(app: App) {
    this.app = app;
  }

  /** Word count for a single scene path (0 if missing). Cached by mtime. */
  async sceneWords(path: string | null): Promise<number> {
    if (!path) return 0;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return 0;
    const cached = this.cache.get(path);
    if (cached && cached.mtime === file.stat.mtime) return cached.words;
    const contents = await this.app.vault.cachedRead(file);
    const words = countWords(contents);
    this.cache.set(path, { mtime: file.stat.mtime, words });
    return words;
  }

  /** Total word count across a project's scenes (or its single note). */
  async projectWords(project: Project): Promise<number> {
    if (!isMultiScene(project.draft)) {
      return this.sceneWords(project.vaultPath);
    }
    let total = 0;
    for (const scene of project.scenes) {
      total += await this.sceneWords(scene.path);
    }
    return total;
  }

  /**
   * Sum word counts per act/chapter label across a project's scenes, keyed by the
   * scene's `act`/`chapter` string (blank → the "" bucket). Reuses the mtime-cached
   * `sceneWords`; membership is the frozen scene string, read from the metadata cache.
   */
  async groupWords(
    project: Project,
    kind: StructureKind
  ): Promise<Map<string, { words: number; scenes: number }>> {
    if (!isMultiScene(project.draft)) return new Map();
    const entries: Array<{ label?: string; words: number }> = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const label = readSceneMeta(this.app, file)[kind];
      const words = await this.sceneWords(scene.path);
      entries.push({ label, words });
    }
    return sumGroupWords(entries);
  }

  /** Drop a path from the cache (e.g. on delete). */
  invalidate(path: string): void {
    this.cache.delete(path);
  }
}
