/**
 * Books whose index note Inkswell can't read (#69). A sync merge, another
 * plugin or a hand edit can leave an index's frontmatter unparseable (one
 * misplaced space or a duplicated key is enough), and discovery used to skip
 * such a note in silence, so the book just vanished from Home. The store
 * reports these instead, and Home lists them with a way to open the note.
 *
 * Pure (no Obsidian import): the store supplies the note text and the parser.
 */

export type UnreadableReason = "yaml" | "longform";

export interface UnreadableIndex {
  /** Vault path of the index note. */
  path: string;
  /** "yaml": the frontmatter doesn't parse. "longform": it parses, but the
   *  `longform` block names no format and no scenes. */
  reason: UnreadableReason;
  /** For "yaml", the note line the parser stopped at (1-based, counting the
   *  opening `---`), when it says. */
  line?: number;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** The YAML between a note's opening `---` fences, or null when it has none. */
export function frontmatterBlock(text: string): string | null {
  const m = text.match(FRONTMATTER_RE);
  return m ? m[1] : null;
}

/** True when raw frontmatter has a top-level `longform` key. Read as text, so
 *  it works when the YAML itself won't parse. */
export function declaresLongform(yaml: string): boolean {
  return /^longform[ \t]*:/m.test(yaml);
}

/**
 * The note line a YAML error points at. Obsidian's parser says "… at line 9,
 * column 1:" counting from the first line INSIDE the fences, so add one for
 * the opening `---` to match the line the writer sees in the note.
 */
export function yamlErrorLine(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = /\bat line (\d+)/.exec(msg);
  const line = m ? Number(m[1]) : 0;
  return line > 0 ? line + 1 : undefined;
}

/**
 * Diagnose a note whose frontmatter Obsidian couldn't parse. Returns a "yaml"
 * entry only when it's a book's index (declares `longform`) and the YAML
 * really fails. Any other note with broken properties isn't ours to report,
 * and a block that parses here means the metadata cache simply hasn't caught
 * up (its next "changed" event lists the book normally).
 */
export function diagnoseUnparsedIndex(
  path: string,
  text: string,
  parse: (yaml: string) => unknown
): UnreadableIndex | null {
  const yaml = frontmatterBlock(text);
  if (yaml === null || !declaresLongform(yaml)) return null;
  try {
    parse(yaml);
    return null;
  } catch (err) {
    const line = yamlErrorLine(err);
    return line ? { path, reason: "yaml", line } : { path, reason: "yaml" };
  }
}

/** True when a parsed `longform` value was meant as a book's block: an object,
 *  or empty (`longform:` with nothing under it, e.g. after a bad merge). A
 *  scalar or list is some other tool's property, so it isn't reported. */
export function looksLikeBookBlock(longform: unknown): boolean {
  return longform === null || (typeof longform === "object" && !Array.isArray(longform));
}
