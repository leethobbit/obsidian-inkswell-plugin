/**
 * Folder-layout helpers (pure, Obsidian-free, unit-tested). These decide WHERE new
 * Inkswell content scaffolds — a creation default only. Discovery stays vault-wide
 * (project + codex frontmatter scans), so these never constrain where existing
 * content may live. Likewise, the codex folder is chosen FROM an entity's scope; it
 * is cosmetic co-location — the `codex-series`/`codex-project` tag governs visibility,
 * never the path. See {@link ../codex/codex-scope}.
 */

import { EntityScope } from "../codex/types";

/** Settings fields these helpers depend on (subset of InkswellSettings). */
export interface FolderSettings {
  /** Parent folder new projects + the shared codex scaffold under ("" = vault root). */
  baseFolder: string;
  /** Codex subfolder name, used both shared and per-project. */
  codexFolder: string;
  /** When true, book-scoped codex co-locates in its project; series/global go shared. */
  coLocateCodex: boolean;
}

const sanitizeSegment = (s: string): string => s.trim().replace(/[\\/:*?"<>|]/g, "-");

/** Join non-empty, slash-trimmed segments into a vault path ("" when all empty). */
export function joinPath(...parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, "").trim())
    .filter(Boolean)
    .join("/");
}

/** Parent folder of a vault path ("" for a root-level file). */
export function parentFolder(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

/** The own-subfolder a new project scaffolds into: `<base>/<sanitized title>`. */
export function projectFolder(baseFolder: string, title: string): string {
  return joinPath(baseFolder, sanitizeSegment(title));
}

/**
 * Resolve the folder a new codex entity should be created in, given its scope and
 * (when known) the active project's index-note path. Book-scoped entries co-locate
 * in their project's folder when co-location is on; everything else (series, global,
 * or shared mode) lands in `<base>/<codexFolder>`.
 */
export function resolveCodexFolder(
  settings: FolderSettings,
  scope: EntityScope,
  activeProjectIndexPath?: string | null
): string {
  const name = settings.codexFolder.trim() || "Codex";
  if (settings.coLocateCodex && scope.project && !scope.series && activeProjectIndexPath) {
    return joinPath(parentFolder(activeProjectIndexPath), name);
  }
  return joinPath(settings.baseFolder, name);
}
