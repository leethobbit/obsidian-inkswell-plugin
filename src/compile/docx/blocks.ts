/**
 * Compiled-manuscript markdown → a flat block list for the .docx writer. PURE.
 *
 * Input is what the compile pipeline produces (frontmatter stripped, links
 * flattened, to-do markers removed), so this handles the subset fiction uses:
 * headings, paragraphs, scene breaks, emphasis, block quotes, lists, aligned
 * HTML blocks, line breaks, and stand-alone images. Anything richer (tables,
 * footnotes, fenced code) degrades to plain paragraphs and is counted in
 * `unsupported` so the panel can say so. **Never drops prose**: every
 * non-markup character of the input lands in some block.
 */
import type { Align } from "../../lib/html-tags";
import { htmlTagRe, isBlockHtmlTag, tagAlignment } from "../../lib/html-tags";

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  code?: boolean;
}
export type Run = TextRun | { br: true };

export type Block =
  | { kind: "heading"; level: number; runs: Run[] }
  | {
      kind: "para";
      runs: Run[];
      align?: Align;
      quote?: boolean;
      /** List item: depth (0 = top level) and the literal marker to print. */
      list?: { depth: number; marker: string };
      /** Plain fallback (table row, footnote, code line): no first-line indent. */
      plain?: boolean;
    }
  | { kind: "sceneBreak" }
  | { kind: "image"; src: string; alt: string };

export interface ParsedManuscript {
  blocks: Block[];
  /** Tables, footnote definitions, and fenced code blocks flattened to paragraphs. */
  unsupported: number;
}

const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const SCENE_BREAK_RE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:~[ \t]*){3,}|#|§)$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const QUOTE_RE = /^ {0,3}>[ \t]?(.*)$/;
const LIST_RE = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const FOOTNOTE_DEF_RE = /^\[\^[^\]]+\]:\s*(.*)$/;
const IMAGE_LINE_RE = /^\s*!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\s*\)\s*$/;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

