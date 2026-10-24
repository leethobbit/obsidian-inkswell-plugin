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
 * …plus any the writer adds under Customize → To-do markers
 * (`settings.listOverrides.markers`, resolved by {@link markerSet}).
 *
 * One syntax family — `[KEYWORD: content]`, with the `: content` optional so a bare
 * `[TODO]` is valid too. Pure module — no CodeMirror or Obsidian imports — so it's
 * unit-testable and shared by the editor scanner (`markdown-syntax.ts`, for
 * highlighting), the Todos sweep view, and the compile strip step.
 *
 * The KEYWORD is the contract: it lives in the writer's prose, so a keyword that
 * stops being recognized leaks its markers into the compiled manuscript. Hence:
 * the shipped five are recognized forever, a hidden marker is still matched
 * (and stripped) — hiding only takes it out of the insert UI — and a custom
 * marker's keyword never changes after it's created (its label may).
 *
 * Tokens are single-line by design: the content matches any text EXCEPT a closing
 * bracket or newline. This keeps highlighting to a clean single-line mark and
 * per-line protection simple; multi-line skips should use bullet lists.
 */

import { ListOverride, applyOverride } from "./list-override";

export type ShippedMarkerId = "todo" | "research" | "note" | "dialogue" | "scene";

/** A custom marker's list-specific field (see `SPEC_MARKERS`). */
export interface MarkerExtra {
  /** Uppercase keyword typed in prose — immutable once the marker exists. */
  keyword: string;
}

/** The shipped markers, in canonical display order. */
export const SHIPPED_MARKERS: readonly { id: ShippedMarkerId; label: string; keyword: string }[] = [
  { id: "todo", label: "TODO", keyword: "TODO" },
  { id: "research", label: "Research", keyword: "RESEARCH" },
  { id: "note", label: "Note", keyword: "NOTE" },
  { id: "dialogue", label: "Dialogue", keyword: "DIALOGUE" },
  { id: "scene", label: "Scene", keyword: "SCENE" },
];

/** One effective marker: shipped or the writer's own. */
export interface MarkerDef {
  /** Shipped id, or a minted `mk-…` id for a custom marker. */
  id: string;
  /** Uppercase keyword matched (case-insensitively) in prose. */
  keyword: string;
  /** Display name — menus, Todos badges, filter chips. */
  label: string;
  custom: boolean;
  /** Not offered for insertion; still matched, listed, and stripped. */
  hidden: boolean;
}

/** A compiled marker set — build once per override, reuse per keystroke. */
export interface MarkerSet {
  /** Every marker, hidden ones flagged, in effective order. */
  defs: readonly MarkerDef[];
  byId: ReadonlyMap<string, MarkerDef>;
  /** Uppercase keyword → marker. */
  byKeyword: ReadonlyMap<string, MarkerDef>;
  /** Global, case-insensitive matcher for the whole family. */
  re: RegExp;
}

export interface PlaceholderMatch {
  /** Absolute start offset (inclusive). */
  from: number;
  /** Absolute end offset (exclusive). */
  to: number;
  /** The matched marker's id. */
  kind: string;
}

export interface PlaceholderTemplate {
  /** The literal text inserted at the cursor. */
  text: string;
  /** Where the cursor should land, as an offset within `text`. */
  cursor: number;
}

/** A letter, then 1–19 letters, digits or hyphens. Checked on the uppercased form. */
const KEYWORD_RE = /^\p{L}[\p{L}\p{N}-]{1,19}$/u;

