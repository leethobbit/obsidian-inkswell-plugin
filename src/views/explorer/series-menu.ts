/**
 * Series-membership menu for a project header row (right-click / "⋯" tap):
 * add to / change / leave a series, and set the book number within it.
 * Extracted from explorer-view.ts.
 */

import { App, Menu, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import { writeSeries } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { Project } from "../../projects/types";
import { projectSeries } from "../../series/series";
import { promptText } from "../../scenes/scene-actions";

export class SeriesMenu {
  private app: App;
  private store: ProjectStore;

  constructor(app: App, store: ProjectStore) {
    this.app = app;
    this.store = store;
  }

  /** Right-click menu on a project header: series membership. */
  projectMenu(project: Project): Menu {
    const menu = new Menu();
    const file = this.indexFile(project);
    if (!file) return menu;
    const info = projectSeries(project);

    menu.addItem((i) =>
      i
        .setTitle(info ? "Change series…" : "Add to series…")
        .setIcon("library")
        .onClick(() => void this.setSeries(project, file))
    );
    if (info) {
      menu.addItem((i) =>
        i
          .setTitle("Set book number…")
          .setIcon("list-ordered")
          .onClick(() => void this.setBookNumber(project, file))
      );
      menu.addItem((i) =>
        i
          .setTitle("Remove from series")
          .setIcon("link-2-off")
          .onClick(() => void tryFileOp(() => writeSeries(this.app, file, null), "Couldn't remove the book from the series."))
      );
    }
    return menu;
  }

  private async setSeries(project: Project, file: TFile): Promise<void> {
    const cur = projectSeries(project);
    const name = await promptText(this.app, {
      title: "Series name",
      value: cur?.name ?? "",
      multiline: false,
      cta: "Save",
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      await tryFileOp(() => writeSeries(this.app, file, null), "Couldn't update the series.");
      return;
    }
    // A book that's alone in its series is Book 1 by default; joining a series
    // that already has other books keeps any existing number (set via the menu).
    const others = this.store
      .getProjects()
      .filter((p) => p.vaultPath !== project.vaultPath && projectSeries(p)?.name === trimmed);
    const order = others.length === 0 ? 1 : cur?.order;
    await tryFileOp(() => writeSeries(this.app, file, { name: trimmed, order }), "Couldn't update the series.");
  }

  private async setBookNumber(project: Project, file: TFile): Promise<void> {
    const cur = projectSeries(project);
    if (!cur) return;
    const raw = await promptText(this.app, {
      title: "Book number",
      value: cur.order != null ? String(cur.order) : "",
      multiline: false,
      cta: "Save",
    });
    if (raw === null) return;
    const n = Math.floor(Number(raw));
    await tryFileOp(
      () => writeSeries(this.app, file, { name: cur.name, order: Number.isFinite(n) && n > 0 ? n : undefined }),
      "Couldn't set the book number."
    );
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
