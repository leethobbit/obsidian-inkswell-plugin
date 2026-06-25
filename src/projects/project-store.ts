/**
 * Observable registry of writing projects in the vault.
 *
 * Projects are discovered by scanning Obsidian's in-memory metadata cache for
 * notes carrying a `longform` frontmatter key — never by walking the filesystem
 * directly. The cache is used only for cheap *detection*: the nested
 * `longform.scenes` array is then re-parsed from the file's own frontmatter with
 * `parseYaml`, because the metadata cache does not reliably expose deeply-nested
 * frontmatter arrays (a flat-frontmatter design limitation). The store keeps
 * itself current via vault + metadata-cache events and notifies subscribers.
 */

import {
  App,
  Component,
  TFile,
  TFolder,
  normalizePath,
  parseYaml,
} from "obsidian";
import { parseDraft } from "./draft-serialization";
import {
  Draft,
  Project,
  ResolvedScene,
  InkswellProjectData,
  isMultiScene,
} from "./types";

type Subscriber = (projects: Project[]) => void;

export class ProjectStore extends Component {
  private app: App;
  private projects: Project[] = [];
  private subscribers = new Set<Subscriber>();
  private refreshQueued = false;
  private refreshing = false;
  private rerun = false;

  constructor(app: App) {
    super();
    this.app = app;
  }

  /** Begin watching the vault and build the initial project list. */
  onload(): void {
    const mc = this.app.metadataCache;
    const vault = this.app.vault;
    this.registerEvent(mc.on("changed", () => this.queueRefresh()));
    this.registerEvent(mc.on("resolved", () => this.queueRefresh()));
    this.registerEvent(vault.on("rename", () => this.queueRefresh()));
    this.registerEvent(vault.on("delete", () => this.queueRefresh()));
    this.registerEvent(vault.on("create", () => this.queueRefresh()));
    this.refresh();
  }

  /** Current snapshot of discovered projects. */
  getProjects(): Project[] {
    return this.projects;
  }

  /** Find a project by the vault path of its index note. */
  getProject(indexPath: string): Project | undefined {
    return this.projects.find((p) => p.vaultPath === indexPath);
  }

  /** Find the project + scene a vault path belongs to, if any. */
  findSceneByPath(
    path: string
  ): { project: Project; scene: ResolvedScene } | null {
    for (const p of this.projects) {
      const scene = p.scenes.find((s) => s.path === path);
      if (scene) return { project: p, scene };
    }
    return null;
  }

  /** Subscribe to project-list changes. Returns an unsubscribe function. */
  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    fn(this.projects);
    return () => this.subscribers.delete(fn);
  }

  /** Coalesce bursts of events into a single refresh on the next microtask. */
  private queueRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      this.refresh();
    });
  }

  /** Trigger a rebuild of the project list (runs asynchronously). */
  refresh(): void {
    void this.doRefresh();
  }

  /**
   * Rebuild the project list. Detection is cheap (metadata cache), but the
   * `longform` block — especially the nested `scenes` array — is re-parsed from
   * each candidate's own frontmatter. An in-flight guard coalesces overlapping
   * refreshes so the last request always wins.
   */
  private async doRefresh(): Promise<void> {
    if (this.refreshing) {
      this.rerun = true;
      return;
    }
    this.refreshing = true;
    try {
      const found: Project[] = [];
      for (const file of this.app.vault.getMarkdownFiles()) {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter as
          | Record<string, unknown>
          | undefined;
        if (!fm || !("longform" in fm)) continue; // cheap detection only
        const parsed = await this.readFrontmatter(file);
        const longform = parsed?.["longform"] ?? fm["longform"];
        if (!longform) continue;
        const draft = parseDraft(longform, file.basename);
        if (!draft) continue;
        found.push(
          this.buildProject(file, draft, parsed?.["inkswell"] ?? fm["inkswell"])
        );
      }
      found.sort((a, b) => a.draft.title.localeCompare(b.draft.title));
      this.projects = found;
      // Notify on every refresh: panels render vault data not captured by the
      // project list alone (codex entities, scene frontmatter like status/act),
      // so they must re-render on any metadata change. Focus loss while typing is
      // prevented by the host's focus-guard (inkswell-view renderActive), not by
      // suppressing notifications here.
      this.notify();
    } finally {
      this.refreshing = false;
      if (this.rerun) {
        this.rerun = false;
        void this.doRefresh();
      }
    }
  }

  /** Read and YAML-parse a note's frontmatter block (reliable for nested data). */
  private async readFrontmatter(
    file: TFile
  ): Promise<Record<string, unknown> | null> {
    try {
      const text = await this.app.vault.cachedRead(file);
      const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) return null;
      const parsed: unknown = parseYaml(m[1]);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private notify(): void {
    for (const fn of this.subscribers) fn(this.projects);
  }

  private buildProject(
    indexFile: TFile,
    draft: Draft,
    inkswellRaw: unknown
  ): Project {
    const inkswell = (inkswellRaw && typeof inkswellRaw === "object"
      ? (inkswellRaw as InkswellProjectData)
      : null);

    if (!isMultiScene(draft)) {
      return {
        vaultPath: indexFile.path,
        draft,
        scenes: [],
        unknownFiles: [],
        inkswell,
      };
    }

    const folderPath = this.resolveSceneFolder(indexFile, draft.sceneFolder);
    const scenes: ResolvedScene[] = draft.scenes.map((s) => ({
      ...s,
      path: this.resolveScenePath(folderPath, s.title),
    }));

    const known = new Set(draft.scenes.map((s) => s.title));
    const ignored = new Set(draft.ignoredFiles);
    const unknownFiles: string[] = [];
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (folder instanceof TFolder) {
      for (const child of folder.children) {
        if (
          child instanceof TFile &&
          child.extension === "md" &&
          !known.has(child.basename) &&
          !ignored.has(child.basename) &&
          child.path !== indexFile.path
        ) {
          unknownFiles.push(child.basename);
        }
      }
    }

    return {
      vaultPath: indexFile.path,
      draft,
      scenes,
      unknownFiles,
      inkswell,
    };
  }

  /** Resolve the scene folder relative to the index note's folder. */
  resolveSceneFolder(indexFile: TFile, sceneFolder: string): string {
    const base = indexFile.parent ? indexFile.parent.path : "";
    const rel = (sceneFolder || "/").replace(/^\/+/, "").replace(/\/+$/, "");
    if (!rel) return base || "/";
    return normalizePath(base ? `${base}/${rel}` : rel);
  }

  private resolveScenePath(folderPath: string, title: string): string | null {
    const candidate = normalizePath(
      folderPath === "/" ? `${title}.md` : `${folderPath}/${title}.md`
    );
    const file = this.app.vault.getAbstractFileByPath(candidate);
    return file instanceof TFile ? file.path : null;
  }
}

/**
 * Read the raw `inkswell` frontmatter block from a note's source as a fallback
 * (e.g. when only the file text is available). Most callers should use the
 * already-parsed value from the metadata cache instead.
 */
export function parseInkswellBlock(source: string): InkswellProjectData | null {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const fm = parseYaml(match[1]) as Record<string, unknown>;
    const inkswell = fm?.["inkswell"];
    return inkswell && typeof inkswell === "object"
      ? (inkswell as InkswellProjectData)
      : null;
  } catch {
    return null;
  }
}
