/**
 * Pure side-character roster logic (no Obsidian imports — unit-testable).
 * Implements a "side character roster": each side character
 * should serve a narrative function, have a goal + flaw, and a memorable "thing".
 * The panel reads codex character fields + scene-appearance counts and passes the
 * assembled entries here for gap-flagging.
 */

/** The nine narrative functions a side character can serve. */
export const SIDE_ROLES: string[] = [
  "Helps the hero grow",
  "Stands in the hero's way",
  "Pushes the hero's buttons",
  "Shows the dark side of the hero's flaws",
  "Mirrors the hero's flaws",
  "Assists with the hero's goals",
  "Pushes the hero out of their comfort zone",
  "A window into the hero's thoughts",
  "Tells us about the hero or the world",
];

export interface RosterEntry {
  name: string;
  /** Narrative function (the `function` codex field). */
  func?: string;
  /** Goal (the `motivation` codex field). */
  goal?: string;
  flaw?: string;
  /** Memorable trait (the `memorableTrait` codex field). */
  trait?: string;
  /** Number of scenes this character is linked to. */
  appearances: number;
}

export type RosterField = "function" | "goal" | "flaw" | "trait";

export interface RosterGaps {
  /** Roster fields with no value. */
  missing: RosterField[];
  /** Appears in ≤1 scene — a possible spear-carrier to cut or merge. */
  spearCarrier: boolean;
}

/** Flag missing roster fields and one-appearance characters. */
export function rosterGaps(entry: RosterEntry): RosterGaps {
  const missing: RosterField[] = [];
  if (!(entry.func ?? "").trim()) missing.push("function");
  if (!(entry.goal ?? "").trim()) missing.push("goal");
  if (!(entry.flaw ?? "").trim()) missing.push("flaw");
  if (!(entry.trait ?? "").trim()) missing.push("trait");
  return { missing, spearCarrier: entry.appearances <= 1 };
}
