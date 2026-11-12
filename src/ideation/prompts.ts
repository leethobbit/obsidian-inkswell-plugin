/**
 * Writing-prompt bank + a pure picker (no Obsidian imports — unit-testable).
 *
 * Each prompt is tagged with a `phase` (draft = generative nudges for the scene
 * you're writing; revise = surgical nudges for prose you already have) and a
 * `category` (POV / dialogue / setting / character / structure / tension /
 * constraint). The Write panel filters on these. A few prompts carry a `{pov}`
 * token that's substituted from the active scene's POV when known — and filtered
 * out when it isn't, so a raw token is never shown.
 *
 * Localization: the English `text` below is DATA. It feeds the id hash, so it
 * must never be translated or reworded here. Display text for a shipped prompt
 * comes from the catalog (`prompt.<id>` in src/i18n/locales/en/ideation.ts) via
 * {@link shippedPromptText}; a writer's own or renamed prompt is shown as typed.
 */

import { ListOverride, visibleItems } from "../lib/list-override";
import { MessageKey, isMessageKey, t } from "../i18n";

export type PromptPhase = "draft" | "revise";
export type PromptCategory =
  | "pov"
  | "dialogue"
  | "setting"
  | "character"
  | "structure"
  | "tension"
  | "constraint";

export interface WritingPrompt {
  /** Stable id: `p` + FNV-1a hash of `phase|category|text` unless set explicitly.
   *  Customize hides/adds prompts by id, so rewording a shipped prompt changes
   *  its id (un-hides it) — set an explicit id in PROMPT_ROWS when rewording. */
  id: string;
  text: string;
  phase: PromptPhase;
  category: PromptCategory;
}

/** List-specific fields a custom prompt carries (see settings/overridable-lists). */
export type PromptExtra = { phase: PromptPhase; category: PromptCategory };

type PromptSource = Omit<WritingPrompt, "id"> & { id?: string };

/** FNV-1a 32-bit, as 8 hex chars — deterministic and order-independent. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The content-derived id for a prompt. */
export function promptId(p: { phase: PromptPhase; category: PromptCategory; text: string }): string {
  return `p${fnv1a(`${p.phase}|${p.category}|${p.text}`)}`;
}

export interface PromptCategoryDef {
  id: PromptCategory;
  labelKey: MessageKey;
  /** Display label, translated on each read (never at import). */
  readonly label: string;
}

function category(id: PromptCategory, labelKey: MessageKey): PromptCategoryDef {
  return {
    id,
    labelKey,
    get label() {
      return t(labelKey);
    },
  };
}

export const PROMPT_CATEGORIES: PromptCategoryDef[] = [
  category("pov", "prompt.category.pov"),
  category("dialogue", "prompt.category.dialogue"),
  category("setting", "prompt.category.setting"),
  category("character", "prompt.category.character"),
  category("structure", "prompt.category.structure"),
  category("tension", "prompt.category.tension"),
  category("constraint", "prompt.category.constraint"),
];

const POV_TOKEN = /\{pov\}/;

/** `[phase, category, English text, explicit id?]`. The text is the id's hash
 *  input (data, never translated here); display text is `prompt.<id>` in the
 *  catalog. Reword a shipped prompt only with its old id as the 4th element. */
type PromptRow = readonly [PromptPhase, PromptCategory, string, string?];

