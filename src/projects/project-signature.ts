/**
 * Structural fingerprint of the project list (pure — no Obsidian imports, so it's
 * unit-testable). The ProjectStore uses it to skip subscriber notifications when a
 * vault edit didn't change anything subscribers render — e.g. editing a scene's
 * body (word counts aren't part of `Project`) or a codex note's frontmatter.
 * Includes `inkswell` so beats/compile/goals/series edits still trigger a refresh.
 */

import { Project } from "./types";

export function projectsSignature(projects: Project[]): string {
  return projects
    .map((p) => {
      const scenes = p.scenes.map((s) => `${s.title}:${s.path ?? ""}`).join("|");
      const ink = JSON.stringify(p.inkswell ?? null);
      return `${p.vaultPath}#${p.draft.title}#${p.draft.format}#${scenes}#${ink}`;
    })
    .join("\n");
}
