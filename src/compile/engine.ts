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
import { readSceneMeta } from "../scenes/scene-meta";
import { sanitizeSegment } from "../settings/folders";
import { assembleManuscript } from "./assemble";
import { runPandoc } from "./pandoc";
import { CompileConfig, CompileScene } from "./types";

export interface CompileResult {
  /** Vault-relative path written, or absolute path for pandoc output. */
  outputPath: string;
  wordCountSource: string;
}

export { assembleManuscript };

/**
 * Ownership marker stamped on the first line of md/html compile output, so a
 * later compile can distinguish "my previous output — replace it" from a
 * hand-written note that happens to share the configured name (which must
 * never be silently destroyed). Invisible in rendered Markdown and in browsers.
 */
export const COMPILE_MARKER = "<!-- inkswell:compile -->";

/** The compile output would overwrite a note Inkswell didn't produce. */
export class OutputExistsError extends Error {
  constructor(readonly path: string) {
    super(
      `"${path}" already exists and doesn't look like a previous Inkswell compile. ` +
        `Rename the output (Publish → Compile → Output file name) or confirm the overwrite there.`
    );
  }
}

export interface CompileOptions {
  /** Replace even a marker-less existing file (the user confirmed; the caller
   *  is responsible for backing the displaced note up first). */
  allowOverwrite?: boolean;
}

/** Load scene contents, assemble, render, and write. Returns the output path. */
export async function runCompile(
  app: App,
  project: Project,
  config: CompileConfig,
  opts: CompileOptions = {}
): Promise<CompileResult> {
  const scenes = await loadScenes(app, project);
  if (scenes.length === 0) {
    throw new Error("No scenes with content to compile.");
  }
  const manuscript = assembleManuscript(scenes, config);

  // Defense in depth: the panel sanitizes on input, but the config is
  // hand-editable frontmatter — a name containing "/" would resolve the output
  // to a SIBLING path (e.g. a scene file) instead of a note in the project folder.
  const basename = sanitizeSegment(config.targetBasename) || "manuscript";
  const indexFolder = folderOf(project.vaultPath);
  const base = normalizePath(indexFolder ? `${indexFolder}/${basename}` : basename);

  if (config.format === "md") {
    const path = `${base}.md`;
    await writeOutput(app, path, `${COMPILE_MARKER}\n${manuscript}`, opts);
    return { outputPath: path, wordCountSource: manuscript };
  }

  if (config.format === "html") {
    const html = await renderHtml(app, manuscript, project.vaultPath);
    const path = `${base}.html`;
    await writeOutput(app, path, html, opts);
    return { outputPath: path, wordCountSource: manuscript };
  }

  // pandoc — writes binary output itself (docx/pdf/epub, never .md), so the
  // vault-note overwrite guard doesn't apply on this path.
  if (!config.pandoc) {
    throw new Error("Pandoc output selected but no pandoc options configured.");
  }
  const outputPath = await runPandoc(app, manuscript, base, config.pandoc);
  return { outputPath, wordCountSource: manuscript };
}

/**
 * Write compile output through the vault API (NOT `adapter.write`) so the file
 * shows up in Obsidian's file index and metadata cache immediately. An existing
 * file is replaced ONLY when it carries the compile marker (it's our previous
 * output) or the caller explicitly allowed the overwrite after confirmation —
 * a hand-written note at the configured path throws instead of being destroyed.
 */
async function writeOutput(
  app: App,
  path: string,
  content: string,
  opts: CompileOptions
): Promise<TFile> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    if (!opts.allowOverwrite) {
      const head = (await app.vault.cachedRead(existing)).slice(0, 300);
      if (!head.includes("inkswell:compile")) throw new OutputExistsError(path);
    }
    await app.vault.modify(existing, content);
    return existing;
  }
  if (existing) {
    throw new Error(`Can't write "${path}" — a folder with that name exists.`);
  }
  return app.vault.create(path, content);
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
    const chapter = readSceneMeta(app, file).chapter;
    out.push({ title: scene.title, indent: scene.indent, contents, chapter });
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
    // innerHTML READ off a detached element, never a write to the live DOM:
    // it serializes MarkdownRenderer's already-sanitized output into the
    // exported HTML string. Not an injection sink.
    const body = container.innerHTML;
    // The compile marker rides in the head slice so writeOutput can recognize
    // this file as a previous compile on the next run.
    return `<!doctype html>\n${COMPILE_MARKER}\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
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
