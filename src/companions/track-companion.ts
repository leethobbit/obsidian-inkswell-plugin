/**
 * Track companion (sidebar): the Track dashboard in one column. Its cards
 * already reflow to a single column at sidebar width, so this hosts the same
 * StatsPanel and re-renders when the tracker reports new words (debounced by
 * the tracker: once typing pauses, never per keystroke).
 */

import { WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { Project } from "../projects/types";
import { StatsPanel } from "../stats/stats-view";
import { CompanionView } from "./companion-view";
import { CompanionId } from "./registry";

export class TrackCompanionView extends CompanionView {
  private panel: StatsPanel;

  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
    this.panel = new StatsPanel(this.app, plugin, plugin.tracker, plugin.store, plugin.stats);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.register(this.plugin.tracker.onChange(() => this.requestRender()));
  }

  protected companionId(): CompanionId {
    return "track";
  }

  protected openInInkswell(): void {
    void this.plugin.openStats();
  }

  protected renderBody(body: HTMLElement, _project: Project): void {
    this.panel.render(body.createDiv({ cls: "inkswell-companion__track" }));
  }
}
