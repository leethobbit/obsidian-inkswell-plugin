/**
 * The one series dialog. `renderSeriesFields` is the shared field group — pick
 * an existing series from a dropdown (so a typo can't fork a series), or
 * "New series…" with a name box, plus the book number, which defaults to the
 * next free slot. `SeriesModal` wraps it for one existing book; the New project
 * dialog embeds the same fields (src/projects/new-project-modal.ts).
 *
 * Membership is STORY-level (it describes the book), so the modal always reads
 * and writes the base draft, whichever draft the caller hands it — a series tag
 * written to a copy vanishes the moment the story unfocuses, and breaks series
 * codex scoping from the base draft's vantage.
 */

import { App, Notice, Setting, TFile } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { tryFileOp } from "../lib/notify";
import { writeSeries } from "../projects/index-writer";
import { baseDraftFor, representativeDrafts } from "../projects/stories";
import { Project, SeriesInfo } from "../projects/types";
import { Series, groupIntoSeries, projectSeries } from "./series";
import { nextBookOrder } from "./series-ops";

export interface SeriesFieldsContext {
  /** Existing series (one representative draft per book), for the picker + the next-number default. */
  series: Series[];
  /** The book's current membership when editing — preselected, and its number is kept. */
  current?: SeriesInfo | null;
  /** Preselection for a brand-new book (e.g. "New book in this series"). */
  preset?: SeriesInfo | null;
}

export interface SeriesFieldsHandle {
  /** The chosen membership: `null` = no series; `false` = invalid (a Notice was shown). */
  read(): SeriesInfo | null | false;
}

const NEW = "__new__";

/** The existing series for the current Home selection, for a picker. */
export function seriesForPicker(projects: Project[], activePath: string | null): Series[] {
  return groupIntoSeries(representativeDrafts(projects, activePath)).series;
}

export function renderSeriesFields(
  container: HTMLElement,
  ctx: SeriesFieldsContext
): SeriesFieldsHandle {
  const initial = ctx.current ?? ctx.preset ?? null;
  const indexOf = (name: string) => ctx.series.findIndex((s) => s.name === name);
  let selected = "";
  if (initial) {
    const i = indexOf(initial.name);
    selected = i >= 0 ? String(i) : NEW;
  }
  let orderTouched = false;

  new Setting(container)
    .setName("Series")
    .setDesc("Group this book with others under one name — pick an existing series or start one.")
    .addDropdown((d) => {
      d.addOption("", "None");
      ctx.series.forEach((s, i) => {
        const n = s.books.length;
        d.addOption(String(i), `${s.name} (${n} book${n === 1 ? "" : "s"})`);
      });
      d.addOption(NEW, "New series…");
      d.setValue(selected);
      d.onChange((v) => {
        selected = v;
        orderTouched = false;
        sync();
      });
    });

  let nameInput!: HTMLInputElement;
  const nameRow = new Setting(container).setName("New series name").addText((t) => {
    t.setPlaceholder("e.g. The Lattice Cycle");
    if (initial && selected === NEW) t.setValue(initial.name);
    nameInput = t.inputEl;
  });

  let orderInput!: HTMLInputElement;
  const orderRow = new Setting(container)
    .setName("Book number")
    .setDesc("Position in the series. Blank = unnumbered (sorts last).")
    .addText((t) => {
      orderInput = t.inputEl;
      orderInput.type = "number";
      orderInput.min = "1";
      orderInput.placeholder = "e.g. 2";
      orderInput.addClass("inkswell-series__ordernum");
      orderInput.oninput = () => (orderTouched = true);
    });

  /** The number this selection should default to. */
  const defaultOrder = (): number | undefined => {
    if (selected === "") return undefined;
    if (selected === NEW) return initial && indexOf(initial.name) < 0 ? initial.order : 1;
    const s = ctx.series[Number(selected)];
    if (ctx.current && ctx.current.name === s.name) return ctx.current.order;
    return nextBookOrder(s.books);
  };

  const sync = () => {
    nameRow.settingEl.toggle(selected === NEW);
    orderRow.settingEl.toggle(selected !== "");
    const o = defaultOrder();
    orderInput.value = o != null ? String(o) : "";
  };
  sync();

  return {
    read() {
      if (selected === "") return null;
      let name: string;
      let books: readonly Project[] | null = null;
      if (selected === NEW) {
        name = nameInput.value.trim();
        if (!name) {
          new Notice("Enter a name for the new series.");
          nameInput.focus();
          return false;
        }
        // Typing an existing series' name under "New series…" simply joins it.
        const i = indexOf(name);
        if (i >= 0) books = ctx.series[i].books;
      } else {
        name = ctx.series[Number(selected)].name;
      }
      const raw = orderInput.value.trim();
      const n = Math.floor(Number(raw));
      let order = raw && Number.isFinite(n) && n > 0 ? n : undefined;
      if (books && !orderTouched) order = nextBookOrder(books);
      return { name, order };
    },
  };
}

/** Edit one book's series membership (add / change / remove) on the house scaffold. */
export class SeriesModal extends FormModal {
  private fields!: SeriesFieldsHandle;
  private readonly base: Project;
  private readonly series: Series[];

  constructor(app: App, projects: Project[], project: Project, activePath: string | null) {
    super(app);
    this.base = baseDraftFor(projects, project);
    this.series = seriesForPicker(projects, activePath);
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Series" });
    contentEl.createEl("p", { cls: "inkswell-stats__muted", text: this.base.draft.title });
    this.fields = renderSeriesFields(contentEl, {
      series: this.series,
      current: projectSeries(this.base),
    });
  }

  protected async submit(): Promise<boolean | void> {
    const info = this.fields.read();
    if (info === false) return false;
    const f = this.app.vault.getAbstractFileByPath(this.base.vaultPath);
    if (!(f instanceof TFile)) return;
    await tryFileOp(() => writeSeries(this.app, f, info), "Couldn't update the series.");
  }
}
