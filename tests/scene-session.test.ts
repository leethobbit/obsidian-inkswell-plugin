/**
 * SceneSession safety contract: a save never overwrites disk text the session
 * hasn't seen (conflict abort), external changes reload-in-place when clean and
 * raise a conflict when dirty, own writes are classified by content (no time
 * windows), saves serialize, flush captures synchronously, and every forced
 * displacement writes a backup to "Inkswell conflicts" first.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { SceneSession, SessionState } from "../src/views/scene-session";
import { CONFLICT_FOLDER } from "../src/lib/conflict-backup";
import { capturedNotices } from "./fakes/obsidian";
import { FakeApp, flushAsync } from "./fakes/fake-app";

const SCENE_PATH = "Books/My Novel/Scenes/Alpha.md";
const SCENE = `---
status: draft
pov: Mara
---
The lamplighter came at dusk.
`;

interface Harness {
  session: SceneSession;
  /** The "editor buffer" — tests mutate this to simulate typing. */
  setDoc: (text: string | null) => void;
  states: SessionState[];
  reloads: string[];
}

async function makeSession(app: FakeApp, autosaveMs = 60000): Promise<Harness> {
  let doc: string | null = null;
  const states: SessionState[] = [];
  const reloads: string[] = [];
  const session = await SceneSession.load({
    app: app.asApp(),
    file: app.file(SCENE_PATH),
    getDoc: () => doc,
    onStateChange: (s) => states.push(s),
    onReloaded: (body) => {
      reloads.push(body);
      doc = body; // mirror the panel: reseed the editor
    },
    autosaveMs,
  });
  doc = session.loadedBody; // editor seeded from the loaded body
  return { session, setDoc: (t) => (doc = t), states, reloads };
}

function bodyOf(app: FakeApp, path = SCENE_PATH): string {
  const raw = app.vault.raw(path) ?? "";
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? raw.slice(m[0].length) : raw;
}

function backupPaths(app: FakeApp): string[] {
  return app.vault
    .getMarkdownFiles()
    .map((f) => f.path)
    .filter((p) => p.startsWith(`${CONFLICT_FOLDER}/`))
    .sort();
}

