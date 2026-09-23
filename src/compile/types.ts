/**
 * Compile pipeline model.
 *
 * A compile run is: gather scenes in order → run ordered SCENE steps (each
 * transforms the scene list) → join into one manuscript string → run ordered
 * MANUSCRIPT steps (each transforms the string) → render to the output format →
 * write. The assembly stages (everything before render/write) are pure and live
 * in engine.ts so they can be tested without Obsidian.
 */

/** A scene as it flows through the pipeline. */
export interface CompileScene {
  title: string;
  indent: number;
  contents: string;
  /** Scene's `chapter` frontmatter, if any (used by the group-by-chapter step). */
  chapter?: string;
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

export type OutputFormat = "md" | "html" | "pandoc";

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
