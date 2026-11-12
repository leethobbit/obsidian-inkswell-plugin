/**
 * Track panel: an at-a-glance overview card row, then collapsible sections —
 * Goals (rings/habit/streak), Activity (writing-history chart + heatmap +
 * milestone), Sprints (history), Structure (status/act), and project Targets.
 * Charts are plain DOM/CSS — no external libraries (CSP-safe). Prose analysis
 * lives on Revise → Analysis, not here.
 */

import { App, Notice, TFile, setIcon } from "obsidian";
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
  perWritingDay,
  recentDailyAverage,
  suggestedDeadlineWeeks,
  weekToDateWords,
} from "../goals/goals";
import { ChallengeProgress, WritingChallenge, showEndedResult } from "../goals/challenge";
import { renderHint } from "../help/hint";
import { tallyBy } from "../insight/breakdown";
import { ChapterRunsResult, chapterRuns } from "../outliner/outline";
import { formatReadTime, heatLevel } from "./format";
import { resolveActive } from "../projects/active-project";
import { ProjectStats } from "../projects/project-stats";
import { ProjectStore } from "../projects/project-store";
import { baseDraft, draftLabel, groupIntoStories, projectArchived, storyOf } from "../projects/stories";
import { Project, isMultiScene } from "../projects/types";
import { SCENE_STATUSES, readSceneMeta, statusLabel, visibleStatuses } from "../scenes/scene-meta";
import { sprintSeconds, sprintStats, sprintWpm } from "../sprints/sprint-stats";
import { WritingTracker } from "../tracking/writing-tracker";
import { dateKey, projectedDaily } from "../tracking/types";
import { MessageKey, formatDate, formatNumber, t, tp } from "../i18n";
import { fillTemplate } from "../i18n/dom";
import type InkswellPlugin from "../../main";

const HEAT_WEEKS = 26;
const PROJECTION_WINDOW = 14;

/** `tallyBy`'s bucket for scenes with no value: a data key, translated only when shown. */
const NONE_KEY = "None";

const RANGES: { labelKey: MessageKey; days: number | null }[] = [
  { labelKey: "stats.range.days7", days: 7 },
  { labelKey: "stats.range.days30", days: 30 },
  { labelKey: "stats.range.days90", days: 90 },
  { labelKey: "stats.range.all", days: null },
];

