/**
 * Compile engine.
 *
 * `assembleManuscript` is the pure core (no Obsidian) — gather → scene steps →
 * join → manuscript steps → string — and is what the unit tests exercise.
 * `runCompile` is the I/O wrapper that loads scene contents, renders the output
 * format, and writes the result.
 */

import {
  App,
  Component,
  FileSystemAdapter,
  MarkdownRenderer,
  TFile,
  normalizePath,
} from "obsidian";
import { Project, isMultiScene } from "../projects/types";
import { assembleManuscript } from "./assemble";
import { runPandoc } from "./pandoc";
import { CompileConfig, CompileScene } from "./types";

export interface CompileResult {
  /** Vault-relative path written, or absolute path for pandoc output. */
  outputPath: string;
  wordCountSource: string;
}

export { assembleManuscript };

/** Load scene contents, assemble, render, and write. Returns the output path. */
export async function runCompile(
  app: App,
  project: Project,
  config: CompileConfig
): Promise<CompileResult> {
  const scenes = await loadScenes(app, project);
  if (scenes.length === 0) {
    throw new Error("No scenes with content to compile.");
  }
  const manuscript = assembleManuscript(scenes, config);

  const indexFolder = folderOf(project.vaultPath);
  const base = normalizePath(
    indexFolder ? `${indexFolder}/${config.targetBasename}` : config.targetBasename
  );

  if (config.format === "md") {
    const path = `${base}.md`;
    await app.vault.adapter.write(path, manuscript);
    return { outputPath: path, wordCountSource: manuscript };
  }

  if (config.format === "html") {
    const html = await renderHtml(app, manuscript, project.vaultPath);
    const path = `${base}.html`;
    await app.vault.adapter.write(path, html);
    return { outputPath: path, wordCountSource: manuscript };
  }

  // pandoc
  if (!config.pandoc) {
    throw new Error("Pandoc output selected but no pandoc options configured.");
  }
  const outputPath = await runPandoc(app, manuscript, base, config.pandoc);
  return { outputPath, wordCountSource: manuscript };
}

async function loadScenes(app: App, project: Project): Promise<CompileScene[]> {
  if (!isMultiScene(project.draft)) {
    const file = app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(file instanceof TFile)) return [];
    const contents = await app.vault.cachedRead(file);
    return [{ title: project.draft.title, indent: 0, contents }];
  }

  const out: CompileScene[] = [];
  for (const scene of project.scenes) {
    if (!scene.path) continue; // missing scene file — skip
    const file = app.vault.getAbstractFileByPath(scene.path);
    if (!(file instanceof TFile)) continue;
    const contents = await app.vault.cachedRead(file);
    out.push({ title: scene.title, indent: scene.indent, contents });
  }
  return out;
}

/** Render markdown to a standalone HTML document using Obsidian's renderer. */
async function renderHtml(
  app: App,
  markdown: string,
  sourcePath: string
): Promise<string> {
  const component = new Component();
  const container = createDiv();
  try {
    await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
    const body = container.innerHTML;
    return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  } finally {
    component.unload();
  }
}

function folderOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

/** True when the vault is on a real filesystem (required for pandoc). */
export function vaultHasFilesystem(app: App): boolean {
  return app.vault.adapter instanceof FileSystemAdapter;
}
