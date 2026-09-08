/**
 * Pure bold / italic / strikethrough toggle for the manuscript editor — no
 * CodeMirror or Obsidian imports, so it's unit-testable in plain Node (like
 * `markdown-syntax.ts`). The CM adapter (`views/scene-editor.ts`,
 * `formatSelection`) runs this once per selection range via `changeByRange`.
 *
 * Semantics follow Obsidian's own toggles:
 *   - empty selection inside/touching a word → the whole word is wrapped/unwrapped
 *   - empty selection at whitespace → an empty marker pair with the cursor between
 *   - cursor between an empty pair (`**|**`) → the pair is removed
 *   - a selection already wrapped (markers just outside, or included in the
 *     selection) → unwrapped; otherwise wrapped, selection kept on the content
 *   - italic on `**bold**` gives `***bold***` (and back): presence is decided by
 *     the length of the marker run on each side, not by a literal match
 *
 * `_`/`__` markers are recognized for UNWRAPPING only; wrapping always emits
 * `*`/`**`/`~~` — what the Live-Preview scanner and Obsidian produce. A
 * multi-line selection is wrapped as-is (the per-line scanner won't style it,
 * but the markdown is valid and it round-trips).
 */

export type MarkKind = "bold" | "italic" | "strike";

export interface ToggleResult {
  /** Range to replace, in ORIGINAL document offsets. */
  from: number;
  to: number;
  insert: string;
  /** New selection, in offsets of (original doc + this change); anchor <= head. */
  anchor: number;
  head: number;
}

const MARKER: Record<MarkKind, string> = { bold: "**", italic: "*", strike: "~~" };
/** Characters whose runs count as markers for the kind (`_` unwraps only). */
const FAMILY: Record<MarkKind, string> = { bold: "*_", italic: "*_", strike: "~" };

interface Run {
  len: number;
  ch: string;
}

/** Run of one family character ending at `pos` (exclusive), not crossing `min`. */
function runBefore(doc: string, pos: number, family: string, min = 0): Run {
  const ch = pos > min ? doc[pos - 1] : "";
  if (!ch || !family.includes(ch)) return { len: 0, ch: "" };
  let i = pos;
  while (i > min && doc[i - 1] === ch) i--;
  return { len: pos - i, ch };
}

/** Run of one family character starting at `pos`, not crossing `max`. */
function runAfter(doc: string, pos: number, family: string, max = doc.length): Run {
  const ch = pos < max ? doc[pos] : "";
  if (!ch || !family.includes(ch)) return { len: 0, ch: "" };
  let i = pos;
  while (i < max && doc[i] === ch) i++;
  return { len: i - pos, ch };
}

/** Length of the matching marker runs around a span (0 when they don't match). */
function pairLength(before: Run, after: Run): number {
  if (before.len === 0 || after.len === 0 || before.ch !== after.ch) return 0;
  return Math.min(before.len, after.len);
}

/** Is `kind` present given matching marker runs of length `n` on both sides? */
function present(kind: MarkKind, n: number): boolean {
  if (kind === "italic") return n === 1 || n === 3;
  return n >= 2; // bold (`**`, `***`, …) and strike (`~~`)
}

const WORD_RE = /[\p{L}\p{N}\p{M}_]/u;

function isBaseWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_RE.test(ch);
}

/** Word character test; an apostrophe counts when flanked by word characters (`don't`). */
function isWordChar(doc: string, i: number): boolean {
  const ch = doc[i];
  if (isBaseWordChar(ch)) return true;
  if (ch === "'" || ch === "’") {
    return isBaseWordChar(doc[i - 1]) && isBaseWordChar(doc[i + 1]);
  }
  return false;
}

function wordBounds(doc: string, pos: number): [number, number] {
  let s = pos;
  let e = pos;
  while (s > 0 && isWordChar(doc, s - 1)) s--;
  while (e < doc.length && isWordChar(doc, e)) e++;
  return [s, e];
}

function insertPair(at: number, kind: MarkKind): ToggleResult {
  const m = MARKER[kind];
  return { from: at, to: at, insert: m + m, anchor: at + m.length, head: at + m.length };
}

/** Toggle around a non-empty span (whitespace at the edges is left outside the markers). */
function toggleSpan(doc: string, from: number, to: number, kind: MarkKind): ToggleResult {
  const m = MARKER[kind];
  const w = m.length;
  const fam = FAMILY[kind];

  let f = from;
  let t = to;
  while (f < t && /\s/.test(doc[f])) f++;
  while (t > f && /\s/.test(doc[t - 1])) t--;
  if (f === t) return insertPair(from, kind);
  const content = doc.slice(f, t);

  // Markers included in the selection: `|**hello**|` → strip from the inside.
  const inside = pairLength(runAfter(doc, f, fam, t), runBefore(doc, t, fam, f));
  if (inside > 0 && t - f >= 2 * inside && present(kind, inside)) {
    return {
      from: f,
      to: t,
      insert: content.slice(w, content.length - w),
      anchor: f,
      head: t - 2 * w,
    };
  }

  // Markers just outside the selection: `**|hello|**` → unwrap.
  const outside = pairLength(runBefore(doc, f, fam), runAfter(doc, t, fam));
  if (present(kind, outside)) {
    return { from: f - w, to: t + w, insert: content, anchor: f - w, head: t - w };
  }

  // Otherwise wrap, keeping the selection on the content.
  return { from: f, to: t, insert: m + content + m, anchor: f + w, head: t + w };
}

/**
 * Toggle `kind` around [from, to) of `doc` (order-insensitive; offsets are
 * clamped). Never returns null — the "nothing to act on" case is an insert of an
 * empty marker pair with the cursor between the markers.
 */
export function toggleInlineMark(doc: string, from: number, to: number, kind: MarkKind): ToggleResult {
  const len = doc.length;
  let a = Math.max(0, Math.min(from, len));
  let b = Math.max(0, Math.min(to, len));
  if (a > b) [a, b] = [b, a];
  if (a !== b) return toggleSpan(doc, a, b, kind);

  const m = MARKER[kind];
  const w = m.length;
  const fam = FAMILY[kind];

  // Cursor sitting between marker runs (`**|**`, `***|***`): remove or grow the pair.
  const between = pairLength(runBefore(doc, a, fam), runAfter(doc, a, fam));
  if (between > 0) {
    if (present(kind, between)) return { from: a - w, to: a + w, insert: "", anchor: a - w, head: a - w };
    return insertPair(a, kind);
  }

  // Cursor in or touching a word: act on the whole word, keep a collapsed cursor.
  if ((a > 0 && isWordChar(doc, a - 1)) || (a < len && isWordChar(doc, a))) {
    const [ws, we] = wordBounds(doc, a);
    const r = toggleSpan(doc, ws, we, kind);
    const wrapped = r.insert.length > r.to - r.from;
    const cursor = Math.max(r.anchor, Math.min(wrapped ? a + w : a - w, r.head));
    return { ...r, anchor: cursor, head: cursor };
  }

  return insertPair(a, kind);
}