const PROMPT_ROWS: PromptRow[] = [
  // --- Draft: generative nudges to write the scene -------------------------
  ["draft", "pov", "Write the scene from the antagonist's point of view."],
  ["draft", "tension", "Your character receives a message they were never meant to see."],
  ["draft", "structure", "Start the next scene in the middle of an argument."],
  ["draft", "setting", "Describe the setting using only sound and smell."],
  ["draft", "character", "Give your character exactly what they want — then show the cost."],
  ["draft", "character", "Two characters who never speak are forced to cooperate."],
  ["draft", "constraint", "Write 200 words where nothing is explained."],
  ["draft", "tension", "A long-held secret slips out at the worst possible moment."],
  ["draft", "structure", "End the scene on a question your character can't answer."],
  ["draft", "structure", "Introduce an object that will matter much later."],
  ["draft", "character", "Your character lies. Show why the reader should believe them anyway."],
  ["draft", "tension", "Strand two characters somewhere they can't leave."],
  ["draft", "tension", "Write the moment everything was going right — just before it isn't."],
  ["draft", "character", "A minor character makes a choice that changes the protagonist's path."],
  ["draft", "setting", "Describe a place your character is afraid to return to."],
  ["draft", "dialogue", "Open with a line of dialogue and no attribution."],
  ["draft", "character", "Your character breaks a promise. Don't let them off easy."],
  ["draft", "pov", "Write the scene as a memory the narrator isn't sure is real."],
  ["draft", "tension", "Someone arrives who should be dead."],
  ["draft", "structure", "Cut to the consequence and reveal the cause later."],
  ["draft", "constraint", "Rewrite the last paragraph you wrote with no adjectives."],
  ["draft", "character", "Let your character be wrong about something they're certain of."],
  ["draft", "dialogue", "Write a scene where the most important thing is left unsaid."],
  ["draft", "character", "Give a quiet character the floor for a full page."],
  ["draft", "structure", "Start in the wrong place on purpose, then find the real opening."],
  ["draft", "constraint", "Show your character's mood without naming a single emotion."],
  ["draft", "tension", "Put two people who love each other on opposite sides of one decision."],
  ["draft", "dialogue", "Write the argument both characters think they're winning."],
  ["draft", "setting", "Describe the room by what's missing from it."],
  ["draft", "character", "Have your character do the kind thing for the wrong reason."],
  ["draft", "structure", "End the chapter one line earlier than feels comfortable."],
  ["draft", "constraint", "Write the scene in real time — no summary, no skipping ahead."],
  ["draft", "tension", "Let a character interrupt the moment the reader most wants to hear."],
  ["draft", "character", "Give your protagonist a small, petty victory."],
  ["draft", "dialogue", "Write a conversation where neither person says what they mean."],
  ["draft", "setting", "Introduce a rule of your world by having someone break it."],
  ["draft", "setting", "Make the weather disagree with the scene's emotion."],
  ["draft", "tension", "Have your character notice the one detail that changes everything."],
  ["draft", "dialogue", "Write the goodbye neither character admits is a goodbye."],
  ["draft", "character", "Take something from your character they didn't value until it's gone."],
  ["draft", "structure", "Open the scene with an action already in progress."],
  ["draft", "setting", "Let the setting do the work the dialogue usually does."],
  ["draft", "constraint", "Write a flashback in a single sentence."],
  ["draft", "character", "Have a character lie to protect someone who doesn't deserve it."],
  ["draft", "structure", "Show the cost of the last victory before granting the next one."],
  ["draft", "character", "Write the scene your character has been avoiding."],
  ["draft", "character", "Let a trusted character give bad advice in good faith."],
  ["draft", "pov", "Describe a face as someone in love would, then as an enemy would."],
  ["draft", "tension", "Put a clock on the scene — something that runs out."],
  ["draft", "character", "Write the first thing your character does when they're finally alone."],
  ["draft", "pov", "Rewrite this beat from a POV other than {pov}."],
  ["draft", "pov", "Show this scene through what {pov} refuses to look at."],

  // --- Revise: surgical nudges for prose you already have -------------------
  ["revise", "constraint", "Cut your favorite line in this scene. Does the scene survive without it?"],
  ["revise", "constraint", "Find the sentence you're hiding behind and delete it."],
  ["revise", "constraint", "Read the scene aloud and mark every place you stumble."],
  ["revise", "structure", "Delete the first paragraph. Does the scene start stronger?"],
  ["revise", "constraint", "Highlight every adverb; cut the ones the verb already implies."],
  ["revise", "dialogue", "Find a line of dialogue that explains a feeling and replace it with an action."],
  ["revise", "structure", "Locate the scene's turning point and move it earlier."],
  ["revise", "structure", "Cut the scene's last line and write three new ones; keep the best."],
  ["revise", "constraint", "Find a place you told the reader how to feel and let them decide instead."],
  ["revise", "character", "Trace one character's want through the scene. If it's unclear, sharpen it."],
  ["revise", "constraint", "Replace the strongest adjective with a more precise noun."],
  ["revise", "constraint", "Find a 'very', 'really', 'just', or 'quite' and delete it."],
  ["revise", "constraint", "Where two sentences say the same thing, keep only the sharper one."],
  ["revise", "pov", "Cut anything in this scene that {pov} couldn't see, hear, or know."],
  ["revise", "constraint", "Find the longest sentence and break it where the reader breathes."],
  ["revise", "constraint", "Locate a passive construction and decide whether the actor matters."],
  ["revise", "dialogue", "Cut every stage direction the dialogue already implies (he nodded, she smiled)."],
  ["revise", "structure", "Find a paragraph of backstory and try moving it later — or cutting it."],
  ["revise", "setting", "Mark every sense you used. If it's only sight, add one more."],
  ["revise", "tension", "Find where tension peaks and make sure nothing after it sags."],
  ["revise", "character", "Cut a character from this scene. Can another carry their lines?"],
  ["revise", "constraint", "Find a metaphor that's doing nothing and replace or remove it."],
  ["revise", "dialogue", "Read only the dialogue. Can you tell who's speaking without the tags?"],
  ["revise", "structure", "Find the scene's central question and make sure it's still open at the end."],
  ["revise", "constraint", "Find a line that flatters your prose more than it serves the scene, and cut it."],
  ["revise", "structure", "Tighten the scene's opening to half its current length."],
  ["revise", "structure", "Find a key moment you summarized and dramatize it instead."],
  ["revise", "constraint", "Check the scene's verbs; replace three weak ones with exact ones."],
  ["revise", "constraint", "Find an emotion you named and rewrite it as behavior."],
  ["revise", "structure", "Where the pacing drags, cut the transitions and jump-cut between beats."],
  ["revise", "setting", "Find a description that stops the action and weave it into movement."],
  ["revise", "character", "Make sure every character wants something here — even the silent one."],
  ["revise", "dialogue", "Find dialogue that's too on-the-nose and bury the point in subtext."],
  ["revise", "tension", "Find a coincidence that helps your character and make them earn it instead."],
  ["revise", "constraint", "Cut the explanation that follows the joke, the reveal, or the gut-punch."],
  ["revise", "setting", "Check the setting against the mood and cut details that fight it."],
  ["revise", "constraint", "Find a word repeated within a paragraph and vary it — or own the repetition."],
  ["revise", "structure", "Trace time through the scene and fix any moment the clock skips or stalls."],
  ["revise", "dialogue", "Find your weakest line of dialogue and give it to a better character."],
  ["revise", "structure", "Make the entrance and exit of the scene land harder than the middle."],
  ["revise", "pov", "Cut any detail the POV character wouldn't actually notice in this moment."],
  ["revise", "pov", "Look at what {pov} notices first; let it reveal their state of mind."],
  ["revise", "constraint", "Find a sentence the reader will skim, and earn their attention back."],
  ["revise", "structure", "Find where two beats blur together and put white space between them."],
  ["revise", "constraint", "Cut one modifier from every sentence on this page; restore only what you miss."],
  ["revise", "constraint", "Find where the scene states its theme aloud and trust the reader instead."],
  ["revise", "structure", "Make sure the strongest image lands last, not first."],
  ["revise", "character", "Find a missing reaction and add the beat where the character feels it."],
  ["revise", "character", "Read the scene as the antagonist; cut anything that makes them a cartoon."],
  ["revise", "dialogue", "Cut filler dialogue ('hello', 'okay', 'I see') down to the live wire."],
  ["revise", "structure", "Find the line you'd quote to a friend, and make sure the scene builds to it."],
];

