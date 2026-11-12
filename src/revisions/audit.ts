/**
 * Pure revision-checkpoint definitions and progress math (no Obsidian imports —
 * unit-testable). Implements a tiered revision method, macro→micro: Story →
 * Chapter → Scene → Prose, each tier a master checklist.
 *
 * - SCENE checkpoints are per-scene state (stored in scene frontmatter; see
 *   `audit-meta.ts`). The 14 checks below are the scene-level pass.
 * - CHAPTER checkpoints (10) are per-chapter state kept on the project, keyed by
 *   chapter id (`inkswell.revisionChecklist.chapter`; see `checklist.ts`).
 * - STORY (18) and PROSE (5 grouped categories) checkpoints are project-level state
 *   (stored under `inkswell.revisionChecklist`; see `checklist.ts`). The prose tier
 *   keeps the internal id/const name "page" for back-compat — only its label changed.
 *
 * IDs are stable string constants: stored data keys off them, so labels can be
 * reworded without migrating frontmatter.
 */

import { MessageKey, t } from "../i18n";
import { ListOverride, applyGroupedOverride, visibleItems } from "../lib/list-override";

export interface Checkpoint {
  id: string;
  label: string;
}

export interface CheckpointGroup {
  id: string;
  label: string;
  items: Checkpoint[];
}

/**
 * A shipped checkpoint whose label is looked up through `t()` on every read,
 * never at import (the catalog is picked in onload). Ids stay the stored keys;
 * consumers keep reading `.label` (resolvers, Customize, the Inspector).
 */
function checkpoint<I extends string>(id: I, key: MessageKey): { id: I; readonly label: string } {
  return {
    id,
    get label() {
      return t(key);
    },
  };
}

// --- Scene-level (14): per-scene checklist ---------------------------------

export type SceneCheckId =
  | "startsRight"
  | "described"
  | "goalConflict"
  | "shift"
  | "purpose"
  | "structure"
  | "tension"
  | "paced"
  | "researched"
  | "endsUncertain"
  | "transitions"
  | "narratorSwitch"
  | "perspective"
  | "consistent";

export const SCENE_CHECKPOINTS: { id: SceneCheckId; label: string }[] = [
  checkpoint("startsRight", "audit.checkpoint.scene.startsRight"),
  checkpoint("described", "audit.checkpoint.scene.described"),
  checkpoint("goalConflict", "audit.checkpoint.scene.goalConflict"),
  checkpoint("shift", "audit.checkpoint.scene.shift"),
  checkpoint("purpose", "audit.checkpoint.scene.purpose"),
  checkpoint("structure", "audit.checkpoint.scene.structure"),
  checkpoint("tension", "audit.checkpoint.scene.tension"),
  checkpoint("paced", "audit.checkpoint.scene.paced"),
  checkpoint("researched", "audit.checkpoint.scene.researched"),
  checkpoint("endsUncertain", "audit.checkpoint.scene.endsUncertain"),
  checkpoint("transitions", "audit.checkpoint.scene.transitions"),
  checkpoint("narratorSwitch", "audit.checkpoint.scene.narratorSwitch"),
  checkpoint("perspective", "audit.checkpoint.scene.perspective"),
  checkpoint("consistent", "audit.checkpoint.scene.consistent"),
];

export const SCENE_CHECK_IDS: SceneCheckId[] = SCENE_CHECKPOINTS.map((c) => c.id);

// --- Story-level (18): project checklist -----------------------------------

export const STORY_CHECKPOINTS: Checkpoint[] = [
  checkpoint("structure", "audit.checkpoint.story.structure"),
  checkpoint("startsRight", "audit.checkpoint.story.startsRight"),
  checkpoint("reveals", "audit.checkpoint.story.reveals"),
  checkpoint("heroGoals", "audit.checkpoint.story.heroGoals"),
  checkpoint("conflict", "audit.checkpoint.story.conflict"),
  checkpoint("stakes", "audit.checkpoint.story.stakes"),
  checkpoint("tension", "audit.checkpoint.story.tension"),
  checkpoint("believable", "audit.checkpoint.story.believable"),
  checkpoint("researched", "audit.checkpoint.story.researched"),
  checkpoint("backstory", "audit.checkpoint.story.backstory"),
  checkpoint("heroComplex", "audit.checkpoint.story.heroComplex"),
  checkpoint("heroTransforms", "audit.checkpoint.story.heroTransforms"),
  checkpoint("sideCharsPurpose", "audit.checkpoint.story.sideCharsPurpose"),
  checkpoint("sideCharsMemorable", "audit.checkpoint.story.sideCharsMemorable"),
  checkpoint("subplots", "audit.checkpoint.story.subplots"),
  checkpoint("worldFleshed", "audit.checkpoint.story.worldFleshed"),
  checkpoint("worldImmersive", "audit.checkpoint.story.worldImmersive"),
  checkpoint("consistent", "audit.checkpoint.story.consistent"),
];

