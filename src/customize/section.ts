/**
 * Contract between the Customize panel and its sections. A section is a small
 * renderer for one catalog entry; the panel owns selection, the detail host, and
 * re-rendering. Sections never call `plugin.refreshView()` — Customize IS the
 * active view, and a forced rebuild would tear down the pane being edited. They
 * save, then call `ctx.rerender()`; every other panel re-reads settings at its
 * own next render.
 */

import type { App } from "obsidian";
import type InkswellPlugin from "../../main";
import type { SectionState } from "../views/panel-kit";

export interface SectionCtx {
  app: App;
  plugin: InkswellPlugin;
  /** Sub-target inside the section (a codex type id, a beat template id…). */
  target: string | null;
  /** Change the sub-target and re-render (null = back to the section's list). */
  setTarget(target: string | null): void;
  /** Re-render the panel in place (scroll + focus preserved). */
  rerender(): void;
  /** Open/closed memory for `<details>` cards, keyed "<sectionId>:<card>". */
  cards: SectionState;
  /** Mark a vault path as self-written BEFORE writing it, so the host softens
   *  the resulting store notify instead of rebuilding under the caret. */
  markSelfWrite(path: string): void;
}

export interface CustomizeSection {
  id: string;
  /** One-line status for the catalog row (computed at render time). */
  describe(plugin: InkswellPlugin, app: App): string;
  render(host: HTMLElement, ctx: SectionCtx): void;
}
