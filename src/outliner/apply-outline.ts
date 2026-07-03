/**
 * Write an OutlineTree back to the vault — the one place the derived outputs are
 * materialized. Kept out of index-writer.ts because it also touches scene files
 * (denormalized `act`/`chapter` strings), which that module deliberately never does.
 *
 * One guarded op writes, in order: (1) each scene's `chapter`/`act` string, but
 * only where it changed; (2) the reordered `longform.scenes`; (3) the acts +
 * chapters config arrays. Scene bodies are never touched — frontmatter only.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { persistStructure, updateScenes } from "../projects/index-writer";
import { Project } from "../projects/types";
import { SceneMeta, readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { OutlineTree, serializeOutline } from "./outline";

export async function applyOutline(
  app: App,
  indexFile: TFile,
  project: Project,
  tree: OutlineTree
): Promise<void> {
  const { order, sceneChapter, sceneAct, acts, chapters } = serializeOutline(tree);
  await tryFileOp(async () => {
    // 1. Denormalize scene strings — only for scenes whose value actually changed
    //    (empty string clears the key). Avoids rewriting every scene on each edit.
    for (const s of project.scenes) {
      if (!s.path) continue;
      const f = app.vault.getAbstractFileByPath(s.path);
      if (!(f instanceof TFile)) continue;
      const cur = readSceneMeta(app, f);
      const wantChapter = sceneChapter.get(s.title) ?? "";
      const wantAct = sceneAct.get(s.title) ?? "";
      const patch: Partial<SceneMeta> = {};
      if ((cur.chapter ?? "") !== wantChapter) patch.chapter = wantChapter;
      if ((cur.act ?? "") !== wantAct) patch.act = wantAct;
      if (Object.keys(patch).length > 0) await writeSceneMeta(app, f, patch);
    }
    // 2. Reorder the manuscript to the flattened outline order.
    await updateScenes(app, indexFile, project.draft, () => order);
    // 3. Persist the config arrays (order + actId live here).
    await persistStructure(app, indexFile, "act", acts);
    await persistStructure(app, indexFile, "chapter", chapters);
  }, "Couldn't update the outline.");
}
