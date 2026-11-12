/**
 * Search destination: full-text search across scene prose (and the `synopsis`
 * field) for a chosen scope — the active draft, the whole story, the series, or
 * the whole vault — narrowed by metadata filters. Results group by scene; click
 * a body hit to jump to it in Write and flash it (synopsis hits open the scene
 * without a flash, since the synopsis isn't in the editor document).
 *
 * Structurally a sibling of the revision-log panel (revisions/work-panel.ts): read each
 * scene body via `cachedRead`, run a pure scanner, group + jump-to-scene. The one
 * addition is an mtime-keyed body cache so re-running a query across a large scope
 * doesn't re-read every file. This panel is read-only; find & replace is layered
 * on separately.
 */

import { App, Notice, TFile } from "obsidian";
import { MessageKey, t, tp } from "../i18n";
import { tagField } from "../lib/focus-preserve";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { baseDraftFor, groupIntoStories, representativeDrafts, storyOf } from "../projects/stories";
import { groupIntoSeries, projectSeries } from "../series/series";
import { SceneStatus, readSceneMeta, visibleStatuses } from "../scenes/scene-meta";
import type { ListOverrides } from "../settings/overridable-lists";
import { splitFrontmatter, stripFrontmatter } from "../lib/frontmatter";
import {
  SearchFilters,
  SearchMatch,
  SearchOptions,
  findMatches,
  replaceMatches,
  sceneMatchesFilters,
} from "../lib/scene-search";
import { renderEmptyState } from "./panel-kit";
import { SceneHighlight } from "./write-panel";
import { FormModal } from "../lib/form-modal";
import { openSceneOnModClick } from "../scenes/scene-actions";

/** Host-provided coordination so the panel never reaches into other panels directly. */
export interface SearchPanelCallbacks {
  /** Open a scene in Write, optionally flashing a body hit. */
  onOpenInWrite: (path: string, highlight?: SceneHighlight) => void;
  /** Flush the open scene's unsaved editor text to disk before a replace. */
  beforeReplace: () => Promise<void>;
  /** Notify that these scene paths were rewritten (so an open editor can reload). */
  afterReplace: (changedPaths: string[]) => void;
  /** The writer's list overrides (status labels/visibility for the filter). */
  getListOverrides?: () => ListOverrides;
}

type SearchScope = "draft" | "story" | "series" | "vault";

const SCOPE_LABELS: Record<SearchScope, MessageKey> = {
  draft: "search.scope.draft",
  story: "search.scope.story",
  series: "search.scope.series",
  vault: "search.scope.vault",
};

/** A cap so a broad vault query can't build an unbounded DOM; surfaced in the UI. */
const RESULT_CAP = 1000;
const DEBOUNCE_MS = 200;
/** Yield to the UI thread every this many scenes on a long scan. */
const CHUNK = 25;

interface HitRow extends SearchMatch {
  /** The exact matched literal, handed to Write as the re-locate anchor. */
  text: string;
}

interface SceneResult {
  title: string;
  path: string;
  inactive: boolean;
  matches: HitRow[];
}

/** Distinct filterable values gathered from the scenes currently in scope. */
interface FilterOptions {
  povs: string[];
  chapters: string[];
  plotlines: string[];
  /** Character wikilink values (raw), e.g. "[[Anna]]". */
  characters: string[];
}

