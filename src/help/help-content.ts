/**
 * Central copy for the in-app guidance system. Pure content — no Obsidian view
 * wiring beyond DOM builders — so the same prose feeds both the dismissible
 * per-panel tips (`hint.ts`) and the Help index destination (`help-panel.ts`).
 *
 * Only genuinely non-obvious surfaces get a tip; self-evident phases (Home,
 * Plan→Overview, Track, the Publish checklists) are covered in the Help index
 * prose but show no inline callout.
 */

/** A builder that appends explanatory content into `el`. */
export type Body = (el: HTMLElement) => void;

export interface HintEntry {
  title: string;
  body: Body;
}

/** Append a paragraph of plain text. */
function p(el: HTMLElement, text: string): void {
  el.createEl("p", { text });
}

/** Append a bulleted list. */
function steps(el: HTMLElement, items: string[]): void {
  const ul = el.createEl("ul");
  for (const it of items) ul.createEl("li", { text: it });
}

/** Append an inline example line showing literal marker syntax. */
function examples(el: HTMLElement, codes: string[]): void {
  const wrap = el.createDiv({ cls: "inkswell-hint__examples" });
  for (const c of codes) wrap.createEl("code", { text: c });
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
    title: "How drafting & to-do markers work",
    body: (el) => {
      p(
        el,
        "Write is a focused editor: pick a scene on the left, draft in the centre, " +
          "tweak its metadata in the Inspector on the right. Edits save on blur and " +
          "when you switch scenes — never mid-keystroke."
      );
      p(
        el,
        "Don't stop to research or perfect a hard bit. Drop a bracketed marker and " +
          "keep moving — they're highlighted in the editor and swept up later in " +
          "Revise → Todos. The keyword is case-insensitive and the “: text” is optional."
      );
      examples(el, ["[TODO: ]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(el, 'Run “Insert a to-do marker…” for a picker that drops one at the cursor.');
    },
  },
  "plan/beats": {
    title: "How the beat sheet works",
    body: (el) => {
      p(
        el,
        "A Save-the-Cat–style 15-beat outline for the active project. Each beat carries " +
          "its purpose, a planning note, an optional linked scene, and a done toggle; the " +
          "bar across the top tracks how many are complete."
      );
      steps(el, [
        "Type directly into a beat's planning note — it's inline, not a separate file.",
        "Link a beat to the scene that delivers it so Plan and Write stay in sync.",
        'Scaffold generates scene stubs for any unlinked beats in one step.',
      ]);
    },
  },
  "plan/board": {
    title: "How the board works",
    body: (el) => {
      p(
        el,
        "A Kanban view of your scenes. Use the Group by selector to organise columns by " +
          "Status, Act, Chapter, or POV."
      );
      p(
        el,
        "Drag a card to another column to change that scene's value (e.g. move it from " +
          "Draft to Revised). Click a card to open the scene; right-click (or the ⋯ button) " +
          "for rename, edit, and delete. Card colour comes from the scene's colour field."
      );
    },
  },
  "plan/outline": {
    title: "How the outline works",
    body: (el) => {
      p(
        el,
        "Organise your book as a tree: acts hold chapters, chapters hold scenes. Drag a " +
          "scene into a chapter (or a chapter into an act), and drop above or below a row " +
          "to reorder. This tree is the source of truth — arranging it also sets the " +
          "manuscript's reading order, so each chapter's scenes stay together."
      );
      p(
        el,
        "It comes last in Plan on purpose. The usual flow is to sketch your Beats first, " +
          "spin scenes off those beats, and draft them in Write — structure can wait. " +
          "Once you have real scenes, come back here to group them into acts and chapters."
      );
      steps(el, [
        "Nesting is optional — a scene can sit outside any chapter and a chapter outside any act (the “Chapters with no act” / “Unassigned scenes” buckets).",
        "Give a chapter a word target to track its progress; the same targets show on Track.",
        "Click a scene to open it in Write; use the ⋯ menu (or right-click) to rename, move, or delete.",
      ]);
    },
  },
  codex: {
    title: "How the codex works",
    body: (el) => {
      p(
        el,
        "Your story bible: characters, locations, factions, items, events, and concepts, " +
          "each with a structured profile that auto-saves to the note's frontmatter."
      );
      p(el, "Every entry has a scope that controls where it shows up:");
      steps(el, [
        "Global (default) — available in every project.",
        "Project — set codex-project on the note; only that book sees it.",
        "Series — set codex-series; shared across the books in a series.",
      ]);
      p(
        el,
        "While you write, the codex auto-detects entries mentioned by name or alias, so " +
          "linking and lookups stay effortless."
      );
    },
  },
  "revise/audit": {
    title: "How the revision audit works",
    body: (el) => {
      p(el, "A three-tier checklist that takes a draft from messy to finished:");
      steps(el, [
        "Story — 18 manuscript-wide checkpoints (saved on the project).",
        "Prose — 32 line-level checks, grouped.",
        "Scene — a 14-point pass per scene (saved on each scene's frontmatter).",
      ]);
      p(
        el,
        "The per-scene pass classifies each opening (Action / Dialogue / Thought / " +
          "Reflection) automatically — override it if the guess is wrong. Click a scene " +
          "to expand and edit its checklist inline, or jump to it in Write."
      );
    },
  },
  "revise/log": {
    title: "How the revision log works",
    body: (el) => {
      p(
        el,
        "A decision log for revision work: capture what needs changing now, act on it " +
          "later. Each entry has a type (Continuity, Plot hole, Rewrite, Character, " +
          "Research, New-scene) and a priority."
      );
      steps(el, [
        'Add one with “Log a revision decision” — it pre-fills from your editor selection.',
        "Anchor it to the current scene, or to the whole project.",
        "Entries start Pending; click Apply once you've made the change.",
        "Filter by project, scene, or type; toggle Show applied to review history.",
      ]);
    },
  },
  "revise/todos": {
    title: "How the to-do sweep works",
    body: (el) => {
      p(
        el,
        "Every bracketed marker you dropped while drafting, gathered in one place and " +
          "grouped by scene. Use the chips to filter by type."
      );
      examples(el, ["[TODO]", "[RESEARCH: ]", "[NOTE: ]", "[DIALOGUE: ]", "[SCENE: ]"]);
      p(
        el,
        "Click a row to jump straight to that spot in Write — the marker flashes so you " +
          "can resolve it fast. Edit the prose to remove it; the sweep updates on the next scan."
      );
    },
  },
  "publish/compile": {
    title: "How compile works",
    body: (el) => {
      p(
        el,
        "Assemble the active project's scenes into one manuscript file. Pick a format — " +
          "Markdown, HTML, or Word/PDF/EPUB via Pandoc — set the output name, and compile."
      );
      p(
        el,
        "The pipeline runs in steps you can toggle: per-scene steps (strip to-do markers, " +
          "filter metadata) and manuscript-level steps (headings, page breaks, tidy blank " +
          "lines). Your choices are remembered per project."
      );
    },
  },
};

export interface HelpSection {
  /** Phase label shown as the section heading. */
  phase: string;
  /** Lucide icon name for the section header. */
  icon: string;
  /** Short one-liner under the heading. */
  summary: string;
  /** Detailed body for the index (reuses HINT bodies where one exists). */
  body: Body;
}

/** Ordered phases for the Help index destination. */
export const HELP_SECTIONS: HelpSection[] = [
  {
    phase: "Home",
    icon: "home",
    summary: "Projects, scenes, and a quick-capture inbox for story ideas.",
    body: (el) => {
      p(
        el,
        "Your hub. Every project and its scene tree lives here; drag scene rows to " +
          "reorder, or use the ⋯ menu to move, rename, or delete. The Inspector on the " +
          "right edits the selected scene's metadata."
      );
      p(
        el,
        "Capture story ideas in the inbox at the top without leaving the page — press " +
          "Enter to save, and pin the ones worth keeping at the top."
      );
    },
  },
  {
    phase: "Plan",
    icon: "compass",
    summary: "Overview fields, the beat sheet, the status board, and the story outline.",
    body: (el) => {
      p(
        el,
        "Overview holds novel-level fields (logline, theme, genre) and long-form prose " +
          "(synopsis, three-act sketch). Beats, Board, and Outline are detailed below."
      );
      el.createEl("h4", { text: HINTS["plan/beats"].title });
      HINTS["plan/beats"].body(el);
      el.createEl("h4", { text: HINTS["plan/board"].title });
      HINTS["plan/board"].body(el);
      el.createEl("h4", { text: HINTS["plan/outline"].title });
      HINTS["plan/outline"].body(el);
    },
  },
  {
    phase: "Write",
    icon: "pencil",
    summary: "The focused manuscript editor and to-do markers.",
    body: HINTS["write"].body,
  },
  {
    phase: "Codex",
    icon: "book-marked",
    summary: "Your story bible, scoped global / project / series.",
    body: HINTS["codex"].body,
  },
  {
    phase: "Track",
    icon: "bar-chart-3",
    summary: "Word counts, streaks, pace, sprints, and structure.",
    body: (el) => {
      p(
        el,
        "A dashboard of your writing: daily/weekly/monthly counts, streaks, a 26-week " +
          "heatmap, sprint history, and a scene-structure breakdown. The status bar at the " +
          "bottom mirrors today's progress and any running sprint — click it to open Track."
      );
      p(
        el,
        "Start a timed sprint from the rail (or the “Start a writing sprint” command) to " +
          "write against a clock and a word goal."
      );
    },
  },
  {
    phase: "Revise",
    icon: "git-compare",
    summary: "Audit checklists, the decision log, the to-do sweep, and prose analysis.",
    body: (el) => {
      el.createEl("h4", { text: HINTS["revise/audit"].title });
      HINTS["revise/audit"].body(el);
      el.createEl("h4", { text: HINTS["revise/log"].title });
      HINTS["revise/log"].body(el);
      el.createEl("h4", { text: HINTS["revise/todos"].title });
      HINTS["revise/todos"].body(el);
      el.createEl("h4", { text: "Analysis" });
      p(
        el,
        "Readability grades, your most-used words, and repeated-phrase (echo) detection " +
          "across the whole manuscript — run on demand for a style pass."
      );
    },
  },
  {
    phase: "Publish",
    icon: "upload",
    summary: "Compile, the self-publishing checklist, and launch planning.",
    body: (el) => {
      el.createEl("h4", { text: HINTS["publish/compile"].title });
      HINTS["publish/compile"].body(el);
      el.createEl("h4", { text: "Checklist & launch" });
      p(
        el,
        "Checklist tracks ~50 self-publishing tasks plus a per-format metadata worksheet " +
          "(ISBN, blurb, keywords). Launch plans a pre-order timeline with auto-computed " +
          "milestone dates and trackers for budget, cover, marketing, and ARC readers."
      );
    },
  },
];
