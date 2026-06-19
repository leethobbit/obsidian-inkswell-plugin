/**
 * Publish panel: pick a project and compile it. Compilation lives here (the
 * "ship it" destination) rather than scattered on project rows. The step-editor
 * UI arrives in a later phase; for now this launches the compile dialog.
 */

import { App } from "obsidian";
import { CompileModal } from "../compile/compile-modal";
import { ProjectStore } from "../projects/project-store";
import type InkswellPlugin from "../../main";

export class CompilePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-publish");
    container.createEl("h3", { text: "Compile" });

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }
    for (const project of projects) {
      const row = container.createDiv({ cls: "inkswell-publish__row" });
      row.createSpan({ cls: "inkswell-publish__title", text: project.draft.title });
      const btn = row.createEl("button", { cls: "mod-cta", text: "Compile…" });
      btn.onclick = () =>
        new CompileModal(this.app, project, this.plugin.settings).open();
    }
  }
}