/** The stored form of a keyword: trimmed, uppercased. */
export function normalizeKeyword(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Is `raw` usable as a marker keyword (after {@link normalizeKeyword})? */
export function isValidKeyword(raw: string): boolean {
  return KEYWORD_RE.test(normalizeKeyword(raw));
}

// `-` is literal outside a class and must NOT be escaped: `\-` is a syntax
// error under the `u` flag the matcher uses.
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Compile `defs` into a set. Keywords are deduplicated case-insensitively: the
 * first def to claim one keeps it (callers pass shipped markers first, so a
 * custom marker can never shadow a shipped keyword), and an invalid keyword is
 * dropped — a malformed def can't break matching for the rest.
 */
export function buildMarkerSet(defs: readonly MarkerDef[]): MarkerSet {
  const kept: MarkerDef[] = [];
  const byKeyword = new Map<string, MarkerDef>();
  for (const d of defs) {
    const keyword = normalizeKeyword(d.keyword);
    if (!isValidKeyword(keyword) || byKeyword.has(keyword)) continue;
    const def = { ...d, keyword };
    byKeyword.set(keyword, def);
    kept.push(def);
  }
  const alts = kept.map((d) => escapeRe(d.keyword)).join("|");
  return {
    defs: kept,
    byId: new Map(kept.map((d) => [d.id, d])),
    byKeyword,
    // Case-insensitive on the keyword so `[todo: …]` matches too; `u` so a
    // non-ASCII keyword folds case properly.
    re: new RegExp(`\\[(${alts})(?::[^\\]\\n]*)?\\]`, "giu"),
  };
}

/** The shipped five — the set every caller falls back to. */
export const DEFAULT_MARKERS: MarkerSet = buildMarkerSet(
  SHIPPED_MARKERS.map((m) => ({ ...m, custom: false, hidden: false }))
);

let memo: { override: ListOverride<MarkerExtra>; set: MarkerSet } | null = null;

/**
 * The effective marker set for a stored override (`settings.listOverrides.markers`).
 * Shipped keywords always come from {@link SHIPPED_MARKERS} — an `extras.keyword`
 * on a shipped id is ignored — and a custom whose keyword collides is dropped.
 * Memoized on the override's identity: the scanner asks on every keystroke, and
 * a saved override is a new object.
 */
export function markerSet(override: ListOverride<MarkerExtra> | undefined): MarkerSet {
  if (!override) return DEFAULT_MARKERS;
  if (memo?.override === override) return memo.set;
  const shippedKeyword = new Map<string, string>(SHIPPED_MARKERS.map((m) => [m.id, m.keyword]));
  const effective = applyOverride<MarkerExtra>(SHIPPED_MARKERS, override);
  // Shipped first so their keywords are claimed before any custom's (the
  // effective ORDER may put a custom earlier; the output keeps that order).
  const ordered = [
    ...effective.filter((it) => !it.custom),
    ...effective.filter((it) => it.custom),
  ].map(
    (it): MarkerDef => ({
      id: it.id,
      keyword: it.custom ? it.extra.keyword : shippedKeyword.get(it.id) ?? "",
      label: it.label,
      custom: it.custom,
      hidden: it.hidden,
    })
  );
  const compiled = buildMarkerSet(ordered);
  const rank = new Map(effective.map((it, i) => [it.id, i]));
  const defs = [...compiled.defs].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  const set: MarkerSet = { ...compiled, defs };
  memo = { override, set };
  return set;
}

/** The markers offered for insertion (menus, picker, shortcuts): visible only. */
export function insertableMarkers(set: MarkerSet): MarkerDef[] {
  return set.defs.filter((d) => !d.hidden);
}

/** Insertion template; the cursor lands inside the colon form, ready to type. */
export function markerTemplate(def: Pick<MarkerDef, "keyword">): PlaceholderTemplate {
  return { text: `[${def.keyword}: ]`, cursor: def.keyword.length + 3 };
}

/** CSS class for a marker's styled span in the editor. */
export function markerClass(def: Pick<MarkerDef, "id" | "custom"> | undefined): string {
  return !def || def.custom ? "cm-ph-custom" : `cm-ph-${def.id}`;
}

/** Display label for a marker id (an id the set no longer knows falls back to itself). */
export function markerLabel(set: MarkerSet, id: string): string {
  return set.byId.get(id)?.label ?? id;
}

/**
 * Remove every to-do marker from `text` — the compile-step / pre-export cleanup
 * so drafting placeholders never ship in the manuscript. Hidden markers are
 * stripped too. Markers are single-line by construction, so this can't swallow
 * real prose across a paragraph break; leftover blank lines are tidied by the
 * `trim-blank-lines` manuscript step.
 */
export function stripPlaceholders(text: string, set: MarkerSet = DEFAULT_MARKERS): string {
  return text.replace(set.re, "");
}

/** Find every to-do marker in `text`, sorted by start offset. */
export function scanPlaceholders(text: string, set: MarkerSet = DEFAULT_MARKERS): PlaceholderMatch[] {
  const out: PlaceholderMatch[] = [];
  const re = set.re;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const def = set.byKeyword.get(m[1].toUpperCase());
    if (!def) continue;
    out.push({ from: m.index, to: m.index + m[0].length, kind: def.id });
  }
  return out.sort((a, b) => a.from - b.from);
}

/** An uppercase colon-form token like `[CHEKC: …]` — what a marker looks like. */
const MARKER_SHAPE_RE = /\[(\p{Lu}[\p{Lu}\p{N}-]{1,19}):[^\]\n]*\]/gu;

/**
 * Tokens shaped like a marker whose keyword `set` doesn't know — a removed
 * custom marker, a typo, or a device whose settings didn't sync. Compile would
 * leave these in the manuscript, so preflight warns. Colon form only: a bare
 * `[REDACTED]` is ordinary prose far more often than a marker.
 */
export function findUnknownMarkers(text: string, set: MarkerSet = DEFAULT_MARKERS): string[] {
  const out: string[] = [];
  MARKER_SHAPE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_SHAPE_RE.exec(text)) !== null) {
    if (!set.byKeyword.has(m[1].toUpperCase())) out.push(m[1]);
  }
  return out;
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
export function findGaps(text: string, set: MarkerSet = DEFAULT_MARKERS): GapHit[] {
  const matches = scanPlaceholders(text, set);
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
