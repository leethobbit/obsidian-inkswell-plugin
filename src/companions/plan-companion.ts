/**
 * Plan companion (sidebar): the shared plan digest (plan-digest.ts) in a
 * sidebar leaf. The same body is the Plan panel in Write's side column.
 */

import { WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { Project } from "../projects/types";
import { CompanionView } from "./companion-view";
import { PlanDigest } from "./plan-digest";
import { CompanionId } from "./registry";

export class PlanCompanionView extends CompanionView {
  private digest = new PlanDigest(this.referenceHost());

  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    // The planning note is a normal note: re-render when it's saved.
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        const project = this.project();
        if (project && this.digest.showsNote(project, file.path)) this.requestRender();
      })
    );
  }

  async onClose(): Promise<void> {
    this.digest.dispose();
    await super.onClose();
  }

  protected companionId(): CompanionId {
    return "plan";
  }

  protected openInInkswell(): void {
    void this.plugin.openInkswell("plan");
  }

  protected renderBody(body: HTMLElement, project: Project): void {
    this.digest.render(body, project, this.sceneFile(project));
  }
}
