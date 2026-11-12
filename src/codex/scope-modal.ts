/**
 * The Scope editor for one codex entry (#57): where the entry is visible —
 * everywhere, one series, or the books the writer picks. The detail pane shows
 * only a one-line summary; editing lives here so a vault with many books
 * doesn't push the entry's actual fields off screen.
 *
 * Books are a vertical checklist grouped by series (Home's shelf order), then
 * standalone books; a stored value naming no book stays listed as "not found"
 * until unticked. Save makes ONE write, built by the caller: a whole scope for
 * a kind change, or a book delta applied to the CURRENT stored list.
 */

import { App, Notice } from "obsidian";
import { t, tp } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { ScopeBook, applyBookPicks, namesBook } from "./codex-scope";
import { EntityScope } from "./types";

type Kind = "global" | "series" | "books";

/** What Save hands back: a whole new scope, or — when books stay books — the picks. */
export type ScopeEdit =
  | { kind: "replace"; scope: EntityScope }
  | {
      kind: "books";
      add: ScopeBook[];
      remove: ScopeBook[];
      dropValues: string[];
      /** The resulting list, for the panel's optimistic preview. */
      preview: string[];
    };

export interface ScopeModalOptions {
  entityName: string;
  /** The entry's scope right now (pending-aware). */
  scope: EntityScope;
  books: ScopeBook[];
  /** Series in Home's shelf order, with their book counts. */
  series: { name: string; books: number }[];
  /** Picks when switching kind: the active story's series / book. */
  defaultSeries?: string;
  defaultBook?: string;
  onSave: (edit: ScopeEdit) => void;
}

export class ScopeModal extends FormModal {
  private kind: Kind;
  private seriesName: string;
  private readonly initialKind: Kind;
  private readonly initialList: string[];
  /** Books ticked now. */
  private on: Set<ScopeBook>;
  /** Stored values naming no book, still ticked. */
  private unknown: Set<string>;
  private body: HTMLElement | null = null;
  private kindsEl: HTMLElement | null = null;

  constructor(
    app: App,
    private opts: ScopeModalOptions
  ) {
    super(app);
    const { scope, books } = opts;
    this.initialList = scope.projects ?? [];
    this.initialKind = scope.series ? "series" : this.initialList.length > 0 ? "books" : "global";
    this.kind = this.initialKind;
    this.seriesName = scope.series ?? opts.defaultSeries ?? opts.series[0]?.name ?? "";
    this.on = new Set(books.filter((b) => this.initialList.some((v) => namesBook(v, b))));
    this.unknown = new Set(this.initialList.filter((v) => this.isStale(v)));
    if (this.on.size === 0 && this.unknown.size === 0) {
      const preset = books.find((b) => b.value === opts.defaultBook) ?? books[0];
      if (preset) this.on.add(preset);
    }
  }

