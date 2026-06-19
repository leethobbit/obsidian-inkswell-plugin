/**
 * Track panel: progress rings (today/week/month), the writing habit, streak +
 * lifetime records, a calendar heatmap with the next milestone, and per-project
 * target projections. Rendered inside the Inkswell host. Charts are plain
 * DOM/CSS — no external chart libraries (CSP-safe).
 */

import {
  computeStreaks,
  habitDaysMet,
  heatmapWeeks,
  lifetimeRecords,
  monthToDateWords,
  nextMilestone,
  projectFinish,
  recentDailyAverage,
  weekToDateWords,
} from "../goals/goals";
import { App, TFile } from "obsidian";
import { tallyBy } from "../insight/breakdown";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { SCENE_STATUSES, readSceneMeta, statusLabel } from "../scenes/scene-meta";
import { WritingTracker } from "../tracking/writing-tracker";
import type InkswellPlugin from "../../main";

const HEAT_WEEKS = 26;
const PROJECTION_WINDOW = 14;

export class StatsPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private tracker: WritingTracker;
  private store: ProjectStore;
  private stats: ProjectStats;
  private container: HTMLElement | null = null;
  private breakdownPath: string | null = null;

  constructor(
    app: App,
    plugin: InkswellPlugin,
    tracker: WritingTracker,
    store: ProjectStore,
    stats: ProjectStats
  ) {
    this.app = app;
    this.plugin = plugin;
    this.tracker = tracker;
    this.store = store;
    this.stats = stats;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-stats");

    const log = this.tracker.getLog();
    const daily = log.daily;
    const s = this.plugin.settings;

    // Goals — rings
    const goalsSec = container.createDiv({ cls: "inkswell-stats__section" });
    goalsSec.createEl("h4", { text: "Goals" });
    const rings = goalsSec.createDiv({ cls: "inkswell-rings" });
    this.ring(rings, this.tracker.todayWords(), s.dailyWordGoal, "Today");
    this.ring(rings, weekToDateWords(daily), s.weeklyWordGoal, "Week");
    this.ring(rings, monthToDateWords(daily), s.monthlyWordGoal, "Month");

    // Habit
    const habitSec = container.createDiv({ cls: "inkswell-stats__section" });
    habitSec.createEl("h4", { text: "Habit" });
    const met = habitDaysMet(daily, s.habitMinWords);
    habitSec.createDiv({
      cls: "inkswell-stats__row",
      text: `${met} / ${s.habitDaysPerWeek} days this week (≥ ${s.habitMinWords} words/day)`,
    });

    // Streak + lifetime
    const streak = computeStreaks(daily, s.streakThreshold);
    const life = lifetimeRecords(daily);
    const lifeSec = container.createDiv({ cls: "inkswell-stats__section" });
    lifeSec.createEl("h4", { text: "Streak & records" });
    lifeSec.createDiv({
      cls: "inkswell-stats__row",
      text: `Current streak ${streak.current} · Longest ${streak.longest}`,
    });
    lifeSec.createDiv({
      cls: "inkswell-stats__muted",
      text:
        `Total ${life.totalWords.toLocaleString()} words · ${life.daysWritten} days written` +
        (life.bestDay ? ` · best day ${life.bestDay.words.toLocaleString()} (${life.bestDay.date})` : ""),
    });

    // Activity heatmap + milestone
    const heatSec = container.createDiv({ cls: "inkswell-stats__section" });
    heatSec.createEl("h4", { text: `Activity (${HEAT_WEEKS} weeks)` });
    this.heatmap(heatSec, daily);
    const next = nextMilestone(life.totalWords);
    heatSec.createDiv({
      cls: "inkswell-stats__muted",
      text: next
        ? `Next milestone: ${next.toLocaleString()} (${(next - life.totalWords).toLocaleString()} to go)`
        : "All milestones reached 🎉",
    });

    // Structure breakdown (per project)
    this.renderStructure(container);

    // Project targets
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
      const rate = recentDailyAverage(daily, PROJECTION_WINDOW);
      for (const project of withTargets) {
        const target = project.inkswell!.goals!.target!;
        const row = projSec.createDiv({ cls: "inkswell-stats__project" });
        row.createDiv({ cls: "inkswell-stats__project-title", text: project.draft.title });
        const detail = row.createDiv({ cls: "inkswell-stats__muted" });
        this.stats.projectWords(project).then((words) => {
          const p = projectFinish(words, target, rate);
          this.progressBar(row, words, target);
          if (p.done) {
            detail.setText(`${words.toLocaleString()} / ${target.toLocaleString()} — target met 🎉`);
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

  private renderStructure(container: HTMLElement): void {
    const sec = container.createDiv({ cls: "inkswell-stats__section" });
    sec.createEl("h4", { text: "Structure" });

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    if (projects.length === 0) {
      sec.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }
    const project =
      projects.find((p) => p.vaultPath === this.breakdownPath) ?? projects[0];
    if (this.breakdownPath === null) this.breakdownPath = project.vaultPath;

    if (projects.length > 1) {
      const sel = sec.createEl("select", { cls: "dropdown" });
      for (const p of projects) {
        const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
        if (p.vaultPath === project.vaultPath) o.selected = true;
      }
      sel.onchange = () => {
        this.breakdownPath = sel.value;
        this.rerender();
      };
    }

    const metas = project.scenes.map((s) => {
      if (!s.path) return {} as ReturnType<typeof readSceneMeta>;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f) : ({} as ReturnType<typeof readSceneMeta>);
    });

    sec.createDiv({ cls: "inkswell-stats__muted", text: "By status" });
    this.tallyBars(sec, tallyBy(metas.map((m) => m.status), SCENE_STATUSES), (k) =>
      SCENE_STATUSES.includes(k as never) ? statusLabel(k as never) : k
    );
    sec.createDiv({ cls: "inkswell-stats__muted", text: "By act" });
    this.tallyBars(sec, tallyBy(metas.map((m) => m.act)));
  }

  private tallyBars(
    parent: HTMLElement,
    tallies: { key: string; count: number }[],
    label: (k: string) => string = (k) => k
  ): void {
    const max = Math.max(1, ...tallies.map((t) => t.count));
    const wrap = parent.createDiv({ cls: "inkswell-tally" });
    for (const t of tallies) {
      const row = wrap.createDiv({ cls: "inkswell-tally__row" });
      row.createSpan({ cls: "inkswell-tally__label", text: label(t.key) });
      const bar = row.createDiv({ cls: "inkswell-tally__bar" });
      bar.createDiv({ cls: "inkswell-tally__fill" }).style.width = `${(t.count / max) * 100}%`;
      row.createSpan({ cls: "inkswell-tally__count", text: `${t.count}` });
    }
  }

  private ring(parent: HTMLElement, value: number, max: number, label: string): void {
    const pct = max > 0 ? Math.round(Math.min(100, (value / max) * 100)) : 0;
    const wrap = parent.createDiv({ cls: "inkswell-ring" });
    const dial = wrap.createDiv({ cls: "inkswell-ring__dial" });
    dial.style.setProperty("--pct", `${pct}`);
    dial.createDiv({ cls: "inkswell-ring__hole", text: `${pct}%` });
    wrap.createDiv({ cls: "inkswell-ring__label", text: label });
    wrap.createDiv({
      cls: "inkswell-ring__sub",
      text: `${value.toLocaleString()}${max > 0 ? ` / ${max.toLocaleString()}` : ""}`,
    });
  }

  private progressBar(parent: HTMLElement, value: number, max: number): void {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const bar = parent.createDiv({ cls: "inkswell-progress" });
    bar.createDiv({ cls: "inkswell-progress__fill" }).style.width = `${pct}%`;
  }

  private heatmap(parent: HTMLElement, daily: Record<string, number>): void {
    const weeks = heatmapWeeks(daily, HEAT_WEEKS);
    const max = Math.max(1, ...weeks.flat().map((c) => c.words));
    const grid = parent.createDiv({ cls: "inkswell-heat" });
    for (const col of weeks) {
      const colEl = grid.createDiv({ cls: "inkswell-heat__col" });
      for (const cell of col) {
        const lvl =
          cell.words === 0
            ? 0
            : cell.words >= max * 0.66
              ? 3
              : cell.words >= max * 0.33
                ? 2
                : 1;
        const c = colEl.createDiv({ cls: `inkswell-heat__cell lvl-${lvl}` });
        c.setAttribute("aria-label", `${cell.key}: ${cell.words} words`);
      }
    }
  }
}