// --- Chapter-level (10): per-chapter checklist (#75) -----------------------
// Stored per chapter under `inkswell.revisionChecklist.chapter[<chapterId>]`
// (see checklist.ts), keyed by the chapter's stable structure id so a rename
// keeps its ticks. Worded as checks a chapter can pass, not a menu of purposes
// that no chapter fulfils all of.

export const CHAPTER_CHECKPOINTS: Checkpoint[] = [
  checkpoint("earnsPlace", "audit.checkpoint.chapter.earnsPlace"),
  checkpoint("hook", "audit.checkpoint.chapter.hook"),
  checkpoint("conflict", "audit.checkpoint.chapter.conflict"),
  checkpoint("advancesPlot", "audit.checkpoint.chapter.advancesPlot"),
  checkpoint("developsCharacter", "audit.checkpoint.chapter.developsCharacter"),
  checkpoint("storyQuestion", "audit.checkpoint.chapter.storyQuestion"),
  checkpoint("setupPayoff", "audit.checkpoint.chapter.setupPayoff"),
  checkpoint("tension", "audit.checkpoint.chapter.tension"),
  checkpoint("paced", "audit.checkpoint.chapter.paced"),
  checkpoint("endsPull", "audit.checkpoint.chapter.endsPull"),
];

// --- Prose-level (5 grouped categories): project checklist -----------------
// (Const names stay PAGE_* and the stored tier id stays "page" for back-compat.)

export const PAGE_GROUPS: CheckpointGroup[] = [
  {
    id: "necessity",
    get label() {
      return t("audit.checkpoint.proseGroup.necessity");
    },
    items: [
      checkpoint("telling", "audit.checkpoint.prose.telling"),
      checkpoint("overDescribing", "audit.checkpoint.prose.overDescribing"),
      checkpoint("preempting", "audit.checkpoint.prose.preempting"),
      checkpoint("internalQuestions", "audit.checkpoint.prose.internalQuestions"),
      checkpoint("adverbs", "audit.checkpoint.prose.adverbs"),
    ],
  },
  {
    id: "paragraphs",
    get label() {
      return t("audit.checkpoint.proseGroup.paragraphs");
    },
    items: [
      checkpoint("repetitiveStructure", "audit.checkpoint.prose.repetitiveStructure"),
      checkpoint("overChoreographed", "audit.checkpoint.prose.overChoreographed"),
      checkpoint("purpleProse", "audit.checkpoint.prose.purpleProse"),
      checkpoint("overusedMetaphor", "audit.checkpoint.prose.overusedMetaphor"),
      checkpoint("passiveVoice", "audit.checkpoint.prose.passiveVoice"),
    ],
  },
  {
    id: "dialogue",
    get label() {
      return t("audit.checkpoint.proseGroup.dialogue");
    },
    items: [
      checkpoint("tagOverload", "audit.checkpoint.prose.tagOverload"),
      checkpoint("repetitiveDialogue", "audit.checkpoint.prose.repetitiveDialogue"),
      checkpoint("flashyTags", "audit.checkpoint.prose.flashyTags"),
      checkpoint("dialogueAdverbs", "audit.checkpoint.prose.dialogueAdverbs"),
      checkpoint("unrealisticDialogue", "audit.checkpoint.prose.unrealisticDialogue"),
      checkpoint("unnecessaryDialogue", "audit.checkpoint.prose.unnecessaryDialogue"),
      checkpoint("disjointedDialogue", "audit.checkpoint.prose.disjointedDialogue"),
    ],
  },
  {
    id: "words",
    get label() {
      return t("audit.checkpoint.proseGroup.words");
    },
    items: [
      checkpoint("overusedWords", "audit.checkpoint.prose.overusedWords"),
      checkpoint("echoes", "audit.checkpoint.prose.echoes"),
      checkpoint("redundantWords", "audit.checkpoint.prose.redundantWords"),
      checkpoint("intensifiers", "audit.checkpoint.prose.intensifiers"),
      checkpoint("mitigators", "audit.checkpoint.prose.mitigators"),
      checkpoint("filterWords", "audit.checkpoint.prose.filterWords"),
      checkpoint("weakWords", "audit.checkpoint.prose.weakWords"),
      checkpoint("nonSpecificWords", "audit.checkpoint.prose.nonSpecificWords"),
      checkpoint("cliches", "audit.checkpoint.prose.cliches"),
      checkpoint("researchWords", "audit.checkpoint.prose.researchWords"),
    ],
  },
  {
    id: "consistency",
    get label() {
      return t("audit.checkpoint.proseGroup.consistency");
    },
    items: [
      checkpoint("namesConsistent", "audit.checkpoint.prose.namesConsistent"),
      checkpoint("descriptionsConsistent", "audit.checkpoint.prose.descriptionsConsistent"),
      checkpoint("actionsConsistent", "audit.checkpoint.prose.actionsConsistent"),
      checkpoint("referencesConsistent", "audit.checkpoint.prose.referencesConsistent"),
      checkpoint("formattingConsistent", "audit.checkpoint.prose.formattingConsistent"),
    ],
  },
];

