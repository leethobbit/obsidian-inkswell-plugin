/**
 * In-memory Obsidian App fake: a vault over a Map<path, content> plus the
 * metadataCache / fileManager surfaces the impure src modules use. Built on the
 * classes in ./obsidian (the module vitest aliases `obsidian` to), so
 * `instanceof TFile` checks inside src code hold.
 *
 * Fidelity notes (the parts that MUST match Obsidian for the tests to mean
 * anything):
 *  - `fileManager.processFrontMatter` parses the YAML block, hands the object to
 *    the callback, and reserializes ONLY the frontmatter — the body after the
 *    closing fence is reattached byte-for-byte. That is the contract the
 *    "never touch scene bodies" invariant tests rely on.
 *  - `vault.process` is an atomic string transform (read→fn→write with no
 *    interleaving await), like the real API.
 *  - vault mutations fire the same events the ProjectStore subscribes to
 *    (`modify`/`rename`/`create`/`delete` + metadataCache `changed`).
 */

import type { App, TFile as ObsidianTFile } from "obsidian";
import { TAbstractFile, TFile, TFolder, parseYaml, stringifyYaml } from "./obsidian";

type Handler = (...args: unknown[]) => void;

class Emitter {
  private handlers = new Map<string, Set<Handler>>();

  on(name: string, cb: Handler): { detach: () => void } {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(cb);
    return { detach: () => set.delete(cb) };
  }

  trigger(name: string, ...args: unknown[]): void {
    for (const cb of this.handlers.get(name) ?? []) cb(...args);
  }
}

/** Frontmatter block at the top of a note: [full match incl. fences+newline, yaml text]. */
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export class FakeVault extends Emitter {
  private contents = new Map<string, string>();
  private nodes = new Map<string, TAbstractFile>();
  private root: TFolder;
  /** Monotonic clock for stat.mtime — every write bumps it (mtime caches rely on it). */
  private tick = 1;

  /** Not a FileSystemAdapter instance → pandoc/vaultHasFilesystem stay false. */
  adapter = {};

  constructor() {
    super();
    this.root = new TFolder();
    this.root.path = "/";
    this.root.name = "";
    this.nodes.set("/", this.root);
  }

  // -- helpers -----------------------------------------------------------------

  private folderAt(path: string): TFolder {
    if (path === "" || path === "/") return this.root;
    const existing = this.nodes.get(path);
    if (existing instanceof TFolder) return existing;
    if (existing) throw new Error(`Not a folder: ${path}`);
    const parent = this.folderAt(parentOf(path));
    const folder = new TFolder();
    folder.path = path;
    folder.name = path.slice(path.lastIndexOf("/") + 1);
    folder.parent = parent;
    parent.children.push(folder);
    this.nodes.set(path, folder);
    return folder;
  }

  private newFile(path: string): TFile {
    const parent = this.folderAt(parentOf(path));
    const file = new TFile();
    setFileFields(file, path);
    file.stat.ctime = file.stat.mtime = this.tick++;
    file.parent = parent;
    parent.children.push(file);
    this.nodes.set(path, file);
    return file;
  }

  /** Seed a file without firing events (initial vault state). */
  seed(path: string, content: string): TFile {
    if (this.nodes.has(path)) throw new Error(`Duplicate seed: ${path}`);
    const file = this.newFile(path);
    this.contents.set(path, content);
    return file;
  }

  /** Raw bytes currently stored for a path (for byte-identity assertions). */
  raw(path: string): string | undefined {
    return this.contents.get(path);
  }

  // -- Vault API surface ---------------------------------------------------------

  getAbstractFileByPath(path: string): TAbstractFile | null {
    if (path === "" || path === "/") return this.root;
    return this.nodes.get(path) ?? null;
  }

  getMarkdownFiles(): TFile[] {
    return [...this.nodes.values()].filter(
      (n): n is TFile => n instanceof TFile && n.extension === "md"
    );
  }

  getFiles(): TFile[] {
    return [...this.nodes.values()].filter((n): n is TFile => n instanceof TFile);
  }

  async read(file: TFile): Promise<string> {
    const c = this.contents.get(file.path);
    if (c === undefined) throw new Error(`File not found: ${file.path}`);
    return c;
  }

  async cachedRead(file: TFile): Promise<string> {
    return this.read(file);
  }

  async create(path: string, content: string): Promise<TFile> {
    if (this.nodes.has(path)) throw new Error(`File already exists: ${path}`);
    const file = this.newFile(path);
    this.contents.set(path, content);
    this.trigger("create", file);
    return file;
  }

  async createFolder(path: string): Promise<TFolder> {
    return this.folderAt(path);
  }

  async modify(file: TFile, content: string): Promise<void> {
    if (!this.contents.has(file.path)) throw new Error(`File not found: ${file.path}`);
    this.contents.set(file.path, content);
    file.stat.mtime = this.tick++;
    this.trigger("modify", file);
  }

  async process(file: TFile, fn: (data: string) => string): Promise<string> {
    const next = fn(await this.read(file));
    await this.modify(file, next);
    return next;
  }

  async rename(file: TAbstractFile, newPath: string): Promise<void> {
    const oldPath = file.path;
    const content = this.contents.get(oldPath);
    if (!(file instanceof TFile) || content === undefined) {
      throw new Error(`Cannot rename: ${oldPath}`);
    }
    this.contents.delete(oldPath);
    this.nodes.delete(oldPath);
    const oldParent = file.parent;
    if (oldParent) oldParent.children = oldParent.children.filter((c) => c !== file);

    setFileFields(file, newPath);
    const parent = this.folderAt(parentOf(newPath));
    file.parent = parent;
    parent.children.push(file);
    this.nodes.set(newPath, file);
    this.contents.set(newPath, content);
    this.trigger("rename", file, oldPath);
  }

  async delete(file: TAbstractFile): Promise<void> {
    this.removeNode(file);
    this.trigger("delete", file);
  }

  private removeNode(file: TAbstractFile): void {
    this.contents.delete(file.path);
    this.nodes.delete(file.path);
    if (file.parent) file.parent.children = file.parent.children.filter((c) => c !== file);
  }

  /** internal — used by the fileManager's trashFile */
  _trash(file: TAbstractFile): void {
    this.removeNode(file);
    this.trigger("delete", file);
  }
}

