/**
 * Obsidian adapter for "Linked files" (#74): reads an entry note's links from
 * the metadata cache. Which of them to list is the pure `linkedFiles`.
 */

import { App, TFile } from "obsidian";
import { NoteLinkRef, linkPathOf } from "./linked-files";

/**
 * Every link in the note, in note order: properties first, then the links and
 * embeds in the text by position. Each resolves the way Obsidian resolves a
 * click on it (relative to the note), so `[[Moodboard.canvas]]` finds the
 * canvas wherever it lives.
 */
export function noteLinks(app: App, file: TFile): NoteLinkRef[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return [];
  const resolve = (link: string): string | null => {
    const linkpath = linkPathOf(link);
    if (!linkpath) return null;
    return app.metadataCache.getFirstLinkpathDest(linkpath, file.path)?.path ?? null;
  };
  const refs: NoteLinkRef[] = (cache.frontmatterLinks ?? []).map((l) => ({
    link: l.link,
    key: l.key,
    resolved: resolve(l.link),
  }));
  const inText = [...(cache.links ?? []), ...(cache.embeds ?? [])].sort(
    (a, b) => a.position.start.offset - b.position.start.offset
  );
  for (const l of inText) refs.push({ link: l.link, resolved: resolve(l.link) });
  return refs;
}

/**
 * Canvases that link to the note, by path: a canvas holding the note as a
 * card (or linking it from a text card). Obsidian indexes canvases as link
 * sources, so this is a cache read, not a scan of canvas files.
 */
export function canvasesLinkingTo(app: App, file: TFile): string[] {
  const out: string[] = [];
  for (const [source, targets] of Object.entries(app.metadataCache.resolvedLinks)) {
    if (source.endsWith(".canvas") && targets[file.path]) out.push(source);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * The file a link to nothing probably meant: one whose name matches but has
 * an extension the link left off (`[[Moodboard]]` for `Moodboard.canvas`).
 * Obsidian only assumes `.md` for a link with no extension.
 */
export function nearMatch(app: App, linkpath: string): TFile | null {
  const want = linkpath.toLowerCase();
  return (
    app.vault.getFiles().find((f) => {
      if (f.extension === "md") return false;
      const stem = f.path.slice(0, -(f.extension.length + 1)).toLowerCase();
      return stem === want || f.basename.toLowerCase() === want;
    }) ?? null
  );
}
