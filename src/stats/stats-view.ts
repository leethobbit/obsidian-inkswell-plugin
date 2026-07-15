/**
 * Track panel: an at-a-glance overview card row, then collapsible sections —
 * Goals (rings/habit/streak), Activity (writing-history chart + heatmap +
 * milestone), Sprints (history), Structure (status/act), and project Targets.
 * Charts are plain DOM/CSS — no external libraries (CSP-safe). Prose analysis
 * lives on Revise → Analysis, not here.
 */

import { App, TFile, setIcon } from "obsidian";
import {
  computePace,
  computeStreaks,
  dailySeries,
  draftMilestone,
  habitDaysMet,
  heatmapWeeks,
  lifetimeRecords,
  monthToDateWords,
  nextMilestone,
  projectFinish,
  recentDailyAverage,
  suggestedDeadlineWeeks,
  weekToDateWords,
} from "../goals/goals";
import { tallyBy } from "../insight/breakdown";
import { formatReadTime, heatLevel } from "./format";
import { resolveActive } from "../projects/active-project";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { baseDraft, draftLabel, groupIntoStories, storyOf } from "../projects/stories";
import { Project, isMultiScene } from "../projects/types";
import { SCENE_STATUSES, readSceneMeta, statusLabel } from "../scenes/scene-meta";
import { sprintSeconds, sprintStats, sprintWpm } from "../sprints/sprint-stats";
import { WritingTracker } from "../tracking/writing-tracker";
import { dateKey } from "../tracking/types";
import type InkswellPlugin from "../../main";

const HEAT_WEEKS = 26;
const PROJECTION_WINDOW = 14;

const RANGES: { label: string; days: number | null }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
];

