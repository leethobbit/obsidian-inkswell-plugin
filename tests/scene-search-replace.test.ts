/**
 * Find & replace data-safety: the cross-scene replace rewrites ONLY scene prose,
 * atomically, and reattaches frontmatter byte-for-byte. This exercises the exact
 * write transform the Search panel performs — `vault.process(file, cur =>
 * splitFrontmatter(cur).frontmatter + replaceMatches(body).text)` — through the
 * in-memory Obsidian fake, so the byte-identity and body-only guarantees are
 * asserted end-to-end (the panel's own loop/DOM is covered by manual e2e).
 */
import { describe, expect, it } from "vitest";
import { FakeApp } from "./fakes/fake-app";
import { splitFrontmatter } from "../src/lib/frontmatter";
import { replaceMatches, SearchOptions } from "../src/lib/scene-search";
import type { TFile } from "obsidian";

const opts = (over: Partial<SearchOptions> = {}): SearchOptions => ({
  query: "",
  caseSensitive: false,
  wholeWord: false,
  ...over,
});

/** The panel's per-scene write transform, isolated for testing. */
async function replaceInScene(
  app: FakeApp,
  file: TFile,
  o: SearchOptions,
  replacement: string
): Promise<number> {
  let count = 0;
  await app.vault.process(file as never, (cur) => {
    const { frontmatter, body } = splitFrontmatter(cur);
    const res = replaceMatches(body, o, replacement);
    count = res.count;
    return frontmatter + res.text;
  });
  return count;
}

const scene = (synopsis: string, body: string) => `---\nstatus: draft\nsynopsis: ${synopsis}\n---\n${body}`;

describe("cross-scene replace — data safety", () => {
  it("replaces body literals and leaves frontmatter byte-identical", async () => {
    const app = new FakeApp({
      "Book/Scenes/One.md": scene("The locket gleamed", "She held the locket. The locket was warm."),
    });
    const before = app.vault.raw("Book/Scenes/One.md")!;
    const fmBefore = splitFrontmatter(before).frontmatter;

    const count = await replaceInScene(app, app.file("Book/Scenes/One.md"), opts({ query: "locket" }), "amulet");

    const after = app.vault.raw("Book/Scenes/One.md")!;
    expect(count).toBe(2);
    expect(splitFrontmatter(after).body).toBe("She held the amulet. The amulet was warm.");
    // Frontmatter — including a `synopsis` that ALSO contains "locket" — untouched.
    expect(splitFrontmatter(after).frontmatter).toBe(fmBefore);
    expect(after).toContain("synopsis: The locket gleamed");
  });

  it("does not touch a file whose only match is in frontmatter", async () => {
    const app = new FakeApp({
      "Book/Scenes/Two.md": scene("A locket", "No match in this body."),
    });
    const before = app.vault.raw("Book/Scenes/Two.md")!;

    const count = await replaceInScene(app, app.file("Book/Scenes/Two.md"), opts({ query: "locket" }), "amulet");

    expect(count).toBe(0);
    expect(app.vault.raw("Book/Scenes/Two.md")).toBe(before);
  });

  it("supports deletion (empty replacement) in the body only", async () => {
    const app = new FakeApp({
      "Book/Scenes/Three.md": scene("keep", "drop [CUT] this"),
    });
    await replaceInScene(app, app.file("Book/Scenes/Three.md"), opts({ query: "[CUT] " }), "");
    expect(splitFrontmatter(app.vault.raw("Book/Scenes/Three.md")!).body).toBe("drop this");
  });

  it("bumps mtime on write, so a scanned-then-modified scene is detectable (skip guard)", async () => {
    const app = new FakeApp({
      "Book/Scenes/Four.md": scene("s", "the locket"),
    });
    const file = app.file("Book/Scenes/Four.md");
    // The panel caches file.stat.mtime at scan time; an external edit bumps it.
    const scannedMtime = file.stat.mtime;
    await app.vault.modify(file as never, "externally changed");
    // The guard the panel applies before writing: mtime moved ⇒ skip, don't clobber.
    expect(file.stat.mtime).not.toBe(scannedMtime);
  });
});
