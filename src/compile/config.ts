/**
 * Shared compile-config resolution. Both the Publish → Compile panel and the
 * "Compile the active project" command resolve a project's config through here,
 * so the two entry points can never diverge on steps, separator, output name, or
 * format. Pure (no Obsidian imports) — unit-testable.
 */

import { Project } from "../projects/types";
import { CompileConfig, DEFAULT_COMPILE_CONFIG, OutputFormat } from "./types";

/**
 * Resolve a raw stored `inkswell.compile` value (untyped frontmatter) into a
 * usable config, or a fresh default seeded with `fallbackFormat` (the user's
 * `defaultCompileFormat` setting) when the project has never been configured.
 * Always returns a CLONE — never the caller's object — so mutating the result
 * (the compile panel does, and `updateCompile`'s mutator does) can corrupt
 * neither the ProjectStore's cached parse nor the stored frontmatter object.
 */
export function resolveCompileValue(
  saved: unknown,
  fallbackFormat: OutputFormat = "md"
): CompileConfig {
  if (
    saved &&
    typeof saved === "object" &&
    Array.isArray((saved as CompileConfig).sceneSteps)
  ) {
    return JSON.parse(JSON.stringify(saved)) as CompileConfig;
  }

  const config = JSON.parse(JSON.stringify(DEFAULT_COMPILE_CONFIG)) as CompileConfig;
  config.format = fallbackFormat;
  if (fallbackFormat === "pandoc") {
    config.pandoc = { to: "docx", extension: "docx", extraArgs: [] };
  }
  return config;
}

/** {@link resolveCompileValue} over a project's parsed data (panel/command entry). */
export function resolveCompileConfig(
  project: Project,
  fallbackFormat: OutputFormat = "md"
): CompileConfig {
  return resolveCompileValue(project.inkswell?.compile, fallbackFormat);
}

/**
 * Scene steps that each emit a heading per scene/chapter. Enabling both stacks
 * two headings (e.g. "# One" then "# 01 - Scene title"), so they're mutually
 * exclusive — turning one on turns the others off.
 */
export const EXCLUSIVE_HEADING_STEPS = ["prepend-title", "group-by-chapter"];

/**
 * Toggle one step in a config's step list, IN PLACE (designed to run inside
 * `updateCompile`'s mutator, against the CURRENT stored config): applies the
 * heading-exclusivity rule, rebuilds the list in registry order (`orderedIds`),
 * preserves existing steps' options, and seeds defaults for newly-added
 * heading steps.
 */
export function applyStepToggle(
  config: CompileConfig,
  key: "sceneSteps" | "manuscriptSteps",
  orderedIds: readonly string[],
  stepId: string,
  enabled: boolean,
  defaults: { sceneHeadingLevel: number }
): void {
  const prevSteps = config[key];
  const included = new Set(prevSteps.map((s) => s.id));
  if (enabled) {
    included.add(stepId);
    if (EXCLUSIVE_HEADING_STEPS.includes(stepId)) {
      for (const other of EXCLUSIVE_HEADING_STEPS) {
        if (other !== stepId) included.delete(other);
      }
    }
  } else {
    included.delete(stepId);
  }
  config[key] = orderedIds
    .filter((id) => included.has(id))
    .map((id) => {
      const prev = prevSteps.find((c) => c.id === id);
      if (prev) return { id, options: prev.options ?? {} };
      if (id === "prepend-title") {
        return { id, options: { level: defaults.sceneHeadingLevel } };
      }
      if (id === "group-by-chapter") {
        return { id, options: { level: defaults.sceneHeadingLevel, sceneBreak: "* * *" } };
      }
      return { id, options: {} };
    });
}
