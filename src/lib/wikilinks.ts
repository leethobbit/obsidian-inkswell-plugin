/**
 * Pure wikilink scanner for the Write editor (no Obsidian imports — unit-tested).
 * Finds `[[Target]]`, `[[Target|alias]]`, `[[Target#Heading]]`, `[[Target#^block]]`
 * and combinations in a single line of text, reporting where the link sits and
 * which slice of it is the visible content (the alias when present, else the
 * written `Target#Heading`). Embeds (`![[…]]`) are skipped: the editor renders
 * them as plain text and the compile step handles them.
 *
 * The compile flatten-links step (compile/steps.ts) keeps its own regex on
 * purpose — it decides what the READER sees; this one decides what the WRITER
 * sees and clicks.
 */

export interface WikilinkMatch {
  /** Offsets of the whole `[[…]]` in the scanned text. */
  from: number;
  to: number;
  /** Note name before any `#` / `|` (trimmed; may be "" for a same-note `[[#Heading]]`). */
  target: string;
  /** The `#Heading` / `#^block` part without the `#`, when present. */
  heading?: string;
  /** The alias after `|`, when present and non-blank. */
  alias?: string;
  /** What Obsidian's link APIs want: `Target#Heading` as written (no alias). */
  linktext: string;
  /** What the writer sees: the alias, else `linktext`. */
  display: string;
  /** Offsets of the visible content slice within the scanned text. */
  contentFrom: number;
  contentTo: number;
}

// Group 1: optional `!` (embed marker). 2: target. 3: heading. 4: alias.
const WIKILINK_RE = /(!?)\[\[([^\]|#\n]*)(?:#([^\]|\n]*))?(?:\|([^\]\n]*))?\]\]/g;

/** Every wikilink in `text` (a single line, though multi-line input is tolerated). */
export function scanWikilinks(text: string): WikilinkMatch[] {
  const out: WikilinkMatch[] = [];
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    const [whole, bang, rawTarget, heading, rawAlias] = m;
    if (bang) continue; // embed — not a navigable link in the editor
    const target = rawTarget.trim();
    if (!target && heading === undefined) continue; // `[[]]` / `[[   ]]`
    const from = m.index;
    const to = from + whole.length;
    const linktext = heading === undefined ? target : `${target}#${heading}`;
    const alias = rawAlias !== undefined && rawAlias.trim() ? rawAlias : undefined;
    // Content = the alias slice when aliased, else the written target#heading.
    const innerFrom = from + 2;
    const writtenLen = rawTarget.length + (heading === undefined ? 0 : 1 + heading.length);
    let contentFrom: number;
    let contentTo: number;
    if (alias !== undefined) {
      contentFrom = innerFrom + writtenLen + 1; // past the `|`
      contentTo = to - 2;
    } else {
      contentFrom = innerFrom;
      contentTo = innerFrom + writtenLen;
    }
    out.push({
      from,
      to,
      target,
      ...(heading === undefined ? {} : { heading }),
      ...(alias === undefined ? {} : { alias }),
      linktext,
      display: alias ?? linktext,
      contentFrom,
      contentTo,
    });
  }
  return out;
}

/** The wikilink whose span contains `pos` (inclusive edges), if any. */
export function wikilinkAt(text: string, pos: number): WikilinkMatch | null {
  return scanWikilinks(text).find((l) => l.from <= pos && pos <= l.to) ?? null;
}
