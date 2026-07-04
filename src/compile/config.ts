/**
 * Shared compile-config resolution. Both the Publish → Compile panel and the
 * "Compile the active project" command resolve a project's config through here,
 * so the two entry points can never diverge on steps, separator, output name, or
 * format. Pure (no Obsidian imports) — unit-testable.
 */

import { Project } from "../projects/types";
import { CompileConfig, DEFAULT_COMPILE_CONFIG, OutputFormat } from "./types";

/**
 * The project's saved compile config, or a fresh default seeded with
 * `fallbackFormat` (the user's `defaultCompileFormat` setting). A saved config is
 * returned verbatim — its own format wins; `fallbackFormat` only applies when the
 * project has never been configured.
 */
export function resolveCompileConfig(
  project: Project,
  fallbackFormat: OutputFormat = "md"
): CompileConfig {
  const saved = project.inkswell?.compile;
  if (saved && Array.isArray(saved.sceneSteps)) return saved;

  const config = JSON.parse(JSON.stringify(DEFAULT_COMPILE_CONFIG)) as CompileConfig;
  config.format = fallbackFormat;
  if (fallbackFormat === "pandoc") {
    config.pandoc = { to: "docx", extension: "docx", extraArgs: [] };
  }
  return config;
}
