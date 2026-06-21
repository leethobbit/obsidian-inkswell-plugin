/**
 * Writing-sprint controller: a countdown over which net words written are
 * tallied live (via WritingTracker deltas), then recorded to the sprint log.
 *
 * UI (status bar) subscribes via onUpdate to redraw the countdown and live count.
 */

import { Component, Notice } from "obsidian";
import { WritingLogData, SprintRecord } from "../tracking/types";
import { WritingTracker } from "../tracking/writing-tracker";

export interface ActiveSprint {
  startMs: number;
  durationSec: number;
  goal: number | null;
  words: number;
}

export class SprintController extends Component {
  private tracker: WritingTracker;
  private log: WritingLogData;
  private persist: () => void;
  private active: ActiveSprint | null = null;
  private unsubDelta: (() => void) | null = null;
  private endTimer: number | null = null;
  private tickTimer: number | null = null;
  private uiListeners = new Set<() => void>();

  constructor(tracker: WritingTracker, log: WritingLogData, persist: () => void) {
    super();
    this.tracker = tracker;
    this.log = log;
    this.persist = persist;
  }

  /** Subscribe to tick / word-count updates for live UI. */
  onUpdate(fn: () => void): () => void {
    this.uiListeners.add(fn);
    return () => this.uiListeners.delete(fn);
  }

  isActive(): boolean {
    return this.active !== null;
  }

  getActive(): ActiveSprint | null {
    return this.active;
  }

  /** Seconds left in the active sprint (0 if none). */
  remainingSec(nowMs: number = Date.now()): number {
    if (!this.active) return 0;
    const elapsed = (nowMs - this.active.startMs) / 1000;
    return Math.max(0, Math.ceil(this.active.durationSec - elapsed));
  }

  start(durationMin: number, goal: number | null = null): void {
    if (this.active) {
      new Notice("A sprint is already running.");
      return;
    }
    this.active = {
      startMs: Date.now(),
      durationSec: Math.round(durationMin * 60),
      goal,
      words: 0,
    };
    this.unsubDelta = this.tracker.onDelta((delta) => {
      if (!this.active) return;
      this.active.words += delta;
      this.emit();
    });
    this.endTimer = window.setTimeout(() => this.finish(), this.active.durationSec * 1000);
    this.tickTimer = window.setInterval(() => this.emit(), 1000);
    new Notice(`Sprint started: ${durationMin} min${goal ? `, goal ${goal} words` : ""}`);
    this.emit();
  }

  /** Stop early without recording. */
  cancel(): void {
    if (!this.active) return;
    this.teardown();
    new Notice("Sprint cancelled.");
    this.emit();
  }

  /** End the sprint, record it, and notify. */
  finish(): void {
    if (!this.active) return;
    const a = this.active;
    const elapsedSec = Math.min(
      a.durationSec,
      Math.max(1, Math.round((Date.now() - a.startMs) / 1000))
    );
    const record: SprintRecord = {
      start: new Date(a.startMs).toISOString(),
      durationSec: a.durationSec,
      elapsedSec,
      words: a.words,
      goal: a.goal,
    };
    this.log.sprints.push(record);
    this.persist();
    this.teardown();
    const metGoal = a.goal != null && a.words >= a.goal;
    new Notice(
      `Sprint complete! ${a.words} words` +
        (a.goal ? ` (goal ${a.goal}${metGoal ? " ✓" : ""})` : "")
    );
    this.emit();
  }

  onunload(): void {
    this.teardown();
  }

  private teardown(): void {
    if (this.endTimer !== null) window.clearTimeout(this.endTimer);
    if (this.tickTimer !== null) window.clearInterval(this.tickTimer);
    this.endTimer = null;
    this.tickTimer = null;
    this.unsubDelta?.();
    this.unsubDelta = null;
    this.active = null;
  }

  private emit(): void {
    for (const fn of this.uiListeners) fn();
  }
}