/** Parse a compiled manuscript into blocks. */
export function parseManuscript(markdown: string): ParsedManuscript {
  const lines = markdown.replace(/\r\n?/g, "\n").replace(HTML_COMMENT_RE, "").split("\n");
  const blocks: Block[] = [];
  let unsupported = 0;
  let para: string[] = [];
  let paraMeta: { align?: Align; quote?: boolean } = {};

  const flush = () => {
    if (para.length) {
      const runs = parseInline(joinLines(para));
      if (runs.some((r) => "br" in r || r.text.trim())) blocks.push({ kind: "para", runs, ...paraMeta });
    }
    para = [];
    paraMeta = {};
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      flush();
      unsupported++;
      const close = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}\\s*$`);
      for (i++; i < lines.length && !close.test(lines[i]); i++) {
        blocks.push({ kind: "para", runs: [{ text: lines[i], code: true }], plain: true });
      }
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length, runs: parseInline(heading[2]) });
      continue;
    }

    if (SCENE_BREAK_RE.test(line)) {
      flush();
      blocks.push({ kind: "sceneBreak" });
      continue;
    }

    const image = IMAGE_LINE_RE.exec(line);
    if (image) {
      flush();
      blocks.push({ kind: "image", alt: image[1], src: image[2].replace(/^<|>$/g, "") });
      continue;
    }

    if (TABLE_ROW_RE.test(line) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      flush();
      unsupported++;
      for (; i < lines.length && TABLE_ROW_RE.test(lines[i]); i++) {
        if (TABLE_SEP_RE.test(lines[i])) continue;
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        blocks.push({ kind: "para", runs: parseInline(cells.join(" · ")), plain: true });
      }
      i--;
      continue;
    }

    const footnote = FOOTNOTE_DEF_RE.exec(line);
    if (footnote) {
      flush();
      unsupported++;
      blocks.push({ kind: "para", runs: parseInline(line), plain: true });
      continue;
    }

    // Aligned HTML block: `<p align="right">…</p>`, `<center>…</center>`, possibly
    // spanning lines; ends at the matching close tag or a blank line. Each
    // `<br>`-separated segment stays one paragraph with line breaks.
    const aligned = openingAlignment(line);
    if (aligned) {
      flush();
      const body: string[] = [];
      for (; i < lines.length && lines[i].trim(); i++) {
        body.push(lines[i]);
        if (closesBlock(lines[i], aligned.name, body.length === 1 ? aligned.end : 0)) break;
      }
      const runs = parseInline(stripBlockTags(body.join("\n")));
      if (runs.some((r) => "br" in r || r.text.trim())) {
        blocks.push({ kind: "para", runs, align: aligned.align });
      }
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      if (!paraMeta.quote) flush();
      paraMeta.quote = true;
      if (!quote[1].trim()) {
        flush();
        paraMeta.quote = true;
        continue;
      }
      para.push(quote[1]);
      continue;
    }

    const list = LIST_RE.exec(line);
    if (list) {
      flush();
      const depth = Math.min(4, Math.floor(list[1].replace(/\t/g, "    ").length / 2));
      const marker = /\d/.test(list[2]) ? list[2] : "•";
      const item = [list[3]];
      // Lazy continuation lines (indented, not a new item or block).
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() &&
        /^[ \t]+/.test(lines[i + 1]) &&
        !LIST_RE.test(lines[i + 1])
      ) {
        item.push(lines[++i].trim());
      }
      blocks.push({ kind: "para", runs: parseInline(joinLines(item)), list: { depth, marker } });
      continue;
    }

    if (paraMeta.quote) flush();
    para.push(line);
  }
  flush();
  return { blocks, unsupported };
}

/** Join soft-wrapped lines; a trailing `\` or two spaces is a hard break. */
function joinLines(lines: string[]): string {
  let out = "";
  lines.forEach((raw, idx) => {
    const last = idx === lines.length - 1;
    if (!last && /(?: {2,}|\\)$/.test(raw)) {
      out += raw.replace(/(?: {2,}|\\)$/, "") + "<br>";
    } else {
      out += raw.trim() + (last ? "" : " ");
    }
  });
  return out.trim();
}

function openingAlignment(line: string): { align: Align; name: string; end: number } | null {
  const lead = /^\s*/.exec(line)?.[0].length ?? 0;
  const re = htmlTagRe();
  re.lastIndex = lead;
  const m = re.exec(line);
  if (!m || m.index !== lead || m[1] === "/" || !isBlockHtmlTag(m[2])) return null;
  const align = tagAlignment(m[2], m[0]);
  return align ? { align, name: m[2].toLowerCase(), end: m.index + m[0].length } : null;
}

function closesBlock(line: string, name: string, from: number): boolean {
  const re = htmlTagRe();
  re.lastIndex = from;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m[1] === "/" && m[2].toLowerCase() === name) return true;
  }
  return false;
}

/** Remove block-level tags (p/div/center/hr) but keep their content; newlines become breaks. */
function stripBlockTags(text: string): string {
  return text
    .replace(htmlTagRe(), (whole, _slash: string, name: string) => (isBlockHtmlTag(name) ? "" : whole))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("<br>");
}

// --- Inline -----------------------------------------------------------------

const ESCAPABLE = new Set("\\`*_{}[]()#+-.!~=|<>\"'");
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};
const ENTITY_RE = /^&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]+);/i;
const INLINE_TAG_RE = /^<(\/?)([a-z][a-z0-9]*)\b(?:\s[^<>]*)?\/?>/i;
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);

