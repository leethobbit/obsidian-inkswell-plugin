/**
 * Home's "can't read" notice (#69): books whose index note Inkswell can't
 * read, which would otherwise just be missing. Lists each note with the reason
 * and a way to open it. Fixing or restoring the note brings the book back on
 * the next store refresh. Read-only: it never repairs a note itself.
 */

import { App, TFile } from "obsidian";
import type { UnreadableIndex } from "../../projects/unreadable-index";
import { openScene } from "../../scenes/scene-actions";

function reasonText(item: UnreadableIndex): string {
  if (item.reason === "longform") return "Its longform properties have no format and no scene list.";
  return item.line
    ? `Its properties have a formatting error near line ${item.line}.`
    : "Its properties have a formatting error.";
}

export function renderUnreadableNotice(
  parent: HTMLElement,
  app: App,
  items: readonly UnreadableIndex[]
): void {
  if (items.length === 0) return;
  const one = items.length === 1;
  const box = parent.createDiv({ cls: "inkswell-unreadable" });
  box.createDiv({
    cls: "inkswell-unreadable__head",
    text: one ? "Inkswell can't read 1 book" : `Inkswell can't read ${items.length} books`,
  });
  box.createDiv({
    cls: "inkswell-unreadable__summary",
    text: one
      ? "Its index note has a problem, so the book is hidden until it's fixed. Your scenes are untouched: fix the properties at the top of the note, or restore an earlier version of it, and the book comes back."
      : "Their index notes have a problem, so these books are hidden until they're fixed. Your scenes are untouched: fix the properties at the top of each note, or restore an earlier version, and the book comes back.",
  });
  for (const item of items) {
    const row = box.createDiv({ cls: "inkswell-unreadable__row" });
    const text = row.createDiv({ cls: "inkswell-unreadable__text" });
    text.createDiv({ cls: "inkswell-unreadable__name", text: item.path.replace(/\.md$/i, "") });
    text.createDiv({ cls: "inkswell-unreadable__reason", text: reasonText(item) });
    const open = row.createEl("button", { text: "Open note" });
    open.onclick = () => {
      const file = app.vault.getAbstractFileByPath(item.path);
      if (file instanceof TFile) openScene(app, file);
    };
  }
}
