/**
 * The To-dos scan hands the Write editor offsets to jump to. The editor's
 * document uses "\n" breaks, so a scene saved with "\r\n" must be scanned the
 * same way or every jump lands one character early per line above it (#64).
 */
import { describe, expect, it } from "vitest";
import { scanProjectTodos } from "../src/revisions/todos-scan";
import { FakeApp } from "./fakes/fake-app";

describe("scanProjectTodos", () => {
  it("gives editor offsets for a scene saved with Windows line endings", async () => {
    const path = "Book/Scenes/One.md";
    const app = new FakeApp({ [path]: "---\r\nstatus: draft\r\n---\r\nLine one.\r\nLine two [TODO: fix] here.\r\n" });
    const [group] = await scanProjectTodos(app.asApp(), [{ title: "One", path }]);
    const editorDoc = "Line one.\nLine two [TODO: fix] here.\n";
    const hit = group.todos[0];
    expect(editorDoc.slice(hit.from, hit.to)).toBe("[TODO: fix]");
    expect(hit.line).toBe(2);
  });
});
