/**
 * Tracks how many words are written over time.
 *
 * On each markdown file modification it recomputes the file's word count and
 * attributes the *net* delta to today's entry in the writing log. Per-file
 * baselines persist across sessions (in data.json) so counting survives
 * restarts. Other features (goals, sprints, stats) read the log or subinkswell to
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
  }

  /** Subinkswell to per-edit deltas (e.g. for live sprint counting). */
  onDelta(fn: DeltaListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Subinkswell to "the log changed" (e.g. to refresh status bar / stats). */
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

  private async handleModify(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const contents = await this.app.vault.cachedRead(file);
    const count = countWords(contents);
    const prev = this.log.baselines[file.path];
    this.log.baselines[file.path] = count;

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

    for (const fn of this.listeners) fn(delta, file.path);
    for (const fn of this.changeListeners) fn();
    this.save();
  }
}
