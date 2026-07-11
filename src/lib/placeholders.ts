/**
 * To-do markers (the "defer everything" drafting method): instead of stopping to
 * research or write a hard bit, drop a bracketed marker and keep drafting forward,
 * then find them all later in Revise → Todos.
 *
 *   [TODO: …]       — a generic to-do
 *   [RESEARCH: …]   — a fact/detail to look up or verify
 *   [NOTE: …]       — a note/reminder to yourself
 *   [DIALOGUE: …]   — a line/exchange you'll write later
 *   [SCENE: …]      — a whole scene summarised as a one-liner for now
 *
 * One syntax family — `[KEYWORD: content]`, with the `: content` optional so a bare
 * `[TODO]` is valid too. Pure module — no CodeMirror or Obsidian imports — so it's
 * unit-testable and shared by the editor scanner (`markdown-syntax.ts`, for
 * highlighting) and the Todos sweep view.
 *
 * Tokens are single-line by design: the content matches any text EXCEPT a closing
 * bracket or newline. This keeps highlighting to a clean single-line mark and
 * per-line protection simple; multi-line skips should use bullet lists.
 */

export type PlaceholderKind = "todo" | "research" | "note" | "dialogue" | "scene";

export interface PlaceholderMatch {
  /** Absolute start offset (inclusive). */
  from: number;
  /** Absolute end offset (exclusive). */
  to: number;
  kind: PlaceholderKind;
}

/** CSS class applied to each token's styled span in the editor. */
export const PLACEHOLDER_CLASS: Record<PlaceholderKind, string> = {
  todo: "cm-ph-todo",
  research: "cm-ph-research",
  note: "cm-ph-note",
  dialogue: "cm-ph-dialogue",
  scene: "cm-ph-scene",
};

/** User-facing label per kind — badges, filter chips, insert menus. */
export const PLACEHOLDER_LABEL: Record<PlaceholderKind, string> = {
  todo: "TODO",
  research: "Research",
  note: "Note",
  dialogue: "Dialogue",
  scene: "Scene",
};

/** Canonical display order for kind lists (chips, pickers). */
export const PLACEHOLDER_ORDER: PlaceholderKind[] = [
  "todo",
  "research",
  "note",
  "dialogue",
  "scene",
];

export interface PlaceholderTemplate {
  /** The literal text inserted at the cursor. */
  text: string;
  /** Where the cursor should land, as an offset within `text`. */
  cursor: number;
}

/** Insertion templates; the cursor lands inside the colon form, ready to type. */
export const PLACEHOLDER_TEMPLATES: Record<PlaceholderKind, PlaceholderTemplate> = {
  todo: { text: "[TODO: ]", cursor: 7 },
  research: { text: "[RESEARCH: ]", cursor: 11 },
  note: { text: "[NOTE: ]", cursor: 7 },
  dialogue: { text: "[DIALOGUE: ]", cursor: 11 },
  scene: { text: "[SCENE: ]", cursor: 8 },
};

// One family: `[KEYWORD: content]`, with the `: content` optional (so `[TODO]` also
// matches). Case-insensitive on the keyword so `[todo: …]` matches too.
const PLACEHOLDER_RE = /\[(TODO|RESEARCH|NOTE|DIALOGUE|SCENE)(?::[^\]\n]*)?\]/gi;

function kindOf(keyword: string): PlaceholderKind {
  return keyword.toLowerCase() as PlaceholderKind;
}

/**
 * Remove every to-do marker from `text` — the compile-step / pre-export cleanup
 * so drafting placeholders never ship in the manuscript. Markers are single-line
 * by construction, so this can't swallow real prose across a paragraph break;
 * leftover blank lines are tidied by the `trim-blank-lines` manuscript step.
 */
export function stripPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER_RE, "");
}

/** Find every to-do marker in `text`, sorted by start offset. */
export function scanPlaceholders(text: string): PlaceholderMatch[] {
  const out: PlaceholderMatch[] = [];
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
    out.push({
      from: m.index,
      to: m.index + m[0].length,
      kind: kindOf(m[1]),
    });
  }
  return out.sort((a, b) => a.from - b.from);
}

export interface GapHit extends PlaceholderMatch {
  /** 1-based line number of the token. */
  line: number;
  /** The token's line, trimmed (and truncated if long), for list display. */
  excerpt: string;
}

const EXCERPT_MAX = 120;

/**
 * Locate every placeholder with its line number and a trimmed line excerpt — the
 * data the "find all gaps" view lists. Single pass: `scanPlaceholders` returns
 * matches in ascending order, so we walk the text once tracking line position.
 */
export function findGaps(text: string): GapHit[] {
  const matches = scanPlaceholders(text);
  const hits: GapHit[] = [];
  let idx = 0;
  let line = 1;
  let lineStart = 0;
  for (const m of matches) {
    while (idx < m.from) {
      if (text[idx] === "\n") {
        line++;
        lineStart = idx + 1;
      }
      idx++;
    }
    let lineEnd = text.indexOf("\n", m.from);
    if (lineEnd === -1) lineEnd = text.length;
    const raw = text.slice(lineStart, lineEnd).trim();
    const excerpt = raw.length > EXCERPT_MAX ? `${raw.slice(0, EXCERPT_MAX - 1)}…` : raw;
    hits.push({ ...m, line, excerpt });
  }
  return hits;
}
