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
}

/** Options bag passed to a step instance (step-specific shape). */
export type StepOptions = Record<string, unknown>;

export interface SceneStep {
  id: string;
  description: string;
  kind: "scene";
  run(scenes: CompileScene[], options: StepOptions): CompileScene[];
}

export interface ManuscriptStep {
  id: string;
  description: string;
  kind: "manuscript";
  run(manuscript: string, options: StepOptions): string;
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

export interface CompileConfig {
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
  // `prepend-title` is intentionally NOT a default: many authors already put a
  // heading at the top of each scene, so prepending the scene name would
  // double-title the manuscript. Add it explicitly for titleless-scene vaults.
  sceneSteps: [
    { id: "strip-frontmatter", options: {} },
    { id: "remove-comments", options: {} },
  ],
  manuscriptSteps: [{ id: "trim-blank-lines", options: {} }],
  separator: "\n\n",
  targetBasename: "manuscript",
  format: "md",
};