const PROMPT_SOURCE: PromptSource[] = PROMPT_ROWS.map(([phase, category, text, id]) =>
  id ? { phase, category, text, id } : { phase, category, text }
);

/** The shipped prompt bank with stable ids (never render from this directly —
 *  use {@link writingPrompts} so Customize's hides/additions apply and the text
 *  is translated; `text` here is the English source the id is hashed from). */
export const WRITING_PROMPTS: WritingPrompt[] = PROMPT_SOURCE.map((p) => ({
  ...p,
  id: p.id ?? promptId(p),
}));

/**
 * Display text for a shipped prompt id: its catalog entry (`prompt.<id>`), or
 * `fallback` (the English source text) when the id has none. Never call this
 * for a writer's own prompt — user text is shown exactly as typed.
 */
export function shippedPromptText(id: string, fallback: string): string {
  const key = `prompt.${id}`;
  return isMessageKey(key) ? t(key) : fallback;
}

/**
 * The effective prompt bank: shipped prompts minus hidden ones (a renamed
 * shipped prompt shows its new text), plus the writer's own. Shipped prompts the
 * writer hasn't renamed carry their translated display text.
 */
export function writingPrompts(override?: ListOverride<PromptExtra>): WritingPrompt[] {
  const shipped = WRITING_PROMPTS.map((p) => ({
    id: p.id,
    label: p.text,
    phase: p.phase,
    category: p.category,
  }));
  return visibleItems(shipped, override).map((i) => ({
    id: i.id,
    text: !i.custom && i.label === i.shippedLabel ? shippedPromptText(i.id, i.label) : i.label,
    phase: i.extra.phase,
    category: i.extra.category,
  }));
}

