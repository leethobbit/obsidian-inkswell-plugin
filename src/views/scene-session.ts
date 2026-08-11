/**
 * SceneSession: the single owner of "the scene currently loaded in the Write
 * editor" — its body/frontmatter baselines, dirty/conflict state, save
 * serialization, debounced autosave, and external-change handling. WritePanel
 * creates one per scene load and drops the reference on switch, so an orphaned
 * session's async continuations can only touch the orphaned session (no
 * cross-scene state clobbering).
 *
 * The safety contract, in order of importance:
 *  1. A save NEVER overwrites disk text it hasn't seen: the on-disk body is
 *     compared to the loaded baseline INSIDE `vault.process`; a mismatch aborts
 *     the write (throw ⇒ no modify) and flips the session to "conflict" for the
 *     user to arbitrate. Frontmatter-only disk changes are not conflicts.
 *  2. Saves are serialized on one promise chain, so a blur-save, an autosave,
 *     and a teardown flush can never interleave their read-modify-writes.
 *  3. `flush()` captures the editor text SYNCHRONOUSLY, so callers may destroy
 *     the editor immediately after calling it — and `load()` callers await the
 *     previous session's flush before reading, so a rebuilt editor can never be
 *     seeded from pre-save bytes.
 *
 * EditorView-free by design (`getDoc` is a thunk): fully unit-testable against
 * the FakeApp harness.
 */

import { App, Notice, TFile, debounce, Debouncer } from "obsidian";
import { splitFrontmatter } from "../lib/frontmatter";
import { writeConflictBackup } from "../lib/conflict-backup";

export type SessionState = "clean" | "dirty" | "conflict";
export type SaveResult = "saved" | "noop" | "conflict" | "error";

/** Thrown out of the `vault.process` transform to abort a stale write. */
export class ConflictError extends Error {
  constructor() {
    super("Scene changed on disk since it was loaded.");
  }
}

export interface SceneSessionOptions {
  app: App;
  file: TFile;
  /** Read the live editor text; null once the editor is gone / re-owned. */
  getDoc: () => string | null;
  /** State changed (clean/dirty/conflict) — the panel re-renders its banner. */
  onStateChange: (state: SessionState) => void;
  /** Disk changed while clean and the session reloaded in place — the panel
   *  must reseed the editor with `body`. */
  onReloaded: (body: string) => void;
  /** Autosave debounce in ms (default 2000; tests pass 0-ish values). */
  autosaveMs?: number;
}

export class SceneSession {
  readonly file: TFile;
  /** Body baseline: what this session believes is on disk. */
  loadedBody: string;
  /** Frontmatter of the loaded scene (kept fresh on every save/reload). */
  loadedFrontmatter: string;
  state: SessionState = "clean";

  private app: App;
  private getDoc: () => string | null;
  private onStateChange: (state: SessionState) => void;
  private onReloaded: (body: string) => void;
  /** Serializes save/flush/resolve/external-modify ops (persistChain pattern). */
  private chain: Promise<unknown> = Promise.resolve();
  private autosave: Debouncer<[], void>;
  private disposed = false;

  private constructor(opts: SceneSessionOptions, frontmatter: string, body: string) {
    this.app = opts.app;
    this.file = opts.file;
    this.getDoc = opts.getDoc;
    this.onStateChange = opts.onStateChange;
    this.onReloaded = opts.onReloaded;
    this.loadedFrontmatter = frontmatter;
    this.loadedBody = body;
    this.autosave = debounce(
      () => void this.save("editor-alive"),
      opts.autosaveMs ?? 2000,
      false
    );
  }

  /** Read the scene and seed baselines. Factory — never half-initialized. */
  static async load(opts: SceneSessionOptions): Promise<SceneSession> {
    const content = await opts.app.vault.cachedRead(opts.file);
    const { frontmatter, body } = splitFrontmatter(content);
    return new SceneSession(opts, frontmatter, body);
  }

  /** A live editor edit: mark dirty and (re)arm the autosave. */
  noteChange(): void {
    if (this.disposed || this.state === "conflict") return; // banner arbitrates; don't spin on ConflictError
    this.setState("dirty");
    this.autosave();
  }

  /**
   * Save the current editor text (captured when the queued op RUNS, so the
   * latest keystrokes win). Serialized with every other session op.
   */
  save(ctx: "editor-alive" | "teardown" = "editor-alive"): Promise<SaveResult> {
    return this.enqueue(() => {
      const body = this.getDoc();
      if (body === null) return Promise.resolve<SaveResult>("noop"); // editor gone; flush() handles teardown
      return this.writeBody(body, ctx);
    });
  }

  /**
   * Teardown flush: capture the editor text NOW (synchronously — the caller
   * may destroy the editor on the next line), cancel the pending autosave, and
   * queue the final save. Await the returned promise wherever ordering matters
   * (scene switch re-seeds, app quit).
   */
  flush(): Promise<SaveResult> {
    const body = this.getDoc();
    this.autosave.cancel();
    if (body === null) return Promise.resolve("noop");
    return this.enqueue(() => this.writeBody(body, "teardown"));
  }

