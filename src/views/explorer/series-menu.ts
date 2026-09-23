/**
 * Home's project and series menus: the per-book menu (rename, series
 * membership) and the per-series menu (new book, add an existing project,
 * rename, reorder). Extracted from explorer-view.ts.
 */

import { App, Menu, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import { addCoverMenuItems } from "../../projects/cover-actions";
import { writeSeries } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { baseDraftFor } from "../../projects/stories";
import { Project, SeriesInfo } from "../../projects/types";
import { Series, projectSeries } from "../../series/series";
import {
  ReorderBooksModal,
  addExistingToSeries,
  promptRenameSeries,
} from "../../series/series-actions";
import { SeriesModal } from "../../series/series-modal";
import { nextBookOrder } from "../../series/series-ops";

export interface SeriesMenuCallbacks {
  renameProject(project: Project): void;
  /** Open the New project dialog, optionally preset to a series. */
  newProject(preset?: { series?: SeriesInfo | null }): void;
  /** The current Home selection (drives which draft represents each story). */
  activePath(): string | null;
  /** Mark an index path as our own write (softens the resulting refresh). */
  markSelfWrite(path: string): void;
}

export class SeriesMenu {
  constructor(
    private app: App,
    private store: ProjectStore,
    private cb: SeriesMenuCallbacks
  ) {}

  /** Right-click / ⋯ menu on a project: rename + series membership. */
  projectMenu(row: Project): Menu {
    const menu = new Menu();
    menu.addItem((i) =>
      i
        .setTitle("Rename project")
        .setIcon("text-cursor-input")
        .onClick(() => this.cb.renameProject(row))
    );
    menu.addSeparator();
    // Series membership is STORY-level (it describes the book): always read
    // and write the base draft, whichever draft the row currently represents —
    // a series tag written to a copy vanishes the moment the story unfocuses,
    // and breaks series codex scoping from the base draft's vantage.
    const projects = this.store.getProjects();
    const project = baseDraftFor(projects, row);
    const info = projectSeries(project);

    menu.addItem((i) =>
      i
        .setTitle(info ? "Series…" : "Add to series…")
        .setIcon("library")
        .onClick(() => new SeriesModal(this.app, projects, project, this.cb.activePath()).open())
    );
    if (info) {
      menu.addItem((i) =>
        i
          .setTitle("Remove from series")
          .setIcon("link-2-off")
          .onClick(() => {
            const file = this.indexFile(project);
            if (!file) return;
            void tryFileOp(
              () => writeSeries(this.app, file, null),
              "Couldn't remove the book from the series."
            );
          })
      );
    }
    // Cover art is story-level too — same base draft.
    menu.addSeparator();
    addCoverMenuItems(menu, this.app, project, (p) => this.cb.markSelfWrite(p));
    return menu;
  }

  /** Right-click / ⋯ menu on a series header: grow, rename, reorder. */
  seriesMenu(series: Series): Menu {
    const menu = new Menu();
    const projects = this.store.getProjects();
    menu.addItem((i) =>
      i
        .setTitle("New book in this series…")
        .setIcon("book-plus")
        .onClick(() =>
          this.cb.newProject({ series: { name: series.name, order: nextBookOrder(series.books) } })
        )
    );
    menu.addItem((i) =>
      i
        .setTitle("Add existing project…")
        .setIcon("book-copy")
        .onClick(() => addExistingToSeries(this.app, projects, this.cb.activePath(), series))
    );
    menu.addSeparator();
    menu.addItem((i) =>
      i
        .setTitle("Rename series…")
        .setIcon("text-cursor-input")
        .onClick(() => void promptRenameSeries(this.app, projects, series))
    );
    menu.addItem((i) =>
      i
        .setTitle("Reorder books…")
        .setIcon("list-ordered")
        .onClick(() => new ReorderBooksModal(this.app, projects, series).open())
    );
    return menu;
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