/** Replace the `{pov}` token; falls back to a generic phrase when POV is unknown. */
function resolveText(text: string, pov?: string | null): string {
  // Unreachable in the UI: pickPrompt drops {pov} prompts when POV is unknown.
  const name = pov && pov.trim() ? pov.trim() : "your POV character";
  return text.replace(/\{pov\}/g, name);
}

export interface PromptQuery {
  phase: PromptPhase;
  /** null/undefined = any category. */
  category?: PromptCategory | null;
  /** Active scene's POV, if known — fills `{pov}` prompts (else they're skipped). */
  pov?: string | null;
  /** Resolved text of the currently shown prompt, to avoid repeating it. */
  exclude?: string | null;
}

export interface PickedPrompt {
  prompt: WritingPrompt;
  /** Display text with `{pov}` already substituted. */
  text: string;
}

/**
 * Pick a prompt matching the query, with `{pov}` resolved. Returns null when no
 * prompt matches (e.g. a category with only `{pov}` prompts and no POV context).
 */
export function pickPrompt(
  q: PromptQuery,
  rng: () => number = Math.random,
  bank: readonly WritingPrompt[] = writingPrompts()
): PickedPrompt | null {
  const hasPov = !!(q.pov && q.pov.trim());
  let pool = bank.filter((p) => p.phase === q.phase);
  if (q.category) pool = pool.filter((p) => p.category === q.category);
  // Without POV context we can't fill {pov} prompts, so drop them.
  if (!hasPov) pool = pool.filter((p) => !POV_TOKEN.test(p.text));
  if (pool.length === 0) return null;

  let candidates = pool;
  if (q.exclude && pool.length > 1) {
    const filtered = pool.filter((p) => resolveText(p.text, q.pov) !== q.exclude);
    if (filtered.length > 0) candidates = filtered;
  }
  const prompt = candidates[Math.floor(rng() * candidates.length)];
  return { prompt, text: resolveText(prompt.text, q.pov) };
}
