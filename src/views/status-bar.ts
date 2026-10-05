/**
 * Status-bar item showing today's progress, or a live sprint countdown when one
 * is running. Clicking it opens the stats dashboard.
 */

import { WritingTracker } from "../tracking/writing-tracker";
import { SprintController } from "../sprints/sprint-controller";
import type { ChallengeProgress } from "../goals/challenge";

export class StatusBar {
  private el: HTMLElement;
  private tracker: WritingTracker;
  private sprints: SprintController;
  private getGoal: () => number;
  private onClick: () => void;
  private unsubs: Array<() => void> = [];

  constructor(
    el: HTMLElement,
    tracker: WritingTracker,
    sprints: SprintController,
    getGoal: () => number,
    onClick: () => void,
    /** The "tracking" feature toggle — hidden means the item disappears entirely. */
    private isEnabled: () => boolean = () => true,
    /** The running challenge's progress, or null. Called per keystroke — keep it cheap. */
    private getChallenge: () => ChallengeProgress | null = () => null
  ) {
    this.el = el;
    this.tracker = tracker;
    this.sprints = sprints;
    this.getGoal = getGoal;
    this.onClick = onClick;

    this.el.addClass("mod-clickable");
    this.el.onClickEvent(() => this.onClick());
    this.unsubs.push(this.tracker.onChange(() => this.render()));
    // Live keystroke deltas skip the heavy change listeners (they'd rebuild
    // whole panels per keystroke) — but this render is one setText, so listen
    // to the delta channel too or the count only moves on disk saves.
    this.unsubs.push(this.tracker.onDelta(() => this.render()));
    this.unsubs.push(this.sprints.onUpdate(() => this.render()));
    this.render();
  }

  render(): void {
    if (!this.isEnabled()) {
      this.el.hide();
      return;
    }
    this.el.show();
    const active = this.sprints.getActive();
    if (active) {
      const rem = this.sprints.remainingSec();
      this.el.setText(`✍ ${active.words}w · ${formatClock(rem)}`);
      this.el.setAttribute(
        "aria-label",
        `Sprint: ${active.words} words, ${formatClock(rem)} left`
      );
      return;
    }
    const challenge = this.getChallenge();
    if (challenge?.phase === "active") {
      // Needed-today replaces the static daily goal while a challenge runs.
      this.el.setText(
        `✍ ${challenge.today}/${challenge.neededToday} · ${compact(challenge.written)}/${compact(challenge.target)}`
      );
      this.el.setAttribute(
        "aria-label",
        `Challenge: ${challenge.today} of ${challenge.neededToday} words needed today; ` +
          `${challenge.written} of ${challenge.target} total (click for stats)`
      );
      return;
    }
    const today = this.tracker.todayWords();
    const goal = this.getGoal();
    this.el.setText(goal > 0 ? `✍ ${today}/${goal}` : `✍ ${today}`);
    this.el.setAttribute("aria-label", "Inkswell: words written today (click for stats)");
  }

  destroy(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }
}

/** 21340 → "21.3k"; under 1,000 as-is. */
function compact(n: number): string {
  return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${`${s}`.padStart(2, "0")}`;
}
