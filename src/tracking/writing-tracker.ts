/**
 * Tracks how many words are written over time.
 *
 * On each markdown file modification it recomputes the file's word count and
 * attributes the *net* delta to today's entry in the writing log. Per-file
 * baselines persist across sessions (in data.json) so counting survives
 * restarts. Other features (goals, sprints, stats) read the log or subscribe to
 * deltas; this is the single place word-change is measured.
 */

import { App, Component, TAbstractFile, TFile, debounce } from "obsidian";
import { countWords } from "../lib/wordcount";
import { WritingLogData, dateKey } from "./types";

/** Notified with the net word delta (can be negative) and the file path. */
export type DeltaListener = (delta: number, path: string) => void;

export class WritingTracker extends Component {
  private app: App;
  private log: WritingLogData;
  private persist: () => void;
  private listeners = new Set<DeltaListener>();
  private changeListeners = new Set<() => void>();
  private save: () => void;

  constructor(app: App, log: WritingLogData, persist: () => void) {
    super();
    this.app = app;
    this.log = log;
    this.persist = persist;
    // Coalesce rapid edits into one save.
    this.save = debounce(() => this.persist(), 2000, false);
  }

  onload(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.handleModify(file))
    );
    // Live keystroke counting for Obsidian's own editors (the in-plugin Write
    // panel reports separately via noteLiveContent). `modify` only fires when the
    // buffer is flushed to disk — on blur/autosave — so without this a running
    // sprint wouldn't tick until you click away. Funnels through the same
    // baseline, so the later disk save is a no-op (no double count).
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        const file = info.file;
        if (file instanceof TFile && file.extension === "md") {
          this.applyCount(file.path, countWords(editor.getValue()), true);
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

  /** Net words written today. */
  todayWords(now: Date = new Date()): number {
    return this.log.daily[dateKey(now)] ?? 0;
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
   * {@link handleModify}, so a live edit and its later disk save can't
   * double-count: by save time the baseline already equals the count, so the
   * disk pass is a no-op. `text` should match what gets written (frontmatter +
   * body); `countWords` strips frontmatter, so body-only text reconciles too.
   */
  noteLiveContent(path: string, text: string): void {
    this.applyCount(path, countWords(text), true);
  }

  private async handleModify(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const contents = await this.app.vault.cachedRead(file);
    this.applyCount(file.path, countWords(contents));
  }

  /**
   * Attribute the net change for `path` to today, given its current word count.
   * `live` (per-keystroke) edits notify only the delta listeners — the sprint
   * tally, which the status bar reflects — and skip the heavier change listeners
   * that drive full re-renders, so typing in a background editor can't trigger a
   * host rebuild on every keystroke. The eventual disk `modify` (live=false)
   * fires the change listeners once.
   */
  private applyCount(path: string, count: number, live = false): void {
    const prev = this.log.baselines[path];
    this.log.baselines[path] = count;

    // First time we've seen this file (no persisted baseline): set baseline
    // only, so pre-existing content isn't counted as "written now".
    if (prev === undefined) {
      this.save();
      return;
    }
    const delta = count - prev;
    if (delta === 0) return;

    const key = dateKey(new Date());
    this.log.daily[key] = (this.log.daily[key] ?? 0) + delta;

    for (const fn of this.listeners) fn(delta, path);
    if (!live) for (const fn of this.changeListeners) fn();
    this.save();
  }
}
