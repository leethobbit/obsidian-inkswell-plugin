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
  TAbstractFile,
  TFile,
  TFolder,
  normalizePath,
  parseYaml,
} from "obsidian";
import { tryFileOp } from "../lib/notify";
import { parseDraft } from "./draft-serialization";
import { renameSceneInIndex } from "./index-writer";
import { consumeExpectedRename, planSceneRename } from "./rename-heal";
import {
  Draft,
  Project,
  ResolvedScene,
  InkswellProjectData,
  isMultiScene,
} from "./types";
import {
  UnreadableIndex,
  diagnoseUnparsedIndex,
  frontmatterBlock,
  looksLikeBookBlock,
} from "./unreadable-index";

/**
 * `changed` lists the vault paths whose fingerprint entries differ from the
 * previously notified state (added, removed, or modified). It is absent on the
 * immediate subscribe-time call. Subscribers that don't care can ignore it;
 * the view uses it to soften rebuilds caused purely by its own writes.
 */
type Subscriber = (projects: Project[], changed?: ReadonlySet<string>) => void;

/** Cached per-index parse, valid while the file's path + mtime are unchanged. */
interface ParsedIndex {
  mtime: number;
  draft: Draft | null;
  inkswellRaw: unknown;
  /** The parsed `longform` value was meant as a book (see `looksLikeBookBlock`). */
  bookBlock: boolean;
}

/** Cached diagnosis of a note whose frontmatter didn't parse, by path + mtime. */
interface UnparsedNote {
  mtime: number;
  result: UnreadableIndex | null;
}

