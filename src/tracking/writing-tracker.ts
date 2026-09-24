/**
 * Tracks how many words are written over time.
 *
 * Words are attributed from TYPING — `editor-change` for Obsidian's own
 * editors, `noteLiveContent` for the Write panel — as the *net* delta against a
 * per-file baseline, logged to today's entry. Disk events (`modify`/`create`)
 * only move the baseline: a `modify` may be Obsidian Sync delivering another
 * device's words, or an external tool's edit, and neither was written HERE
 * (#44 — synced text used to be logged as local words, doubling it and
 * breaking streaks). The trade-off, deliberate: an edit made outside Obsidian
 * on this device is no longer counted either. Baselines persist across
 * sessions (in data.json) so counting survives restarts. Other features
 * (goals, sprints, stats) read the log or subscribe to deltas; this is the
 * single place word-change is measured.
 */

import { App, Component, Debouncer, TAbstractFile, TFile, debounce } from "obsidian";
import { countWords } from "../lib/wordcount";
import {
  WordCategory,
  WritingLogData,
  applyCountToLog,
  dateKey,
  noteBaseline,
  projectedDayWords,
} from "./types";

/** Notified with the net word delta (can be negative) and the file path. */
export type DeltaListener = (delta: number, path: string) => void;

/** What kind of project note a path is, or null for unrelated files. */
export type PathClassifier = (path: string) => WordCategory | null;

export class WritingTracker extends Component {
  private app: App;
  private log: WritingLogData;
  private persist: () => void;
  private classify: PathClassifier;
  private disabledCategories: () => ReadonlySet<WordCategory>;
  private listeners = new Set<DeltaListener>();
  private changeListeners = new Set<() => void>();
  private save: Debouncer<[], void>;
  /** Change listeners fire once typing pauses, not per keystroke (they drive full re-renders). */
  private notifyChange: Debouncer<[], void>;

  constructor(
    app: App,
    log: WritingLogData,
    persist: () => void,
    classify: PathClassifier,
    disabledCategories: () => ReadonlySet<WordCategory>
  ) {
    super();
    this.app = app;
    this.log = log;
    this.persist = persist;
    this.classify = classify;
    this.disabledCategories = disabledCategories;
    // Coalesce rapid edits into one save.
    this.save = debounce(() => this.persist(), 2000, false);
    this.notifyChange = debounce(
      () => {
        for (const fn of this.changeListeners) fn();
      },
      1000,
      true
    );
  }

  onunload(): void {
    // Flush a pending debounced save so words counted in the final ~2s before
    // the plugin unloads (or Obsidian quits) aren't dropped.
    this.flushPendingSave();
  }

  /** Run a pending debounced log save NOW (quit-time flush; idempotent). */
  flushPendingSave(): void {
    this.save.run();
  }

