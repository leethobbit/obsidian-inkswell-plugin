/**
 * Write panel (the "forward momentum" destination). Until the in-plugin
 * manuscript editor lands (a later phase), this is a calm launchpad: start a
 * sprint, see the active sprint, and a hint to open a scene. Deliberately sparse —
 * Write should never surface analysis or compile noise.
 */

import { App } from "obsidian";
import { SprintController } from "../sprints/sprint-controller";
import type InkswellPlugin from "../../main";

export class WritePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private sprints: SprintController;
  private container: HTMLElement | null = null;
  private unsub: (() => void) | null = null;

  constructor(app: App, plugin: InkswellPlugin, sprints: SprintController) {
    this.app = app;
    this.plugin = plugin;
    this.sprints = sprints;
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-write");

    // Subscribe once to sprint updates so the status stays live while shown.
    if (!this.unsub) {
      this.unsub = this.sprints.onUpdate(() => {
        if (this.container) this.renderBody(this.container);
      });
    }
    this.renderBody(container);
  }

  private renderBody(container: HTMLElement): void {
    container.empty();
    const wrap = container.createDiv({ cls: "inkswell-write__wrap" });

    const active = this.sprints.getActive();
    if (active) {
      wrap.createEl("h3", { text: "Sprint in progress" });
      wrap.createDiv({
        cls: "inkswell-stats__big",
        text: `${active.words} words`,
      });
      wrap.createDiv({
        cls: "inkswell-stats__muted",
        text: `${this.sprints.remainingSec()}s left${active.goal ? ` · goal ${active.goal}` : ""}`,
      });
      const end = wrap.createEl("button", { cls: "mod-cta", text: "End sprint" });
      end.onclick = () => this.sprints.finish();
      return;
    }

    wrap.createEl("h3", { text: "Write" });
    wrap.createDiv({
      cls: "inkswell-stats__muted",
      text: "Open a scene from Home to write it. A dedicated in-plugin manuscript editor is coming in a later phase.",
    });
    const sprint = wrap.createEl("button", {
      cls: "mod-cta",
      text: "Start a writing sprint",
    });
    sprint.onclick = () => this.plugin.startSprint();
  }

  dispose(): void {
    this.unsub?.();
    this.unsub = null;
  }
}