/** Flatten the page groups to a single ordered id list (for progress totals). */
export const PAGE_CHECK_IDS: string[] = PAGE_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// --- Effective lists (shipped + the writer's Customize overrides) -----------
// Render from THESE, never from the consts above (AGENTS.md gotcha 17): the
// consts are the frozen shipped lists; a writer may have hidden, renamed,
// reordered, or added checkpoints. Hidden items are simply absent here — their
// stored state is untouched and counts toward nothing.

export function sceneCheckpoints(override?: ListOverride): Checkpoint[] {
  return visibleItems(SCENE_CHECKPOINTS, override).map((i) => ({ id: i.id, label: i.label }));
}
export function sceneCheckIds(override?: ListOverride): string[] {
  return sceneCheckpoints(override).map((c) => c.id);
}
export function storyCheckpoints(override?: ListOverride): Checkpoint[] {
  return visibleItems(STORY_CHECKPOINTS, override).map((i) => ({ id: i.id, label: i.label }));
}
export function chapterCheckpoints(override?: ListOverride): Checkpoint[] {
  return visibleItems(CHAPTER_CHECKPOINTS, override).map((i) => ({ id: i.id, label: i.label }));
}
export function pageGroups(override?: ListOverride): CheckpointGroup[] {
  return applyGroupedOverride(PAGE_GROUPS, override)
    .filter((g) => !g.hidden)
    .map((g) => ({
      id: g.id,
      label: g.label,
      items: g.items.filter((i) => !i.hidden).map((i) => ({ id: i.id, label: i.label })),
    }));
}
export function pageCheckIds(override?: ListOverride): string[] {
  return pageGroups(override).flatMap((g) => g.items.map((i) => i.id));
}

// --- Progress math ---------------------------------------------------------

export interface AuditProgress {
  done: number;
  total: number;
}

/** Count how many of `ids` are marked true in `checks`. */
export function auditProgress(
  checks: Partial<Record<string, boolean>> | undefined,
  ids: readonly string[]
): AuditProgress {
  const c = checks ?? {};
  let done = 0;
  for (const id of ids) if (c[id]) done += 1;
  return { done, total: ids.length };
}

export interface SceneAuditRow {
  title: string;
  path: string | null;
  done: number;
  total: number;
  /** True once at least one checkpoint is ticked. */
  audited: boolean;
}

export interface SceneAuditRollup {
  rows: SceneAuditRow[];
  /** Scenes with no checkpoint ticked at all. */
  unaudited: number;
  /** Scenes with every checkpoint ticked. */
  complete: number;
}

/**
 * Summarise per-scene audit state into dashboard rows. Pure: callers read each
 * scene's checks (Obsidian I/O) then pass the plain data in.
 */
export function sceneAuditRollup(
  scenes: { title: string; path: string | null; checks: Partial<Record<string, boolean>> }[],
  /** The effective checkpoint ids (`sceneCheckIds(override)`); shipped by default. */
  ids: readonly string[] = SCENE_CHECK_IDS
): SceneAuditRollup {
  let unaudited = 0;
  let complete = 0;
  const rows: SceneAuditRow[] = scenes.map((s) => {
    const { done, total } = auditProgress(s.checks, ids);
    if (done === 0) unaudited += 1;
    if (done === total) complete += 1;
    return { title: s.title, path: s.path, done, total, audited: done > 0 };
  });
  return { rows, unaudited, complete };
}
