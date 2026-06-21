/**
 * Writing-prompt bank + a pure picker (no Obsidian imports — unit-testable).
 *
 * Each prompt is tagged with a `phase` (draft = generative nudges for the scene
 * you're writing; revise = surgical nudges for prose you already have) and a
 * `category` (POV / dialogue / setting / character / structure / tension /
 * constraint). The Write panel filters on these. A few prompts carry a `{pov}`
 * token that's substituted from the active scene's POV when known — and filtered
 * out when it isn't, so a raw token is never shown.
 */

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
  text: string;
  phase: PromptPhase;
  category: PromptCategory;
}

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
  { id: "pov", label: "POV" },
  { id: "dialogue", label: "Dialogue" },
  { id: "setting", label: "Setting" },
  { id: "character", label: "Character" },
  { id: "structure", label: "Structure" },
  { id: "tension", label: "Tension" },
  { id: "constraint", label: "Constraint" },
];

const POV_TOKEN = /\{pov\}/;

export const WRITING_PROMPTS: WritingPrompt[] = [
  // --- Draft: generative nudges to write the scene -------------------------
  { phase: "draft", category: "pov", text: "Write the scene from the antagonist's point of view." },
  { phase: "draft", category: "tension", text: "Your character receives a message they were never meant to see." },
  { phase: "draft", category: "structure", text: "Start the next scene in the middle of an argument." },
  { phase: "draft", category: "setting", text: "Describe the setting using only sound and smell." },
  { phase: "draft", category: "character", text: "Give your character exactly what they want — then show the cost." },
  { phase: "draft", category: "character", text: "Two characters who never speak are forced to cooperate." },
  { phase: "draft", category: "constraint", text: "Write 200 words where nothing is explained." },
  { phase: "draft", category: "tension", text: "A long-held secret slips out at the worst possible moment." },
  { phase: "draft", category: "structure", text: "End the scene on a question your character can't answer." },
  { phase: "draft", category: "structure", text: "Introduce an object that will matter much later." },
  { phase: "draft", category: "character", text: "Your character lies. Show why the reader should believe them anyway." },
  { phase: "draft", category: "tension", text: "Strand two characters somewhere they can't leave." },
  { phase: "draft", category: "tension", text: "Write the moment everything was going right — just before it isn't." },
  { phase: "draft", category: "character", text: "A minor character makes a choice that changes the protagonist's path." },
  { phase: "draft", category: "setting", text: "Describe a place your character is afraid to return to." },
  { phase: "draft", category: "dialogue", text: "Open with a line of dialogue and no attribution." },
  { phase: "draft", category: "character", text: "Your character breaks a promise. Don't let them off easy." },
  { phase: "draft", category: "pov", text: "Write the scene as a memory the narrator isn't sure is real." },
  { phase: "draft", category: "tension", text: "Someone arrives who should be dead." },
  { phase: "draft", category: "structure", text: "Cut to the consequence and reveal the cause later." },
  { phase: "draft", category: "constraint", text: "Rewrite the last paragraph you wrote with no adjectives." },
  { phase: "draft", category: "character", text: "Let your character be wrong about something they're certain of." },
  { phase: "draft", category: "dialogue", text: "Write a scene where the most important thing is left unsaid." },
  { phase: "draft", category: "character", text: "Give a quiet character the floor for a full page." },
  { phase: "draft", category: "structure", text: "Start in the wrong place on purpose, then find the real opening." },
  { phase: "draft", category: "constraint", text: "Show your character's mood without naming a single emotion." },
  { phase: "draft", category: "tension", text: "Put two people who love each other on opposite sides of one decision." },
  { phase: "draft", category: "dialogue", text: "Write the argument both characters think they're winning." },
  { phase: "draft", category: "setting", text: "Describe the room by what's missing from it." },
  { phase: "draft", category: "character", text: "Have your character do the kind thing for the wrong reason." },
  { phase: "draft", category: "structure", text: "End the chapter one line earlier than feels comfortable." },
  { phase: "draft", category: "constraint", text: "Write the scene in real time — no summary, no skipping ahead." },
  { phase: "draft", category: "tension", text: "Let a character interrupt the moment the reader most wants to hear." },
  { phase: "draft", category: "character", text: "Give your protagonist a small, petty victory." },
  { phase: "draft", category: "dialogue", text: "Write a conversation where neither person says what they mean." },
  { phase: "draft", category: "setting", text: "Introduce a rule of your world by having someone break it." },
  { phase: "draft", category: "setting", text: "Make the weather disagree with the scene's emotion." },
  { phase: "draft", category: "tension", text: "Have your character notice the one detail that changes everything." },
  { phase: "draft", category: "dialogue", text: "Write the goodbye neither character admits is a goodbye." },
  { phase: "draft", category: "character", text: "Take something from your character they didn't value until it's gone." },
  { phase: "draft", category: "structure", text: "Open the scene with an action already in progress." },
  { phase: "draft", category: "setting", text: "Let the setting do the work the dialogue usually does." },
  { phase: "draft", category: "constraint", text: "Write a flashback in a single sentence." },
  { phase: "draft", category: "character", text: "Have a character lie to protect someone who doesn't deserve it." },
  { phase: "draft", category: "structure", text: "Show the cost of the last victory before granting the next one." },
  { phase: "draft", category: "character", text: "Write the scene your character has been avoiding." },
  { phase: "draft", category: "character", text: "Let a trusted character give bad advice in good faith." },
  { phase: "draft", category: "pov", text: "Describe a face as someone in love would, then as an enemy would." },
  { phase: "draft", category: "tension", text: "Put a clock on the scene — something that runs out." },
  { phase: "draft", category: "character", text: "Write the first thing your character does when they're finally alone." },
  { phase: "draft", category: "pov", text: "Rewrite this beat from a POV other than {pov}." },
  { phase: "draft", category: "pov", text: "Show this scene through what {pov} refuses to look at." },

  // --- Revise: surgical nudges for prose you already have -------------------
  { phase: "revise", category: "constraint", text: "Cut your favorite line in this scene. Does the scene survive without it?" },
  { phase: "revise", category: "constraint", text: "Find the sentence you're hiding behind and delete it." },
  { phase: "revise", category: "constraint", text: "Read the scene aloud and mark every place you stumble." },
  { phase: "revise", category: "structure", text: "Delete the first paragraph. Does the scene start stronger?" },
  { phase: "revise", category: "constraint", text: "Highlight every adverb; cut the ones the verb already implies." },
  { phase: "revise", category: "dialogue", text: "Find a line of dialogue that explains a feeling and replace it with an action." },
  { phase: "revise", category: "structure", text: "Locate the scene's turning point and move it earlier." },
  { phase: "revise", category: "structure", text: "Cut the scene's last line and write three new ones; keep the best." },
  { phase: "revise", category: "constraint", text: "Find a place you told the reader how to feel and let them decide instead." },
  { phase: "revise", category: "character", text: "Trace one character's want through the scene. If it's unclear, sharpen it." },
  { phase: "revise", category: "constraint", text: "Replace the strongest adjective with a more precise noun." },
  { phase: "revise", category: "constraint", text: "Find a 'very', 'really', 'just', or 'quite' and delete it." },
  { phase: "revise", category: "constraint", text: "Where two sentences say the same thing, keep only the sharper one." },
  { phase: "revise", category: "pov", text: "Cut anything in this scene that {pov} couldn't see, hear, or know." },
  { phase: "revise", category: "constraint", text: "Find the longest sentence and break it where the reader breathes." },
  { phase: "revise", category: "constraint", text: "Locate a passive construction and decide whether the actor matters." },
  { phase: "revise", category: "dialogue", text: "Cut every stage direction the dialogue already implies (he nodded, she smiled)." },
  { phase: "revise", category: "structure", text: "Find a paragraph of backstory and try moving it later — or cutting it." },
  { phase: "revise", category: "setting", text: "Mark every sense you used. If it's only sight, add one more." },
  { phase: "revise", category: "tension", text: "Find where tension peaks and make sure nothing after it sags." },
  { phase: "revise", category: "character", text: "Cut a character from this scene. Can another carry their lines?" },
  { phase: "revise", category: "constraint", text: "Find a metaphor that's doing nothing and replace or remove it." },
  { phase: "revise", category: "dialogue", text: "Read only the dialogue. Can you tell who's speaking without the tags?" },
  { phase: "revise", category: "structure", text: "Find the scene's central question and make sure it's still open at the end." },
  { phase: "revise", category: "constraint", text: "Find a line that flatters your prose more than it serves the scene, and cut it." },
  { phase: "revise", category: "structure", text: "Tighten the scene's opening to half its current length." },
  { phase: "revise", category: "structure", text: "Find a key moment you summarized and dramatize it instead." },
  { phase: "revise", category: "constraint", text: "Check the scene's verbs; replace three weak ones with exact ones." },
  { phase: "revise", category: "constraint", text: "Find an emotion you named and rewrite it as behavior." },
  { phase: "revise", category: "structure", text: "Where the pacing drags, cut the transitions and jump-cut between beats." },
  { phase: "revise", category: "setting", text: "Find a description that stops the action and weave it into movement." },
  { phase: "revise", category: "character", text: "Make sure every character wants something here — even the silent one." },
  { phase: "revise", category: "dialogue", text: "Find dialogue that's too on-the-nose and bury the point in subtext." },
  { phase: "revise", category: "tension", text: "Find a coincidence that helps your character and make them earn it instead." },
  { phase: "revise", category: "constraint", text: "Cut the explanation that follows the joke, the reveal, or the gut-punch." },
  { phase: "revise", category: "setting", text: "Check the setting against the mood and cut details that fight it." },
  { phase: "revise", category: "constraint", text: "Find a word repeated within a paragraph and vary it — or own the repetition." },
  { phase: "revise", category: "structure", text: "Trace time through the scene and fix any moment the clock skips or stalls." },
  { phase: "revise", category: "dialogue", text: "Find your weakest line of dialogue and give it to a better character." },
  { phase: "revise", category: "structure", text: "Make the entrance and exit of the scene land harder than the middle." },
  { phase: "revise", category: "pov", text: "Cut any detail the POV character wouldn't actually notice in this moment." },
  { phase: "revise", category: "pov", text: "Look at what {pov} notices first; let it reveal their state of mind." },
  { phase: "revise", category: "constraint", text: "Find a sentence the reader will skim, and earn their attention back." },
  { phase: "revise", category: "structure", text: "Find where two beats blur together and put white space between them." },
  { phase: "revise", category: "constraint", text: "Cut one modifier from every sentence on this page; restore only what you miss." },
  { phase: "revise", category: "constraint", text: "Find where the scene states its theme aloud and trust the reader instead." },
  { phase: "revise", category: "structure", text: "Make sure the strongest image lands last, not first." },
  { phase: "revise", category: "character", text: "Find a missing reaction and add the beat where the character feels it." },
  { phase: "revise", category: "character", text: "Read the scene as the antagonist; cut anything that makes them a cartoon." },
  { phase: "revise", category: "dialogue", text: "Cut filler dialogue ('hello', 'okay', 'I see') down to the live wire." },
  { phase: "revise", category: "structure", text: "Find the line you'd quote to a friend, and make sure the scene builds to it." },
];

/** Replace the `{pov}` token; falls back to a generic phrase when POV is unknown. */
function resolveText(text: string, pov?: string | null): string {
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
  rng: () => number = Math.random
): PickedPrompt | null {
  const hasPov = !!(q.pov && q.pov.trim());
  let pool = WRITING_PROMPTS.filter((p) => p.phase === q.phase);
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
