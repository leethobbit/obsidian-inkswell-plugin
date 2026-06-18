/**
 * Stats panel: today's progress, writing streak, a 30-day bar chart, and
 * per-project target projections. Rendered inside the Inkswell host view.
 * Charts are plain DOM/CSS — no external chart libraries (CSP-safe).
 */

import {
  computeStreaks,
  projectFinish,
  recentDailyAverage,
} from "../goals/goals";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { dateKey } from "../tracking/types";
import { WritingTracker } from "../tracking/writing-tracker";
import type InkswellPlugin from "../../main";

const CHART_DAYS = 30;
const PROJECTION_WINDOW = 14;

export class StatsPanel {
  private plugin: InkswellPlugin;
  private tracker: WritingTracker;
  private store: ProjectStore;
  private stats: ProjectStats;

  constructor(
    plugin: InkswellPlugin,
    tracker: WritingTracker,
    store: ProjectStore,
    stats: ProjectStats
  ) {
    this.plugin = plugin;
    this.tracker = tracker;
    this.store = store;
    this.stats = stats;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-stats");

    const log = this.tracker.getLog();
    const goal = this.plugin.settings.dailyWordGoal;
    const today = this.tracker.todayWords();

    const todaySec = container.createDiv({ cls: "inkswell-stats__section" });
    todaySec.createEl("h4", { text: "Today" });
    todaySec.createDiv({
      cls: "inkswell-stats__big",
      text: goal > 0 ? `${today} / ${goal}` : `${today}`,
    });
    if (goal > 0) this.progressBar(todaySec, today, goal);

    const streak = computeStreaks(log.daily, this.plugin.settings.streakThreshold);
    const streakSec = container.createDiv({ cls: "inkswell-stats__section" });
    streakSec.createEl("h4", { text: "Streak" });
    streakSec.createDiv({
      cls: "inkswell-stats__row",
      text: `Current: ${streak.current} day(s) · Longest: ${streak.longest} day(s)`,
    });

    const chartSec = container.createDiv({ cls: "inkswell-stats__section" });
    chartSec.createEl("h4", { text: `Last ${CHART_DAYS} days` });
    this.barChart(chartSec, log.daily);

    const projSec = container.createDiv({ cls: "inkswell-stats__section" });
    projSec.createEl("h4", { text: "Project targets" });
    const withTargets = this.store
      .getProjects()
      .filter((p) => p.inkswell?.goals?.target && p.inkswell.goals.target > 0);
    if (withTargets.length === 0) {
      projSec.createDiv({
        cls: "inkswell-stats__muted",
        text: "No project word targets set. Use the 'Set word target' command.",
      });
    } else {
      const rate = recentDailyAverage(log.daily, PROJECTION_WINDOW);
      for (const project of withTargets) {
        const target = project.inkswell!.goals!.target!;
        const row = projSec.createDiv({ cls: "inkswell-stats__project" });
        row.createDiv({
          cls: "inkswell-stats__project-title",
          text: project.draft.title,
        });
        const detail = row.createDiv({ cls: "inkswell-stats__muted" });
        this.stats.projectWords(project).then((words) => {
          const p = projectFinish(words, target, rate);
          this.progressBar(row, words, target);
          if (p.done) {
            detail.setText(
              `${words.toLocaleString()} / ${target.toLocaleString()} — target met 🎉`
            );
          } else {
            const eta =
              p.daysToFinish === null
                ? "no recent writing"
                : `~${p.daysToFinish} day(s) at ${Math.round(rate)}/day`;
            detail.setText(
              `${words.toLocaleString()} / ${target.toLocaleString()} — ${p.remaining.toLocaleString()} left, ${eta}`
            );
          }
        });
      }
    }
  }

  private progressBar(parent: HTMLElement, value: number, max: number): void {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const bar = parent.createDiv({ cls: "inkswell-progress" });
    const fill = bar.createDiv({ cls: "inkswell-progress__fill" });
    fill.style.width = `${pct}%`;
  }

  private barChart(parent: HTMLElement, daily: Record<string, number>): void {
    const days: { key: string; words: number }[] = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - (CHART_DAYS - 1));
    for (let i = 0; i < CHART_DAYS; i++) {
      const key = dateKey(cursor);
      days.push({ key, words: daily[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const max = Math.max(1, ...days.map((d) => d.words));
    const chart = parent.createDiv({ cls: "inkswell-chart" });
    for (const d of days) {
      const col = chart.createDiv({ cls: "inkswell-chart__col" });
      const bar = col.createDiv({ cls: "inkswell-chart__bar" });
      bar.style.height = `${(d.words / max) * 100}%`;
      bar.setAttribute("aria-label", `${d.key}: ${d.words} words`);
    }
  }
}
