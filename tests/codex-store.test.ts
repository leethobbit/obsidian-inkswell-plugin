/**
 * createEntity's filename safety: a codex entry name that sanitizes to a
 * dot-only / dot-edged segment must NOT create a hidden or folder-escaping
 * file (regression — a scene renamed to ".." once vanished from Obsidian).
 * Normal names still create as expected.
 */
import { describe, expect, it } from "vitest";
import { createEntity } from "../src/codex/codex-store";
import { TFile } from "./fakes/obsidian";
import { FakeApp } from "./fakes/fake-app";

describe("createEntity filename safety", () => {
  it('rejects ".." / "." / dot-only names without creating any file', async () => {
    const app = new FakeApp();
    for (const bad of ["..", ".", "...", "  ..  "]) {
      const before = app.vault.getMarkdownFiles().length;
      const result = await createEntity(app.asApp(), "character", bad, "Codex");
      expect(result, `name ${JSON.stringify(bad)} should be rejected`).toBeNull();
      expect(app.vault.getMarkdownFiles().length).toBe(before);
    }
  });

  it("strips leading/trailing dots so the file isn't hidden", async () => {
    const app = new FakeApp();
    const file = await createEntity(app.asApp(), "character", ".Gandalf.", "Codex");
    expect(file).toBeInstanceOf(TFile);
    expect(file?.path).toBe("Codex/Gandalf.md");
  });

  it("creates a normal entry at the expected path", async () => {
    const app = new FakeApp();
    const file = await createEntity(app.asApp(), "location", "The Shire", "Codex");
    expect(file?.path).toBe("Codex/The Shire.md");
    expect(app.metadataCache.getFileCache(file as never)?.frontmatter?.["codex"]).toBe(
      "location"
    );
  });
});
