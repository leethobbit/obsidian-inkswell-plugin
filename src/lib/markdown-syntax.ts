/**
 * Pure Markdown syntax scanner for the manuscript editor — no CodeMirror or
 * Obsidian imports, so it's unit-testable in a plain Node environment (like
 * `wordcount.ts` and the prompt picker).
 *
 * Given the document text and the current selection ranges (in absolute doc
 * offsets), it returns a flat list of "intents" describing how to decorate the
 * text. The CM adapter (`views/scene-editor.ts`) maps each intent to a decoration:
 *   - "style" → a mark with the given CSS class (italic/bold/heading/etc.)
 *   - "hide"  → a replace that collapses the range (used for syntax markers)
 *
 * Live-Preview behavior lives here: a construct's content is always styled, but
 * its markers (`*`, `**`, backticks, heading `#`s, quote `>`) are HIDDEN unless a
 * selection sits on/touches that construct — then they're revealed (dimmed) so you
 * can edit them. Reveal is per-span for inline constructs and per-line for block
 * markers, matching Obsidian.
 *
 * To-do markers (`[TODO: …]`, `[DIALOGUE: …]`, etc. — see
 * `lib/placeholders.ts`) are styled as whole-token marks (never hidden, so the
 * cursor edits inside them normally) and their interiors are protected from
 * emphasis/code scanning so `[DIALOGUE: he *runs*]` isn't half-italicised.
 */

import { PLACEHOLDER_CLASS, scanPlaceholders } from "./placeholders";

export interface Sel {
  from: number;
  to: number;
}

export interface SyntaxIntent {
  from: number;
  to: number;
  /**
   * "style" → CM mark with `cls`; "hide" → CM replace (collapse the range);
   * "line" → CM line decoration with `cls` (zero-width, at the line start —
   * classifies the whole line for block-level CSS such as manuscript indents).
   */
  type: "style" | "hide" | "line";
  cls?: string;
}

/** Block classification of one line, for the cross-line "first paragraph" rule. */
export type LineKind = "blank" | "heading" | "quote" | "hr" | "prose";

const HEADING_RE = /^(#{1,6})\s+/;
const QUOTE_RE = /^\s{0,3}>\s?/;
// Thematic break: three or more of the same -, * or _ (spaces allowed between).
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
// Inline code: 1–3 backticks with a matching close, no inner backtick.
const CODE_RE = /(`{1,3})([^`]+?)\1/g;
// Emphasis families, longest marker first within each so `***` beats `**` beats
// `*`. Group 1/2 = asterisk marker/content, 3/4 = underscore, 5/6 = strikethrough.
const EMPH_RE =
  /(\*\*\*|\*\*|\*)(?=\S)([\s\S]*?\S)\1|(___|__|_)(?=\S)([\s\S]*?\S)\3|(~~)(?=\S)([\s\S]*?\S)\5/g;

/** Does any selection touch [from, to] (inclusive on both edges)? */
function anyTouch(from: number, to: number, sels: Sel[]): boolean {
  return sels.some((s) => s.from <= to && s.to >= from);
}

/** Line-local overlap test (half-open), used to keep emphasis out of code spans. */
function overlapsLocal(s: number, e: number, ranges: [number, number][]): boolean {
  return ranges.some(([ps, pe]) => s < pe && e > ps);
}

/** CSS class for an emphasis content span given its marker. */
function emphasisClass(marker: string, isStrike: boolean): string {
  if (isStrike) return "cm-md-strike";
  if (marker.length === 3) return "cm-md-strong cm-md-em";
  if (marker.length === 2) return "cm-md-strong";
  return "cm-md-em";
}

/** Emit a marker range: styled (faint, visible) when revealed, else collapsed. */
function pushMarker(out: SyntaxIntent[], from: number, to: number, revealed: boolean): void {
  if (from >= to) return;
  if (revealed) out.push({ from, to, type: "style", cls: "cm-md-mark" });
  else out.push({ from, to, type: "hide" });
}

/** Zero-width line-classifying intent at the line start. */
function pushLine(out: SyntaxIntent[], base: number, cls: string): void {
  out.push({ from: base, to: base, type: "line", cls });
}