export class StatsPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private tracker: WritingTracker;
  private store: ProjectStore;
  private stats: ProjectStats;
  private container: HTMLElement | null = null;

  /** Section ids the user has collapsed (in-memory for the view's lifetime). */
  private collapsed = new Set<string>();
  /** Selected range for the writing-history chart (days, or null = all). */
  private chartRange: number | null = 30;

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

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-stats");

    const daily = this.tracker.getLog().daily;
    const s = this.plugin.settings;

    this.renderOverview(container);

    // Draft comparison: only when the active story has more than one draft.
    this.renderDrafts(container);

    // Activity: a full-width card on top (its own block, not in the card grid).
    this.section(container, "activity", "Activity", (body) => {
      const cols = body.createDiv({ cls: "inkswell-activity" });
      const chartCol = cols.createDiv({ cls: "inkswell-activity__chart" });
      this.renderHistory(chartCol);

      const heatCol = cols.createDiv({ cls: "inkswell-activity__heat" });
      heatCol.createDiv({
        cls: "inkswell-stats__muted inkswell-stats__subhead",
        text: `Activity (${HEAT_WEEKS} weeks)`,
      });
      this.heatmap(heatCol, daily);

      const life = lifetimeRecords(daily);
      const next = nextMilestone(life.totalWords);
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: next
          ? `Next milestone: ${next.toLocaleString()} (${(next - life.totalWords).toLocaleString()} to go)`
          : "All milestones reached 🎉",
      });
    });

    // Card row beneath, left→right: Project targets · Goals · Sprints · Structure.
    // With no wide item in this grid, auto-fit collapses empty tracks so the four
    // cards stretch to fill the full width and reflow as the window resizes.
    const grid = container.createDiv({ cls: "inkswell-stats__grid" });
    this.section(grid, "targets", "Project targets", (body) => this.renderTargets(body, daily));

    this.section(grid, "goals", "Goals", (body) => {
      const rings = body.createDiv({ cls: "inkswell-rings" });
      this.ring(rings, this.tracker.todayWords(), s.dailyWordGoal, "Today");
      this.ring(rings, weekToDateWords(daily, new Date(), s.weekStart), s.weeklyWordGoal, "Week");
      this.ring(rings, monthToDateWords(daily), s.monthlyWordGoal, "Month");

      const met = habitDaysMet(daily, s.habitMinWords, new Date(), s.weekStart);
      body.createDiv({
        cls: "inkswell-stats__row",
        text: `Habit: ${met} / ${s.habitDaysPerWeek} days this week (≥ ${s.habitMinWords} words/day)`,
      });

      const streak = computeStreaks(daily, s.streakThreshold);
      const life = lifetimeRecords(daily);
      body.createDiv({
        cls: "inkswell-stats__row",
        text: `Current streak ${streak.current} · Longest ${streak.longest}`,
      });

      // Optional daily mood (1–10) — light-touch, never required.
      const moodRow = body.createDiv({ cls: "inkswell-stats__row inkswell-mood" });
      moodRow.createSpan({ cls: "inkswell-stats__muted", text: "Mood today:" });
      const todayKey = dateKey(new Date());
      const moodSel = moodRow.createEl("select", { cls: "dropdown" });
      moodSel.createEl("option", { text: "—", value: "" });
      for (let i = 1; i <= 10; i++) moodSel.createEl("option", { text: `${i}`, value: `${i}` });
      moodSel.value = `${this.tracker.getMood(todayKey) ?? ""}`;
      moodSel.onchange = () => this.tracker.setMood(todayKey, Number(moodSel.value) || 0);
      body.createDiv({
        cls: "inkswell-stats__muted",
        text:
          `Total ${life.totalWords.toLocaleString()} words · ${life.daysWritten} days written` +
          (life.bestDay
            ? ` · best day ${life.bestDay.words.toLocaleString()} (${life.bestDay.date})`
            : ""),
      });
    });

    this.section(grid, "sprints", "Sprints", (body) => this.renderSprints(body));
    this.section(grid, "structure", "Structure", (body) => this.renderStructure(body));
  }

  // --- Layout helpers ------------------------------------------------------

  /** A collapsible section. Body display + caret are toggled in place. */
  private section(
    parent: HTMLElement,
    id: string,
    title: string,
    build: (body: HTMLElement) => void
  ): void {
    const sec = parent.createDiv({ cls: "inkswell-stats__section" });
    if (this.collapsed.has(id)) sec.addClass("is-collapsed");
    const head = sec.createDiv({ cls: "inkswell-stats__section-head" });
    const caret = head.createSpan({ cls: "inkswell-stats__caret" });
    setIcon(caret, "chevron-down");
    head.createEl("h4", { text: title });
    const body = sec.createDiv({ cls: "inkswell-stats__section-body" });
    build(body);
    head.onclick = () => {
      const collapse = !this.collapsed.has(id);
      if (collapse) this.collapsed.add(id);
      else this.collapsed.delete(id);
      sec.toggleClass("is-collapsed", collapse);
    };
  }

  private renderOverview(parent: HTMLElement): void {
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());

    const row = parent.createDiv({ cls: "inkswell-stats__overview" });
    const words = this.card(row, "type", "…", "Words");
    this.card(row, "file-text", project ? `${project.scenes.length}` : "—", "Scenes");
    const read = this.card(row, "book-open", "…", "Read time");
    this.card(row, "pencil", this.tracker.todayWords().toLocaleString(), "Today");

    if (project) {
      void this.stats.projectWords(project).then((w) => {
        words.setText(w.toLocaleString());
        read.setText(formatReadTime(w));
      });
    } else {
      words.setText("0");
      read.setText("0m");
    }
  }

  /** Render one overview card; returns the value element for async updates. */
  private card(parent: HTMLElement, icon: string, value: string, label: string): HTMLElement {
    const c = parent.createDiv({ cls: "inkswell-stats__card" });
    setIcon(c.createSpan({ cls: "inkswell-stats__card-icon" }), icon);
    const val = c.createDiv({ cls: "inkswell-stats__card-value", text: value });
    c.createDiv({ cls: "inkswell-stats__card-label", text: label });
    return val;
  }

  // --- Sections ------------------------------------------------------------

  /** Writing-history bar chart + range toggle (rebuilds itself on toggle). */
  private renderHistory(host: HTMLElement): void {
    host.empty();
    const toggle = host.createDiv({ cls: "inkswell-stats__rangetoggle" });
    for (const r of RANGES) {
      const b = toggle.createEl("button", { text: r.label });
      b.toggleClass("is-active", this.chartRange === r.days);
      b.onclick = () => {
        this.chartRange = r.days;
        this.renderHistory(host);
      };
    }

    const series = dailySeries(this.tracker.getLog().daily, this.chartRange);
    const max = Math.max(1, ...series.map((p) => p.words));
    const chart = host.createDiv({ cls: "inkswell-chart" });
    if (series.length === 0) {
      host.createDiv({ cls: "inkswell-stats__muted", text: "No writing logged yet." });
      return;
    }
    for (const p of series) {
      const col = chart.createDiv({ cls: "inkswell-chart__col" });
      col.createDiv({ cls: "inkswell-chart__bar" }).style.height = `${(p.words / max) * 100}%`;
      col.setAttribute("aria-label", `${p.date}: ${p.words.toLocaleString()} words`);
    }
    const cap = host.createDiv({ cls: "inkswell-stats__muted inkswell-chart__caption" });
    cap.createSpan({ text: series[0].date });
    cap.createSpan({ text: `max ${max.toLocaleString()}/day` });
    cap.createSpan({ text: series[series.length - 1].date });
  }

  private renderSprints(body: HTMLElement): void {
    const records = this.plugin.writingLog.sprints;
    const st = sprintStats(records);
    if (st.count === 0) {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: "No sprints yet. Start one from Write or the command palette.",
      });
      return;
    }

    body.createDiv({
      cls: "inkswell-stats__row",
      text: `${st.count} sprints · ${st.totalWords.toLocaleString()} words · ${Math.round(st.avgWpm)} wpm avg`,
    });
    body.createDiv({
      cls: "inkswell-stats__muted",
      text:
        `Best ${st.bestWords.toLocaleString()} words · ${Math.round(st.bestWpm)} wpm peak` +
        (st.goalCount > 0
          ? ` · goals ${st.goalsMet}/${st.goalCount} (${Math.round(st.hitRate * 100)}%)`
          : ""),
    });

    const list = body.createDiv({ cls: "inkswell-sprintlist" });
    const head = list.createDiv({
      cls: "inkswell-sprint-row inkswell-sprint-row--head",
    });
    head.createSpan({ cls: "inkswell-sprint__date", text: "Date" });
    head.createSpan({ cls: "inkswell-sprint__num", text: "Words" });
    head.createSpan({ cls: "inkswell-sprint__num", text: "wpm" });
    head.createSpan({ cls: "inkswell-sprint__num", text: "Time" });
    head.createSpan({ cls: "inkswell-sprint__goal", text: "Goal" });

    for (const r of records.slice(-8).reverse()) {
      const rowEl = list.createDiv({ cls: "inkswell-sprint-row" });
      rowEl.createSpan({
        cls: "inkswell-sprint__date",
        text: new Date(r.start).toLocaleDateString(),
      });
      rowEl.createSpan({ cls: "inkswell-sprint__num", text: `${r.words.toLocaleString()}` });
      rowEl.createSpan({ cls: "inkswell-sprint__num", text: `${Math.round(sprintWpm(r))}` });
      rowEl.createSpan({
        cls: "inkswell-sprint__num",
        text: `${Math.round(sprintSeconds(r) / 60)}m`,
      });
      // Goal cell is always rendered (blank when no goal) so columns align.
      const goal = rowEl.createSpan({ cls: "inkswell-sprint__goal" });
      if (r.goal != null) {
        const hit = r.words >= r.goal;
        goal.setText(hit ? "✓" : "✗");
        goal.toggleClass("is-hit", hit);
        goal.toggleClass("is-miss", !hit);
      }
    }
  }

  private renderStructure(body: HTMLElement): void {
    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.plugin.activeProject.get());
    if (!project) {
      body.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    const metas = project.scenes.map((s) => {
      if (!s.path) return {};
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f) : ({});
    });

    body.createDiv({ cls: "inkswell-stats__muted", text: "By status" });
    this.tallyBars(body, tallyBy(metas.map((m) => m.status), SCENE_STATUSES), (k) =>
      SCENE_STATUSES.includes(k as never) ? statusLabel(k as never) : k
    );
    body.createDiv({ cls: "inkswell-stats__muted", text: "By act" });
    // Order acts by first appearance in manuscript order (metas is in scene
    // order), matching the Board and the compile group-by-chapter step — not
    // alphabetically, which mis-sorts spelled-out acts.
    const acts = metas.map((m) => m.act);
    const actOrder = [...new Set(acts.filter((a): a is string => !!a))];
    this.tallyBars(body, tallyBy(acts, actOrder));

    body.createDiv({ cls: "inkswell-stats__muted", text: "By chapter" });
    const chapters = metas.map((m) => m.chapter);
    const chapterOrder = [...new Set(chapters.filter((c): c is string => !!c))];
    this.tallyBars(body, tallyBy(chapters, chapterOrder));

    // Read-only mirror of any per-chapter word targets (managed in Plan → Structure).
    void this.renderChapterTargets(body, project);
  }

  /** Compact per-chapter target progress (only chapters that have a target). */
  private async renderChapterTargets(body: HTMLElement, project: Project): Promise<void> {
    const configured = (project.inkswell?.chapters ?? []).filter((g) => g.targetWords);
    if (configured.length === 0) return;
    const map = await this.stats.groupWords(project, "chapter");
    body.createDiv({ cls: "inkswell-stats__muted", text: "Chapter targets" });
    for (const g of configured) {
      const target = g.targetWords ?? 0;
      const words = map.get(g.title)?.words ?? 0;
      const row = body.createDiv({ cls: "inkswell-stats__row" });
      row.createSpan({ cls: "inkswell-tally__label", text: g.title });
      this.progressBar(row, words, target);
      row.createSpan({
        cls: "inkswell-tally__count",
        text: `${words.toLocaleString()} / ${target.toLocaleString()}`,
      });
    }
  }

  /**
   * Compare the drafts of the active story: words + delta vs the first draft,
   * scene count, a status-mix bar (revision progress), and draft age. Renders
   * nothing unless the active draft belongs to a story with more than one draft —
   * single-draft projects see no section at all.
   */
  private renderDrafts(container: HTMLElement): void {
    const stories = groupIntoStories(this.store.getProjects());
    const story = storyOf(stories, this.plugin.activeProject.get());
    if (!story || story.drafts.length <= 1) return;
    const activePath = this.plugin.activeProject.get();

    // Order chronologically by creation stamp so "the first draft" (the delta
    // baseline) is genuinely the earliest, not whatever the store happened to list
    // first. Undated drafts (created before the stamp existed) sort as oldest.
    // Labels keep each draft's story-order index so unnamed "Draft N" labels still
    // match the header switcher.
    const ordered = story.drafts
      .map((d, storyIndex) => ({ d, storyIndex, t: this.createdMs(d) }))
      .sort((a, b) => a.t - b.t);

    this.section(container, "drafts", "Drafts", (body) => {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: `Comparing ${story.drafts.length} drafts of "${story.title}" (Δ vs the first draft).`,
      });

      const table = body.createDiv({ cls: "inkswell-drafttable" });
      const head = table.createDiv({ cls: "inkswell-draft-row inkswell-draft-row--head" });
      head.createSpan({ cls: "inkswell-draft__label", text: "Draft" });
      head.createSpan({ cls: "inkswell-draft__num", text: "Words" });
      head.createSpan({ cls: "inkswell-draft__num", text: "Δ" });
      head.createSpan({ cls: "inkswell-draft__num", text: "Scenes" });
      head.createSpan({ cls: "inkswell-draft__mix", text: "Status mix" });
      head.createSpan({ cls: "inkswell-draft__num", text: "Age" });

      const wordCells: HTMLElement[] = [];
      const deltaCells: HTMLElement[] = [];
      ordered.forEach(({ d, storyIndex }) => {
        const row = table.createDiv({ cls: "inkswell-draft-row" });
        if (d.vaultPath === activePath) row.addClass("is-active");
        row.createSpan({ cls: "inkswell-draft__label", text: draftLabel(d, storyIndex) });
        wordCells.push(row.createSpan({ cls: "inkswell-draft__num", text: "…" }));
        deltaCells.push(row.createSpan({ cls: "inkswell-draft__num inkswell-draft__delta" }));
        const scenes = isMultiScene(d.draft) ? d.scenes.length : 1;
        row.createSpan({ cls: "inkswell-draft__num", text: `${scenes}` });
        this.statusMix(row.createSpan({ cls: "inkswell-draft__mix" }), d);
        row.createSpan({ cls: "inkswell-draft__num", text: this.draftAge(d) });
      });

      // Word counts are async (mtime-cached); fill once all resolve so the delta
      // can reference the first (earliest) draft's total.
      void Promise.all(ordered.map(({ d }) => this.stats.projectWords(d))).then((counts) => {
        const base = counts[0];
        counts.forEach((w, i) => {
          wordCells[i].setText(w.toLocaleString());
          if (i === 0) {
            deltaCells[i].setText("—");
            return;
          }
          const delta = w - base;
          deltaCells[i].setText(
            delta === 0 ? "±0" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString()}`
          );
          deltaCells[i].toggleClass("is-up", delta > 0);
          deltaCells[i].toggleClass("is-down", delta < 0);
        });
      });
    });
  }

  /** A compact stacked bar of a draft's scene statuses (revision progress at a glance). */
  private statusMix(host: HTMLElement, project: Project): void {
    if (!isMultiScene(project.draft)) {
      host.createSpan({ cls: "inkswell-stats__muted", text: "single note" });
      return;
    }
    const statuses = project.scenes.map((s) => {
      if (!s.path) return undefined;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f).status : undefined;
    });
    const tallies = tallyBy(statuses, SCENE_STATUSES);
    if (tallies.length === 0) {
      host.createSpan({ cls: "inkswell-stats__muted", text: "—" });
      return;
    }
    const bar = host.createDiv({ cls: "inkswell-mixbar" });
    for (const t of tallies) {
      const isStatus = SCENE_STATUSES.includes(t.key as never);
      const seg = bar.createDiv({
        cls: isStatus
          ? `inkswell-mixbar__seg inkswell-status--${t.key}`
          : "inkswell-mixbar__seg inkswell-mixbar__seg--none",
      });
      seg.style.flexGrow = `${t.count}`;
      const label = isStatus ? statusLabel(t.key as never) : t.key;
      seg.setAttribute("aria-label", `${t.count} ${label}`);
    }
  }

  /** Creation time in ms for ordering; undated drafts sort oldest (−Infinity). */
  private createdMs(project: Project): number {
    const created = project.inkswell?.draftCreated;
    const ms = created ? new Date(created).getTime() : NaN;
    return Number.isNaN(ms) ? -Infinity : ms;
  }

  /** Human "age" of a draft from its `draftCreated` stamp, or "—" when absent. */
  private draftAge(project: Project): string {
    const created = project.inkswell?.draftCreated;
    if (!created) return "—";
    const ms = new Date(created).getTime();
    if (Number.isNaN(ms)) return "—";
    const days = Math.floor((Date.now() - ms) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 mo" : `${months} mo`;
  }

  private renderTargets(body: HTMLElement, daily: Record<string, number>): void {
    // Targets are story-level: one row per story, read off its base draft (not
    // one row per draft, which would duplicate the shared goal).
    const withTargets = groupIntoStories(this.store.getProjects())
      .map((s) => baseDraft(s))
      .filter((p) => p.inkswell?.goals?.target && p.inkswell.goals.target > 0);
    if (withTargets.length === 0) {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: "No project word targets set. Use the 'Set word target' command.",
      });
      return;
    }
    const rate = recentDailyAverage(daily, PROJECTION_WINDOW);
    for (const project of withTargets) {
      const target = project.inkswell!.goals!.target!;
      const row = body.createDiv({ cls: "inkswell-stats__project" });
      row.createDiv({ cls: "inkswell-stats__project-title", text: project.draft.title });
      const detail = row.createDiv({ cls: "inkswell-stats__muted" });
      const goals = project.inkswell!.goals!;
      void this.stats.projectWords(project).then((words) => {
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

        // Deadline pace (B3): required rate + verdict, or a suggestion to set one.
        if (goals.deadline) {
          const pace = computePace(words, target, goals.deadline, goals.daysPerWeek ?? 7, rate);
          if (pace.status !== "met" && pace.status !== "no-deadline") {
            const badge = row.createDiv({ cls: `inkswell-pace inkswell-pace--${pace.status}` });
            const label =
              pace.status === "ahead" ? "Ahead" : pace.status === "on-track" ? "On track" : "Behind";
            badge.setText(
              `${label} · need ~${pace.requiredRate.toLocaleString()}/writing-day · ${pace.calendarDays} days left (avg ${Math.round(rate)}/day)`
            );
          }
        } else if (!p.done) {
          row.createDiv({
            cls: "inkswell-stats__muted",
            text: `Set a deadline (≈${suggestedDeadlineWeeks(target)} weeks suggested) for pace tracking.`,
          });
        }

        // Draft-progress milestone zone (B5, light-touch).
        const ms = draftMilestone(words, target);
        if (ms.zone) {
          row.createDiv({
            cls: "inkswell-stats__muted inkswell-stats__zone",
            text: `${ms.pct}% · ${ms.zone.label} — ${ms.zone.note}`,
          });
        }
      });
    }
  }

  // --- Primitives ----------------------------------------------------------

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
    const weeks = heatmapWeeks(daily, HEAT_WEEKS, new Date(), this.plugin.settings.weekStart);
    const max = Math.max(1, ...weeks.flat().map((c) => c.words));
    const grid = parent.createDiv({ cls: "inkswell-heat" });
    for (const col of weeks) {
      const colEl = grid.createDiv({ cls: "inkswell-heat__col" });
      for (const cell of col) {
        const c = colEl.createDiv({ cls: `inkswell-heat__cell lvl-${heatLevel(cell.words, max)}` });
        c.setAttribute("aria-label", `${cell.key}: ${cell.words} words`);
      }
    }
  }
}
