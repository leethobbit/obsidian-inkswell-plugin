/**
 * Obsidian I/O for "Rename project" — executes a {@link ./rename-plan} plan.
 * Order matters: the folder moves first (Obsidian carries every child and
 * rewrites wikilinks), then the index notes and plan note, then frontmatter on
 * each draft, then codex scope, path-keyed caches, and the active-project pointer.
 */

import { App, Notice, TAbstractFile, TFile, normalizePath } from "obsidian";
import { getCodexEntities, writeEntityScope } from "../codex/codex-store";
import { tryFileOp } from "../lib/notify";
import { persistOverview, updateDraftFields } from "./index-writer";
import { expectInAppRename } from "./rename-heal";
import { ProjectRenamePlan } from "./rename-plan";

export interface RenameHooks {
  /** Mark a path as an app-initiated write (soft refresh instead of full re-render). */
  mark: (path: string) => void;
  /** Rekey path-indexed caches (writing-tracker baselines). */
  remapPaths: (remap: (path: string) => string) => void;
  /** Current active-project index path, and its setter. */
  getActive: () => string | null;
  setActive: (path: string | null) => void;
}

/** Execute the plan. Returns true when every step completed. */
export async function executeProjectRename(
  app: App,
  plan: ProjectRenamePlan,
  hooks: RenameHooks
): Promise<boolean> {
  const activeBefore = hooks.getActive();
  for (const p of plan.patches) hooks.mark(p.indexPath);
  for (const m of plan.fileMoves) {
    hooks.mark(m.from);
    hooks.mark(m.to);
    expectInAppRename(m.to);
  }

  const ok = await tryFileOp(async () => {
    if (plan.folderMove) {
      const folder = app.vault.getAbstractFileByPath(plan.folderMove.from);
      if (!folder) throw new Error(`Folder "${plan.folderMove.from}" not found.`);
      await app.fileManager.renameFile(folder, normalizePath(plan.folderMove.to));
    }
    // NOTE: with "Automatically update internal links" off, each of these can
    // pop Obsidian's "Update links?" dialog and await the user's answer — that's
    // the user's setting, not a hang. Codex scope links are covered by the
    // sweep below regardless of what they pick.
    for (const m of plan.fileMoves) {
      const f: TAbstractFile | null = app.vault.getAbstractFileByPath(m.from);
      if (!(f instanceof TFile)) continue; // e.g. plan note never created — nothing to move
      await app.fileManager.renameFile(f, normalizePath(m.to));
    }
    for (const p of plan.patches) {
      const index = app.vault.getAbstractFileByPath(p.indexPath);
      if (!(index instanceof TFile)) continue;
      // Field-level transform against CURRENT state (never a whole-draft write
      // from the panel snapshot — that would clobber `longform.scenes`).
      await updateDraftFields(app, index, (d) => ({
        ...d,
        title: p.title,
        titleInFrontmatter: true,
        ...(d.format === "scenes" && p.sceneTemplate ? { sceneTemplate: p.sceneTemplate } : {}),
      }));
      if (p.planningNote || p.cover) {
        await persistOverview(app, index, { planningNote: p.planningNote, cover: p.cover });
      }
    }
    // Codex scope is the index basename stored as a wikilink; Obsidian already
    // rewrote resolving links during the rename when link-updating is on. This
    // sweep covers the rest (setting off, or a link that didn't resolve).
    if (plan.codexRenames.length) {
      const byOld = new Map(plan.codexRenames.map((r) => [r.from, r.to]));
      for (const e of getCodexEntities(app)) {
        const to = e.scope?.project ? byOld.get(e.scope.project) : undefined;
        if (!to) continue;
        const f = app.vault.getAbstractFileByPath(e.path);
        if (f instanceof TFile) await writeEntityScope(app, f, { ...e.scope, project: to });
      }
    }
  }, `Couldn't finish renaming "${plan.oldTitle}" — some files may have moved; check the project folder.`);
  if (ok === null) return false;

  hooks.remapPaths(plan.remap);
  if (activeBefore) hooks.setActive(plan.remap(activeBefore));
  new Notice(`Renamed "${plan.oldTitle}" to "${plan.newTitle}".`);
  return true;
}
