/**
 * Compile pipeline model.
 *
 * A compile run is: gather scenes in order → run ordered SCENE steps (each
 * transforms the scene list) → join into one manuscript string → run ordered
 * MANUSCRIPT steps (each transforms the string) → render to the output format →
 * write. The assembly stages (everything before render/write) are pure and live
 * in engine.ts so they can be tested without Obsidian.
 */

import type { MarkerSet } from "../lib/placeholders";

/** A scene as it flows through the pipeline. */
export interface CompileScene {
  title: string;
  indent: number;
  contents: string;
  /** Scene's `chapter` frontmatter, if any (used by the group-by-chapter step). */
  chapter?: string;
  /** True on the first scene of a chapter (from the outline's chapter runs) —
   *  lets two same-named chapters side by side get a heading each (#58). */
  chapterStart?: boolean;
}

/** Options bag passed to a step instance (step-specific shape). */
export type StepOptions = Record<string, unknown>;

/**
 * What the run is producing — the same for every step in a run. Lets a step
 * adapt to (or skip) an output target: `html-align` rewrites HTML alignment
 * only for pandoc targets whose writer drops raw HTML.
 */
export interface StepContext {
  format: OutputFormat;
  /** pandoc `--to` value (docx / pdf / epub) when `format` is "pandoc". */
  target?: string;
  /** The vault's effective to-do markers (shipped + the writer's own), for
   *  `remove-todos`. Vault-wide settings, not per-project step options. */
  markers?: MarkerSet;
}

export interface SceneStep {
  id: string;
  description: string;
  kind: "scene";
  run(scenes: CompileScene[], options: StepOptions, ctx: StepContext): CompileScene[];
}

export interface ManuscriptStep {
  id: string;
  description: string;
  kind: "manuscript";
  run(manuscript: string, options: StepOptions, ctx: StepContext): string;
}

export type CompileStep = SceneStep | ManuscriptStep;

/** One configured (ordered, parameterized) step in a workflow. */
export interface ConfiguredStep {
  id: string;
  options: StepOptions;
}

/** `docx` = the built-in Word writer (src/compile/docx/); `pandoc` = the optional
 *  external converter (docx with a reference doc, pdf, epub). */
export type OutputFormat = "md" | "html" | "docx" | "pandoc";

/**
 * Built-in Word (standard manuscript format) options, per project. Every field
 * is optional; absent = the default noted. The writer's legal name and contact
 * block are vault-wide preferences (settings `authorName` / `authorContact`),
 * not stored here.
 */
export interface DocxConfig {
  /** Default "times" (Times New Roman); "courier" = Courier New. */
  font?: "times" | "courier";
  /** Default "letter" (8.5×11 in); "a4". */
  paper?: "letter" | "a4";
  /** Name readers see. Default: settings `authorName`. */
  byline?: string;
  /** Running-header surname. Default: the byline's last word. */
  surname?: string;
  /** Default true. */
  titlePage?: boolean;
  /** "END" after the last line. Default true. */
  endMarker?: boolean;
}

export interface PandocOutput {
  /** pandoc `--to` value, e.g. "docx", "pdf", "epub". */
  to: string;
  /** Output file extension, e.g. "docx". */
  extension: string;
  /** Extra CLI args appended verbatim. */
  extraArgs: string[];
}

/**
 * Current compile-config schema version. Bump it (and add a case to
 * `migrateCompileConfig` in config.ts) whenever a NEW step should be on by
 * default for projects that were configured under an older version — a saved
 * `sceneSteps` list is otherwise taken verbatim and never learns about new steps.
 *   1 (implicit — no `version` key): pre-1.14 configs
 *   2: `flatten-links` scene step added, default-on
 *   3: `html-align` scene step added, default-on (1.17)
 */
export const COMPILE_CONFIG_VERSION = 3;

export interface CompileConfig {
  /** Schema version (see {@link COMPILE_CONFIG_VERSION}); absent = 1. */
  version?: number;
  sceneSteps: ConfiguredStep[];
  manuscriptSteps: ConfiguredStep[];
  /** Text inserted between scenes during the join. */
  separator: string;
  /** Output basename (without extension), relative to the project index folder. */
  targetBasename: string;
  format: OutputFormat;
  pandoc?: PandocOutput;
  /** Built-in Word options (kept when switching formats, so they survive a detour). */
  docx?: DocxConfig;
}

export const DEFAULT_COMPILE_CONFIG: CompileConfig = {
  version: COMPILE_CONFIG_VERSION,
  // `prepend-title` is intentionally NOT a default: many authors already put a
  // heading at the top of each scene, so prepending the scene name would
  // double-title the manuscript. Add it explicitly for titleless-scene vaults.
  sceneSteps: [
    { id: "strip-frontmatter", options: {} },
    { id: "remove-comments", options: {} },
    { id: "remove-todos", options: {} },
    { id: "flatten-links", options: {} },
    { id: "html-align", options: {} },
  ],
  manuscriptSteps: [{ id: "trim-blank-lines", options: {} }],
  separator: "\n\n",
  targetBasename: "manuscript",
  format: "md",
};
