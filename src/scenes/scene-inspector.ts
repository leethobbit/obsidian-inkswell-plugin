/**
 * Scene Inspector: a single focused panel for the selected scene's metadata.
 * Deliberately small — the picked fields only, no wall of sections (that's the
 * antidote to StoryLine's mega-forms). Tracks the active scene file; edits write
 * straight to that scene's frontmatter (never its body).
 */

import { App, TFile } from "obsidian";
import { ProjectStore } from "../projects/project-store";
import { renderSceneMetaFields } from "./scene-meta-form";

export class SceneInspector {
  private app: App;
  private store: ProjectStore;

  constructor(app: App, store: ProjectStore) {
    this.app = app;
    this.store = store;
  }

  render(container: HTMLElement, file: TFile | null): void {
    container.empty();
    container.addClass("inkswell-inspector");

    const ctx = file ? this.store.findSceneByPath(file.path) : null;
    if (!file || !ctx) {
      container.createDiv({
        cls: "inkswell-inspector__empty",
        text: "Open a scene to edit its details.",
      });
      return;
    }

    container.createDiv({ cls: "inkswell-inspector__title", text: ctx.scene.title });
    container.createDiv({
      cls: "inkswell-inspector__project",
      text: ctx.project.draft.title,
    });

    renderSceneMetaFields(container, this.app, file);
  }
}
