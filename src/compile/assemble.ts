/**
 * Pure manuscript assembly — no Obsidian imports, so it is unit-testable in a
 * plain Node environment. The I/O wrapper (scene loading, render, write) lives in
 * engine.ts and calls into this.
 *
 * Pipeline: scenes → ordered SCENE steps → join with separator → ordered
 * MANUSCRIPT steps → string.
 */

import { STEP_REGISTRY } from "./steps";
import {
  CompileConfig,
  CompileScene,
  CompileStep,
  ManuscriptStep,
  SceneStep,
  StepContext,
} from "./types";

export function assembleManuscript(
  scenes: CompileScene[],
  config: CompileConfig,
  registry: Map<string, CompileStep> = STEP_REGISTRY
): string {
  let working = scenes.map((s) => ({ ...s }));
  // Every step sees the same output target (a step may adapt to it or skip).
  const ctx: StepContext = {
    format: config.format,
    ...(config.pandoc ? { target: config.pandoc.to } : {}),
  };

  for (const cfg of config.sceneSteps) {
    const step = resolveStep(registry, cfg.id, "scene") as SceneStep;
    working = step.run(working, cfg.options, ctx);
  }

  let manuscript = working.map((s) => s.contents).join(config.separator);

  for (const cfg of config.manuscriptSteps) {
    const step = resolveStep(registry, cfg.id, "manuscript") as ManuscriptStep;
    manuscript = step.run(manuscript, cfg.options, ctx);
  }

  return manuscript;
}

function resolveStep(
  registry: Map<string, CompileStep>,
  id: string,
  kind: "scene" | "manuscript"
): CompileStep {
  const step = registry.get(id);
  if (!step) throw new Error(`Unknown compile step: "${id}"`);
  if (step.kind !== kind) {
    throw new Error(`Step "${id}" is a ${step.kind} step, not a ${kind} step`);
  }
  return step;
}
