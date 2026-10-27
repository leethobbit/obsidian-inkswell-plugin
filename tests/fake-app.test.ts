/**
 * The fake vault must behave like Obsidian where it matters for data safety,
 * or tests pass on code that misbehaves in the app. Measured live (#64):
 * `modify` on a deleted note recreates it; `process` and `processFrontMatter`
 * throw instead.
 */
import { describe, expect, it } from "vitest";
import { FakeApp } from "./fakes/fake-app";

describe("FakeApp fidelity", () => {
  const PATH = "Notes/Gone.md";

  it("modify on a deleted note recreates it, like Obsidian (a resurrection hazard)", async () => {
    const app = new FakeApp({ [PATH]: "hello" });
    const stale = app.file(PATH);
    await app.vault.delete(stale as never);
    await app.vault.modify(stale as never, "again");
    expect(app.vault.raw(PATH)).toBe("again");
    expect(app.vault.getAbstractFileByPath(PATH)).not.toBeNull();
  });

  it("process and processFrontMatter on a deleted note throw and create nothing", async () => {
    const app = new FakeApp({ [PATH]: "---\nstatus: draft\n---\nbody" });
    const stale = app.file(PATH);
    await app.vault.delete(stale as never);
    await expect(app.vault.process(stale as never, (t) => `${t}!`)).rejects.toThrow();
    await expect(
      app.fileManager.processFrontMatter(stale as never, (fm: Record<string, unknown>) => {
        fm["status"] = "revised";
      })
    ).rejects.toThrow();
    expect(app.vault.raw(PATH)).toBeUndefined();
  });
});
