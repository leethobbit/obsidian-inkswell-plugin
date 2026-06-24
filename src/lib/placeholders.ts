/**
 * Fast-drafting placeholder tokens (Writing Mastery Academy "defer everything"
 * method): instead of stopping to research or write a hard bit, drop a bracketed
 * marker and keep drafting forward, then find them all later.
 *
 *   [TK]            — journalism "to come": a missing fact/name to fill in
 *   [DIALOGUE: …]   — a line/exchange you'll write later
 *   [SCENE: …]      — a whole scene summarised as a one-liner for now
 *   [NOTE: …]       — a memo to yourself
 *   [???]           — generic uncertainty
 *
 * Pure module — no CodeMirror or Obsidian imports — so it's unit-testable and can
 * be shared by the editor scanner (`markdown-syntax.ts`, for highlighting) and the
 * "find all gaps" view (for the revision-pass sweep).
 *
 * Tokens are single-line by design: the colon forms match any content EXCEPT a
 * closing bracket or newline. This keeps highlighting to a clean single-line mark
 * and per-line protection simple; multi-line skips should use bullet lists.
 */

export type PlaceholderKind = "tk" | "dialogue" | "scene" | "note" | "unknown";

export interface PlaceholderMatch {
  /** Absolute start offset (inclusive). */
  from: number;
  /** Absolute end offset (exclusive). */
  to: number;
  kind: PlaceholderKind;
}

/** CSS class applied to each token's styled span in the editor. */
export const PLACEHOLDER_CLASS: Record<PlaceholderKind, string> = {
  tk: "cm-ph-tk",
  dialogue: "cm-ph-dialogue",
  scene: "cm-ph-scene",
  note: "cm-ph-note",
  unknown: "cm-ph-unknown",
};

export interface PlaceholderTemplate {
  /** The literal text inserted at the cursor. */
  text: string;
  /** Where the cursor should land, as an offset within `text`. */
  cursor: number;
}

/** Insertion templates; the cursor lands inside the colon forms, ready to type. */
export const PLACEHOLDER_TEMPLATES: Record<PlaceholderKind, PlaceholderTemplate> = {
  tk: { text: "[TK]", cursor: 4 },
  dialogue: { text: "[DIALOGUE: ]", cursor: 11 },
  scene: { text: "[SCENE: ]", cursor: 8 },
  note: { text: "[NOTE: ]", cursor: 7 },
  unknown: { text: "[???]", cursor: 5 },
};

// `TK` and `???` are exact; the colon forms take any single-line content up to the
// closing `]`. Case-insensitive on the keyword so `[tk]`/`[dialogue: …]` also match.
const PLACEHOLDER_RE = /\[(TK|\?\?\?|(DIALOGUE|SCENE|NOTE):[^\]\n]*)\]/gi;

function kindOf(inner: string, keyword: string | undefined): PlaceholderKind {
  if (keyword) {
    const k = keyword.toUpperCase();
    return k === "DIALOGUE" ? "dialogue" : k === "SCENE" ? "scene" : "note";
  }
  return inner.toUpperCase() === "TK" ? "tk" : "unknown";
}

/** Find every placeholder token in `text`, sorted by start offset. */
export function scanPlaceholders(text: string): PlaceholderMatch[] {
  const out: PlaceholderMatch[] = [];
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
    out.push({
      from: m.index,
      to: m.index + m[0].length,
      kind: kindOf(m[1], m[2]),
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
