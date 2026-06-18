/**
 * Status-bar item showing today's progress, or a live sprint countdown when one
 * is running. Clicking it opens the stats dashboard.
 */

import { WritingTracker } from "../tracking/writing-tracker";
import { SprintController } from "../sprints/sprint-controller";

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
    onClick: () => void
  ) {
    this.el = el;
    this.tracker = tracker;
    this.sprints = sprints;
    this.getGoal = getGoal;
    this.onClick = onClick;

    this.el.addClass("mod-clickable");
    this.el.onClickEvent(() => this.onClick());
    this.unsubs.push(this.tracker.onChange(() => this.render()));
    this.unsubs.push(this.sprints.onUpdate(() => this.render()));
    this.render();
  }

  render(): void {
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

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${`${s}`.padStart(2, "0")}`;
}