  /**
   * A vault `modify` landed for this file. Classified by CONTENT, not by time
   * window: disk body === baseline ⇒ our own write (or an identical one) —
   * refresh the frontmatter baseline and move on. A different disk body with a
   * clean editor reloads in place (baselines + `onReloaded`); with unsaved
   * edits it flips to "conflict" — the user's words stay in the buffer and the
   * banner arbitrates.
   */
  handleExternalModify(): Promise<void> {
    return this.enqueue(async () => {
      let content: string;
      try {
        content = await this.app.vault.cachedRead(this.file);
      } catch {
        return; // deleted/unreadable — deletion flows own their messaging
      }
      const { frontmatter, body } = splitFrontmatter(content);
      if (body === this.loadedBody) {
        this.loadedFrontmatter = frontmatter;
        return;
      }
      const doc = this.getDoc();
      if (doc === null || doc === this.loadedBody) {
        this.loadedBody = body;
        this.loadedFrontmatter = frontmatter;
        this.setState("clean");
        this.onReloaded(body);
      } else {
        this.setState("conflict");
      }
    });
  }

  /**
   * Conflict resolution: adopt the disk version. The editor's unsaved text is
   * backed up FIRST (to "Inkswell conflicts"), then baselines reset from disk
   * and `onReloaded` reseeds the editor. Returns the backup path ("" when the
   * editor held nothing worth backing up).
   */
  resolveReloadFromDisk(): Promise<string> {
    return this.enqueue(async () => {
      const doc = this.getDoc();
      const content = await this.app.vault.cachedRead(this.file);
      const { frontmatter, body } = splitFrontmatter(content);
      let backupPath = "";
      if (doc !== null && doc.trim() && doc !== body) {
        backupPath = await writeConflictBackup(
          this.app,
          this.file.basename,
          "unsaved editor text",
          this.loadedFrontmatter + doc
        );
      }
      this.loadedBody = body;
      this.loadedFrontmatter = frontmatter;
      this.setState("clean");
      this.onReloaded(body);
      return backupPath;
    });
  }

  /**
   * Conflict resolution: keep the editor's version. The DISK version is backed
   * up FIRST, then the editor text is force-written (no baseline check — the
   * user just chose). Returns the backup path.
   */
  resolveKeepMine(): Promise<string> {
    return this.enqueue(async () => {
      const doc = this.getDoc();
      if (doc === null) return "";
      const diskContent = await this.app.vault.cachedRead(this.file);
      const backupPath = await writeConflictBackup(
        this.app,
        this.file.basename,
        "disk version",
        diskContent
      );
      await this.app.vault.process(this.file, (cur) => {
        const { frontmatter } = splitFrontmatter(cur);
        this.loadedFrontmatter = frontmatter;
        return frontmatter + doc;
      });
      this.loadedBody = doc;
      this.setState("clean");
      return backupPath;
    });
  }

  /** Detach: cancel the autosave and mute callbacks. Callers that care about
   *  the final write call (and may await) `flush()` FIRST. */
  dispose(): void {
    this.disposed = true;
    this.autosave.cancel();
  }

  // --- internals -------------------------------------------------------------

  /** Queue an op on the serialization chain; the chain never rejects. */
  private enqueue<T>(op: () => Promise<T> | T): Promise<T> {
    const run = this.chain.then(op);
    this.chain = run.catch(() => {});
    return run;
  }

  private setState(next: SessionState): void {
    if (this.state === next) return;
    this.state = next;
    if (!this.disposed) this.onStateChange(next);
  }

  /** After a successful save: clean if the editor matches what we wrote. */
  private reconcileState(savedBody: string): void {
    const doc = this.getDoc();
    this.setState(doc === null || doc === savedBody ? "clean" : "dirty");
  }

  private async writeBody(body: string, ctx: "editor-alive" | "teardown"): Promise<SaveResult> {
    if (this.state === "conflict") return "conflict"; // banner owns the file until resolved
    if (body === this.loadedBody) {
      this.reconcileState(body);
      return "noop";
    }
    try {
      // Atomic read-check-write: the CURRENT frontmatter is reattached and the
      // CURRENT body must equal the baseline — otherwise the disk holds words
      // this session never saw, and writing would destroy them.
      await this.app.vault.process(this.file, (cur) => {
        const { frontmatter, body: diskBody } = splitFrontmatter(cur);
        if (diskBody !== this.loadedBody) throw new ConflictError();
        this.loadedFrontmatter = frontmatter;
        return frontmatter + body;
      });
      this.loadedBody = body;
      this.reconcileState(body);
      return "saved";
    } catch (e) {
      if (e instanceof ConflictError) {
        this.setState("conflict");
        return "conflict";
      }
      console.error("[Inkswell] Failed to save scene body", e);
      await this.reportSaveFailure(body, ctx);
      return "error";
    }
  }

  /** Honest failure messaging: name where the text still lives. */
  private async reportSaveFailure(body: string, ctx: "editor-alive" | "teardown"): Promise<void> {
    if (ctx === "editor-alive") {
      new Notice(
        `Inkswell couldn't save "${this.file.basename}". Your text is still in the editor — copy it out if this keeps happening.`
      );
      return;
    }
    // The editor is going away — the old "still in the editor" claim would be a
    // lie here. Best-effort backup, then say exactly where the words are.
    try {
      const path = await writeConflictBackup(
        this.app,
        this.file.basename,
        "unsaved editor text",
        this.loadedFrontmatter + body
      );
      new Notice(`Inkswell couldn't save "${this.file.basename}" — your unsaved text was backed up to "${path}".`);
    } catch (backupErr) {
      console.error("[Inkswell] Backup also failed; dumping unsaved text:", backupErr);
      console.error(body);
      new Notice(
        `Inkswell couldn't save "${this.file.basename}" or back it up — the unsaved text was printed to the developer console (Ctrl/Cmd-Shift-I).`
      );
    }
  }
}
