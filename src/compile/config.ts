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
  // Deep clone — `saved` is the ProjectStore's cached parse, shared across
  // refreshes and documented immutable. The compile panel mutates the resolved
  // config in place, which must never corrupt the store's cache (a failed
  // write would otherwise leave the UI showing the change as applied).
  if (saved && Array.isArray(saved.sceneSteps)) {
    return JSON.parse(JSON.stringify(saved)) as CompileConfig;
  }

  const config = JSON.parse(JSON.stringify(DEFAULT_COMPILE_CONFIG)) as CompileConfig;
  config.format = fallbackFormat;
  if (fallbackFormat === "pandoc") {
    config.pandoc = { to: "docx", extension: "docx", extraArgs: [] };
  }
  return config;
}
