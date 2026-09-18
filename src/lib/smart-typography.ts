/**
 * Pure smart-typography rules for the manuscript editor — no CodeMirror or
 * Obsidian imports, so it's unit-testable in plain Node. Given the document
 * BEFORE a keystroke, the cursor, and the typed character, decide whether the
 * keystroke should become a typographic replacement instead of a literal insert.
 * The CM adapter (`views/scene-editor.ts`, an `EditorView.inputHandler`) applies
 * the returned change in place of the default insertion.
 *
 * Rules (each individually switchable — Settings → Write editor):
 *   - dashes:   `--` → en dash (–), a third `-` after `–` → em dash (—).
 *               A run of dashes at the start of a line is left alone (`---`
 *               thematic breaks). Inside a word (`re--do`) converts.
 *   - ellipsis: `...` → …
 *   - quotes:   `"`/`'` → opening (“ ‘) after start-of-line, whitespace, an
 *               opening bracket, an opening quote, or a dash; closing (” ’)
 *               otherwise — so an apostrophe inside a word becomes ’. Emphasis
 *               markers just before the cursor are looked through (`**"Hi` opens).
 *               Known limitation (shared with the Smart Typography plugin):
 *               leading elisions (`'tis`, `'90s`) get an opening quote.
 *
 * Never fires: for multi-character input (paste, IME commits), after a
 * backslash, inside inline code, inside a fenced code block, inside an
 * unclosed `[[wikilink`, inside a markdown link target `](…`, or inside an
 * unclosed HTML tag / comment opener (`<p align="` must keep straight quotes;
 * `<!--` must not become `<!–`).
 */

export interface TypographyRules {
  dashes: boolean;
  quotes: boolean;
  ellipsis: boolean;
}

export interface TypographyReplacement {
  /** ORIGINAL-doc range to replace; the typed character is consumed, not inserted separately. */
  from: number;
  to: number;
  insert: string;
}

const EN_DASH = "–";
const EM_DASH = "—";
const ELLIPSIS = "…";
const LDQUO = "“";
const RDQUO = "”";
const LSQUO = "‘";
const RSQUO = "’";

/** Characters after which a quote opens (besides whitespace / start). */
const OPENERS = `([{${LDQUO}${LSQUO}${EM_DASH}${EN_DASH}-`;
/** Emphasis markers skipped when looking at the character before a quote. */
const EMPHASIS_CHARS = "*_~";
const FENCE_RE = /^\s{0,3}(```|~~~)/;

function countChar(s: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) n++;
  return n;
}

// An unclosed `<tag …` or `<!--` before the cursor (`<` followed by a space, as
// in `a < b`, is prose and doesn't match).
const OPEN_TAG_RE = /<[a-zA-Z!/][^<>]*$/;

/** Code spans, code fences, wikilinks, link targets and HTML tags are never touched. */
function inProtectedContext(doc: string, lineStart: number, prefix: string): boolean {
  if (countChar(prefix, "`") % 2 === 1) return true;
  if (OPEN_TAG_RE.test(prefix)) return true;
  let fences = 0;
  for (const line of doc.slice(0, lineStart).split("\n")) {
    if (FENCE_RE.test(line)) fences++;
  }
  if (fences % 2 === 1) return true;
  const link = prefix.lastIndexOf("[[");
  if (link !== -1 && prefix.indexOf("]]", link) === -1) return true;
  const target = prefix.lastIndexOf("](");
  if (target !== -1 && prefix.indexOf(")", target) === -1) return true;
  return false;
}

/**
 * Decide the replacement for typing `typed` at `pos` in `doc` (the text BEFORE
 * the keystroke). Returns null when the default insert should happen.
 */
export function smartTypography(
  doc: string,
  pos: number,
  typed: string,
  rules: TypographyRules
): TypographyReplacement | null {
  if (typed.length !== 1) return null;
  const isQuote = typed === '"' || typed === "'";
  const applies =
    (typed === "-" && rules.dashes) || (typed === "." && rules.ellipsis) || (isQuote && rules.quotes);
  if (!applies) return null;

  pos = Math.max(0, Math.min(pos, doc.length));
  const lineStart = doc.lastIndexOf("\n", pos - 1) + 1;
  const prefix = doc.slice(lineStart, pos);
  if (inProtectedContext(doc, lineStart, prefix)) return null;

  if (typed === "-") {
    const prev = doc[pos - 1];
    if (prev === "-") {
      if (doc[pos - 2] === "\\") return null;
      let runStart = pos - 1;
      while (runStart > lineStart && doc[runStart - 1] === "-") runStart--;
      // A dash run at the start of the line is a thematic break in the making.
      if (/^\s{0,3}$/.test(doc.slice(lineStart, runStart))) return null;
      return { from: pos - 1, to: pos, insert: EN_DASH };
    }
    if (prev === EN_DASH) {
      if (doc[pos - 2] === "\\") return null;
      return { from: pos - 1, to: pos, insert: EM_DASH };
    }
    return null;
  }

  if (typed === ".") {
    if (doc[pos - 1] === "." && doc[pos - 2] === "." && doc[pos - 3] !== "\\") {
      return { from: pos - 2, to: pos, insert: ELLIPSIS };
    }
    return null;
  }

  // Quotes.
  if (doc[pos - 1] === "\\") return null;
  let i = pos;
  while (i > lineStart && EMPHASIS_CHARS.includes(doc[i - 1])) i--;
  const p = i > 0 ? doc[i - 1] : undefined;
  const opening = p === undefined || /\s/.test(p) || OPENERS.includes(p);
  const q = typed === '"' ? (opening ? LDQUO : RDQUO) : opening ? LSQUO : RSQUO;
  return { from: pos, to: pos, insert: q };
}
