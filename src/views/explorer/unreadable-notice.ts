/**
 * Home's "can't read" notice (#69): books whose index note Inkswell can't
 * read, which would otherwise just be missing. Lists each note with the reason
 * and a way to open it. Fixing or restoring the note brings the book back on
 * the next store refresh. Read-only: it never repairs a note itself.
 */

import { App, TFile } from "obsidian";
import { t, tp } from "../../i18n";
import type { UnreadableIndex } from "../../projects/unreadable-index";
import { openScene } from "../../scenes/scene-actions";

function reasonText(item: UnreadableIndex): string {
  if (item.reason === "longform") return t("home.unreadable.reason.longform");
  return item.line
    ? t("home.unreadable.reason.line", { line: item.line })
    : t("home.unreadable.reason.generic");
}

export function renderUnreadableNotice(
  parent: HTMLElement,
  app: App,
  items: readonly UnreadableIndex[]
): void {
  if (items.length === 0) return;
  const box = parent.createDiv({ cls: "inkswell-unreadable" });
  box.createDiv({
    cls: "inkswell-unreadable__head",
    text: tp("home.unreadable.head", items.length),
  });
  box.createDiv({
    cls: "inkswell-unreadable__summary",
    text: tp("home.unreadable.summary", items.length),
  });
  for (const item of items) {
    const row = box.createDiv({ cls: "inkswell-unreadable__row" });
    const text = row.createDiv({ cls: "inkswell-unreadable__text" });
    text.createDiv({ cls: "inkswell-unreadable__name", text: item.path.replace(/\.md$/i, "") });
    text.createDiv({ cls: "inkswell-unreadable__reason", text: reasonText(item) });
    const open = row.createEl("button", { text: t("home.unreadable.open") });
    open.onclick = () => {
      const file = app.vault.getAbstractFileByPath(item.path);
      if (file instanceof TFile) openScene(app, file);
    };
  }
}
