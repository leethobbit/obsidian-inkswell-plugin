/**
 * Comments panel (Revise → Comments): lists inline `%%…%%` / `@@…@@` editorial
 * comments found across the selected project's scenes, grouped by scene, with a
 * click to open the scene. Read-only — a companion to the decision log.
 */

import { App, TFile } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { openScene } from "../scenes/scene-actions";
import { ProjectStore } from "../projects/project-store";
import { extractComments } from "./comments";

export class CommentsPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;

  constructor(app: App, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-comments");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    const results = container.createDiv();
    results.createDiv({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });
    void this.scan(results, project.scenes);
  }

  private async scan(
    results: HTMLElement,
    scenes: { title: string; path: string | null }[]
  ): Promise<void> {
    let total = 0;
    const groups: { title: string; file: TFile; comments: ReturnType<typeof extractComments> }[] = [];
    for (const scene of scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const comments = extractComments(await this.app.vault.cachedRead(file));
      if (comments.length) {
        groups.push({ title: scene.title, file, comments });
        total += comments.length;
      }
    }

    results.empty();
    if (total === 0) {
      results.createDiv({
        cls: "inkswell-stats__muted",
        text: "No inline comments found. Mark notes with %% … %% or @@ … @@ in your scenes.",
      });
      return;
    }

    for (const g of groups) {
      const header = results.createDiv({ cls: "inkswell-comments__scene" });
      header.setText(`${g.title} (${g.comments.length})`);
      header.onclick = () => openScene(this.app, g.file);
      for (const c of g.comments) {
        const row = results.createDiv({ cls: "inkswell-comments__row" });
        row.createSpan({ cls: "inkswell-comments__marker", text: c.kind });
        row.createSpan({ cls: "inkswell-comments__text", text: c.text });
      }
    }
  }
}
