/**
 * Cross-scene search — the pure matching core (no Obsidian imports, unit-testable).
 * Mirrors `placeholders.ts`: the panel reads scene bodies, calls in here, and gets
 * back positioned hits it can group and jump to.
 *
 * Matching is a LITERAL substring scan (`indexOf`), never a user-supplied RegExp —
 * so a query like `a.b*c` or `[TODO]` matches those characters exactly and there's
 * no regex-injection surface. The only regex used is a fixed single-character
 * Unicode word-class for whole-word boundary tests, which never contains user input.
 */

import type { SceneMeta, SceneStatus } from "../scenes/scene-meta";

/** Which text a hit came from: the prose body or the `synopsis` frontmatter field. */
export type SearchTarget = "body" | "synopsis";

export interface SearchOptions {
  /** The literal query. Empty → no matches. */
  query: string;
  caseSensitive: boolean;
  /** Require a non-word char (or edge) on both sides of the match. */
  wholeWord: boolean;
}

export interface SearchMatch {
  /** Start offset (inclusive) into the searched string. */
  from: number;
  /** End offset (exclusive). */
  to: number;
  /** 1-based line number within the searched string. */
  line: number;
  /** The match's line, trimmed (and truncated if long), for list display. */
  excerpt: string;
  target: SearchTarget;
}

const EXCERPT_MAX = 120;
const WORD_CHAR = /[\p{L}\p{N}_]/u;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_CHAR.test(ch);
}

/**
 * Every non-overlapping occurrence of `opts.query` in `text`, ascending by offset.
 * Case-insensitive by comparing lowercased copies while keeping the original text
 * for offsets/excerpts. Whole-word checks look at the chars flanking each hit.
 */
export function findMatches(text: string, opts: SearchOptions, target: SearchTarget): SearchMatch[] {
  const needle = opts.query;
  if (!needle) return [];
  const hay = opts.caseSensitive ? text : text.toLowerCase();
  const find = opts.caseSensitive ? needle : needle.toLowerCase();
  const len = find.length;

  const offsets: number[] = [];
  let pos = 0;
  for (;;) {
    const i = hay.indexOf(find, pos);
    if (i === -1) break;
    if (!opts.wholeWord || (!isWordChar(text[i - 1]) && !isWordChar(text[i + len]))) {
      offsets.push(i);
      pos = i + len; // non-overlapping: skip past this hit
    } else {
      pos = i + 1; // whole-word check failed here; try the next start position
    }
  }
  return annotate(text, offsets, len, target);
}

/**
 * Assign a line number + line excerpt to each ascending offset in a single walk
 * over `text` (same shape as `findGaps` in placeholders.ts).
 */
function annotate(text: string, offsets: number[], len: number, target: SearchTarget): SearchMatch[] {
  const out: SearchMatch[] = [];
  let idx = 0;
  let line = 1;
  let lineStart = 0;
  for (const from of offsets) {
    while (idx < from) {
      if (text[idx] === "\n") {
        line++;
        lineStart = idx + 1;
      }
      idx++;
    }
    let lineEnd = text.indexOf("\n", from);
    if (lineEnd === -1) lineEnd = text.length;
    const raw = text.slice(lineStart, lineEnd).trim();
    const excerpt = raw.length > EXCERPT_MAX ? `${raw.slice(0, EXCERPT_MAX - 1)}…` : raw;
    out.push({ from, to: from + len, line, excerpt, target });
  }
  return out;
}

/**
 * Replace every literal occurrence of `opts.query` in `text` with `replacement`
 * (empty replacement = deletion). Reuses the exact matcher `findMatches` uses, so
 * a preview count always equals the applied count. Body-only callers pass the body.
 */
export function replaceMatches(
  text: string,
  opts: SearchOptions,
  replacement: string
): { text: string; count: number } {
  const matches = findMatches(text, opts, "body");
  if (!matches.length) return { text, count: 0 };
  let out = "";
  let last = 0;
  for (const m of matches) {
    out += text.slice(last, m.from) + replacement;
    last = m.to;
  }
  out += text.slice(last);
  return { text: out, count: matches.length };
}

/**
 * Categorical filters applied to a scene BEFORE its body is read (cheap — reads
 * only the metadata cache). Every set field is an OR-within / AND-across filter:
 * a scene passes when it matches at least one selected value in each active field.
 * Empty arrays = "don't filter on this field".
 */
export interface SearchFilters {
  status?: SceneStatus[];
  pov?: string[];
  chapter?: string[];
  /** Plotline titles (plain, matching `plotlines` frontmatter). */
  plotline?: string[];
  /** Character wikilink strings (e.g. "[[Anna]]"), matched verbatim. */
  character?: string[];
  /** Include archived (`inactive: true`) scenes. */
  includeInactive: boolean;
}

/** Whether a scene's metadata satisfies the active filters. */
export function sceneMatchesFilters(meta: SceneMeta, f: SearchFilters): boolean {
  if (!f.includeInactive && meta.inactive) return false;
  if (f.status?.length && !(meta.status && f.status.includes(meta.status))) return false;
  if (f.pov?.length && !(meta.pov && f.pov.includes(meta.pov))) return false;
  if (f.chapter?.length && !(meta.chapter && f.chapter.includes(meta.chapter))) return false;
  if (f.plotline?.length) {
    const pls = meta.plotlines ?? [];
    if (!f.plotline.some((p) => pls.includes(p))) return false;
  }
  if (f.character?.length) {
    const chars = meta.characters ?? [];
    if (!f.character.some((c) => chars.includes(c))) return false;
  }
  return true;
}