function scanLine(
  text: string,
  base: number,
  sels: Sel[],
  out: SyntaxIntent[],
  seedProtected: [number, number][] = []
): LineKind {
  const lineFrom = base;
  const lineTo = base + text.length;
  const lineTouched = anyTouch(lineFrom, lineTo, sels);
  // Seeded with placeholder-token interiors so emphasis/code never style inside them.
  const protectedSpans: [number, number][] = [...seedProtected];
  let kind: LineKind = text.trim() ? "prose" : "blank";

  if (HR_RE.test(text)) {
    pushLine(out, base, "cm-md-line-hr");
    return "hr";
  }

  // --- Block markers: revealed when the cursor is anywhere on the line ---
  const heading = HEADING_RE.exec(text);
  if (heading) {
    kind = "heading";
    pushLine(out, base, "cm-md-line-heading");
    const level = heading[1].length;
    if (heading[0].length < text.length) {
      out.push({
        from: base + heading[0].length,
        to: lineTo,
        type: "style",
        cls: `cm-md-heading cm-md-h${level}`,
      });
    }
    // When revealed, only the #'s are faint; when hidden, collapse #'s + spaces so
    // the heading text sits flush left.
    if (lineTouched) pushMarker(out, base, base + heading[1].length, true);
    else pushMarker(out, base, base + heading[0].length, false);
  }

  const quote = QUOTE_RE.exec(text);
  if (quote) {
    kind = "quote";
    pushLine(out, base, "cm-md-line-quote");
    out.push({ from: base + quote[0].length, to: lineTo, type: "style", cls: "cm-md-quote" });
    pushMarker(out, base, base + quote[0].length, lineTouched);
  }

  // --- Inline code: protects its interior from emphasis scanning ---
  CODE_RE.lastIndex = 0;
  let code: RegExpExecArray | null;
  while ((code = CODE_RE.exec(text)) !== null) {
    const s = code.index;
    const e = s + code[0].length;
    if (overlapsLocal(s, e, protectedSpans)) continue; // skip backticks inside a placeholder
    const ml = code[1].length;
    protectedSpans.push([s, e]);
    const revealed = anyTouch(base + s, base + e, sels);
    out.push({ from: base + s + ml, to: base + e - ml, type: "style", cls: "cm-md-code" });
    pushMarker(out, base + s, base + s + ml, revealed);
    pushMarker(out, base + e - ml, base + e, revealed);
  }

  // --- Emphasis / strong / strikethrough ---
  EMPH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMPH_RE.exec(text)) !== null) {
    const s = m.index;
    const e = s + m[0].length;
    if (overlapsLocal(s, e, protectedSpans)) continue;

    const marker = m[1] ?? m[3] ?? m[5];
    const ml = marker.length;
    // Underscore emphasis must stand on word boundaries so `snake_case` and
    // `a_b_c` in prose don't accidentally italicise.
    if (marker[0] === "_") {
      const before = s > 0 ? text[s - 1] : " ";
      const after = e < text.length ? text[e] : " ";
      if (/\w/.test(before) || /\w/.test(after)) continue;
    }

    const cls = emphasisClass(marker, m[5] !== undefined);
    const revealed = anyTouch(base + s, base + e, sels);
    out.push({ from: base + s + ml, to: base + e - ml, type: "style", cls });
    pushMarker(out, base + s, base + s + ml, revealed);
    pushMarker(out, base + e - ml, base + e, revealed);
  }
  return kind;
}

/**
 * Scan `text` and produce decoration intents in absolute doc offsets, sorted by
 * start. `selections` drives marker hide/reveal (pass [] for "no cursor").
 */
export function buildSyntaxIntents(text: string, selections: Sel[]): SyntaxIntent[] {
  const out: SyntaxIntent[] = [];

  // Placeholder tokens: whole-token styled marks (never hidden/atomic). Tokens are
  // single-line, so each falls entirely within one line for protection purposes.
  const placeholders = scanPlaceholders(text);
  for (const p of placeholders) {
    out.push({ from: p.from, to: p.to, type: "style", cls: PLACEHOLDER_CLASS[p.kind] });
  }

  let base = 0;
  // The last non-blank line's kind; null at document start. A prose line that
  // follows nothing, a heading, or a thematic break is a section's FIRST
  // paragraph (`cm-md-line-first`) — manuscript typography leaves it unindented,
  // which pure CSS can't express because a blank line breaks sibling adjacency.
  let prevSignificant: LineKind | null = null;
  // Split on \n; a trailing \r (CRLF docs) stays in the line text and counts
  // toward its length, so absolute offsets remain correct.
  for (const line of text.split("\n")) {
    const lineTo = base + line.length;
    const seed: [number, number][] = [];
    for (const p of placeholders) {
      if (p.from < lineTo && p.to > base) {
        seed.push([Math.max(p.from, base) - base, Math.min(p.to, lineTo) - base]);
      }
    }
    const kind = scanLine(line, base, selections, out, seed);
    if (kind === "prose") {
      if (prevSignificant === null || prevSignificant === "heading" || prevSignificant === "hr") {
        pushLine(out, base, "cm-md-line-first");
      }
    }
    if (kind !== "blank") prevSignificant = kind;
    base += line.length + 1;
  }
  out.sort((a, b) => a.from - b.from || a.to - b.to);
  return out;
}