export class SearchPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;
  private cb: SearchPanelCallbacks;

  private container: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private replaceBtn: HTMLButtonElement | null = null;

  private scope: SearchScope = "draft";
  private query = "";
  private replacement = "";
  private caseSensitive = false;
  private wholeWord = false;
  private filters: SearchFilters = { includeInactive: true };

  /** Body cache keyed by path, invalidated by file mtime (like the store's parse cache). */
  private bodyCache = new Map<string, { mtime: number; body: string }>();
  /** Bumped per scan; a stale async scan checks it after each await and bails. */
  private scanToken = 0;
  private debounce: number | null = null;

  private results: SceneResult[] = [];
  private scanned = 0;
  private capped = false;

  constructor(app: App, store: ProjectStore, active: ActiveProject, cb: SearchPanelCallbacks) {
    this.app = app;
    this.store = store;
    this.active = active;
    this.cb = cb;
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-search");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    if (!resolveActive(projects, this.active.get())) {
      renderEmptyState(container, t("search.empty.noProject"));
      return;
    }

    const scenes = this.scopeScenes();
    const options = this.collectOptions(scenes);
    this.pruneFilters(options);

    this.renderControls(container, options, scenes.length);
    this.listEl = container.createDiv({ cls: "inkswell-search__list" });

    if (this.hasCriteria()) void this.runScan();
    else this.renderEmptyPrompt();
  }

  // --- controls -------------------------------------------------------------

  private renderControls(container: HTMLElement, options: FilterOptions, sceneCount: number): void {
    const bar = container.createDiv({ cls: "inkswell-search__controls" });

    // Scope + search box row.
    const top = bar.createDiv({ cls: "inkswell-search__row" });
    const scopeSel = top.createEl("select", { cls: "dropdown inkswell-search__scope" });
    for (const s of ["draft", "story", "series", "vault"] as SearchScope[]) {
      scopeSel.createEl("option", { text: t(SCOPE_LABELS[s]), value: s });
    }
    scopeSel.value = this.scope;
    scopeSel.onchange = () => {
      this.scope = scopeSel.value as SearchScope;
      this.rerender();
    };

    const input = top.createEl("input", {
      type: "text",
      cls: "inkswell-search__query",
      attr: { placeholder: tp("search.query.placeholder", sceneCount) },
    });
    tagField(input, "search:query");
    input.value = this.query;
    input.oninput = () => {
      this.query = input.value;
      this.schedule();
    };

    // Replace row: a replacement box + a gated "Replace all" action. Literal,
    // body-only, and preview-first (the confirm dialog shows exact counts).
    const replaceRow = bar.createDiv({ cls: "inkswell-search__row" });
    const repl = replaceRow.createEl("input", {
      type: "text",
      cls: "inkswell-search__replace",
      attr: { placeholder: t("search.replace.placeholder") },
    });
    tagField(repl, "search:replace");
    repl.value = this.replacement;
    repl.oninput = () => {
      this.replacement = repl.value;
    };
    this.replaceBtn = replaceRow.createEl("button", { text: t("search.replace.button") });
    this.replaceBtn.onclick = () => this.promptReplace();
    this.updateReplaceBtn();

    // Match-option toggles.
    const opts = bar.createDiv({ cls: "inkswell-search__row inkswell-search__opts" });
    this.checkbox(opts, t("search.option.matchCase"), this.caseSensitive, (v) => {
      this.caseSensitive = v;
      void this.runScan();
    });
    this.checkbox(opts, t("search.option.wholeWord"), this.wholeWord, (v) => {
      this.wholeWord = v;
      void this.runScan();
    });
    this.checkbox(opts, t("search.option.includeArchived"), this.filters.includeInactive, (v) => {
      this.filters.includeInactive = v;
      void this.runScan();
    });

    // Metadata filters.
    const filterRow = bar.createDiv({ cls: "inkswell-search__row inkswell-search__filters" });
    this.filterSelect(
      filterRow,
      t("search.filter.status"),
      visibleStatuses(this.cb.getListOverrides?.()["scene.status"]).map((s) => ({
        value: s.id,
        label: s.label,
      })),
      this.filters.status?.[0],
      (v) => {
        this.filters.status = v ? [v as SceneStatus] : undefined;
        void this.runScan();
      }
    );
    this.filterSelect(
      filterRow,
      t("search.filter.pov"),
      options.povs.map((v) => ({ value: v, label: v })),
      this.filters.pov?.[0],
      (v) => {
        this.filters.pov = v ? [v] : undefined;
        void this.runScan();
      }
    );
    this.filterSelect(
      filterRow,
      t("search.filter.chapter"),
      options.chapters.map((v) => ({ value: v, label: v })),
      this.filters.chapter?.[0],
      (v) => {
        this.filters.chapter = v ? [v] : undefined;
        void this.runScan();
      }
    );
    this.filterSelect(
      filterRow,
      t("search.filter.plotline"),
      options.plotlines.map((v) => ({ value: v, label: v })),
      this.filters.plotline?.[0],
      (v) => {
        this.filters.plotline = v ? [v] : undefined;
        void this.runScan();
      }
    );
    this.filterSelect(
      filterRow,
      t("search.filter.character"),
      options.characters.map((v) => ({ value: v, label: stripLink(v) })),
      this.filters.character?.[0],
      (v) => {
        this.filters.character = v ? [v] : undefined;
        void this.runScan();
      }
    );
  }

  private checkbox(
    parent: HTMLElement,
    label: string,
    value: boolean,
    onChange: (v: boolean) => void
  ): void {
    const wrap = parent.createEl("label", { cls: "inkswell-search__toggle" });
    const box = wrap.createEl("input", { type: "checkbox" });
    box.checked = value;
    box.onchange = () => onChange(box.checked);
    wrap.createSpan({ text: label });
  }

  private filterSelect(
    parent: HTMLElement,
    label: string,
    values: { value: string; label: string }[],
    selected: string | undefined,
    onChange: (value: string) => void
  ): void {
    // Only offer a filter that has values to choose from in the current scope.
    if (values.length === 0) return;
    const wrap = parent.createDiv({ cls: "inkswell-search__filter" });
    wrap.createSpan({ cls: "inkswell-search__filterlabel", text: label });
    const sel = wrap.createEl("select", { cls: "dropdown" });
    sel.createEl("option", { text: t("search.filter.any"), value: "" });
    for (const v of values) sel.createEl("option", { text: v.label, value: v.value });
    sel.value = selected ?? "";
    sel.onchange = () => onChange(sel.value);
  }

  // --- scope + options ------------------------------------------------------

  /** The projects covered by the current scope, relative to the active project. */
  private scopeProjects(): Project[] {
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const active = resolveActive(projects, this.active.get());
    if (!active) return [];
    switch (this.scope) {
      case "draft":
        return [active];
      case "story": {
        const story = storyOf(groupIntoStories(projects), active.vaultPath);
        return story ? story.drafts : [active];
      }
      case "series": {
        // Series membership lives on the story's base draft (a copied draft
        // may carry a stale tag or none), and the series search covers ONE
        // draft per book — "story" scope is where all drafts are wanted.
        const info = projectSeries(baseDraftFor(projects, active)) ?? projectSeries(active);
        if (!info) return [active];
        const reps = representativeDrafts(projects, this.active.get());
        const match = groupIntoSeries(reps).series.find((s) => s.name === info.name);
        return match ? match.books : [active];
      }
      case "vault":
        return projects;
    }
  }

  /** Resolved, path-bearing, de-duplicated scenes for the current scope. */
  private scopeScenes(): { title: string; path: string }[] {
    const seen = new Set<string>();
    const out: { title: string; path: string }[] = [];
    for (const p of this.scopeProjects()) {
      for (const sc of p.scenes) {
        if (!sc.path || seen.has(sc.path)) continue;
        seen.add(sc.path);
        out.push({ title: sc.title, path: sc.path });
      }
    }
    return out;
  }

  /** Distinct filter values present in the scope (metadata-cache reads only). */
  private collectOptions(scenes: { path: string }[]): FilterOptions {
    const povs = new Set<string>();
    const chapters = new Set<string>();
    const plotlines = new Set<string>();
    const characters = new Set<string>();
    for (const sc of scenes) {
      const file = this.app.vault.getAbstractFileByPath(sc.path);
      if (!(file instanceof TFile)) continue;
      const meta = readSceneMeta(this.app, file);
      if (meta.pov) povs.add(meta.pov);
      if (meta.chapter) chapters.add(meta.chapter);
      for (const pl of meta.plotlines ?? []) plotlines.add(pl);
      for (const ch of meta.characters ?? []) characters.add(ch);
    }
    const sorted = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
    return {
      povs: sorted(povs),
      chapters: sorted(chapters),
      plotlines: sorted(plotlines),
      characters: sorted(characters),
    };
  }

  /** Drop any selected filter value that no longer exists in the current scope. */
  private pruneFilters(options: FilterOptions): void {
    const keep = (arr: string[] | undefined, allowed: string[]) =>
      arr?.filter((v) => allowed.includes(v));
    const trim = (arr: string[] | undefined) => (arr && arr.length ? arr : undefined);
    this.filters.pov = trim(keep(this.filters.pov, options.povs));
    this.filters.chapter = trim(keep(this.filters.chapter, options.chapters));
    this.filters.plotline = trim(keep(this.filters.plotline, options.plotlines));
    this.filters.character = trim(keep(this.filters.character, options.characters));
  }

  private hasCriteria(): boolean {
    return this.query.trim().length > 0 || this.activeFilterCount() > 0;
  }

  private activeFilterCount(): number {
    const f = this.filters;
    return (
      (f.status?.length ? 1 : 0) +
      (f.pov?.length ? 1 : 0) +
      (f.chapter?.length ? 1 : 0) +
      (f.plotline?.length ? 1 : 0) +
      (f.character?.length ? 1 : 0) +
      (f.includeInactive ? 0 : 1)
    );
  }

  // --- scanning -------------------------------------------------------------

  private schedule(): void {
    if (this.debounce != null) window.clearTimeout(this.debounce);
    this.debounce = window.setTimeout(() => {
      this.debounce = null;
      void this.runScan();
    }, DEBOUNCE_MS);
  }

  private async runScan(): Promise<void> {
    const token = ++this.scanToken;
    if (!this.hasCriteria()) {
      this.results = [];
      this.renderEmptyPrompt();
      return;
    }

    const opts: SearchOptions = {
      query: this.query.trim(),
      caseSensitive: this.caseSensitive,
      wholeWord: this.wholeWord,
    };
    const scenes = this.scopeScenes();
    const results: SceneResult[] = [];
    let total = 0;
    let scanned = 0;
    let capped = false;

    for (let i = 0; i < scenes.length; i++) {
      if (i % CHUNK === 0) {
        await Promise.resolve();
        if (token !== this.scanToken) return; // superseded by a newer scan
      }
      const sc = scenes[i];
      const file = this.app.vault.getAbstractFileByPath(sc.path);
      if (!(file instanceof TFile)) continue;

      const meta = readSceneMeta(this.app, file);
      if (!sceneMatchesFilters(meta, this.filters)) continue;
      scanned++;

      const matches: HitRow[] = [];
      // Synopsis first (it's a summary), then body hits.
      if (opts.query && meta.synopsis) {
        for (const m of findMatches(meta.synopsis, opts, "synopsis")) {
          matches.push({ ...m, text: meta.synopsis.slice(m.from, m.to) });
        }
      }
      if (opts.query) {
        const body = await this.readBody(file);
        if (token !== this.scanToken) return;
        for (const m of findMatches(body, opts, "body")) {
          matches.push({ ...m, text: body.slice(m.from, m.to) });
        }
      }

      // With a query, only scenes that matched are listed. With filters but no
      // query, the scene itself is the result (no rows) — a structured finder.
      if (opts.query && matches.length === 0) continue;

      results.push({
        title: sc.title,
        path: sc.path,
        inactive: meta.inactive === true,
        matches,
      });
      total += matches.length;
      if (total >= RESULT_CAP) {
        capped = true;
        break;
      }
    }

    if (token !== this.scanToken) return;
    this.results = results;
    this.scanned = scanned;
    this.capped = capped;
    this.renderList();
  }

  private async readBody(file: TFile): Promise<string> {
    const cached = this.bodyCache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) return cached.body;
    const body = stripFrontmatter(await this.app.vault.cachedRead(file));
    this.bodyCache.set(file.path, { mtime: file.stat.mtime, body });
    return body;
  }

  // --- rendering ------------------------------------------------------------

  private renderEmptyPrompt(): void {
    this.updateReplaceBtn();
    if (!this.listEl) return;
    this.listEl.empty();
    renderEmptyState(this.listEl, t("search.empty.prompt"));
  }

  private renderList(): void {
    this.updateReplaceBtn();
    if (!this.listEl) return;
    this.listEl.empty();

    if (this.results.length === 0) {
      renderEmptyState(this.listEl, t("search.empty.noMatches"));
      return;
    }

    const totalMatches = this.results.reduce((n, g) => n + g.matches.length, 0);
    const summary = this.query.trim()
      ? t("search.summary.matches", {
          matches: tp("search.summary.matchCount", totalMatches),
          scenes: tp("search.summary.ofScenes", this.scanned, { shown: this.results.length }),
        })
      : tp("search.summary.filtered", this.results.length);
    const head = this.listEl.createDiv({ cls: "inkswell-stats__muted", text: summary });
    if (this.capped) {
      head.setText(t("search.summary.capped", { summary, cap: RESULT_CAP }));
    }

    for (const g of this.results) {
      const header = this.listEl.createDiv({ cls: "inkswell-search__scene" });
      header.createSpan({ text: `${g.title}${g.matches.length ? ` (${g.matches.length})` : ""}` }); // i18n-ignore: name and count only
      if (g.inactive) {
        header.createSpan({ cls: "inkswell-search__badge", text: t("search.result.archived") });
      }
      header.onclick = () => this.cb.onOpenInWrite(g.path);
      openSceneOnModClick(header, this.app, g.path);

      for (const m of g.matches) {
        const row = this.listEl.createDiv({ cls: "inkswell-search__hit" });
        if (m.target === "synopsis") {
          row.createSpan({
            cls: "inkswell-search__badge inkswell-search__badge--synopsis",
            text: t("search.result.synopsis"),
          });
        } else {
          row.createSpan({ cls: "inkswell-search__line", text: t("search.result.line", { line: m.line }) });
        }
        row.createSpan({ cls: "inkswell-search__text", text: m.excerpt });
        row.onclick = () => {
          if (m.target === "synopsis") {
            this.cb.onOpenInWrite(g.path);
            new Notice(t("search.result.synopsisNotice"));
          } else {
            this.cb.onOpenInWrite(g.path, { from: m.from, to: m.to, verify: m.text });
          }
        };
        openSceneOnModClick(row, this.app, g.path);
      }
    }
  }

  // --- replace --------------------------------------------------------------

  /** Body-only match tally for the current results (synopsis hits aren't replaceable). */
  private replaceStats(): { matches: number; scenes: number } {
    let matches = 0;
    let scenes = 0;
    for (const g of this.results) {
      const bodyHits = g.matches.filter((m) => m.target === "body").length;
      if (bodyHits) {
        matches += bodyHits;
        scenes++;
      }
    }
    return { matches, scenes };
  }

  private updateReplaceBtn(): void {
    if (!this.replaceBtn) return;
    const { matches } = this.replaceStats();
    // Replace needs a query (nothing to match otherwise) and at least one body hit.
    this.replaceBtn.disabled = this.query.trim().length === 0 || matches === 0;
  }

  private promptReplace(): void {
    const { matches, scenes } = this.replaceStats();
    if (matches === 0) return;
    const needsAck = this.scope === "series" || this.scope === "vault";
    new ReplaceConfirmModal(
      this.app,
      {
        find: this.query.trim(),
        replace: this.replacement,
        matches,
        scenes,
        scope: this.scope === "series" ? "series" : "vault",
        needsAck,
      },
      () => void this.executeReplace()
    ).open();
  }

  /**
   * Apply the replacement to every scene with a body hit. Each scene is rewritten
   * atomically via `vault.process`, RE-MATCHING against the freshly-read body
   * inside the lock — stale scan offsets are never used to write, and frontmatter
   * (incl. `synopsis`) is reattached untouched. A scene whose file changed since
   * the scan (mtime moved) or vanished is skipped and reported, never clobbered.
   */
  private async executeReplace(): Promise<void> {
    const opts: SearchOptions = {
      query: this.query.trim(),
      caseSensitive: this.caseSensitive,
      wholeWord: this.wholeWord,
    };
    const replacement = this.replacement;
    const targets = this.results.filter((g) => g.matches.some((m) => m.target === "body"));

    // Flush the open scene's unsaved text so replace re-reads the latest content.
    await this.cb.beforeReplace();

    let replaced = 0;
    const changedPaths: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const g of targets) {
      const file = this.app.vault.getAbstractFileByPath(g.path);
      if (!(file instanceof TFile)) {
        skipped.push(`${g.title} (no longer exists)`);
        continue;
      }
      const cached = this.bodyCache.get(g.path);
      if (!cached || cached.mtime !== file.stat.mtime) {
        skipped.push(`${g.title} (changed since scan)`);
        continue;
      }
      try {
        let count = 0;
        await this.app.vault.process(file, (cur) => {
          const { frontmatter, body } = splitFrontmatter(cur);
          const res = replaceMatches(body, opts, replacement);
          count = res.count;
          return frontmatter + res.text;
        });
        if (count > 0) {
          replaced += count;
          changedPaths.push(g.path);
          this.bodyCache.delete(g.path); // force a fresh read on the next scan
        }
      } catch (e) {
        console.error("[Inkswell] Find & replace failed for", g.path, e);
        failed.push(g.title);
      }
    }

    // Let an open editor bound to a changed scene reload from disk.
    this.cb.afterReplace(changedPaths);

    const parts = [tp("search.replace.done", changedPaths.length, { replaced })];
    if (skipped.length) parts.push(t("search.replace.skipped", { count: skipped.length }));
    if (failed.length) parts.push(t("search.replace.failed", { count: failed.length }));
    new Notice(parts.join(" · "));
    if (skipped.length || failed.length) {
      console.warn("[Inkswell] Replace — skipped:", skipped, "failed:", failed);
    }

    this.replacement = "";
    void this.runScan(); // refresh the now-reduced results
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }
}

