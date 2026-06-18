/**
 * Observable registry of writing projects in the vault.
 *
 * Projects are discovered by scanning Obsidian's in-memory metadata cache for
 * notes carrying a `longform` frontmatter key — never by walking the filesystem
 * directly. The store keeps itself current via vault + metadata-cache events and
 * notifies subscribers (e.g. the explorer view) on any change.
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

  /** Rebuild the project list from the metadata cache and notify subscribers. */
  refresh(): void {
    const found: Project[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const longform = cache?.frontmatter?.["longform"];
      if (!longform) continue;
      const draft = parseDraft(longform, file.basename);
      if (!draft) continue;
      found.push(this.buildProject(file, draft, cache?.frontmatter?.["inkswell"]));
    }
    found.sort((a, b) => a.draft.title.localeCompare(b.draft.title));
    this.projects = found;
    this.notify();
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
