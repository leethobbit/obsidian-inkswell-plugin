/**
 * Beat-sheet templates. v1 ships the Save the Cat! Writes a Novel 15-beat
 * structure (Jessica Brody) — the project's preferred outlining style. Beat
 * *definitions* (name, blurb, position) live here in code; per-project
 * *assignments* (note, scene link, done) are stored in `inkswell.beats`.
 */

export interface BeatDef {
  id: string;
  name: string;
  /** One-line purpose of the beat. */
  blurb: string;
  /** Representative position in the book, 0–1 (for ordering + a % label). */
  position: number;
}

/** Per-project, per-beat data overlaid on a template definition. */
export interface BeatAssignment {
  /** Scene title this beat is realized by, or null/absent. */
  scene?: string | null;
  /** Planning note: what happens at this beat. */
  note?: string;
  /** Marked complete. */
  done?: boolean;
}

export interface BeatSheet {
  template: string;
  assignments: Record<string, BeatAssignment>;
}

export const SAVE_THE_CAT: BeatDef[] = [
  { id: "opening-image", name: "Opening Image", position: 0.0, blurb: "A snapshot of the hero's life before the story — sets tone and starting point." },
  { id: "theme-stated", name: "Theme Stated", position: 0.05, blurb: "Someone hints at what the story is really about — the lesson the hero must learn." },
  { id: "setup", name: "Setup", position: 0.08, blurb: "Establish the hero's status-quo world, flaws, and what needs fixing." },
  { id: "catalyst", name: "Catalyst", position: 0.1, blurb: "The inciting incident that disrupts the status quo." },
  { id: "debate", name: "Debate", position: 0.15, blurb: "The hero hesitates and resists the change — what should they do?" },
  { id: "break-into-2", name: "Break Into Two", position: 0.2, blurb: "The hero makes a choice and steps into the new world (Act 2)." },
  { id: "b-story", name: "B Story", position: 0.22, blurb: "A new relationship begins that carries the theme." },
  { id: "fun-and-games", name: "Fun and Games", position: 0.35, blurb: "The 'promise of the premise' — set pieces exploring the new world." },
  { id: "midpoint", name: "Midpoint", position: 0.5, blurb: "A false victory or false defeat; stakes rise and the story pivots." },
  { id: "bad-guys-close-in", name: "Bad Guys Close In", position: 0.62, blurb: "Pressure mounts — external foes and internal doubts tighten." },
  { id: "all-is-lost", name: "All Is Lost", position: 0.75, blurb: "The lowest point; the hero loses something major (a 'whiff of death')." },
  { id: "dark-night-of-the-soul", name: "Dark Night of the Soul", position: 0.78, blurb: "The hero's darkest moment of despair before the breakthrough." },
  { id: "break-into-3", name: "Break Into Three", position: 0.8, blurb: "The 'aha!' — the hero finds the solution, fusing the A and B stories." },
  { id: "finale", name: "Finale", position: 0.9, blurb: "The hero proves the lesson learned and sets the world right." },
  { id: "final-image", name: "Final Image", position: 1.0, blurb: "A closing snapshot mirroring the opening — shows how far the hero has come." },
];

export const BEAT_TEMPLATES: Record<string, BeatDef[]> = {
  "save-the-cat": SAVE_THE_CAT,
};

export const DEFAULT_TEMPLATE = "save-the-cat";

export function getTemplate(id: string | undefined): BeatDef[] {
  return (id && BEAT_TEMPLATES[id]) || SAVE_THE_CAT;
}
