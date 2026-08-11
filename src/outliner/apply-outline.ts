/**
 * Write an OutlineTree back to the vault — the one place the derived outputs are
 * materialized. Kept out of index-writer.ts because it also touches scene files
 * (denormalized `act`/`chapter` strings), which that module deliberately never does.
 *
 * One guarded op writes, in order: (1) each scene's `chapter`/`act` string, but
 * only where it changed; (2) the reordered `longform.scenes` plus the acts +
 * chapters config arrays, as ONE index transaction (`persistOutline`, which
 * rebases the order onto the current scene list). Scene bodies are never
 * touched — frontmatter only.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { persistOutline } from "../projects/index-writer";
import { Project } from "../projects/types";
import { SceneMeta, readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import { OutlineTree, serializeOutline } from "./outline";

/**
 * `mark` (when given) records each path as a self-write right before it's
 * written, so the host view can soft-refresh the structure panel in place
 * instead of tearing down the whole body — which resets scroll to the top on
 * every drag, the "move a scene, scroll back down, repeat" jank.
 */
export async function applyOutline(
  app: App,
  indexFile: TFile,
  project: Project,
  tree: OutlineTree,
  mark: (path: string) => void = () => {}
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
      if (Object.keys(patch).length > 0) {
        mark(f.path);
        await writeSceneMeta(app, f, patch);
      }
    }
    // 2. Reorder the manuscript + persist the config arrays in ONE index write.
    //    The order is rebased onto the CURRENT scene list inside the write, so a
    //    drag applied from a stale tree can't drop a concurrently-created scene.
    mark(indexFile.path);
    await persistOutline(app, indexFile, { order, acts, chapters });
  }, "Couldn't update the outline.");
}
