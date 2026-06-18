/**
 * Word-count statistics for projects, cached by file mtime so the explorer can
 * render counts cheaply on every refresh.
 */

import { App, TFile } from "obsidian";
import { countWords } from "../lib/wordcount";
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

  /** Drop a path from the cache (e.g. on delete). */
  invalidate(path: string): void {
    this.cache.delete(path);
  }
}