  onload(): void {
    // Disk events only MOVE the baseline (see the header): a `modify` may be
    // Obsidian Sync landing another device's words, or an external editor —
    // never attributed here. The Write panel's own save arrives with the count
    // the live path already recorded, so it's a no-op.
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.handleFile(file))
    );
    // Baseline files the moment they're created (a new scene, a lazily-created
    // planning note). Creation counts as the first sighting, so the user's
    // FIRST typing into the new note attributes normally — without this, that
    // whole first pass was swallowed as the baseline and no toggle could ever
    // recover the words.
    this.registerEvent(
      this.app.vault.on("create", (file) => this.handleFile(file))
    );
    // Typing in Obsidian's own editors (the in-plugin Write panel reports
    // separately via noteLiveContent) — the ONLY paths that attribute words.
    // Funnels through the same baseline, so the later disk save is a no-op.
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        const file = info.file;
        if (file instanceof TFile && file.extension === "md") {
          this.applyText(file.path, editor.getValue());
        }
      })
    );
  }

  /** Subscribe to per-edit deltas (e.g. for live sprint counting). */
  onDelta(fn: DeltaListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Subscribe to "the log changed" (e.g. to refresh status bar / stats). */
  onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  /** Net words written today that count toward goals (disabled categories
   * subtracted; legacy pre-category history counts fully). */
  todayWords(now: Date = new Date()): number {
    return projectedDayWords(this.log, dateKey(now), this.disabledCategories());
  }

  getLog(): WritingLogData {
    return this.log;
  }

  /** Optional daily mood (1–10) for a date key, or undefined. */
  getMood(date: string): number | undefined {
    return this.log.mood?.[date];
  }

  /** Set/clear the mood for a date (0 or falsy clears). Persists immediately. */
  setMood(date: string, value: number): void {
    if (!this.log.mood) this.log.mood = {};
    if (value >= 1 && value <= 10) this.log.mood[date] = value;
    else delete this.log.mood[date];
    this.persist();
    for (const fn of this.changeListeners) fn();
  }

  /** The rolling "what's next" breadcrumb left for the next session. */
  getNextUp(): string {
    return this.log.nextUp ?? "";
  }

  setNextUp(text: string): void {
    this.log.nextUp = text.trim() || undefined;
    this.persist();
    for (const fn of this.changeListeners) fn();
  }

  /**
   * Live word count from the active editor buffer, before it's saved to disk.
   * The in-plugin Write editor defers saves to blur/switch, so disk `modify`
   * events (and thus the live sprint tally) would otherwise only fire when you
   * click away. This funnels editor edits through the SAME per-file baseline as
   * {@link handleFile}, so a live edit and its later disk save can't
   * double-count: by save time the baseline already equals the count, so the
   * disk pass is a no-op. `text` should match what gets written (frontmatter +
   * body) so the category-aware count reconciles with the disk pass.
   */
  noteLiveContent(path: string, text: string): void {
    this.applyText(path, text);
  }

  /** Disk event: move the file's baseline to its current count, attribute nothing. */
  private async handleFile(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const contents = await this.app.vault.cachedRead(file);
    const count = this.countFor(contents, this.classify(file.path));
    if (noteBaseline(this.log, file.path, count)) this.save();
  }

  /**
   * What a file's text is worth in words, by category. Codex entries keep
   * their prose in frontmatter profile fields (Description, Significance, …)
   * with the body as optional freeform notes — so codex counting includes the
   * frontmatter. The constant parts (keys, the `codex:` tag itself) cancel out
   * in the per-file delta, so only actual edits move the count.
   */
  private countFor(text: string, category: WordCategory | null): number {
    return countWords(text, { stripFrontmatter: category !== "codex" });
  }

  /**
   * Warm baselines for in-scope files that don't have one yet, so the "first
   * tracked edit only sets the baseline" rule stops eating the first words
   * written into a pre-existing scene/planning/codex note. Never touches an
   * existing baseline (that would swallow words mid-session).
   */
  async warmBaselines(paths: Iterable<string>): Promise<void> {
    let touched = false;
    for (const path of paths) {
      if (this.log.baselines[path] !== undefined) continue;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md") continue;
      const text = await this.app.vault.cachedRead(file);
      this.log.baselines[path] = this.countFor(text, this.classify(path));
      touched = true;
    }
    if (touched) this.save();
  }

  /**
   * Rekey baselines after an app-initiated move (Rename project). Without this
   * every moved scene's baseline is orphaned under its old path and the first
   * edit at the new path is swallowed as a fresh baseline. `remap` returns the
   * same path for anything that didn't move.
   */
  remapBaselines(remap: (path: string) => string): void {
    let touched = false;
    for (const [path, count] of Object.entries(this.log.baselines)) {
      const to = remap(path);
      if (to === path) continue;
      this.log.baselines[to] = count;
      delete this.log.baselines[path];
      touched = true;
    }
    if (touched) this.save();
  }

  /**
   * One-time migration: recompute EXISTING baselines for the given paths under
   * the current counting rule. Needed when the rule changes for a category
   * (codex now includes frontmatter) — an old body-only baseline would emit a
   * phantom delta equal to the whole profile on the next edit.
   */
  async rebaseline(paths: Iterable<string>): Promise<void> {
    let touched = false;
    for (const path of paths) {
      if (this.log.baselines[path] === undefined) continue;
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || file.extension !== "md") continue;
      const text = await this.app.vault.cachedRead(file);
      this.log.baselines[path] = this.countFor(text, this.classify(path));
      touched = true;
    }
    if (touched) this.save();
  }

  /**
   * Attribute the net change typed into `path` to today, given its current word
   * count. The path's category (scene/planning/codex/other, or null for files
   * outside every project) decides the bucket; unrelated files only keep their
   * baseline warm and are never attributed. Delta listeners — the sprint tally,
   * which the status bar reflects — hear every keystroke (only for categories
   * that currently count toward goals, so sprints honor the same toggles with
   * no filtering of their own); the heavier change listeners that drive full
   * re-renders fire once typing pauses, so a background editor can't trigger a
   * host rebuild per keystroke.
   */
  private applyText(path: string, text: string): void {
    const category = this.classify(path);
    const delta = applyCountToLog(this.log, path, this.countFor(text, category), category);
    // null: baseline-only change (first sighting, or an unrelated file) —
    // persist the baseline, attribute nothing.
    if (delta === null) {
      this.save();
      return;
    }
    if (delta === 0) return;

    if (category !== null && !this.disabledCategories().has(category)) {
      for (const fn of this.listeners) fn(delta, path);
    }
    this.notifyChange();
    this.save();
  }
}