/** Preview → confirm dialog for a cross-scene replace (wide scopes need an extra tick). */
class ReplaceConfirmModal extends FormModal {
  private ack = false;

  constructor(
    app: App,
    private opts: {
      find: string;
      replace: string;
      matches: number;
      scenes: number;
      scope: "series" | "vault";
      needsAck: boolean;
    },
    private onConfirm: () => void
  ) {
    super(app);
    this.cta = t("search.confirm.cta");
  }

  protected renderForm(el: HTMLElement): void {
    el.createEl("h3", { text: t("search.confirm.heading") });
    el.createEl("p", {
      text: t("search.confirm.summary", {
        occurrences: tp("search.confirm.occurrences", this.opts.matches),
        scenes: tp("common.scenes", this.opts.scenes),
      }),
    });
    const table = el.createDiv({ cls: "inkswell-search__confirm" });
    table.createDiv({ text: t("search.confirm.find", { find: this.opts.find }) });
    table.createDiv({
      text: this.opts.replace
        ? t("search.confirm.replace", { replace: this.opts.replace })
        : t("search.confirm.replaceDelete"),
    });
    el.createEl("p", {
      cls: "inkswell-stats__muted",
      text: t("search.confirm.scopeNote"),
    });
    if (this.opts.needsAck) {
      const label = el.createEl("label", { cls: "inkswell-search__ack" });
      const box = label.createEl("input", { type: "checkbox" });
      box.onchange = () => (this.ack = box.checked);
      label.createSpan({
        text: ` ${t(this.opts.scope === "series" ? "search.confirm.ack.series" : "search.confirm.ack.vault", { count: this.opts.scenes })}`,
      });
    }
  }

  protected submit(): boolean | void {
    if (this.opts.needsAck && !this.ack) {
      new Notice(t(this.opts.scope === "series" ? "search.confirm.tick.series" : "search.confirm.tick.vault"));
      return false;
    }
    this.onConfirm();
  }
}

/** Strip the `[[ ]]` from a wikilink for display (keeps the alias if present). */
function stripLink(link: string): string {
  const inner = link.replace(/^\[\[/, "").replace(/\]\]$/, "");
  const bar = inner.indexOf("|");
  return bar === -1 ? inner : inner.slice(bar + 1);
}