export class ProjectStore extends Component {
  private app: App;
  private projects: Project[] = [];
  private subscribers = new Set<Subscriber>();
  private refreshQueued = false;
  private refreshing = false;
  private rerun = false;
  /** Index-note frontmatter parses, keyed by path (invalidated by mtime). */
  private parseCache = new Map<string, ParsedIndex>();
  /** Book index notes Inkswell can't read (#69), path order. */
  private unreadable: UnreadableIndex[] = [];
  /** Diagnoses of notes whose frontmatter didn't parse, keyed by path. */
  private unparsedCache = new Map<string, UnparsedNote>();
  /** Per-path fingerprint of the last notified state (key = `C|path` /
   *  `I|path` / `P|path`); an unchanged map ⇒ notify is skipped, and the
   *  diff of the two maps becomes the notify's `changed` path set. */
  private lastFingerprint: Map<string, string> | null = null;

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
    this.registerEvent(
      vault.on("rename", (file, oldPath) => {
        void this.healRename(file, oldPath);
        this.queueRefresh();
      })
    );
    this.registerEvent(vault.on("delete", () => this.queueRefresh()));
    this.registerEvent(vault.on("create", () => this.queueRefresh()));
    this.refresh();
  }

  /** Current snapshot of discovered projects. */
  getProjects(): Project[] {
    return this.projects;
  }

  /** Notes that are a book's index but can't be read (frontmatter that won't
   *  parse, or a `longform` block with no book in it). Home lists them, so a
   *  broken index never just makes its book disappear. */
  getUnreadable(): UnreadableIndex[] {
    return this.unreadable;
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
   * Tier 1 self-heal: when a scene file is renamed in place (e.g. via Obsidian's
   * file explorer), rewrite its title in the index so the scene doesn't drop out
   * of the project. App-initiated renames are skipped — `renameScene` already
   * updates the index and pre-registers the new path. All matching/guards live
   * in the pure `planSceneRename`; this only does the I/O.
   */
  private async healRename(file: TAbstractFile, oldPath: string): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    if (consumeExpectedRename(file.path)) return;
    const plan = planSceneRename(this.projects, oldPath, file.path);
    if (!plan) return;
    const indexFile = this.app.vault.getAbstractFileByPath(plan.indexPath);
    if (indexFile instanceof TFile) {
      // Fired from a vault rename event, so a throw here would be an unhandled
      // rejection — surface it like every other I/O entry point. One
      // transaction rewrites the scene title AND the beat links against
      // current state (no window where beats point at a dead title).
      await tryFileOp(
        () => renameSceneInIndex(this.app, indexFile, plan.oldTitle, plan.newTitle),
        `Couldn't update the project index for the renamed scene "${plan.newTitle}".`
      );
    }
  }

  /**
   * Rebuild the project list. Detection is cheap (metadata cache); the
   * `longform` block — especially the nested `scenes` array — is re-parsed from
   * each candidate's own frontmatter, with the parse cached by path + mtime so
   * an unrelated vault event doesn't re-read every index. An in-flight guard
   * coalesces overlapping refreshes so the last request always wins.
   */
  private async doRefresh(): Promise<void> {
    if (this.refreshing) {
      this.rerun = true;
      return;
    }
    this.refreshing = true;
    try {
      const found: Project[] = [];
      const unreadable: UnreadableIndex[] = [];
      const liveCache = new Map<string, ParsedIndex>();
      const liveUnparsed = new Map<string, UnparsedNote>();
      // Fingerprint parts: everything the panels render FROM THE VAULT that the
      // host re-renders on notify — project indexes, codex notes (any note with
      // a `codex` key; discovery is vault-wide, gotcha #7), and resolved scene
      // files (their frontmatter drives status/act/POV badges). If none of these
      // changed, the notify is skipped and no panel rebuild happens.
      const parts = new Map<string, string>();
      // Intentional whole-vault scan: Longform/Inkswell projects may live in any
      // folder (drop-in Longform compat imposes no structure), so discovery can't
      // be scoped. Detection is cache-only — full frontmatter is read only for the
      // handful of candidates that carry a `longform` key (see the guard below).
      for (const file of this.app.vault.getMarkdownFiles()) {
        const cache = this.app.metadataCache.getFileCache(file);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter; without it the reads below trip no-unsafe-assignment
        const fm = cache?.frontmatter as Record<string, unknown> | undefined;
        if (!fm) {
          // Frontmatter Obsidian couldn't parse: the cache drops `frontmatter`
          // but still types the block as a `yaml` section (measured). If it's
          // a book's index, report it instead of letting the book vanish
          // (#69). Only these notes are read, once per mtime.
          if (cache?.sections?.[0]?.type === "yaml") {
            const bad = await this.diagnoseUnparsed(file, liveUnparsed);
            if (bad) {
              unreadable.push(bad);
              parts.set(`X|${file.path}`, `${file.stat.mtime}|${bad.reason}`);
            }
          }
          continue;
        }
        if ("codex" in fm) parts.set(`C|${file.path}`, String(file.stat.mtime));
        if (!("longform" in fm)) continue; // cheap detection only
        parts.set(`I|${file.path}`, String(file.stat.mtime));

        const cached = this.parseCache.get(file.path);
        let entry: ParsedIndex;
        if (cached && cached.mtime === file.stat.mtime) {
          entry = cached;
        } else {
          const parsed = await this.readFrontmatter(file);
          const longform = parsed?.["longform"] ?? fm["longform"];
          entry = {
            mtime: file.stat.mtime,
            // NOTE: the parsed draft is cached and shared across refreshes —
            // treat Draft objects as immutable (updateScenes and friends already
            // build new ones; never mutate draft.scenes in place).
            draft: longform ? parseDraft(longform, file.basename) : null,
            inkswellRaw: parsed?.["inkswell"] ?? fm["inkswell"],
            bookBlock: looksLikeBookBlock(longform),
          };
        }
        liveCache.set(file.path, entry);
        if (!entry.draft) {
          // A `longform` block with no book in it (no format, no scenes).
          if (entry.bookBlock) {
            unreadable.push({ path: file.path, reason: "longform" });
            parts.set(`X|${file.path}`, `${file.stat.mtime}|longform`);
          }
          continue;
        }
        found.push(this.buildProject(file, entry.draft, entry.inkswellRaw));
      }
      this.parseCache = liveCache; // auto-prunes renamed/deleted indexes
      this.unparsedCache = liveUnparsed;
      found.sort((a, b) => a.draft.title.localeCompare(b.draft.title));
      unreadable.sort((a, b) => a.path.localeCompare(b.path));

      for (const p of found) {
        const scenes = p.scenes
          .map((s) => {
            const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
            // A scene's own frontmatter edits fingerprint under ITS path (`S|`),
            // so the notify's `changed` set names the scene file the inline form
            // actually wrote — the project entry only tracks structure.
            if (f instanceof TFile) {
              parts.set(`S|${f.path}`, String(f.stat.mtime));
              return f.path;
            }
            return `${s.title}:missing`;
          })
          .join(",");
        parts.set(`P|${p.vaultPath}`, `${scenes}|U:${p.unknownFiles.join(",")}`);
      }
      const changed = diffFingerprints(this.lastFingerprint, parts);
      if (this.lastFingerprint && changed.size === 0) return; // nothing panels render changed

      this.lastFingerprint = parts;
      this.projects = found;
      this.unreadable = unreadable;
      this.notify(changed);
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
      const yaml = frontmatterBlock(await this.app.vault.cachedRead(file));
      if (yaml === null) return null;
      const parsed: unknown = parseYaml(yaml);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  /** Is this note (whose frontmatter didn't parse) a book's index? Cached by
   *  path + mtime in `live`, so an unchanged note is read once. */
  private async diagnoseUnparsed(
    file: TFile,
    live: Map<string, UnparsedNote>
  ): Promise<UnreadableIndex | null> {
    const cached = this.unparsedCache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) {
      live.set(file.path, cached);
      return cached.result;
    }
    let result: UnreadableIndex | null = null;
    try {
      result = diagnoseUnparsedIndex(file.path, await this.app.vault.cachedRead(file), parseYaml);
    } catch {
      result = null; // couldn't read it at all: nothing to say about it
    }
    live.set(file.path, { mtime: file.stat.mtime, result });
    return result;
  }

  private notify(changed: ReadonlySet<string>): void {
    for (const fn of this.subscribers) fn(this.projects, changed);
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
 * Vault paths whose fingerprint entry was added, removed, or modified between
 * two snapshots. Keys are `C|path` / `I|path` / `P|path`; the 2-char prefix is
 * stripped so a note that is both an index and a codex entry dedupes to one
 * path. (`|` can't appear in a vault path — Obsidian reserves it.)
 */
function diffFingerprints(
  prev: ReadonlyMap<string, string> | null,
  next: ReadonlyMap<string, string>
): Set<string> {
  const changed = new Set<string>();
  for (const [key, value] of next) {
    if (prev?.get(key) !== value) changed.add(key.slice(2));
  }
  if (prev) {
    for (const key of prev.keys()) {
      if (!next.has(key)) changed.add(key.slice(2));
    }
  }
  return changed;
}
