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

export const THREE_ACT: BeatDef[] = [
  { id: "setup", name: "Setup", position: 0.0, blurb: "Establish protagonist, world, and the status quo." },
  { id: "inciting-incident", name: "Inciting Incident", position: 0.12, blurb: "The event that sets the story in motion." },
  { id: "plot-point-1", name: "Plot Point 1", position: 0.25, blurb: "The protagonist commits; Act 2 begins." },
  { id: "midpoint", name: "Midpoint", position: 0.5, blurb: "A turn that raises stakes and shifts the goal." },
  { id: "plot-point-2", name: "Plot Point 2", position: 0.75, blurb: "Lowest point / final push into Act 3." },
  { id: "climax", name: "Climax", position: 0.9, blurb: "The decisive confrontation." },
  { id: "resolution", name: "Resolution", position: 1.0, blurb: "Aftermath and the new normal." },
];

export const HEROS_JOURNEY: BeatDef[] = [
  { id: "ordinary-world", name: "Ordinary World", position: 0.0, blurb: "The hero's normal life before the adventure." },
  { id: "call-to-adventure", name: "Call to Adventure", position: 0.08, blurb: "A problem or challenge appears." },
  { id: "refusal", name: "Refusal of the Call", position: 0.12, blurb: "The hero hesitates or refuses." },
  { id: "meeting-the-mentor", name: "Meeting the Mentor", position: 0.18, blurb: "Guidance and tools to face the journey." },
  { id: "crossing-the-threshold", name: "Crossing the Threshold", position: 0.25, blurb: "The hero commits to the special world." },
  { id: "tests-allies-enemies", name: "Tests, Allies, Enemies", position: 0.35, blurb: "Learning the rules; forming bonds." },
  { id: "approach", name: "Approach to the Inmost Cave", position: 0.45, blurb: "Preparation for the central ordeal." },
  { id: "ordeal", name: "The Ordeal", position: 0.5, blurb: "The greatest fear / a brush with death." },
  { id: "reward", name: "Reward", position: 0.6, blurb: "Seizing the prize after surviving." },
  { id: "the-road-back", name: "The Road Back", position: 0.75, blurb: "Driven to complete the journey home." },
  { id: "resurrection", name: "Resurrection", position: 0.85, blurb: "The final test; transformation proven." },
  { id: "return-with-elixir", name: "Return with the Elixir", position: 1.0, blurb: "Home, changed, bearing something of value." },
];

export const SEVEN_POINT: BeatDef[] = [
  { id: "hook", name: "Hook", position: 0.0, blurb: "Starting state — opposite of the resolution." },
  { id: "plot-turn-1", name: "Plot Turn 1", position: 0.15, blurb: "The call to action moves into Act 2." },
  { id: "pinch-1", name: "Pinch Point 1", position: 0.3, blurb: "Apply pressure; introduce the antagonist's force." },
  { id: "midpoint", name: "Midpoint", position: 0.5, blurb: "Shift from reaction to action." },
  { id: "pinch-2", name: "Pinch Point 2", position: 0.625, blurb: "Greater pressure; things look dire." },
  { id: "plot-turn-2", name: "Plot Turn 2", position: 0.75, blurb: "The final piece needed to win is gained." },
  { id: "resolution", name: "Resolution", position: 1.0, blurb: "The end state — opposite of the hook." },
];

export const STORY_CIRCLE: BeatDef[] = [
  { id: "you", name: "You", position: 0.0, blurb: "A character in a zone of comfort." },
  { id: "need", name: "Need", position: 0.12, blurb: "But they want something." },
  { id: "go", name: "Go", position: 0.25, blurb: "They enter an unfamiliar situation." },
  { id: "search", name: "Search", position: 0.4, blurb: "Adapt to it." },
  { id: "find", name: "Find", position: 0.5, blurb: "Getting what they wanted." },
  { id: "take", name: "Take", position: 0.62, blurb: "Paying a heavy price for it." },
  { id: "return", name: "Return", position: 0.8, blurb: "Then returning to their familiar situation." },
  { id: "change", name: "Change", position: 1.0, blurb: "Having changed." },
];

