/**
 * Codex companion (sidebar): the shared Codex reference (codex-reference.ts)
 * in a sidebar leaf. The same body is the Codex panel in Write's side column.
 */

import { WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { Project } from "../projects/types";
import { CodexReference } from "./codex-reference";
import { CompanionView } from "./companion-view";
import { CompanionId } from "./registry";

export class CodexCompanionView extends CompanionView {
  private reference = new CodexReference(this.referenceHost());

  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === this.plugin.currentScene.get()) this.reference.sceneSaved();
      })
    );
  }

  async onClose(): Promise<void> {
    this.reference.dispose();
    await super.onClose();
  }

  protected onSceneChanged(): void {
    this.reference.sceneChanged();
    super.onSceneChanged();
  }

  protected companionId(): CompanionId {
    return "codex";
  }

  protected openInInkswell(): void {
    const shown = this.reference.shownEntry();
    if (shown) this.plugin.openCodexEntry(shown);
    else void this.plugin.openInkswell("codex");
  }

  protected renderBody(body: HTMLElement, project: Project): void {
    this.reference.render(body, project, this.sceneFile(project));
  }
}
