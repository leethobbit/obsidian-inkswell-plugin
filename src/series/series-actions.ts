/**
 * Series-level actions — rename, reorder books, add an existing book — wired to
 * the pure planners in series-ops.ts. A series has no note of its own, so every
 * action is a batch of `writeSeries` calls on the member books' BASE drafts
 * (plus `writeEntityScope` on series-scoped codex notes for a rename).
 */

import { App, FuzzySuggestModal, Notice, TFile } from "obsidian";
import { getCodexEntities, writeEntityScope } from "../codex/codex-store";
import { FormModal } from "../lib/form-modal";
import { renderListEditor } from "../lib/list-editor";
import { tryFileOp } from "../lib/notify";
import { writeSeries } from "../projects/index-writer";
import { baseDraftFor, representativeDrafts } from "../projects/stories";
import { Project } from "../projects/types";
import { confirmDestructive, promptText } from "../scenes/scene-actions";
import { Series, projectSeries } from "./series";
import { SeriesWrite, nextBookOrder, planReorder, planSeriesRename } from "./series-ops";

function indexFile(app: App, path: string): TFile | null {
  const f = app.vault.getAbstractFileByPath(path);
  return f instanceof TFile ? f : null;
}

async function applyWrites(app: App, writes: SeriesWrite[]): Promise<void> {
  for (const w of writes) {
    const f = indexFile(app, w.indexPath);
    if (f) await writeSeries(app, f, w.info);
  }
}

/** Prompt for a new name, then rename `series` across every book and codex entity. */
export async function promptRenameSeries(app: App, projects: Project[], series: Series): Promise<void> {
  const name = await promptText(app, {
    title: "Rename series",
    value: series.name,
    multiline: false,
    cta: "Rename",
  });
  if (name === null) return;
  await renameSeries(app, projects, series.name, name);
}

/**
 * Rename series `from` → `to` on every draft that carries it and every
 * `codex-series` note. Renaming onto an existing series merges after a confirm.
 * Resolves true when something was written.
 */
export async function renameSeries(app: App, projects: Project[], from: string, to: string): Promise<boolean> {
  const entities = getCodexEntities(app).map((e) => ({ path: e.path, series: e.scope?.series }));
  const plan = planSeriesRename(projects, entities, from, to);
  if (plan.books.length === 0) return false;
  const target = to.trim();
  if (plan.mergesInto) {
    const ok = await confirmDestructive(
      app,
      `A series named “${target}” already exists. Merge “${from}” into it? Book numbers may collide — use Reorder books afterwards.`,
      "Merge"
    );
    if (!ok) return false;
  }
  const done = await tryFileOp(async () => {
    await applyWrites(app, plan.books);
    for (const path of plan.entities) {
      const f = indexFile(app, path);
      if (f) await writeEntityScope(app, f, { series: target });
    }
    return true;
  }, "Couldn't rename the series.");
  if (done) new Notice(plan.mergesInto ? `Merged into “${target}”.` : `Series renamed to “${target}”.`);
  return !!done;
}

/** Pick a standalone project and make it the next book of `series`. */
export function addExistingToSeries(
  app: App,
  projects: Project[],
  activePath: string | null,
  series: Series
): void {
  const candidates = representativeDrafts(projects, activePath).filter(
    (p) => !projectSeries(baseDraftFor(projects, p))
  );
  if (candidates.length === 0) {
    new Notice("Every project already belongs to a series.");
    return;
  }
  new ProjectSuggestModal(app, candidates, `Add a book to ${series.name}…`, (p) => {
    if (!p) return;
    const base = baseDraftFor(projects, p);
    const f = indexFile(app, base.vaultPath);
    if (!f) return;
    void tryFileOp(
      () => writeSeries(app, f, { name: series.name, order: nextBookOrder(series.books) }),
      "Couldn't add the book to the series."
    );
  }).open();
}

class ProjectSuggestModal extends FuzzySuggestModal<Project> {
  private resolved = false;

  constructor(
    app: App,
    private items: Project[],
    placeholder: string,
    private onChoose: (p: Project | null) => void
  ) {
    super(app);
    this.setPlaceholder(placeholder);
  }

  getItems(): Project[] {
    return this.items;
  }

  getItemText(p: Project): string {
    return p.draft.title;
  }

  onChooseItem(p: Project): void {
    this.resolved = true;
    this.onChoose(p);
  }

  onClose(): void {
    super.onClose();
    // Same ordering caveat as ImageSuggestModal (src/lib/images.ts): onChooseItem
    // isn't guaranteed to run before onClose, so defer the "dismissed" result.
    window.setTimeout(() => {
      if (!this.resolved) this.onChoose(null);
    }, 0);
  }
}

/** Drag (or ⋯ → Move up/down) the books of a series into order; Save renumbers 1..n. */
export class ReorderBooksModal extends FormModal {
  private order: Project[];
  private list: HTMLElement | null = null;

  constructor(
    app: App,
    private projects: Project[],
    private series: Series
  ) {
    super(app);
    this.order = [...series.books];
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: `Reorder books — ${this.series.name}` });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text: "Drag to reorder, or use a row's ⋯ menu. Books are renumbered 1, 2, 3… on save.",
    });
    this.list = contentEl.createDiv();
    this.renderList();
  }

  private renderList(): void {
    if (!this.list) return;
    this.list.empty();
    renderListEditor(this.list, {
      items: this.order.map((book) => ({ id: book.vaultPath, book })),
      renderRow: (body, item, i) => {
        body.setText(`${i + 1}. ${item.book.draft.title}`);
      },
      onReorder: (next) => {
        this.order = next.map((x) => x.book);
        this.renderList();
      },
      dragType: "inkswell/series-books",
      keyPrefix: "series-reorder",
    });
  }

  protected async submit(): Promise<void> {
    // Membership is story-level: number the base drafts, whatever draft each row shows.
    const bases = this.order.map((b) => baseDraftFor(this.projects, b));
    const writes = planReorder(bases, bases.map((b) => b.vaultPath));
    await tryFileOp(() => applyWrites(this.app, writes), "Couldn't reorder the books.");
  }
}
