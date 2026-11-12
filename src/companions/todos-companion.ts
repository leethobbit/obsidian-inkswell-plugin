/**
 * Revision log companion (sidebar): what's left to fix in the scene you're writing —
 * its draft markers and logged decisions — using the same panel as Write's
 * Revision column. Clicking a marker jumps to it in Write.
 */

import { WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { markerSet } from "../lib/placeholders";
import { Project } from "../projects/types";
import { RevisionSidebar } from "../revisions/revision-sidebar";
import { CompanionView } from "./companion-view";
import { CompanionId } from "./registry";

export class TodosCompanionView extends CompanionView {
  private panel: RevisionSidebar;

  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
    this.panel = new RevisionSidebar(
      this.app,
      plugin.store,
      plugin.activeProject,
      (path, from, to) =>
        plugin.openSceneInWrite(path, from != null && to != null ? { from, to } : undefined),
      () => markerSet(plugin.settings.listOverrides.markers)
    );
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    // Markers live in the prose: refresh after the current scene is saved.
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === this.plugin.currentScene.get()) this.requestRender();
      })
    );
  }

  protected companionId(): CompanionId {
    return "todos";
  }

  protected openInInkswell(): void {
    void this.plugin.openTodos();
  }

  protected renderBody(body: HTMLElement, project: Project): void {
    this.panel.render(body.createDiv({ cls: "inkswell-companion__todos" }), this.sceneFile(project));
  }
}
