/**
 * Central copy for the in-app guidance system. Pure content — no Obsidian view
 * wiring beyond DOM builders — so the same prose feeds both the dismissible
 * per-panel tips (`hint.ts`) and the Help index destination (`help-panel.ts`).
 *
 * Only genuinely non-obvious surfaces get a tip; self-evident phases (Home,
 * Plan→Overview, Track, the Publish checklists) are covered in the Help index
 * prose but show no inline callout.
 *
 * The prose lives in the catalog (src/i18n/locales/en/help.ts), one key per
 * paragraph, list item, or sub-heading. Tables here hold KEYS; bodies call
 * `t()` when they render, never at import.
 */

import { MessageKey, t } from "../i18n";

/** A builder that appends explanatory content into `el`. */
export type Body = (el: HTMLElement) => void;

export interface HintEntry {
  titleKey: MessageKey;
  body: Body;
}

/** Append a paragraph of plain text. */
function p(el: HTMLElement, key: MessageKey): void {
  el.createEl("p", { text: t(key) });
}

/** Append a bulleted list. */
function steps(el: HTMLElement, keys: MessageKey[]): void {
  const ul = el.createEl("ul");
  for (const key of keys) ul.createEl("li", { text: t(key) });
}

/** Append a sub-heading. */
function h4(el: HTMLElement, key: MessageKey): void {
  el.createEl("h4", { text: t(key) });
}

/** Append an inline example line showing literal marker syntax (never translated:
 *  these are the keywords the editor parses). */
function examples(el: HTMLElement, codes: string[]): void {
  const wrap = el.createDiv({ cls: "inkswell-hint__examples" });
  for (const c of codes) wrap.createEl("code", { text: c });
}

/** A tip's title as a sub-heading, then its body (the index reuses tip bodies). */
function hintSection(el: HTMLElement, key: string): void {
  const entry = HINTS[key];
  h4(el, entry.titleKey);
  entry.body(el);
}

/**
 * Default sub-tab per destination — mirrors the host's resolution in
 * `inkswell-view.ts` so a tip resolves to the right key when no sub-tab is
 * explicitly selected yet.
 */
const DEFAULT_SUBTAB: Record<string, string> = {
  plan: "overview",
  revise: "audit",
  publish: "compile",
};

/** Registry key for a (mode, subtab) pair, e.g. "plan/beats" or "codex". */
export function hintKey(mode: string, subtab?: string): string {
  const sub = subtab ?? DEFAULT_SUBTAB[mode];
  return sub ? `${mode}/${sub}` : mode;
}

/**
 * Per-surface tips, keyed by the value `hintKey` returns. A missing key means
 * "no tip here" (e.g. "home", "plan/overview").
 */