const PACE_KEYS: Record<"ahead" | "on-track" | "behind", MessageKey> = {
  ahead: "stats.targets.pace.ahead",
  "on-track": "stats.targets.pace.onTrack",
  behind: "stats.targets.pace.behind",
};

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

    const daily = this.goalDaily();
    const s = this.plugin.settings;

    // Multi-device writers: point at the opt-in history sync until it's on.
    if (!s.syncWritingHistory) renderHint(container.createDiv(), this.plugin, "track/sync");

    this.renderOverview(container);

    // Draft comparison: only when the active story has more than one draft.
    this.renderDrafts(container);

    // Activity: a full-width card on top (its own block, not in the card grid).
    this.section(container, "activity", t("stats.section.activity"), (body) => {
      const cols = body.createDiv({ cls: "inkswell-activity" });
      const chartCol = cols.createDiv({ cls: "inkswell-activity__chart" });
      this.renderHistory(chartCol);

      const heatCol = cols.createDiv({ cls: "inkswell-activity__heat" });
      heatCol.createDiv({
        cls: "inkswell-stats__muted inkswell-stats__subhead",
        text: tp("stats.activity.heatmap", HEAT_WEEKS),
      });
      this.heatmap(heatCol, daily);

      const life = lifetimeRecords(daily);
      const next = nextMilestone(life.totalWords);
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: next
          ? t("stats.activity.nextMilestone", {
              milestone: formatNumber(next),
              remaining: formatNumber(next - life.totalWords),
            })
          : t("stats.activity.allMilestones"),
      });
    });

    // Card row beneath, left→right: Project targets · Goals · Sprints · Structure.
    // With no wide item in this grid, auto-fit collapses empty tracks so the four
    // cards stretch to fill the full width and reflow as the window resizes.
    const grid = container.createDiv({ cls: "inkswell-stats__grid" });
    // The writing challenge leads while it's upcoming, running, or just ended.
    const challenge = s.challenge;
    const progress = this.plugin.challengeProgress();
    const showChallenge =
      !!challenge && !!progress && (progress.phase !== "ended" || showEndedResult(challenge));
    if (challenge && progress && showChallenge) {
      this.section(grid, "challenge", t("stats.section.challenge"), (body) =>
        this.renderChallenge(body, challenge, progress)
      );
    }
    this.section(grid, "targets", t("stats.section.targets"), (body) => this.renderTargets(body, daily));

    this.section(grid, "goals", t("stats.section.goals"), (body) => {
      const rings = body.createDiv({ cls: "inkswell-rings" });
      this.ring(rings, this.tracker.todayWords(), this.plugin.todayTarget(), t("stats.goals.today"));
      this.ring(
        rings,
        weekToDateWords(daily, new Date(), s.weekStart),
        s.weeklyWordGoal,
        t("stats.goals.week")
      );
      this.ring(rings, monthToDateWords(daily), s.monthlyWordGoal, t("stats.goals.month"));

      const met = habitDaysMet(daily, s.habitMinWords, new Date(), s.weekStart);
      body.createDiv({
        cls: "inkswell-stats__row",
        text: t("stats.goals.habit", { met, days: s.habitDaysPerWeek, min: s.habitMinWords }),
      });

      const streak = computeStreaks(daily, s.streakThreshold);
      const life = lifetimeRecords(daily);
      body.createDiv({
        cls: "inkswell-stats__row",
        text: t("stats.goals.streak", { current: streak.current, longest: streak.longest }),
      });

      // Optional daily mood (1–10) — light-touch, never required.
      const moodRow = body.createDiv({ cls: "inkswell-stats__row inkswell-mood" });
      moodRow.createSpan({ cls: "inkswell-stats__muted", text: t("stats.goals.mood") });
      const todayKey = dateKey(new Date());
      const moodSel = moodRow.createEl("select", { cls: "dropdown" });
      moodSel.createEl("option", { text: "—", value: "" });
      for (let i = 1; i <= 10; i++) moodSel.createEl("option", { text: `${i}`, value: `${i}` });
      moodSel.value = `${this.tracker.getMood(todayKey) ?? ""}`;
      moodSel.onchange = () => this.tracker.setMood(todayKey, Number(moodSel.value) || 0);
      if (!showChallenge) {
        const link = body.createEl("a", {
          cls: "inkswell-stats__link",
          text: t("stats.goals.setUpChallenge"),
          href: "#",
        });
        link.onclick = (e) => {
          e.preventDefault();
          this.plugin.openChallengeModal();
        };
      }
      // The best day stays an ISO day key, as before (formatDate would change it).
      const lifeVars = { words: formatNumber(life.totalWords), days: life.daysWritten };
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: life.bestDay
          ? t("stats.goals.lifetimeBest", {
              ...lifeVars,
              best: formatNumber(life.bestDay.words),
              date: life.bestDay.date,
            })
          : t("stats.goals.lifetime", lifeVars),
      });
    });

    this.section(grid, "sprints", t("stats.section.sprints"), (body) => this.renderSprints(body));
    this.section(grid, "structure", t("stats.section.structure"), (body) => this.renderStructure(body));
  }

  /** The challenge card: par-ticked progress, ahead/behind, today's need,
   *  click-to-copy total (for typing into an event site), Edit. */
  private renderChallenge(body: HTMLElement, ch: WritingChallenge, p: ChallengeProgress): void {
    const n = (v: number) => formatNumber(v);
    const head = body.createDiv({ cls: "inkswell-challenge__head" });
    head.createSpan({ cls: "inkswell-challenge__name", text: ch.name });
    head.createSpan({
      cls: "inkswell-stats__muted",
      text:
        p.phase === "upcoming"
          ? tp("stats.challenge.startsIn", p.startsIn)
          : p.phase === "active"
            ? tp("stats.challenge.dayOf", p.daysLeft, { day: p.dayIndex, total: p.totalDays })
            : t("stats.challenge.finished"),
    });

    if (p.phase === "upcoming") {
      body.createDiv({
        cls: "inkswell-stats__row",
        text: t("stats.challenge.upcomingTarget", {
          target: n(ch.target),
          perDay: n(Math.ceil(ch.target / p.totalDays)),
          days: p.totalDays,
        }),
      });
    } else {
      const bar = body.createDiv({ cls: "inkswell-progress inkswell-challenge__bar" });
      const pct = (v: number) => `${Math.max(0, Math.min(100, (v / ch.target) * 100))}%`;
      bar.createDiv({ cls: "inkswell-progress__fill" }).setCssProps({ width: pct(p.written) });
      if (p.phase === "active") {
        const tick = bar.createDiv({ cls: "inkswell-challenge__par" });
        tick.setCssProps({ left: pct(p.par) });
        tick.setAttribute("aria-label", t("stats.challenge.parToday", { par: n(p.par) }));
      }

      const nums = body.createDiv({ cls: "inkswell-stats__row" });
      // Click the total to copy it — event sites (e.g. ProWritingAid's) have no
      // Obsidian integration, so the count gets typed in by hand every day.
      fillTemplate(
        nums,
        p.phase === "active"
          ? t("stats.challenge.totalPar", { target: n(ch.target), par: n(p.par) })
          : t("stats.challenge.total", { target: n(ch.target) }),
        {
          total: (el) => {
            const total = el.createEl("button", { cls: "inkswell-challenge__total", text: n(p.written) });
            total.setAttribute("aria-label", t("stats.challenge.copyTotal"));
            total.onclick = () => {
              void navigator.clipboard.writeText(String(p.written)).then(
                () => new Notice(t("stats.challenge.copied", { count: n(p.written) })),
                () => new Notice(t("stats.challenge.copyFailed"))
              );
            };
          },
        }
      );

      const status = body.createDiv({ cls: `inkswell-stats__row inkswell-challenge__status is-${p.status}` });
      // Best days stay ISO day keys, as before (formatDate would change them).
      if (p.phase === "active") {
        const today = { today: n(p.today), needed: n(p.neededToday) };
        status.setText(
          p.status === "met"
            ? t("stats.challenge.met")
            : p.status === "ahead"
              ? t("stats.challenge.aheadToday", { ...today, diff: n(p.written - p.par) })
              : t("stats.challenge.behindToday", { ...today, diff: n(p.par - p.written) })
        );
      } else {
        const best = p.bestDay ? { best: n(p.bestDay.words), date: p.bestDay.date } : null;
        const short = n(ch.target - p.written);
        status.setText(
          p.status === "met"
            ? best
              ? t("stats.challenge.metBest", best)
              : t("stats.challenge.met")
            : best
              ? t("stats.challenge.shortBest", { ...best, short })
              : t("stats.challenge.short", { short })
        );
      }
    }

    // Without history sync each device counts only its own typing — the total
    // (and what gets copied) would be short for a two-device writer.
    if (!this.plugin.settings.syncWritingHistory) {
      const warn = body.createDiv({ cls: "inkswell-stats__muted inkswell-challenge__device" });
      fillTemplate(warn, t("stats.challenge.deviceOnly"), {
        link: (el) => {
          const on = el.createEl("a", { text: t("stats.challenge.deviceOnlyLink"), href: "#" });
          on.onclick = (e) => {
            e.preventDefault();
            void this.plugin.setSyncWritingHistory(true);
          };
        },
      });
    }

    const edit = body.createEl("button", { cls: "inkswell-challenge__edit", text: t("common.edit") });
    edit.onclick = () => this.plugin.openChallengeModal();
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
    const words = this.card(row, "type", "…", t("stats.card.words"));
    this.card(row, "file-text", project ? `${project.scenes.length}` : "—", t("stats.card.scenes"));
    const read = this.card(row, "book-open", "…", t("stats.card.readTime"));
    this.card(row, "pencil", formatNumber(this.tracker.todayWords()), t("stats.card.today"));

    if (project) {
      void this.stats.projectWords(project).then((w) => {
        words.setText(formatNumber(w));
        read.setText(formatReadTime(w));
      });
    } else {
      words.setText("0");
      read.setText(formatReadTime(0));
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

  /** The date→words map counting toward goals: the writing log with the
   *  excluded categories subtracted (legacy pre-category days count fully). */
  private goalDaily(): Record<string, number> {
    return projectedDaily(
      this.tracker.getMergedLog(),
      new Set(this.plugin.settings.excludedFromGoals)
    );
  }

  /** Writing-history bar chart + range toggle (rebuilds itself on toggle). */
  private renderHistory(host: HTMLElement): void {
    host.empty();
    const toggle = host.createDiv({ cls: "inkswell-stats__rangetoggle" });
    for (const r of RANGES) {
      const b = toggle.createEl("button", { text: t(r.labelKey) });
      b.toggleClass("is-active", this.chartRange === r.days);
      b.onclick = () => {
        this.chartRange = r.days;
        this.renderHistory(host);
      };
    }

    const series = dailySeries(this.goalDaily(), this.chartRange);
    const max = Math.max(1, ...series.map((p) => p.words));
    const chart = host.createDiv({ cls: "inkswell-chart" });
    if (series.length === 0) {
      host.createDiv({ cls: "inkswell-stats__muted", text: t("stats.chart.empty") });
      return;
    }
    // Dates stay ISO day keys here, as before (formatDate would change them).
    for (const p of series) {
      const col = chart.createDiv({ cls: "inkswell-chart__col" });
      col.createDiv({ cls: "inkswell-chart__bar" }).style.height = `${(p.words / max) * 100}%`;
      col.setAttribute("aria-label", tp("stats.chart.bar", p.words, { date: p.date }));
    }
    const cap = host.createDiv({ cls: "inkswell-stats__muted inkswell-chart__caption" });
    cap.createSpan({ text: series[0].date });
    cap.createSpan({ text: t("stats.chart.max", { max: formatNumber(max) }) });
    cap.createSpan({ text: series[series.length - 1].date });
  }

  private renderSprints(body: HTMLElement): void {
    // Every device's sprints when cross-device history is on (own log otherwise).
    const records = this.tracker.getMergedLog().sprints;
    const st = sprintStats(records);
    if (st.count === 0) {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: t("stats.sprints.empty"),
      });
      return;
    }

    body.createDiv({
      cls: "inkswell-stats__row",
      text: tp("stats.sprints.summary", st.count, {
        words: formatNumber(st.totalWords),
        wpm: Math.round(st.avgWpm),
      }),
    });
    const best = { words: formatNumber(st.bestWords), wpm: Math.round(st.bestWpm) };
    body.createDiv({
      cls: "inkswell-stats__muted",
      text:
        st.goalCount > 0
          ? t("stats.sprints.bestGoals", {
              ...best,
              met: st.goalsMet,
              total: st.goalCount,
              pct: Math.round(st.hitRate * 100),
            })
          : t("stats.sprints.best", best),
    });

    const list = body.createDiv({ cls: "inkswell-sprintlist" });
    const head = list.createDiv({
      cls: "inkswell-sprint-row inkswell-sprint-row--head",
    });
    head.createSpan({ cls: "inkswell-sprint__date", text: t("stats.sprints.col.date") });
    head.createSpan({ cls: "inkswell-sprint__num", text: t("stats.sprints.col.words") });
    head.createSpan({ cls: "inkswell-sprint__num", text: t("stats.sprints.col.wpm") });
    head.createSpan({ cls: "inkswell-sprint__num", text: t("stats.sprints.col.time") });
    head.createSpan({ cls: "inkswell-sprint__goal", text: t("stats.sprints.col.goal") });

    for (const r of records.slice(-8).reverse()) {
      const rowEl = list.createDiv({ cls: "inkswell-sprint-row" });
      rowEl.createSpan({
        cls: "inkswell-sprint__date",
        // `{}` = Intl's default numeric date, what toLocaleDateString() printed.
        text: formatDate(r.start, {}),
      });
      rowEl.createSpan({ cls: "inkswell-sprint__num", text: formatNumber(r.words) });
      rowEl.createSpan({ cls: "inkswell-sprint__num", text: `${Math.round(sprintWpm(r))}` });
      rowEl.createSpan({
        cls: "inkswell-sprint__num",
        text: t("stats.minutesShort", { minutes: Math.round(sprintSeconds(r) / 60) }),
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
      body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.noProjects") });
      return;
    }

    const metas = project.scenes.map((s) => {
      if (!s.path) return {};
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f) : ({});
    });

    body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.byStatus") });
    const statusOverride = this.plugin.settings.listOverrides["scene.status"];
    const statusOrder = visibleStatuses(statusOverride).map((s) => s.id);
    this.tallyBars(body, tallyBy(metas.map((m) => m.status), statusOrder), (k) =>
      SCENE_STATUSES.includes(k as never) ? statusLabel(k as never, statusOverride) : k
    );
    // POV balance for multi-POV books (#47) — most-used first; skipped entirely
    // when no scene names a POV, so single-POV drafts see no noise.
    const povs = metas.map((m) => m.pov?.trim() || undefined);
    if (povs.some((p) => p)) {
      body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.byPov") });
      const povTally = tallyBy(povs);
      const povOrder = povTally
        .filter((tally) => tally.key !== NONE_KEY)
        .sort((a, b) => b.count - a.count)
        .map((tally) => tally.key);
      this.tallyBars(body, tallyBy(povs, povOrder));
    }

    body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.byAct") });
    // Order acts by first appearance in manuscript order (metas is in scene
    // order), matching the Board and the compile group-by-chapter step — not
    // alphabetically, which mis-sorts spelled-out acts.
    const acts = metas.map((m) => m.act);
    const actOrder = [...new Set(acts.filter((a): a is string => !!a))];
    this.tallyBars(body, tallyBy(acts, actOrder));

    body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.byChapter") });
    // One bar per chapter as it runs through the manuscript, never per chapter
    // string: two chapters may share a name (#58).
    const runs = chapterRuns(
      project.scenes.map((s, i) => ({ title: s.title, chapter: metas[i].chapter })),
      project.inkswell?.chapters
    );
    const chapterTallies = runs.runs.map((r) => ({ key: r.title, count: r.indices.length }));
    if (runs.unassigned.length > 0) chapterTallies.push({ key: NONE_KEY, count: runs.unassigned.length });
    this.tallyBars(body, chapterTallies);

    // Read-only mirror of any per-chapter word targets (managed in Plan → Structure).
    void this.renderChapterTargets(body, project, runs);
  }

  /** Compact per-chapter target progress (only chapters that have a target). */
  private async renderChapterTargets(
    body: HTMLElement,
    project: Project,
    { runs, planned }: ChapterRunsResult
  ): Promise<void> {
    const rows = [
      ...runs.map((r) => ({ cfg: r.cfg, paths: r.indices.map((i) => project.scenes[i].path) })),
      ...planned.map((p) => ({ cfg: p.cfg, paths: [] as Array<string | null> })),
    ].filter((r) => r.cfg?.targetWords);
    if (rows.length === 0) return;
    body.createDiv({ cls: "inkswell-stats__muted", text: t("stats.structure.chapterTargets") });
    for (const { cfg, paths } of rows) {
      const target = cfg?.targetWords ?? 0;
      let words = 0;
      for (const p of paths) words += await this.stats.sceneWords(p);
      const row = body.createDiv({ cls: "inkswell-stats__row" });
      row.createSpan({ cls: "inkswell-tally__label", text: cfg?.title ?? "" });
      this.progressBar(row, words, target);
      row.createSpan({
        cls: "inkswell-tally__count",
        text: `${formatNumber(words)} / ${formatNumber(target)}`,
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

    this.section(container, "drafts", t("stats.section.drafts"), (body) => {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: tp("stats.drafts.comparing", story.drafts.length, { title: story.title }),
      });

      const table = body.createDiv({ cls: "inkswell-drafttable" });
      const head = table.createDiv({ cls: "inkswell-draft-row inkswell-draft-row--head" });
      head.createSpan({ cls: "inkswell-draft__label", text: t("stats.drafts.col.draft") });
      head.createSpan({ cls: "inkswell-draft__num", text: t("stats.drafts.col.words") });
      head.createSpan({ cls: "inkswell-draft__num", text: "Δ" }); // i18n-ignore: symbol
      head.createSpan({ cls: "inkswell-draft__num", text: t("stats.drafts.col.scenes") });
      head.createSpan({ cls: "inkswell-draft__mix", text: t("stats.drafts.col.statusMix") });
      head.createSpan({ cls: "inkswell-draft__num", text: t("stats.drafts.col.age") });

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
          wordCells[i].setText(formatNumber(w));
          if (i === 0) {
            deltaCells[i].setText("—");
            return;
          }
          const delta = w - base;
          deltaCells[i].setText(
            delta === 0 ? "±0" : `${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta))}`
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
      host.createSpan({ cls: "inkswell-stats__muted", text: t("stats.drafts.singleNote") });
      return;
    }
    const statuses = project.scenes.map((s) => {
      if (!s.path) return undefined;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f).status : undefined;
    });
    const statusOverride = this.plugin.settings.listOverrides["scene.status"];
    const tallies = tallyBy(statuses, visibleStatuses(statusOverride).map((s) => s.id));
    if (tallies.length === 0) {
      host.createSpan({ cls: "inkswell-stats__muted", text: "—" });
      return;
    }
    const bar = host.createDiv({ cls: "inkswell-mixbar" });
    for (const tally of tallies) {
      const isStatus = SCENE_STATUSES.includes(tally.key as never);
      const seg = bar.createDiv({
        cls: isStatus
          ? `inkswell-mixbar__seg inkswell-status--${tally.key}`
          : "inkswell-mixbar__seg inkswell-mixbar__seg--none",
      });
      seg.style.flexGrow = `${tally.count}`;
      const label = isStatus ? statusLabel(tally.key as never, statusOverride) : displayKey(tally.key);
      seg.setAttribute("aria-label", t("stats.drafts.mixSegment", { count: tally.count, label }));
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
    if (days <= 0) return t("stats.drafts.age.today");
    if (days < 30) return tp("stats.drafts.age.days", days);
    return tp("stats.drafts.age.months", Math.floor(days / 30));
  }

  private renderTargets(body: HTMLElement, daily: Record<string, number>): void {
    // Targets are story-level: one row per story, the TARGET read off its base
    // draft (not one row per draft, which would duplicate the shared goal) but
    // the WORDS counted from the draft being written — the focused draft when
    // this story is active, else the base. Matches the Home hero card, and
    // keeps the bar moving when all the writing happens in a revision draft.
    const activePath = this.plugin.activeProject.get();
    // Archived stories are out of sight here (a shelved book's ETA is noise) —
    // unless it's the one in focus. Their words still count toward every goal.
    const withTargets = groupIntoStories(this.store.getProjects())
      .filter((s) => !projectArchived(baseDraft(s)) || s.drafts.some((d) => d.vaultPath === activePath))
      .map((s) => ({
        base: baseDraft(s),
        counted: s.drafts.find((d) => d.vaultPath === activePath) ?? baseDraft(s),
      }))
      .filter((p) => p.base.inkswell?.goals?.target && p.base.inkswell.goals.target > 0);
    if (withTargets.length === 0) {
      body.createDiv({
        cls: "inkswell-stats__muted",
        text: t("stats.targets.empty"),
      });
      return;
    }
    const rate = recentDailyAverage(daily, PROJECTION_WINDOW);
    for (const { base: project, counted } of withTargets) {
      const target = project.inkswell!.goals!.target!;
      const row = body.createDiv({ cls: "inkswell-stats__project" });
      row.createDiv({ cls: "inkswell-stats__project-title", text: project.draft.title });
      const detail = row.createDiv({ cls: "inkswell-stats__muted" });
      const goals = project.inkswell!.goals!;
      void this.stats.projectWords(counted).then((words) => {
        const p = projectFinish(words, target, rate);
        this.progressBar(row, words, target);
        const progress = { words: formatNumber(words), target: formatNumber(target) };
        if (p.done) {
          detail.setText(t("stats.targets.met", progress));
        } else {
          const remaining = formatNumber(p.remaining);
          detail.setText(
            p.daysToFinish === null
              ? t("stats.targets.noRecent", { ...progress, remaining })
              : t("stats.targets.eta", {
                  ...progress,
                  remaining,
                  days: p.daysToFinish,
                  rate: Math.round(rate),
                })
          );
        }

        // Deadline pace (B3): required rate + verdict, or a suggestion to set one.
        if (goals.deadline) {
          // `rate` is per calendar day; the required rate is per writing day.
          const daysPerWeek = goals.daysPerWeek ?? 7;
          const pace = computePace(
            words,
            target,
            goals.deadline,
            daysPerWeek,
            perWritingDay(rate, daysPerWeek)
          );
          if (pace.status !== "met" && pace.status !== "no-deadline") {
            const badge = row.createDiv({ cls: `inkswell-pace inkswell-pace--${pace.status}` });
            badge.setText(
              t(PACE_KEYS[pace.status], {
                rate: formatNumber(pace.requiredRate),
                days: pace.calendarDays,
                avg: Math.round(rate),
                window: PROJECTION_WINDOW,
              })
            );
          }
        } else if (!p.done) {
          row.createDiv({
            cls: "inkswell-stats__muted",
            text: t("stats.targets.suggestDeadline", { weeks: suggestedDeadlineWeeks(target) }),
          });
        }

        // Draft-progress milestone zone (B5, light-touch).
        const ms = draftMilestone(words, target);
        if (ms.zone) {
          row.createDiv({
            cls: "inkswell-stats__muted inkswell-stats__zone",
            text: t("stats.targets.zone", { pct: ms.pct, label: ms.zone.label, note: ms.zone.note }),
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
    const max = Math.max(1, ...tallies.map((tally) => tally.count));
    const wrap = parent.createDiv({ cls: "inkswell-tally" });
    for (const tally of tallies) {
      const row = wrap.createDiv({ cls: "inkswell-tally__row" });
      row.createSpan({ cls: "inkswell-tally__label", text: displayKey(label(tally.key)) });
      const bar = row.createDiv({ cls: "inkswell-tally__bar" });
      bar.createDiv({ cls: "inkswell-tally__fill" }).style.width = `${(tally.count / max) * 100}%`;
      row.createSpan({ cls: "inkswell-tally__count", text: `${tally.count}` });
    }
  }

  private ring(parent: HTMLElement, value: number, max: number, label: string): void {
    const pct = max > 0 ? Math.round(Math.min(100, (value / max) * 100)) : 0;
    const wrap = parent.createDiv({ cls: "inkswell-ring" });
    const dial = wrap.createDiv({ cls: "inkswell-ring__dial" });
    dial.style.setProperty("--pct", `${pct}`);
    dial.createDiv({ cls: "inkswell-ring__hole", text: t("stats.ring.percent", { pct }) });
    wrap.createDiv({ cls: "inkswell-ring__label", text: label });
    wrap.createDiv({
      cls: "inkswell-ring__sub",
      text:
        max > 0
          ? t("stats.ring.ofMax", { value: formatNumber(value), max: formatNumber(max) })
          : formatNumber(value),
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
        c.setAttribute("aria-label", tp("stats.chart.bar", cell.words, { date: cell.key }));
      }
    }
  }
}

/** A tally key as shown: `tallyBy`'s none bucket reads as the translated "None". */
function displayKey(key: string): string {
  return key === NONE_KEY ? t("common.none") : key;
}