/** Parse inline markdown into formatted runs. */
export function parseInline(src: string): Run[] {
  const runs: Run[] = [];
  const st = { bold: false, italic: false, strike: false, underline: false };
  let buf = "";

  const flush = () => {
    if (!buf) return;
    const run: TextRun = { text: buf };
    if (st.bold) run.bold = true;
    if (st.italic) run.italic = true;
    if (st.strike) run.strike = true;
    if (st.underline) run.underline = true;
    runs.push(run);
    buf = "";
  };

  /** Is there a closing `delim` ahead of `from` (preceded by a non-space)? */
  const closerAhead = (delim: string, from: number, wordBound: boolean): boolean => {
    for (let j = src.indexOf(delim, from); j >= 0; j = src.indexOf(delim, j + 1)) {
      if (isSpace(src[j - 1])) continue;
      if (wordBound && isWordChar(src[j + delim.length])) continue;
      return true;
    }
    return false;
  };

  /** Toggle one emphasis flag at `i` for `delim`; returns false if it's literal here. */
  const toggle = (key: "bold" | "italic" | "strike", delim: string, i: number, wordBound: boolean): boolean => {
    const prev = src[i - 1];
    const next = src[i + delim.length];
    if (st[key]) {
      if (isSpace(prev) || (wordBound && isWordChar(next))) return false;
      flush();
      st[key] = false;
      return true;
    }
    if (isSpace(next) || (wordBound && isWordChar(prev))) return false;
    if (!closerAhead(delim, i + delim.length + 1, wordBound)) return false;
    flush();
    st[key] = true;
    return true;
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "\\" && i + 1 < src.length && ESCAPABLE.has(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    if (c === "`") {
      const tick = /^`+/.exec(src.slice(i))?.[0] ?? "`";
      const end = src.indexOf(tick, i + tick.length);
      if (end > 0) {
        flush();
        runs.push({ text: src.slice(i + tick.length, end).trim() || " ", code: true });
        i = end + tick.length;
        continue;
      }
      buf += tick;
      i += tick.length;
      continue;
    }

    if (c === "<") {
      const tag = INLINE_TAG_RE.exec(src.slice(i));
      if (tag) {
        const closing = tag[1] === "/";
        const name = tag[2].toLowerCase();
        if (name === "br") {
          flush();
          runs.push({ br: true });
        } else if (name === "b" || name === "strong") {
          flush();
          st.bold = !closing;
        } else if (name === "i" || name === "em") {
          flush();
          st.italic = !closing;
        } else if (name === "u") {
          flush();
          st.underline = !closing;
        } else if (name === "s" || name === "del" || name === "strike") {
          flush();
          st.strike = !closing;
        } else if (!isKnownTag(name)) {
          // Not a tag we know (`<Insert name>`, `<TK>`): it's the writer's prose.
          buf += tag[0];
        }
        i += tag[0].length;
        continue;
      }
    }

    if (c === "&") {
      const ent = ENTITY_RE.exec(src.slice(i));
      if (ent) {
        buf += decodeEntity(ent[1]) ?? ent[0];
        i += ent[0].length;
        continue;
      }
    }

    if (c === "~" && src[i + 1] === "~") {
      if (toggle("strike", "~~", i, false)) {
        i += 2;
        continue;
      }
    }
    if (c === "=" && src[i + 1] === "=") {
      // Obsidian highlight: no manuscript equivalent — keep the text, drop the marks.
      if (src.indexOf("==", i + 2) > i + 2 && !isSpace(src[i + 2])) {
        const end = src.indexOf("==", i + 2);
        buf += src.slice(i + 2, end);
        i = end + 2;
        continue;
      }
    }

    if (c === "*" || c === "_") {
      let runLen = 1;
      while (src[i + runLen] === c) runLen++;
      const wordBound = c === "_";
      let consumed = 0;
      let rest = runLen;
      // Close inner-first: italic before bold when both are open, so `***x***` and
      // `**_x_**` both unwind; opening order doesn't matter for flat runs.
      if (rest >= 2 && !(st.italic && !st.bold) && toggle("bold", c + c, i, wordBound)) {
        consumed += 2;
        rest -= 2;
      }
      if (rest >= 1 && toggle("italic", c, i + consumed, wordBound)) {
        consumed += 1;
        rest -= 1;
      }
      if (rest >= 2 && toggle("bold", c + c, i + consumed, wordBound)) {
        consumed += 2;
        rest -= 2;
      }
      if (consumed === 0) {
        buf += src.slice(i, i + runLen);
        i += runLen;
      } else {
        i += consumed;
      }
      continue;
    }

    buf += c;
    i++;
  }
  flush();
  return mergeRuns(runs);
}

const KNOWN_TAGS = new Set(["span", "sub", "sup", "small", "mark", "font", "p", "div", "center", "hr", "a", "img"]);
function isKnownTag(name: string): boolean {
  return KNOWN_TAGS.has(name);
}

function decodeEntity(body: string): string | null {
  if (body[0] === "#") {
    const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return null;
    return String.fromCodePoint(code);
  }
  return ENTITIES[body.toLowerCase()] ?? null;
}

/** Merge adjacent runs with identical formatting (smaller XML, cleaner Word doc). */
function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    const prev = out[out.length - 1];
    if (prev && !("br" in prev) && !("br" in r) && sameFormat(prev, r)) {
      prev.text += r.text;
    } else {
      out.push("br" in r ? r : { ...r });
    }
  }
  return out;
}

function sameFormat(a: TextRun, b: TextRun): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.strike === !!b.strike &&
    !!a.underline === !!b.underline &&
    !!a.code === !!b.code
  );
}

/** All visible text of a block list, for "never drops prose" checks. */
export function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.kind === "sceneBreak") return "";
      if (b.kind === "image") return b.alt;
      return b.runs.map((r) => ("br" in r ? " " : r.text)).join("");
    })
    .join(" ");
}