export const HINTS: Record<string, HintEntry> = {
  write: {
    titleKey: "help.write.title",
    body: (el) => {
      p(el, "help.write.columns");
      p(el, "help.write.room");
      p(el, "help.write.stream");
      p(el, "help.write.markers");
      examples(el, ["[TODO: ]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(el, "help.write.markerPicker");
      p(el, "help.write.peek");
      p(el, "help.write.companions");
      p(el, "help.write.customMarkers");
    },
  },
  "track/sync": {
    titleKey: "help.sync.title",
    body: (el) => {
      p(el, "help.sync.body");
    },
  },
  "plan/beats": {
    titleKey: "help.beats.title",
    body: (el) => {
      p(el, "help.beats.intro");
      steps(el, [
        "help.beats.template.saveTheCat",
        "help.beats.template.threeAct",
        "help.beats.template.herosJourney",
        "help.beats.template.sevenPoint",
        "help.beats.template.storyCircle",
        "help.beats.template.romancingTheBeat",
        "help.beats.template.twentySevenChapter",
        "help.beats.template.tenPoint",
      ]);
      p(el, "help.beats.custom");
      p(el, "help.beats.perBeat");
      steps(el, ["help.beats.tip.inline", "help.beats.tip.link", "help.beats.tip.scaffold"]);
    },
  },
  "plan/board": {
    titleKey: "help.board.title",
    body: (el) => {
      p(el, "help.board.groupBy");
      p(el, "help.board.drag");
    },
  },
  "plan/grid": {
    titleKey: "help.grid.title",
    body: (el) => {
      p(el, "help.grid.matrix");
      p(el, "help.grid.cells");
      steps(el, ["help.grid.tip.plotlines", "help.grid.tip.compact", "help.grid.tip.untracked"]);
    },
  },
  "plan/outline": {
    titleKey: "help.outline.title",
    body: (el) => {
      p(el, "help.outline.tree");
      p(el, "help.outline.order");
      steps(el, ["help.outline.tip.nesting", "help.outline.tip.targets", "help.outline.tip.open"]);
    },
  },
  codex: {
    titleKey: "help.codex.title",
    body: (el) => {
      p(el, "help.codex.intro");
      p(el, "help.codex.scopeIntro");
      steps(el, ["help.codex.scope.global", "help.codex.scope.project", "help.codex.scope.series"]);
      p(el, "help.codex.pins");
      p(el, "help.codex.appearsIn");
      p(el, "help.codex.places");
      p(el, "help.codex.links");
      p(el, "help.codex.portraits");
    },
  },
  "revise/audit": {
    titleKey: "help.audit.title",
    body: (el) => {
      p(el, "help.audit.intro");
      steps(el, [
        "help.audit.tier.story",
        "help.audit.tier.chapters",
        "help.audit.tier.scene",
        "help.audit.tier.prose",
      ]);
      p(el, "help.audit.customize");
      p(el, "help.audit.opening");
    },
  },
  "revise/todos": {
    titleKey: "help.todos.title",
    body: (el) => {
      p(el, "help.todos.intro");
      examples(el, ["[TODO]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(el, "help.todos.jump");
      p(el, "help.todos.decisions");
    },
  },
  search: {
    titleKey: "help.search.title",
    body: (el) => {
      p(el, "help.search.scope");
      p(el, "help.search.results");
      p(el, "help.search.matching");
    },
  },
  "publish/compile": {
    titleKey: "help.compile.title",
    body: (el) => {
      p(el, "help.compile.formats");
      p(el, "help.compile.docx");
      p(el, "help.compile.steps");
    },
  },
  customize: {
    titleKey: "help.customize.title",
    body: (el) => {
      p(el, "help.customize.intro");
      steps(el, [
        "help.customize.tip.sections",
        "help.customize.tip.templates",
        "help.customize.tip.lossless",
        "help.customize.tip.ownItems",
      ]);
    },
  },
};

export interface HelpSection {
  /** Phase label shown as the section heading. */
  phaseKey: MessageKey;
  /** Lucide icon name for the section header. */
  icon: string;
  /** Short one-liner under the heading. */
  summaryKey: MessageKey;
  /** Detailed body for the index (reuses HINT bodies where one exists). */
  body: Body;
}

/** Ordered phases for the Help index destination. */
export const HELP_SECTIONS: HelpSection[] = [
  {
    phaseKey: "help.section.home.phase",
    icon: "home",
    summaryKey: "help.section.home.summary",
    body: (el) => {
      p(el, "help.home.hub");
      p(el, "help.home.archive");
      p(el, "help.home.focused");
      p(el, "help.home.ideas");
      h4(el, "help.home.seriesHeading");
      p(el, "help.home.seriesAdd");
      p(el, "help.home.seriesManage");
    },
  },
  {
    phaseKey: "help.section.plan.phase",
    icon: "compass",
    summaryKey: "help.section.plan.summary",
    body: (el) => {
      p(el, "help.plan.overview");
      p(el, "help.plan.sortByChapter");
      hintSection(el, "plan/beats");
      hintSection(el, "plan/outline");
      hintSection(el, "plan/board");
      hintSection(el, "plan/grid");
    },
  },
  {
    phaseKey: "help.section.write.phase",
    icon: "pencil",
    summaryKey: "help.section.write.summary",
    body: HINTS["write"].body,
  },
  {
    phaseKey: "help.section.codex.phase",
    icon: "book-marked",
    summaryKey: "help.section.codex.summary",
    body: HINTS["codex"].body,
  },
  {
    phaseKey: "help.section.search.phase",
    icon: "search",
    summaryKey: "help.section.search.summary",
    body: HINTS["search"].body,
  },
  {
    phaseKey: "help.section.track.phase",
    icon: "bar-chart-3",
    summaryKey: "help.section.track.summary",
    body: (el) => {
      p(el, "help.track.dashboard");
      p(el, "help.track.goals");
      p(el, "help.track.sprint");
      p(el, "help.track.challenge");
    },
  },
  {
    phaseKey: "help.section.revise.phase",
    icon: "git-compare",
    summaryKey: "help.section.revise.summary",
    body: (el) => {
      hintSection(el, "revise/audit");
      hintSection(el, "revise/todos");
      h4(el, "help.revise.analysisHeading");
      p(el, "help.revise.analysis");
    },
  },
  {
    phaseKey: "help.section.publish.phase",
    icon: "upload",
    summaryKey: "help.section.publish.summary",
    body: (el) => {
      hintSection(el, "publish/compile");
      h4(el, "help.publish.checklistHeading");
      p(el, "help.publish.checklist");
    },
  },
  {
    phaseKey: "help.section.customize.phase",
    icon: "sliders-horizontal",
    summaryKey: "help.section.customize.summary",
    body: HINTS["customize"].body,
  },
  {
    phaseKey: "help.section.data.phase",
    icon: "shield-check",
    summaryKey: "help.section.data.summary",
    body: (el) => {
      p(el, "help.data.storage");
      p(el, "help.data.history");
      p(el, "help.data.sync");
      h4(el, "help.data.recoveryHeading");
      p(el, "help.data.fileRecovery");
      p(el, "help.data.conflicts");
      p(el, "help.data.backups");
    },
  },
];
