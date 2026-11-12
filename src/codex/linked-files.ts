/**
 * "Linked files" on a Codex entry (#74): the files an entry's note links to
 * that its profile doesn't already show (a mood-board canvas, a research PDF,
 * a reference note), plus the canvases that hold the entry's card. Pure (no
 * Obsidian import): the adapter (`linked-files-io.ts`) gathers the links from
 * the metadata cache and resolves them; this decides which to list and in
 * what order.
 *
 * Derived, never stored: the source of truth is the writer's own links (in
 * the note text, any property, or a canvas), which Obsidian keeps current
 * when a linked file is renamed.
 */

/** One link in the entry's note, as the metadata cache reports it. */
export interface NoteLinkRef {
  /** Link destination as written; may carry a `#heading` / `#^block` subpath. */
  link: string;
  /** Property the link sits under (`moodboard`, `refs.0`); absent for links in the note text. */
  key?: string;
  /** Vault path the link resolves to, or null when no such file exists. */
  resolved: string | null;
}

export interface LinkedFile {
  /** Resolved vault path, or null for a link to a file that doesn't exist. */
  path: string | null;
  /** The link path as written, minus any subpath — the label for a missing file. */
  linkpath: string;
}

export interface LinkedFilesOptions {
  /** The entry's own path: links to itself (`[[#Heading]]`) aren't listed. */
  self: string;
  /**
   * Properties whose links the panel already shows or manages: link fields,
   * the portrait, and the app keys (scope, pins), whose values link book index
   * notes rather than anything the writer attached.
   */
  shownKeys: ReadonlySet<string>;
  /** Is this path a codex entry? Entries are the Codex's own relations
   *  (shown and followed through link fields), not attached files. */
  isCodexEntry: (path: string) => boolean;
  /**
   * Files that link TO the entry and count as attached to it: the canvases
   * holding its card (a mood board made by dragging the note onto a canvas).
   * Listed after the note's own links, so a board needs no link back.
   */
  linkedFrom?: string[];
}

/** The link path of a link destination: "Notes#Ideas" → "Notes", "#Ideas" → "". */
export function linkPathOf(link: string): string {
  const hash = link.indexOf("#");
  return (hash === -1 ? link : link.slice(0, hash)).trim();
}

/** Does a frontmatter-link key (`refs`, `refs.0`) belong to one of `keys`? */
function underKey(key: string, keys: ReadonlySet<string>): boolean {
  const dot = key.indexOf(".");
  return keys.has(dot === -1 ? key : key.slice(0, dot));
}

/**
 * The entry's linked files: the files its note links to (in the note's order:
 * properties, then text), then the files that link to it (`linkedFrom`), then
 * links to files that don't exist (shown so a mistyped link is visible rather
 * than silently missing). A file is listed once however often it's linked.
 */
export function linkedFiles(refs: NoteLinkRef[], opts: LinkedFilesOptions): LinkedFile[] {
  const found: LinkedFile[] = [];
  const missing: LinkedFile[] = [];
  const seen = new Set<string>();
  const addFound = (path: string, linkpath: string): void => {
    if (path === opts.self || opts.isCodexEntry(path) || seen.has(path)) return;
    seen.add(path);
    found.push({ path, linkpath });
  };
  for (const ref of refs) {
    if (ref.key !== undefined && underKey(ref.key, opts.shownKeys)) continue;
    const linkpath = linkPathOf(ref.link);
    if (!linkpath) continue; // `[[#Heading]]`: the note itself
    if (ref.resolved !== null) {
      addFound(ref.resolved, linkpath);
    } else {
      // Unresolved links compare case-insensitively, as Obsidian resolves them.
      const id = `missing:${linkpath.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      missing.push({ path: null, linkpath });
    }
  }
  for (const path of opts.linkedFrom ?? []) addFound(path, path);
  return [...found, ...missing];
}