  /** A stored value naming no book in the vault. */
  private isStale(v: string): boolean {
    return !this.opts.books.some((b) => namesBook(v, b));
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.addClass("inkswell-scope-modal");
    contentEl.createEl("h3", { text: t("codex.scope.modal.title", { name: this.opts.entityName }) });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text: t("codex.scope.modal.intro"),
    });
    this.kindsEl = contentEl.createDiv({ cls: "inkswell-viewswitch inkswell-scope__kinds" });
    this.body = contentEl.createDiv({ cls: "inkswell-scope-modal__body" });
    this.renderKinds();
    this.renderBody();
  }

  private renderKinds(): void {
    const seg = this.kindsEl;
    if (!seg) return;
    seg.empty();
    const btn = (label: string, id: Kind, hint: string) => {
      const b = seg.createEl("button", { cls: "inkswell-viewswitch__btn", text: label });
      b.toggleClass("is-active", this.kind === id);
      b.setAttribute("aria-pressed", String(this.kind === id));
      b.setAttribute("aria-label", hint);
      b.onclick = () => {
        if (this.kind === id) return;
        this.kind = id;
        this.renderKinds();
        this.renderBody();
      };
    };
    btn(t("codex.scope.kind.global"), "global", t("codex.scope.kind.global.hint"));
    // Series/Books only when there's something to point at — or the entry
    // already does (a stale tag still needs a home so it can be changed).
    if (this.opts.series.length > 0 || this.initialKind === "series") {
      btn(t("codex.scope.kind.series"), "series", t("codex.scope.kind.series.hint"));
    }
    if (this.opts.books.length > 0 || this.initialKind === "books") {
      btn(t("codex.scope.kind.books"), "books", t("codex.scope.kind.books.hint"));
    }
  }

  private renderBody(): void {
    const body = this.body;
    if (!body) return;
    body.empty();
    if (this.kind === "global") {
      body.createDiv({ cls: "inkswell-stats__muted", text: t("codex.scope.globalBody") });
      return;
    }
    const list = body.createDiv({ cls: "inkswell-scope-modal__list" });
    if (this.kind === "series") {
      const names = this.opts.series.map((s) => s.name);
      const rows = [...this.opts.series];
      if (this.seriesName && !names.includes(this.seriesName)) rows.push({ name: this.seriesName, books: -1 });
      for (const s of rows) {
        const row = list.createEl("label", { cls: "inkswell-scope-modal__row" });
        const radio = row.createEl("input", { type: "radio" });
        radio.name = "inkswell-scope-series";
        radio.checked = s.name === this.seriesName;
        radio.onchange = () => {
          if (radio.checked) this.seriesName = s.name;
        };
        row.createSpan({ text: s.name });
        row.createSpan({
          cls: "inkswell-stats__muted",
          text: s.books < 0 ? t("codex.scope.seriesNotFound") : tp("codex.scope.bookCount", s.books),
        });
      }
      return;
    }
    // Books, grouped by series in Home's order, then standalone.
    const groups: { title: string | null; books: ScopeBook[] }[] = this.opts.series.map((s) => ({
      title: s.name,
      books: this.opts.books.filter((b) => b.series?.trim().toLowerCase() === s.name.trim().toLowerCase()),
    }));
    const grouped = new Set(groups.flatMap((g) => g.books));
    const rest = this.opts.books.filter((b) => !grouped.has(b));
    if (rest.length > 0) groups.push({ title: groups.length > 0 ? t("codex.scope.standalone") : null, books: rest });
    for (const g of groups) {
      if (g.books.length === 0) continue;
      if (g.title) list.createDiv({ cls: "inkswell-scope-modal__group", text: g.title });
      for (const b of g.books) {
        this.checkRow(list, b.label, this.on.has(b), (on) => {
          if (on) this.on.add(b);
          else this.on.delete(b);
        });
      }
    }
    const stale = this.initialList.filter((v) => this.isStale(v));
    if (stale.length > 0) {
      list.createDiv({ cls: "inkswell-scope-modal__group", text: t("codex.scope.notFoundGroup") });
      for (const v of stale) {
        this.checkRow(list, v, this.unknown.has(v), (on) => {
          if (on) this.unknown.add(v);
          else this.unknown.delete(v);
        });
      }
    }
  }

  private checkRow(list: HTMLElement, label: string, checked: boolean, onToggle: (on: boolean) => void): void {
    const row = list.createEl("label", { cls: "inkswell-scope-modal__row" });
    const box = row.createEl("input", { type: "checkbox" });
    box.checked = checked;
    box.onchange = () => onToggle(box.checked);
    row.createSpan({ text: label });
  }

  protected submit(): boolean {
    if (this.kind === "global") {
      this.opts.onSave({ kind: "replace", scope: {} });
      return true;
    }
    if (this.kind === "series") {
      if (!this.seriesName) {
        new Notice(t("codex.scope.pickSeries"));
        return false;
      }
      this.opts.onSave({ kind: "replace", scope: { series: this.seriesName } });
      return true;
    }
    const picked = this.opts.books.filter((b) => this.on.has(b));
    if (this.initialKind !== "books") {
      if (picked.length === 0) {
        new Notice(t("codex.scope.needBook"));
        return false;
      }
      this.opts.onSave({ kind: "replace", scope: { projects: picked.map((b) => b.value) } });
      return true;
    }
    const wasOn = this.opts.books.filter((b) => this.initialList.some((v) => namesBook(v, b)));
    const picks = {
      add: picked.filter((b) => !wasOn.includes(b)),
      remove: wasOn.filter((b) => !this.on.has(b)),
      dropValues: this.initialList.filter((v) => this.isStale(v) && !this.unknown.has(v)),
    };
    const preview = applyBookPicks(this.initialList, this.opts.books, picks);
    if (preview.length === 0) {
      new Notice(t("codex.scope.needBook"));
      return false;
    }
    this.opts.onSave({ kind: "books", ...picks, preview });
    return true;
  }
}