describe("SceneSession", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({ [SCENE_PATH]: SCENE });
    capturedNotices.length = 0;
  });

  it("saves the edited body and preserves frontmatter byte-for-byte", async () => {
    const h = await makeSession(app);
    h.setDoc("The lamplighter never came.\n");
    expect(await h.session.save()).toBe("saved");
    expect(app.vault.raw(SCENE_PATH)).toBe(
      "---\nstatus: draft\npov: Mara\n---\nThe lamplighter never came.\n"
    );
    expect(h.session.state).toBe("clean");
  });

  it("C1: a save over an unseen disk change ABORTS and flips to conflict", async () => {
    const h = await makeSession(app);
    // Sync / a second tab writes newer prose while our editor holds old text.
    await app.vault.modify(
      app.file(SCENE_PATH) as never,
      "---\nstatus: draft\n---\nFive hundred new words from the other tab.\n"
    );
    h.setDoc("The lamplighter never came.\n"); // stale-buffer edit

    expect(await h.session.save()).toBe("conflict");
    // The newer disk text was NOT clobbered — the write never happened.
    expect(bodyOf(app)).toBe("Five hundred new words from the other tab.\n");
    expect(h.session.state).toBe("conflict");
    expect(h.states).toContain("conflict");
  });

  it("a frontmatter-only disk change is NOT a conflict; the new frontmatter is kept", async () => {
    const h = await makeSession(app);
    await app.fileManager.processFrontMatter(app.file(SCENE_PATH) as never, (fm) => {
      fm["status"] = "revised";
    });
    h.setDoc("Rewritten opening line.\n");
    expect(await h.session.save()).toBe("saved");
    const raw = app.vault.raw(SCENE_PATH) ?? "";
    expect(raw).toContain("status: revised");
    expect(bodyOf(app)).toBe("Rewritten opening line.\n");
  });

  it("save is a noop when the buffer matches the baseline", async () => {
    const h = await makeSession(app);
    const before = app.vault.raw(SCENE_PATH);
    expect(await h.session.save()).toBe("noop");
    expect(app.vault.raw(SCENE_PATH)).toBe(before);
  });

  it("overlapping saves serialize; the latest text wins coherently", async () => {
    const h = await makeSession(app);
    h.setDoc("Draft one.\n");
    const first = h.session.save();
    h.setDoc("Draft two — final.\n");
    const second = h.session.save();
    await Promise.all([first, second]);
    expect(bodyOf(app)).toBe("Draft two — final.\n");
    expect(h.session.state).toBe("clean");
  });

  it("own-write classification: our save's modify event is ignored (no reload, still clean)", async () => {
    const h = await makeSession(app);
    h.setDoc("New paragraph.\n");
    await h.session.save();
    // The vault modify our own save produced now reaches the subscription.
    await h.session.handleExternalModify();
    expect(h.reloads).toEqual([]);
    expect(h.session.state).toBe("clean");
  });

  it("C4: an external change with a CLEAN editor reloads in place", async () => {
    const h = await makeSession(app);
    await app.vault.modify(
      app.file(SCENE_PATH) as never,
      "---\nstatus: draft\npov: Mara\n---\nSynced from the other device.\n"
    );
    await h.session.handleExternalModify();
    expect(h.reloads).toEqual(["Synced from the other device.\n"]);
    expect(h.session.loadedBody).toBe("Synced from the other device.\n");
    expect(h.session.state).toBe("clean");
    // A later edit + save now builds on the synced version, not the old one.
    h.setDoc("Synced from the other device.\nAnd one more line.\n");
    expect(await h.session.save()).toBe("saved");
  });

  it("C4: an external change with a DIRTY editor raises a conflict (buffer untouched)", async () => {
    const h = await makeSession(app);
    h.setDoc("Half-typed sentence the user is mid-thought on");
    await app.vault.modify(
      app.file(SCENE_PATH) as never,
      "---\nstatus: draft\npov: Mara\n---\nSynced text.\n"
    );
    await h.session.handleExternalModify();
    expect(h.session.state).toBe("conflict");
    expect(h.reloads).toEqual([]); // never reseed over the user's words
  });

  it("resolveKeepMine backs up the DISK version, then force-writes the buffer", async () => {
    const h = await makeSession(app);
    h.setDoc("My version.\n");
    await app.vault.modify(
      app.file(SCENE_PATH) as never,
      "---\nstatus: draft\npov: Mara\n---\nDisk version.\n"
    );
    await h.session.handleExternalModify();
    expect(h.session.state).toBe("conflict");

    const backup = await h.session.resolveKeepMine();
    expect(backup.startsWith(`${CONFLICT_FOLDER}/`)).toBe(true);
    expect(app.vault.raw(backup)).toContain("Disk version.");
    expect(bodyOf(app)).toBe("My version.\n");
    expect(h.session.state).toBe("clean");
  });

  it("resolveReloadFromDisk backs up the EDITOR text, then reseeds from disk", async () => {
    const h = await makeSession(app);
    h.setDoc("My unsaved words.\n");
    await app.vault.modify(
      app.file(SCENE_PATH) as never,
      "---\nstatus: draft\npov: Mara\n---\nDisk version.\n"
    );
    await h.session.handleExternalModify();

    const backup = await h.session.resolveReloadFromDisk();
    expect(backup.startsWith(`${CONFLICT_FOLDER}/`)).toBe(true);
    expect(app.vault.raw(backup)).toContain("My unsaved words.");
    expect(h.reloads).toEqual(["Disk version.\n"]);
    expect(bodyOf(app)).toBe("Disk version.\n"); // disk untouched by the reload
    expect(h.session.state).toBe("clean");
  });

  it("two same-second backups never clobber each other (suffix on collision)", async () => {
    const h1 = await makeSession(app);
    h1.setDoc("Words A.\n");
    await app.vault.modify(app.file(SCENE_PATH) as never, "---\na: 1\n---\nDisk 1.\n");
    await h1.session.handleExternalModify();
    await h1.session.resolveKeepMine();

    // A second conflict on the same scene, resolved within the same clock second.
    await app.vault.modify(app.file(SCENE_PATH) as never, "---\na: 2\n---\nDisk 2.\n");
    await h1.session.handleExternalModify();
    h1.setDoc("Words B.\n");
    await h1.session.resolveKeepMine();

    expect(backupPaths(app)).toHaveLength(2);
  });

  it("flush captures the doc synchronously — safe to destroy the editor next line", async () => {
    const h = await makeSession(app);
    h.setDoc("Typed just before switching scenes.\n");
    const flushed = h.session.flush();
    h.setDoc(null); // the panel destroys the editor immediately after flush()
    expect(await flushed).toBe("saved");
    expect(bodyOf(app)).toBe("Typed just before switching scenes.\n");
  });

  it("a new session loaded after awaiting flush() sees the saved text (C2 ordering)", async () => {
    const h = await makeSession(app);
    h.setDoc("The paragraph that used to vanish.\n");
    const flushed = h.session.flush();
    h.setDoc(null);
    h.session.dispose();
    await flushed; // renderEditor awaits the handoff before re-reading
    const next = await makeSession(app);
    expect(next.session.loadedBody).toBe("The paragraph that used to vanish.\n");
  });

  it("autosave lands typed text on disk without any blur", async () => {
    const h = await makeSession(app, 5);
    h.setDoc("Autosaved words.\n");
    h.session.noteChange();
    await flushAsync(); // let the 5ms debounce fire and the save chain drain
    await new Promise((r) => setTimeout(r, 20));
    await flushAsync();
    expect(bodyOf(app)).toBe("Autosaved words.\n");
  });

  it("conflict pauses autosave and blur-saves (no retry spin against the banner)", async () => {
    const h = await makeSession(app, 5);
    await app.vault.modify(app.file(SCENE_PATH) as never, "---\na: 1\n---\nNewer disk.\n");
    h.setDoc("Stale buffer edit.\n");
    await h.session.handleExternalModify();
    expect(h.session.state).toBe("conflict");

    h.session.noteChange(); // typing while the banner is up
    await new Promise((r) => setTimeout(r, 20));
    await flushAsync();
    expect(bodyOf(app)).toBe("Newer disk.\n"); // nothing overwrote the disk
    expect(await h.session.save()).toBe("conflict"); // blur-save short-circuits
  });

  it("teardown save failure writes a backup and says where the words went", async () => {
    const h = await makeSession(app);
    h.setDoc("Words typed into a doomed scene.\n");
    // The file vanishes (deleted by sync) — vault.process will throw.
    await app.vault.delete(app.file(SCENE_PATH) as never);
    expect(await h.session.flush()).toBe("error");
    const backups = backupPaths(app);
    expect(backups).toHaveLength(1);
    expect(app.vault.raw(backups[0])).toContain("Words typed into a doomed scene.");
    expect(capturedNotices.some((n) => n.includes("backed up to"))).toBe(true);
  });
});
