/**
 * The small set of raw HTML tags Inkswell understands in scene prose. Shared by
 * the Write editor's syntax scanner (tags are markers — hidden unless touched;
 * `<p align>` / `<div align>` / `<center>` classify aligned lines), the
 * `html-align` compile step (aligned blocks → Word paragraph styles), and the
 * compile preflight (raw-HTML count). PURE — no Obsidian import.
 *
 * An ALLOWLIST, not "anything in angle brackets": a draft's `<Insert name>` or
 * `<TK>` stays prose, and an unknown tag is never hidden from the writer.
 */

/** Tags that stand on their own line / wrap a block. Revealed per line, like `#`. */
export const BLOCK_HTML_TAGS = ["p", "div", "center", "hr"] as const;
/** Tags that sit inside a line. Revealed per span, like `**`. */
export const INLINE_HTML_TAGS = [
  "span",
  "b",
  "i",
  "u",
  "em",
  "strong",
  "s",
  "del",
  "sub",
  "sup",
  "small",
  "mark",
  "font",
  "br",
] as const;
export const HTML_TAGS: readonly string[] = [...BLOCK_HTML_TAGS, ...INLINE_HTML_TAGS];

const BLOCK_SET: ReadonlySet<string> = new Set<string>(BLOCK_HTML_TAGS);
// `\b` after the name rejects `<pre>` / `<Insert name>` / `<img>`; `\/?` before
// `>` accepts `<br/>` and `<br />`. Attributes may not contain angle brackets.
const TAG_SOURCE = `<(\\/?)(${HTML_TAGS.join("|")})\\b(?:\\s[^<>]*)?\\/?>`;

/**
 * A FRESH matcher per call — the regex is stateful (`/g`). Group 1 is "/" for a
 * closing tag (else ""), group 2 the tag name as typed (compare lower-cased).
 */
export function htmlTagRe(): RegExp {
  return new RegExp(TAG_SOURCE, "gi");
}

export function isBlockHtmlTag(name: string): boolean {
  return BLOCK_SET.has(name.toLowerCase());
}

export type Align = "left" | "right" | "center" | "justify";

const ALIGN_ATTR_RE = /\balign\s*=\s*["']?\s*(left|right|center|justify)\b/i;
const ALIGN_STYLE_RE = /\btext-align\s*:\s*(left|right|center|justify)\b/i;

/**
 * The alignment an OPENING tag establishes for its block, or null: `<center>`;
 * `<p|div align="right">` (quotes optional); `<p|div style="text-align: right">`.
 */
export function tagAlignment(name: string, tagText: string): Align | null {
  const n = name.toLowerCase();
  if (n === "center") return "center";
  if (n !== "p" && n !== "div") return null;
  const m = ALIGN_ATTR_RE.exec(tagText) ?? ALIGN_STYLE_RE.exec(tagText);
  return m ? (m[1].toLowerCase() as Align) : null;
}
