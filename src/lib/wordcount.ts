/**
 * The single source of truth for "what counts as a word" across Inkswell.
 *
 * Goals, sprints, the explorer counts, and compile stats all import this so the
 * numbers reconcile. Keep it markdown-aware but deliberately simple — exact
 * parity with other tools matters less than internal consistency.
 */

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const WIKILINK_RE = /\[\[([^\]|]+\|)?([^\]]+)\]\]/g; // keep display text
const MD_LINK_RE = /\[([^\]]*)\]\([^)]*\)/g; // keep link text
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g; // drop images entirely
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

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
    out = out.replace(FRONTMATTER_RE, "");
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

/** Count words in a markdown string. */
export function countWords(text: string, options?: WordCountOptions): number {
  if (!text) return 0;
  const prose = stripMarkdown(text, options);
  const matches = prose.match(WORD_RE);
  return matches ? matches.length : 0;
}
