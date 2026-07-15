/**
 * Scene template notes — pure helpers (no Obsidian import, unit-testable).
 *
 * New scenes scaffold from a user-authored template note, mirroring the codex
 * template system: the note's existence activates it; deleting it reverts to
 * the default (empty) scaffold. Resolution order per project:
 *   1. the project's `longform.sceneTemplate` path (Longform-compatible), then
 *   2. the vault-wide convention note `<baseFolder>/Templates/Scene.md`.
 * The I/O that resolves and applies a template lives in outliner/create-scene.ts.
 */

import { FolderSettings, joinPath, resolveTemplateFolder } from "../settings/folders";

/** Basename of the vault-wide scene template note (under `<base>/Templates/`). */
export const SCENE_TEMPLATE_BASENAME = "Scene";

/**
 * Ordered candidate vault paths for a project's scene template: the project's
 * own `sceneTemplate` (as written, then with `.md` appended for extension-less
 * values) ahead of the shared `Templates/Scene.md`. The first path that exists
 * wins; none existing means the default scaffold.
 */
export function sceneTemplateCandidates(
  settings: FolderSettings,
  sceneTemplate: string | null | undefined
): string[] {
  const out: string[] = [];
  const own = (sceneTemplate ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (own) {
    out.push(own);
    if (!/\.md$/i.test(own)) out.push(`${own}.md`);
  }
  out.push(joinPath(resolveTemplateFolder(settings), `${SCENE_TEMPLATE_BASENAME}.md`));
  return out;
}

/** Starter note text for the scene template ("Generate starter templates"). */
export function starterSceneTemplate(): string {
  return [
    "%% This note is the template for new scenes: its frontmatter and body are",
    "   copied into every scene Inkswell creates, and `{{title}}` becomes the",
    "   scene's name. If you don't set a `status:` key here, new scenes get",
    "   `status: idea`; a synopsis Inkswell seeds itself (e.g. from a beat's",
    "   blurb) always wins over the template's.",
    "   Scene fields you can fill from the Inspector: status, pov, synopsis,",
    "   subtitle, act, chapter, color, characters, location, plotlines,",
    "   targetWords. A single project can use its own template instead via the",
    "   `sceneTemplate` key on its index note.",
    "   Delete this note to go back to empty new scenes. %%",
    "",
  ].join("\n");
}
