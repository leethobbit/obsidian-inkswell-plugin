/**
 * Opt-in cross-device writing history (`settings.syncWritingHistory`, #44).
 *
 * Model: `data.json`'s `writingLog` stays THIS device's log, untouched. When
 * enabled, this component (1) mirrors it into one markdown note for this
 * device — found by its `inkswell-log` id, never by path, so the user may
 * rename or move the note — and (2) discovers every OTHER device's note
 * vault-wide by that frontmatter key (AGENTS.md gotcha 7: never by folder),
 * parses it, and hands the snapshots to the tracker, whose merged view is what
 * Track, goals and streaks read. Only the owning device writes its note, so
 * there is nothing to conflict; the vault's own sync carries the notes.
 *
 * Disabling stops the mirror and drops the remote snapshots; the notes are
 * left for the user (deleting them is a one-time manual step).
 */

import { App, Component, Debouncer, TFile, debounce, normalizePath } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { joinPath, sanitizeSegment } from "../settings/folders";
import { DeviceIdentity } from "./device";
import {
  DeviceLogSnapshot,
  LOG_KEY,
  parseDeviceLog,
  serializeDeviceLog,
  snapshotOf,
} from "./device-log";
import { WritingLogData } from "./types";
import { WritingTracker } from "./writing-tracker";

export interface LogSyncDeps {
  app: App;
  identity: DeviceIdentity;
  /** This device's live log (the `data.json` object the tracker mutates). */
  log: WritingLogData;
  tracker: WritingTracker;
  /** Folder for a NEW note (existing notes are found by id wherever they live). */
  folder: () => string;
  markSelfWrite: (path: string) => void;
}

export class LogSync extends Component {
  private enabled = false;
  /** Last serialized text minus the timestamp — skip writes that change nothing. */
  private lastWritten: string | null = null;
  private writeSoon: Debouncer<[], void>;
  private rescanSoon: Debouncer<[], void>;

  constructor(private deps: LogSyncDeps) {
    super();
    this.writeSoon = debounce(() => void this.writeOwn(), 5000, true);
    this.rescanSoon = debounce(() => void this.rescan(), 500, true);
  }

  onload(): void {
    // Another device's note arrived or changed (Sync writes files → the cache
    // re-indexes); a deleted note drops out on the next rescan.
    this.registerEvent(
      this.deps.app.metadataCache.on("changed", (file) => {
        if (this.enabled && this.isLogNote(file) && this.logId(file) !== this.deps.identity.id) {
          this.rescanSoon();
        }
      })
    );
    this.registerEvent(
      this.deps.app.vault.on("delete", () => {
        if (this.enabled) this.rescanSoon();
      })
    );
  }

  onunload(): void {
    this.writeSoon.cancel();
    this.rescanSoon.cancel();
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.lastWritten = null;
      void this.rescan();
      this.schedule();
    } else {
      this.deps.tracker.setRemoteLogs([]);
    }
  }

  /** Called after every `data.json` save: mirror this device's log soon. */
  schedule(): void {
    if (this.enabled) this.writeSoon();
  }

  /** Mirror NOW (quit-time flush). */
  async flush(): Promise<void> {
    if (!this.enabled) return;
    this.writeSoon.cancel();
    await this.writeOwn();
  }

  private frontmatter(file: TFile): Record<string, unknown> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- cast tames Obsidian's `any`-typed frontmatter
    return this.deps.app.metadataCache.getFileCache(file)?.frontmatter as
      | Record<string, unknown>
      | undefined;
  }

  private logId(file: TFile): string | null {
    const v = this.frontmatter(file)?.[LOG_KEY];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }

  private isLogNote(file: TFile): boolean {
    return this.logId(file) !== null;
  }

  /** This device's note, wherever the user keeps it (by id, not path). */
  private ownNote(): TFile | null {
    for (const f of this.deps.app.vault.getMarkdownFiles()) {
      if (this.logId(f) === this.deps.identity.id) return f;
    }
    return null;
  }

  private async rescan(): Promise<void> {
    if (!this.enabled) return;
    const snaps: DeviceLogSnapshot[] = [];
    for (const f of this.deps.app.vault.getMarkdownFiles()) {
      const id = this.logId(f);
      if (!id || id === this.deps.identity.id) continue;
      const snap = parseDeviceLog(await this.deps.app.vault.cachedRead(f));
      if (snap) snaps.push(snap);
    }
    if (this.enabled) this.deps.tracker.setRemoteLogs(snaps);
  }

  private async writeOwn(): Promise<void> {
    if (!this.enabled) return;
    const own = this.ownNote();
    // The note's `device` property wins (the user can rename the device there).
    const fmName = own ? this.frontmatter(own)?.["device"] : undefined;
    const name =
      typeof fmName === "string" && fmName.trim() ? fmName.trim() : this.deps.identity.name;
    const text = serializeDeviceLog(
      snapshotOf(this.deps.identity.id, name, this.deps.log, new Date().toISOString())
    );
    const key = text.replace(/^updated: .*$/m, "");
    if (key === this.lastWritten) return;

    await tryFileOp(async () => {
      if (own) {
        this.deps.markSelfWrite(own.path);
        await this.deps.app.vault.process(own, () => text);
      } else {
        const folder = normalizePath(this.deps.folder());
        if (folder && folder !== "/" && !this.deps.app.vault.getAbstractFileByPath(folder)) {
          try {
            await this.deps.app.vault.createFolder(folder);
          } catch {
            /* exists / race */
          }
        }
        const base = `${sanitizeSegment(name) || "Device"} (${this.deps.identity.id.slice(0, 6)})`;
        const path = normalizePath(joinPath(folder, `${base}.md`));
        this.deps.markSelfWrite(path);
        const existing = this.deps.app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) await this.deps.app.vault.process(existing, () => text);
        else await this.deps.app.vault.create(path, text);
      }
      this.lastWritten = key;
    }, "Couldn't write the writing-history log note.");
  }
}
