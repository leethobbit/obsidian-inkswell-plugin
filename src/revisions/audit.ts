/**
 * Pure revision-checkpoint definitions and progress math (no Obsidian imports —
 * unit-testable). Implements a three-tier revision method, macro→micro: Story →
 * Scene → Prose, each tier a master checklist.
 *
 * - SCENE checkpoints are per-scene state (stored in scene frontmatter; see
 *   `audit-meta.ts`). The 14 checks below are the scene-level pass.
 * - STORY (18) and PROSE (5 grouped categories) checkpoints are project-level state
 *   (stored under `inkswell.revisionChecklist`; see `checklist.ts`). The prose tier
 *   keeps the internal id/const name "page" for back-compat — only its label changed.
 *
 * IDs are stable string constants: stored data keys off them, so labels can be
 * reworded without migrating frontmatter.
 */

export interface Checkpoint {
  id: string;
  label: string;
}

export interface CheckpointGroup {
  id: string;
  label: string;
  items: Checkpoint[];
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
  { id: "startsRight", label: "Starts in the right place" },
  { id: "described", label: "Described effectively" },
  { id: "goalConflict", label: "Has a goal and conflict" },
  { id: "shift", label: "Has a shift (something changes)" },
  { id: "purpose", label: "Has a clear purpose" },
  { id: "structure", label: "Has a solid structure" },
  { id: "tension", label: "Has enough tension" },
  { id: "paced", label: "Balanced and well-paced" },
  { id: "researched", label: "Well-researched" },
  { id: "endsUncertain", label: "Ends with a sense of uncertainty" },
  { id: "transitions", label: "Transitions seamlessly between scenes" },
  { id: "narratorSwitch", label: "Switches narrators seamlessly (multi-POV)" },
  { id: "perspective", label: "Told from the right perspective (multi-POV)" },
  { id: "consistent", label: "Consistent" },
];

export const SCENE_CHECK_IDS: SceneCheckId[] = SCENE_CHECKPOINTS.map((c) => c.id);

// --- Story-level (18): project checklist -----------------------------------

export const STORY_CHECKPOINTS: Checkpoint[] = [
  { id: "structure", label: "Has a solid structure" },
  { id: "startsRight", label: "Starts in the right place" },
  { id: "reveals", label: "Reveals information in an engaging way" },
  { id: "heroGoals", label: "Hero has clear goals & believable motivations throughout" },
  { id: "conflict", label: "Has enough conflict" },
  { id: "stakes", label: "Has enough at stake" },
  { id: "tension", label: "Has enough tension" },
  { id: "believable", label: "Is believable" },
  { id: "researched", label: "Is well-researched" },
  { id: "backstory", label: "Hero has a complete, compelling backstory" },
  { id: "heroComplex", label: "Hero is unique and complex" },
  { id: "heroTransforms", label: "Hero transforms" },
  { id: "sideCharsPurpose", label: "Side characters & villains serve a purpose" },
  { id: "sideCharsMemorable", label: "Side characters are memorable" },
  { id: "subplots", label: "Subplots serve the story" },
  { id: "worldFleshed", label: "The world is fleshed out" },
  { id: "worldImmersive", label: "The world is immersive" },
  { id: "consistent", label: "Is consistent" },
];

// --- Prose-level (5 grouped categories): project checklist -----------------
// (Const names stay PAGE_* and the stored tier id stays "page" for back-compat.)

export const PAGE_GROUPS: CheckpointGroup[] = [
  {
    id: "necessity",
    label: "Is everything necessary?",
    items: [
      { id: "telling", label: "Telling (vs showing)" },
      { id: "overDescribing", label: "Over-describing" },
      { id: "preempting", label: "Preempting the narrative" },
      { id: "internalQuestions", label: "Internal questions" },
      { id: "adverbs", label: "Adverbs" },
    ],
  },
  {
    id: "paragraphs",
    label: "Are my paragraphs as strong as they can be?",
    items: [
      { id: "repetitiveStructure", label: "Repetitive sentence structure" },
      { id: "overChoreographed", label: "Over-choreographed action" },
      { id: "purpleProse", label: "Purple prose" },
      { id: "overusedMetaphor", label: "Overused metaphors / similes" },
      { id: "passiveVoice", label: "Passive voice" },
    ],
  },
  {
    id: "dialogue",
    label: "Is my dialogue compelling?",
    items: [
      { id: "tagOverload", label: "Tag overload" },
      { id: "repetitiveDialogue", label: "Repetitive dialogue" },
      { id: "flashyTags", label: "Flashy tags" },
      { id: "dialogueAdverbs", label: "Adverb overkill" },
      { id: "unrealisticDialogue", label: "Unrealistic dialogue (info-dump / on-the-nose)" },
      { id: "unnecessaryDialogue", label: "Unnecessary dialogue" },
      { id: "disjointedDialogue", label: "Disjointed dialogue" },
    ],
  },
  {
    id: "words",
    label: "Am I using the best words?",
    items: [
      { id: "overusedWords", label: "Overused words" },
      { id: "echoes", label: "Echoes" },
      { id: "redundantWords", label: "Redundant words" },
      { id: "intensifiers", label: "Intensifiers" },
      { id: "mitigators", label: "Mitigators" },
      { id: "filterWords", label: "Filter words" },
      { id: "weakWords", label: "Weak words" },
      { id: "nonSpecificWords", label: "Non-specific words" },
      { id: "cliches", label: "Clichés" },
      { id: "researchWords", label: "Words requiring research" },
    ],
  },
  {
    id: "consistency",
    label: "Is the prose consistent?",
    items: [
      { id: "namesConsistent", label: "Names" },
      { id: "descriptionsConsistent", label: "Descriptions" },
      { id: "actionsConsistent", label: "Actions" },
      { id: "referencesConsistent", label: "References" },
      { id: "formattingConsistent", label: "Formatting" },
    ],
  },
];

/** Flatten the page groups to a single ordered id list (for progress totals). */
export const PAGE_CHECK_IDS: string[] = PAGE_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// --- Progress math ---------------------------------------------------------

export interface AuditProgress {
  done: number;
  total: number;
}

/** Count how many of `ids` are marked true in `checks`. */
export function auditProgress(
  checks: Partial<Record<string, boolean>> | undefined,
  ids: string[]
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
  scenes: { title: string; path: string | null; checks: Partial<Record<string, boolean>> }[]
): SceneAuditRollup {
  let unaudited = 0;
  let complete = 0;
  const rows: SceneAuditRow[] = scenes.map((s) => {
    const { done, total } = auditProgress(s.checks, SCENE_CHECK_IDS);
    if (done === 0) unaudited += 1;
    if (done === total) complete += 1;
    return { title: s.title, path: s.path, done, total, audited: done > 0 };
  });
  return { rows, unaudited, complete };
}
