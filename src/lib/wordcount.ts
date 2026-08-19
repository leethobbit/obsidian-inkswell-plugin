/**
 * The single source of truth for "what counts as a word" across Inkswell.
 *
 * Goals, sprints, the explorer counts, and compile stats all import this so the
 * numbers reconcile. Keep it markdown-aware but deliberately simple — exact
 * parity with other tools matters less than internal consistency.
 */

import { stripFrontmatter as stripLeadingFrontmatter } from "./frontmatter";

const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const WIKILINK_RE = /\[\[([^\]|]+\|)?([^\]]+)\]\]/g; // keep display text
const MD_LINK_RE = /\[([^\]]*)\]\([^)]*\)/g; // keep link text
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g; // drop images entirely
/**
 * Char-class source for CJK scripts counted one grapheme = one word (the 字数 /
 * 文字数 convention CJK writers calibrate goals against). Script_Extensions so
 * shared marks like ー and 々 count with their script — but scx ALSO covers
 * shared CJK punctuation (。、「」…), so anything matching a word must
 * additionally be \p{L}\p{N} (WORD_RE below does this). Exported for the codex
 * mention matcher, which must agree on what delimits a word.
 */
export const CJK_SRC =
  "\\p{scx=Han}\\p{scx=Hiragana}\\p{scx=Katakana}\\p{scx=Hangul}";

// A single CJK letter/numeral is a word; otherwise a run of non-CJK
// letters/numbers. The lookaheads intersect with the CJK class (first: keep
// punctuation out of the grapheme branch; rest: keep a Latin run from
// swallowing adjacent CJK) because character-class intersection needs the /v
// flag, and /v — like lookbehind — throws at parse time on iOS < 16.4.
const WORD_RE = new RegExp(
  `(?=[${CJK_SRC}])[\\p{L}\\p{N}]|(?![${CJK_SRC}])[\\p{L}\\p{N}](?:(?![${CJK_SRC}])[\\p{L}\\p{N}'’-])*`,
  "gu"
);

export interface WordCountOptions {
  /** Strip a leading YAML frontmatter block before counting. Default true. */
  stripFrontmatter?: boolean;
}

/**
 * Reduce markdown text to its plain prose, dropping syntax that shouldn't count
 * as words (frontmatter, code, comments, link targets, image refs, HTML).
 */
export function stripMarkdown(
  text: string,
  options: WordCountOptions = {}
): string {
  let out = text;
  if (options.stripFrontmatter !== false) {
    // The ONE splitter (lib/frontmatter): a body-leading `---` scene divider is
    // prose and its words count — only a real YAML mapping is stripped.
    out = stripLeadingFrontmatter(out);
  }
  out = out
    .replace(OBSIDIAN_COMMENT_RE, " ")
    .replace(HTML_COMMENT_RE, " ")
    .replace(FENCED_CODE_RE, " ")
    .replace(INLINE_CODE_RE, " ")
    .replace(IMAGE_RE, " ")
    .replace(WIKILINK_RE, (_m, _alias, display) => ` ${display} `)
    .replace(MD_LINK_RE, (_m, label) => ` ${label} `)
    .replace(HTML_TAG_RE, " ");
  return out;
}

/**
 * Tokenize prose (markdown already stripped) into countable words: one token
 * per CJK grapheme, one per non-CJK word. Shared with the Analysis panel so
 * its numbers reconcile with the manuscript count.
 */
export function tokenizeWords(prose: string): string[] {
  return prose.match(WORD_RE) ?? [];
}

/** Count words in a markdown string. */
export function countWords(text: string, options?: WordCountOptions): number {
  if (!text) return 0;
  return tokenizeWords(stripMarkdown(text, options)).length;
}
