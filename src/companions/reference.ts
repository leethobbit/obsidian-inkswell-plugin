/**
 * What a reference body needs from whatever shows it.
 *
 * The Codex list and the Plan digest are each ONE renderer with two homes: a
 * sidebar companion (companion-view.ts) and a panel in Write's side column
 * (src/views/side-panels.ts). The body draws into an element it is handed and
 * asks its host for everything else, so the two homes can't drift apart.
 */

import type { App, TFile } from "obsidian";
import type InkswellPlugin from "../../main";

export interface ReferenceHost {
  app: App;
  plugin: InkswellPlugin;
  /** Draw this body again soon. The host coalesces calls and keeps scroll and
   *  a focused field across the redraw. */
  requestRender(): void;
  /** Open a scene the way this host does (Write, or a regular tab). */
  openScene(file: TFile, newTab: boolean): void;
}

/** Collapsible sections whose open/closed state outlives a redraw. */
export class Sections {
  private open = new Map<string, boolean>();

  /** Returns the `<details>` element, for callers that react to its toggle. */
  section(
    parent: HTMLElement,
    key: string,
    title: string,
    build: (host: HTMLElement) => void,
    defaultOpen = true
  ): HTMLDetailsElement {
    const details = parent.createEl("details", { cls: "inkswell-companion__section" });
    details.open = this.open.get(key) ?? defaultOpen;
    details.createEl("summary", { text: title });
    details.addEventListener("toggle", () => this.open.set(key, details.open));
    build(details.createDiv({ cls: "inkswell-companion__sectionbody" }));
    return details;
  }
}

/** A muted one-line "nothing here" message. */
export function renderReferenceEmpty(parent: HTMLElement, text: string): void {
  parent.createDiv({ cls: "inkswell-companion__empty", text });
}
