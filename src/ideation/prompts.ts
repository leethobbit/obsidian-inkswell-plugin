/** A small bank of writing prompts to break through a stall (shown in Write). */

export const WRITING_PROMPTS: string[] = [
  "Write the scene from the antagonist's point of view.",
  "Your character receives a message they were never meant to see.",
  "Start the next scene in the middle of an argument.",
  "Describe the setting using only sound and smell.",
  "Give your character exactly what they want — then show the cost.",
  "Two characters who never speak are forced to cooperate.",
  "Write 200 words where nothing is explained.",
  "A long-held secret slips out at the worst possible moment.",
  "End the scene on a question your character can't answer.",
  "Introduce an object that will matter much later.",
  "Your character lies. Show why the reader should believe them anyway.",
  "Strand two characters somewhere they can't leave.",
  "Write the moment everything was going right — just before it isn't.",
  "A minor character makes a choice that changes the protagonist's path.",
  "Describe a place your character is afraid to return to.",
  "Open with a line of dialogue and no attribution.",
  "Your character breaks a promise. Don't let them off easy.",
  "Write the scene as a memory the narrator isn't sure is real.",
  "Someone arrives who should be dead.",
  "Cut to the consequence and reveal the cause later.",
];

/** Return a random prompt, avoiding `exclude` when possible. */
export function randomPrompt(exclude?: string): string {
  if (WRITING_PROMPTS.length === 0) return "";
  const pool =
    exclude && WRITING_PROMPTS.length > 1
      ? WRITING_PROMPTS.filter((p) => p !== exclude)
      : WRITING_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
