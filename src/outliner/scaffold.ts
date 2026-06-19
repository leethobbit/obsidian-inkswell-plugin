/**
 * Scaffold placeholder scenes from a beat template: one scene per beat (titled
 * after the beat, synopsis pre-filled from its blurb, status "idea"), added
 * to the project's index in template order. Existing scenes/files are skipped, so
 * it's safe to re-run. Touches scene files' frontmatter + the index only.
 */

import { App, TFile, normalizePath } from "obsidian";
import { updateScenes } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { getTemplate } from "./beat-templates";

function sanitizeTitle(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

/** Returns the number of scenes created (or already present and newly indexed). */
export async function scaffoldFromTemplate(
  app: App,
  store: ProjectStore,
  project: Project,
  templateId: string
): Promise<number> {
  if (!isMultiScene(project.draft)) return 0;
  const indexFile = app.vault.getAbstractFileByPath(project.vaultPath);
  if (!(indexFile instanceof TFile)) return 0;

  const folder = store.resolveSceneFolder(indexFile, project.draft.sceneFolder);
  if (folder && folder !== "/" && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* already exists / race — ignore */
    }
  }

  const template = getTemplate(templateId);
  const added: string[] = [];
  for (const beat of template) {
    const title = sanitizeTitle(beat.name);
    if (!title) continue;
    const path = normalizePath(folder === "/" ? `${title}.md` : `${folder}/${title}.md`);
    if (!app.vault.getAbstractFileByPath(path)) {
      const fm = `---\nstatus: idea\nsynopsis: ${JSON.stringify(beat.blurb)}\n---\n`;
      await app.vault.create(path, fm);
    }
    added.push(title);
  }

  let createdCount = 0;
  await updateScenes(app, indexFile, project.draft, (scenes) => {
    const have = new Set(scenes.map((s) => s.title));
    const additions = added
      .filter((t) => !have.has(t))
      .map((t) => ({ title: t, indent: 0 }));
    createdCount = additions.length;
    return [...scenes, ...additions];
  });
  return createdCount;
}