class FakeMetadataCache extends Emitter {
  constructor(private vault: FakeVault) {
    super();
  }

  getFileCache(file: TFile): { frontmatter?: Record<string, unknown> } | null {
    const content = this.vault.raw(file.path);
    if (content === undefined) return null;
    const m = content.match(FM_RE);
    if (!m) return {};
    try {
      const parsed = parseYaml(m[1]);
      return parsed && typeof parsed === "object"
        ? { frontmatter: parsed as Record<string, unknown> }
        : {};
    } catch {
      return {};
    }
  }
}

class FakeFileManager {
  /** Paths moved to trash (recoverable-delete assertions). */
  trashed: string[] = [];
  /** Real Obsidian queues processFrontMatter ops; serialize to match. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private vault: FakeVault) {}

  processFrontMatter(
    file: TFile,
    fn: (fm: Record<string, unknown>) => void
  ): Promise<void> {
    const run = this.chain.then(() => this.processFrontMatterNow(file, fn));
    this.chain = run.catch(() => {});
    return run;
  }

  private async processFrontMatterNow(
    file: TFile,
    fn: (fm: Record<string, unknown>) => void
  ): Promise<void> {
    const content = await this.vault.read(file);
    const m = content.match(FM_RE);
    const body = m ? content.slice(m[0].length) : content;
    let fm: Record<string, unknown> = {};
    if (m) {
      const parsed = parseYaml(m[1]);
      if (parsed && typeof parsed === "object") fm = parsed as Record<string, unknown>;
    }
    fn(fm);
    const next =
      Object.keys(fm).length === 0 ? body : `---\n${stringifyYaml(fm)}---\n${body}`;
    await this.vault.modify(file, next);
  }

  async trashFile(file: TAbstractFile): Promise<void> {
    this.trashed.push(file.path);
    this.vault._trash(file);
  }
}

export class FakeApp {
  vault = new FakeVault();
  metadataCache = new FakeMetadataCache(this.vault);
  fileManager = new FakeFileManager(this.vault);
  workspace = {
    getActiveFile: (): TFile | null => null,
    on: (): { detach: () => void } => ({ detach: () => {} }),
  };

  constructor(seed: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(seed)) this.vault.seed(path, content);
    // Vault edits invalidate metadata like the real app: modify → cache "changed".
    this.vault.on("modify", (file) => this.metadataCache.trigger("changed", file));
  }

  /** This fake, typed as the real App for passing into src functions. */
  asApp(): App {
    return this as unknown as App;
  }

  /** The seeded/created TFile at a path (throws when missing — test bug). */
  file(path: string): ObsidianTFile {
    const f = this.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) throw new Error(`No file at: ${path}`);
    return f as unknown as ObsidianTFile;
  }
}

/** Let queued microtasks/timers (store refresh coalescing, void async handlers) drain. */
export async function flushAsync(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

function setFileFields(file: TFile, path: string): void {
  file.path = path;
  file.name = path.slice(path.lastIndexOf("/") + 1);
  const dot = file.name.lastIndexOf(".");
  file.basename = dot < 0 ? file.name : file.name.slice(0, dot);
  file.extension = dot < 0 ? "" : file.name.slice(dot + 1);
}
