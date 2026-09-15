/**
 * I/O for the vault-wide scene template note (`<base>/Templates/Scene.md`) —
 * the Customize → Scene template editor's target. Per-project `sceneTemplate`
 * overrides are resolved (not edited) by outliner/create-scene.ts.
 */

import { App, TFile, normalizePath } from "obsidian";
import { FolderSettings, joinPath, resolveTemplateFolder } from "../settings/folders";
import { SCENE_TEMPLATE_BASENAME, starterSceneTemplate } from "./scene-template";

/** Path of the vault-wide scene template note. */
export function sceneTemplatePath(settings: FolderSettings): string {
  return normalizePath(joinPath(resolveTemplateFolder(settings), `${SCENE_TEMPLATE_BASENAME}.md`));
}

/** The vault-wide scene template note, or null when none exists. */
export function resolveVaultSceneTemplate(app: App, settings: FolderSettings): TFile | null {
  const f = app.vault.getAbstractFileByPath(sceneTemplatePath(settings));
  return f instanceof TFile ? f : null;
}

/** The vault-wide scene template: existing, else a fresh starter. Never clobbers. */
export async function ensureSceneTemplate(app: App, settings: FolderSettings): Promise<TFile> {
  const existing = resolveVaultSceneTemplate(app, settings);
  if (existing) return existing;
  const folder = resolveTemplateFolder(settings);
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }
  return app.vault.create(sceneTemplatePath(settings), starterSceneTemplate());
}