export const ROMANCING_THE_BEAT: BeatDef[] = [
  { id: "introduce-leads", name: "Introduce Leads", position: 0.0, blurb: "Establish both protagonists and their flaws." },
  { id: "meet", name: "Meet", position: 0.1, blurb: "The leads meet; spark and friction." },
  { id: "adhesion", name: "Adhesion", position: 0.15, blurb: "A reason they're stuck together." },
  { id: "no-way-1", name: "No Way #1", position: 0.2, blurb: "Why this relationship can't work." },
  { id: "inkling-of-desire", name: "Inkling of Desire", position: 0.3, blurb: "Attraction surfaces despite resistance." },
  { id: "deepening-desire", name: "Deepening Desire", position: 0.4, blurb: "Falling, against better judgment." },
  { id: "midpoint-of-love", name: "Midpoint of Love", position: 0.5, blurb: "A peak moment of connection." },
  { id: "inkling-of-doubt", name: "Inkling of Doubt", position: 0.6, blurb: "Cracks reappear; old fears return." },
  { id: "retreating", name: "Retreating", position: 0.7, blurb: "Pulling away to protect themselves." },
  { id: "breakup", name: "Breakup / Dark Moment", position: 0.75, blurb: "The relationship shatters." },
  { id: "wallowing", name: "Wallowing", position: 0.82, blurb: "The lowest point apart." },
  { id: "epiphany", name: "Epiphany", position: 0.88, blurb: "Realizing what must change." },
  { id: "grand-gesture", name: "Grand Gesture", position: 0.95, blurb: "Proving the lesson learned." },
  { id: "happily-ever-after", name: "Happily Ever After", position: 1.0, blurb: "Earned union; the new normal together." },
];

const TWENTY_SEVEN_LABELS = [
  "Introduction", "Inciting Incident", "Immediate Reaction", "Reaction", "Action",
  "Consequence", "Pressure", "Pinch", "Push", "New World", "Fun & Games",
  "Old World Contrast", "Build Up", "Midpoint", "Reversal", "Reaction",
  "Action", "Dedication", "Trials", "Pinch 2", "Darkest Moment", "Power Within",
  "Action", "Converging Paths", "Battle", "Climax", "Resolution",
];
export const TWENTY_SEVEN_CHAPTER: BeatDef[] = TWENTY_SEVEN_LABELS.map((name, i) => ({
  id: `ch-${i + 1}`,
  name: `${i + 1}. ${name}`,
  position: i / (TWENTY_SEVEN_LABELS.length - 1),
  blurb: "",
}));

export const BEAT_TEMPLATES: Record<string, BeatDef[]> = {
  "save-the-cat": SAVE_THE_CAT,
  "three-act": THREE_ACT,
  "heros-journey": HEROS_JOURNEY,
  "seven-point": SEVEN_POINT,
  "story-circle": STORY_CIRCLE,
  "romancing-the-beat": ROMANCING_THE_BEAT,
  "twenty-seven-chapter": TWENTY_SEVEN_CHAPTER,
};

/** Templates for the picker, in display order. */
export const TEMPLATE_META: { id: string; label: string }[] = [
  { id: "save-the-cat", label: "Save the Cat (15)" },
  { id: "three-act", label: "Three-Act (7)" },
  { id: "heros-journey", label: "Hero's Journey (12)" },
  { id: "seven-point", label: "Seven-Point (7)" },
  { id: "story-circle", label: "Story Circle (8)" },
  { id: "romancing-the-beat", label: "Romancing the Beat (14)" },
  { id: "twenty-seven-chapter", label: "27-Chapter (27)" },
];

export const DEFAULT_TEMPLATE = "save-the-cat";

export function getTemplate(id: string | undefined): BeatDef[] {
  return (id && BEAT_TEMPLATES[id]) || SAVE_THE_CAT;
}

export function templateLabel(id: string | undefined): string {
  return TEMPLATE_META.find((t) => t.id === id)?.label ?? "Save the Cat (15)";
}
