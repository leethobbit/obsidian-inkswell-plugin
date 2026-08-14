/**
 * Tier-2 reconcile/relink banner for the Explorer panel. Extracted from
 * explorer-view.ts.
 *
 * When a project has missing scenes (index title with no file) and/or orphan
 * files (in the folder, not in the index) — usually from a file renamed while
 * the plugin was closed — surface them with one-click relink options.
 * Proposes; never silently guesses. Writes go through the index writer, which
 * triggers a store refresh that re-renders this banner away.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import { renameSceneInIndex, updateDraftFields, updateScenes } from "../../projects/index-writer";
import { reconcileSuggestions } from "../../projects/rename-heal";
import { addScene, removeScene } from "../../projects/scene-tree";
import { Project, isMultiScene } from "../../projects/types";

/** "1 scene" / "2 scenes" — naive count + noun pluralization. */
function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export class ReconcileBanner {
  private app: App;

  constructor(
    app: App,
    /** Marks index writes as the app's own so the host soft-refreshes in place. */
    private markWrite: (path: string) => void = () => {}
  ) {
    this.app = app;
  }

  render(section: HTMLElement, project: Project): void {
    const { missing, orphans, autoMatch } = reconcileSuggestions(project);
    if (missing.length === 0 && orphans.length === 0) return;

    const box = section.createDiv({ cls: "inkswell-reconcile" });
    box.createDiv({ cls: "inkswell-reconcile__head", text: "Scene files out of sync" });
    box.createDiv({
      cls: "inkswell-reconcile__summary",
      text: `${plural(missing.length, "scene")} missing · ${plural(orphans.length, "unindexed file")} in this folder.`,
    });

    // Unambiguous 1:1 — offer the single obvious relink and stop.
    if (autoMatch) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({
        cls: "inkswell-reconcile__label",
        text: `“${autoMatch.oldTitle}” looks renamed to “${autoMatch.newBasename}”.`,
      });
      const btn = row.createEl("button", { cls: "mod-cta", text: "Relink" });
      btn.onclick = () => void this.relink(project, autoMatch.oldTitle, autoMatch.newBasename);
      return;
    }

    for (const title of missing) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({ cls: "inkswell-reconcile__label", text: `Missing: ${title}` });
      if (orphans.length > 0) {
        const sel = row.createEl("select", { cls: "dropdown" });
        for (const o of orphans) sel.createEl("option", { text: o, value: o });
        const relink = row.createEl("button", { text: "Relink to…" });
        relink.onclick = () => void this.relink(project, title, sel.value);
      }
      const rm = row.createEl("button", { text: "Remove from project" });
      rm.onclick = () => void this.removeFromProject(project, title);
    }
    for (const basename of orphans) {
      const row = box.createDiv({ cls: "inkswell-reconcile__row" });
      row.createSpan({ cls: "inkswell-reconcile__label", text: `Unindexed: ${basename}` });
      const add = row.createEl("button", { text: "Add as scene" });
      add.onclick = () => void this.addAsScene(project, basename);
      const ign = row.createEl("button", { text: "Ignore" });
      ign.onclick = () => void this.ignoreFile(project, basename);
    }
  }

  /** Rewrite a scene's index title to a file's basename (the relink/heal transform). */
  private async relink(project: Project, oldTitle: string, newBasename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    // One transaction rewrites the scene title AND any beat links pointing at
    // it, both computed against the file's current state.
    // NOT marked as a self-write: relinking makes the scene file resolve, so
    // the notify batch also names the newly-resolved path (which we can't
    // compute here) — a partial mark never covers and would only linger.
    await tryFileOp(
      () => renameSceneInIndex(this.app, file, oldTitle, newBasename),
      "Couldn't relink the scene."
    );
  }

  private async removeFromProject(project: Project, title: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    // Index-only write (the removed scene is MISSING, so it has no resolved
    // fingerprint entry of its own) — safe to mark for a soft refresh.
    this.markWrite(file.path);
    await tryFileOp(
      () => updateScenes(this.app, file, (scenes) => removeScene(scenes, title)),
      "Couldn't remove the scene from the project."
    );
  }

  private async addAsScene(project: Project, basename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    // NOT marked: adding the scene makes its file resolve, so the notify batch
    // also names that path — a partial mark never covers (see relink note).
    await tryFileOp(
      () => updateScenes(this.app, file, (scenes) => addScene(scenes, basename)),
      "Couldn't add the scene."
    );
  }

  /** Add an orphan file to the project's `ignoredFiles` so it stops being flagged. */
  private async ignoreFile(project: Project, basename: string): Promise<void> {
    const file = this.indexFile(project);
    if (!file || !isMultiScene(project.draft)) return;
    // Field-level transform of the CURRENT draft — never a whole-draft snapshot
    // write, which would rewrite `longform.scenes` from stale state too.
    this.markWrite(file.path);
    await tryFileOp(
      () =>
        updateDraftFields(this.app, file, (d) =>
          isMultiScene(d) && !d.ignoredFiles.includes(basename)
            ? { ...d, ignoredFiles: [...d.ignoredFiles, basename] }
            : d
        ),
      "Couldn't ignore the file."
    );
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
