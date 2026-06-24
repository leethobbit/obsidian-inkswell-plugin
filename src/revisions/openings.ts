/**
 * Pure scene-opening classifier (no Obsidian imports — unit-testable). Implements
 * the Reviser's Workbook "scene openings variety" diagnostic: classify how each
 * scene opens (action / dialogue / thought / reflection) and flag stretches of
 * consecutive scenes that open the same way.
 *
 * HONESTY: this is a coarse heuristic on the first prose line, not NLP. It's good
 * enough to surface "you've opened five scenes in a row with dialogue", but it will
 * misclassify — which is why the result is overridable per scene (`revOpening`).
 */

import { stripMarkdown } from "../lib/wordcount";

export type OpeningType = "dialogue" | "action" | "thought" | "reflection" | "unknown";

export const OPENING_TYPES: OpeningType[] = [
  "action",
  "dialogue",
  "thought",
  "reflection",
  "unknown",
];

export const OPENING_LABEL: Record<OpeningType, string> = {
  action: "Action",
  dialogue: "Dialogue",
  thought: "Thought",
  reflection: "Reflection",
  unknown: "—",
};

// A small bank of physical/motion verbs. Presence early in the first sentence is
// the (rough) signal for an action opening.
const ACTION_VERBS = [
  "ran", "run", "walk", "walked", "grab", "grabbed", "slam", "slammed", "turn",
  "turned", "open", "opened", "threw", "throw", "push", "pushed", "pull", "pulled",
  "kick", "kicked", "jump", "jumped", "rush", "rushed", "strode", "stride", "burst",
  "sprint", "sprinted", "reached", "reach", "seized", "lunged", "swung", "slipped",
  "climbed", "raced", "dashed", "shoved", "yanked", "hauled", "crashed", "stumbled",
  "ducked", "leapt", "leaped", "spun", "whirled", "snatched", "hurled", "fled",
  "stepped", "knocked", "shut", "slammed", "dragged", "tossed", "flung", "darted",
];

const ACTION_RE = new RegExp(`\\b(${ACTION_VERBS.join("|")})\\b`, "i");

/** First non-blank, non-heading line of a scene body (markdown markers intact). */
function firstProseLine(body: string): string {
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) continue; // skip a heading (e.g. scene title)
    if (/^[-*+]\s/.test(line)) continue; // skip a bullet
    return line;
  }
  return "";
}

/** Classify how a scene opens from its body text. */
export function classifyOpening(body: string): OpeningType {
  // Drop frontmatter/code/comments but keep emphasis + quote markers.
  const line = firstProseLine(stripMarkdown(body));
  if (!line) return "unknown";
  if (/^["“”'‘’«»]/.test(line)) return "dialogue";
  // Leading italics (single * or _, not a bullet, not bold) reads as interiority.
  if (/^_(?!_)\S/.test(line) || /^\*(?!\*)(?!\s)/.test(line)) return "thought";
  const firstSentence = line.split(/(?<=[.!?])\s/)[0];
  if (ACTION_RE.test(firstSentence)) return "action";
  return "reflection";
}

export interface OpeningRun {
  type: OpeningType;
  /** Index of the first scene in the run. */
  start: number;
  /** Number of consecutive scenes sharing the type. */
  length: number;
}

/**
 * Find runs of `minRun`+ consecutive scenes that open with the same type
 * (ignoring `unknown`). These are the "vary your openings" warnings.
 */
export function flagOpeningRuns(seq: OpeningType[], minRun = 2): OpeningRun[] {
  const runs: OpeningRun[] = [];
  let i = 0;
  while (i < seq.length) {
    let j = i + 1;
    while (j < seq.length && seq[j] === seq[i]) j++;
    const length = j - i;
    if (length >= minRun && seq[i] !== "unknown") {
      runs.push({ type: seq[i], start: i, length });
    }
    i = j;
  }
  return runs;
}
