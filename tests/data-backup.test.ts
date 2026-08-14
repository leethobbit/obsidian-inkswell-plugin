/**
 * Daily rolling data.json backups: written once per calendar day from the
 * pre-session state, never sourced from a corrupt file, pruned to the newest
 * seven, and never fatal to plugin load. data.json is the one Inkswell data
 * store Obsidian's File Recovery can't see (it lives outside the vault), so
 * these backups are the writing history's only safety net.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { backupPluginData } from "../src/lib/data-backup";
import type { App } from "obsidian";

const DIR = ".obsidian/plugins/inkswell";

/** Minimal in-memory DataAdapter covering exactly what backupPluginData uses. */
function fakeAdapterApp() {
  const files = new Map<string, string>();
  const dirs = new Set<string>([DIR]);
  const adapter = {
    exists: (p: string) => Promise.resolve(files.has(p) || dirs.has(p)),
    read: (p: string) => {
      const c = files.get(p);
      return c !== undefined ? Promise.resolve(c) : Promise.reject(new Error(`missing: ${p}`));
    },
    write: (p: string, data: string) => {
      files.set(p, data);
      return Promise.resolve();
    },
    mkdir: (p: string) => {
      dirs.add(p);
      return Promise.resolve();
    },
    remove: (p: string) => {
      files.delete(p);
      return Promise.resolve();
    },
    list: (p: string) =>
      Promise.resolve({
        files: [...files.keys()].filter((f) => f.startsWith(`${p}/`)),
        folders: [],
      }),
  };
  const app = { vault: { adapter } } as unknown as App;
  return { app, files, dirs };
}

const AUG_11 = new Date(2026, 7, 11, 9, 30);

describe("backupPluginData", () => {
  let h: ReturnType<typeof fakeAdapterApp>;

  beforeEach(() => {
    h = fakeAdapterApp();
  });

  it("writes one dated backup of data.json", async () => {
    h.files.set(`${DIR}/data.json`, '{"settings":{"dailyWordGoal":500}}');
    await backupPluginData(h.app, DIR, AUG_11);
    expect(h.files.get(`${DIR}/backups/data-2026-08-11.json`)).toBe(
      '{"settings":{"dailyWordGoal":500}}'
    );
  });

  it("is once-per-day: a reload later the same day keeps the MORNING state", async () => {
    h.files.set(`${DIR}/data.json`, '{"log":"morning state"}');
    await backupPluginData(h.app, DIR, AUG_11);
    // The session wrote new data; the plugin reloads in the evening.
    h.files.set(`${DIR}/data.json`, '{"log":"evening state"}');
    await backupPluginData(h.app, DIR, new Date(2026, 7, 11, 21, 0));
    expect(h.files.get(`${DIR}/backups/data-2026-08-11.json`)).toBe('{"log":"morning state"}');
  });

  it("a new day gets its own backup alongside yesterday's", async () => {
    h.files.set(`${DIR}/data.json`, '{"log":"day one"}');
    await backupPluginData(h.app, DIR, AUG_11);
    h.files.set(`${DIR}/data.json`, '{"log":"day two"}');
    await backupPluginData(h.app, DIR, new Date(2026, 7, 12, 8, 0));
    expect(h.files.get(`${DIR}/backups/data-2026-08-11.json`)).toBe('{"log":"day one"}');
    expect(h.files.get(`${DIR}/backups/data-2026-08-12.json`)).toBe('{"log":"day two"}');
  });

  it("never backs up a corrupt or empty data.json (existing backups stay good)", async () => {
    h.files.set(`${DIR}/backups/data-2026-08-10.json`, '{"log":"good history"}');
    h.dirs.add(`${DIR}/backups`);
    h.files.set(`${DIR}/data.json`, '{"log": TRUNCATED');
    await backupPluginData(h.app, DIR, AUG_11);
    expect(h.files.has(`${DIR}/backups/data-2026-08-11.json`)).toBe(false);
    expect(h.files.get(`${DIR}/backups/data-2026-08-10.json`)).toBe('{"log":"good history"}');

    h.files.set(`${DIR}/data.json`, "   ");
    await backupPluginData(h.app, DIR, AUG_11);
    expect(h.files.has(`${DIR}/backups/data-2026-08-11.json`)).toBe(false);
  });

  it("no-ops on a fresh install (no data.json)", async () => {
    await backupPluginData(h.app, DIR, AUG_11);
    expect([...h.files.keys()]).toEqual([]);
  });

  it("prunes to the newest seven backups", async () => {
    h.dirs.add(`${DIR}/backups`);
    for (let d = 1; d <= 9; d++) {
      h.files.set(`${DIR}/backups/data-2026-08-${String(d).padStart(2, "0")}.json`, `{"d":${d}}`);
    }
    h.files.set(`${DIR}/data.json`, '{"d":10}');
    await backupPluginData(h.app, DIR, new Date(2026, 7, 10, 9, 0));

    const kept = [...h.files.keys()].filter((p) => p.includes("/backups/")).sort();
    expect(kept).toHaveLength(7);
    expect(kept[0]).toBe(`${DIR}/backups/data-2026-08-04.json`); // 01–03 pruned
    expect(kept[6]).toBe(`${DIR}/backups/data-2026-08-10.json`); // today's included
  });

  it("only prunes its own dated backup files, never other files in the folder", async () => {
    h.dirs.add(`${DIR}/backups`);
    h.files.set(`${DIR}/backups/notes.md`, "a user's stray note");
    for (let d = 1; d <= 8; d++) {
      h.files.set(`${DIR}/backups/data-2026-08-${String(d).padStart(2, "0")}.json`, `{"d":${d}}`);
    }
    h.files.set(`${DIR}/data.json`, '{"d":9}');
    await backupPluginData(h.app, DIR, new Date(2026, 7, 9, 9, 0));
    expect(h.files.get(`${DIR}/backups/notes.md`)).toBe("a user's stray note");
  });

  it("never throws — an adapter failure logs and moves on", async () => {
    h.files.set(`${DIR}/data.json`, "{}");
    (h.app.vault.adapter as unknown as { write: () => Promise<never> }).write = () =>
      Promise.reject(new Error("disk full"));
    await expect(backupPluginData(h.app, DIR, AUG_11)).resolves.toBeUndefined();
  });
});
