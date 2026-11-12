/**
 * The Codex peek: a small floating card for one entry, shown beside the word
 * or chip you pointed at, so you can check a detail and keep writing. One peek
 * at a time, owned by the plugin.
 *
 *  - "hover" peeks close shortly after the pointer leaves both the anchor and
 *    the card (the delay lets you move into the card);
 *  - "sticky" peeks (a click, a tap, the Look up command) stay until Esc, a
 *    click outside, or scrolling.
 * The peek never takes focus, so the editor's cursor and selection stay put.
 */

import { App, TFile } from "obsidian";
import type InkswellPlugin from "../../main";
import { t } from "../i18n";
import { attachOpenInTab } from "../lib/row-menu";
import { openFileInTab } from "../scenes/scene-actions";
import { scopeContextForProject, filterToScope } from "./codex-scope";
import { getCodexEntities } from "./codex-store";
import { renderEntityCard } from "./entity-card";
import { CodexEntity } from "./types";

export interface PeekOptions {
  /** Entries link values can resolve to (scope-filtered). */
  entities: readonly CodexEntity[];
  sticky: boolean;
}

const CLOSE_DELAY = 250;
const GAP = 6;

export class Peek {
  private el: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private closeTimer: number | null = null;
  private history: CodexEntity[] = [];
  private opts: PeekOptions | null = null;
  private sticky = false;
  private cleanups: Array<() => void> = [];

  constructor(
    private app: App,
    private plugin: InkswellPlugin
  ) {}

  isOpen(): boolean {
    return this.el !== null;
  }

  /** The entry currently shown, if any. */
  showing(): CodexEntity | null {
    return this.history[this.history.length - 1] ?? null;
  }

  /** Show `entity` next to `anchor` (a viewport rect). Replaces any open peek. */
  show(entity: CodexEntity, anchor: DOMRect, opts: PeekOptions): void {
    this.cancelClose();
    // Re-pointing at the same entry in hover mode keeps the open card (no flicker).
    if (this.el && !opts.sticky && !this.sticky && this.showing()?.path === entity.path) return;
    this.close();
    this.opts = opts;
    this.sticky = opts.sticky;
    this.history = [entity];

    const doc = activeDocument;
    const el = doc.body.createDiv({ cls: "inkswell-peek" });
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", t("peek.label", { name: entity.name }));
    this.el = el;
    this.body = el.createDiv({ cls: "inkswell-peek__body" });
    this.renderCurrent();
    this.position(anchor);

    el.addEventListener("mouseenter", () => this.cancelClose());
    el.addEventListener("mouseleave", () => {
      if (!this.sticky) this.scheduleClose();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !this.el) return;
      e.preventDefault();
      e.stopPropagation();
      this.close();
    };
    const onPointer = (e: PointerEvent) => {
      if (this.el && !this.el.contains(e.target as Node)) this.close();
    };
    const onScroll = (e: Event) => {
      if (this.el && !this.el.contains(e.target as Node)) this.close();
    };
    doc.addEventListener("keydown", onKey, { capture: true });
    doc.addEventListener("pointerdown", onPointer, { capture: true });
    doc.addEventListener("scroll", onScroll, { capture: true });
    this.cleanups.push(
      () => doc.removeEventListener("keydown", onKey, { capture: true }),
      () => doc.removeEventListener("pointerdown", onPointer, { capture: true }),
      () => doc.removeEventListener("scroll", onScroll, { capture: true })
    );
  }

  /** Make an open hover peek stay (a click on the thing that opened it). */
  pin(): void {
    this.sticky = true;
    this.cancelClose();
  }

  /** The pointer left the anchor: close soon unless it reaches the card. */
  scheduleClose(): void {
    if (this.sticky || !this.el) return;
    this.cancelClose();
    this.closeTimer = window.setTimeout(() => this.close(), CLOSE_DELAY);
  }

  cancelClose(): void {
    if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  close(): void {
    this.cancelClose();
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
    this.el?.remove();
    this.el = null;
    this.body = null;
    this.history = [];
    this.opts = null;
    this.sticky = false;
  }

  private renderCurrent(): void {
    const body = this.body;
    const entity = this.showing();
    const opts = this.opts;
    if (!body || !entity || !opts) return;
    body.empty();
    if (this.history.length > 1) {
      const back = body.createEl("button", {
        cls: "clickable-icon inkswell-peek__back",
        text: t("peek.back", { name: this.history[this.history.length - 2].name }),
      });
      back.onclick = () => {
        this.history.pop();
        this.renderCurrent();
      };
    }
    renderEntityCard(body.createDiv(), {
      app: this.app,
      plugin: this.plugin,
      entity,
      entities: opts.entities,
      size: "compact",
      onNavigate: (next) => {
        // Following a link means you're reading: keep the card open.
        this.sticky = true;
        this.history.push(next);
        this.renderCurrent();
      },
      onLeave: () => this.close(),
    });
  }

  /** Below the anchor when it fits, else above; always inside the window. */
  private position(anchor: DOMRect): void {
    const el = this.el;
    if (!el) return;
    const win = el.win;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = Math.min(anchor.left, win.innerWidth - w - GAP);
    left = Math.max(GAP, left);
    let top = anchor.bottom + GAP;
    if (top + h > win.innerHeight - GAP && anchor.top - GAP - h >= GAP) top = anchor.top - GAP - h;
    top = Math.max(GAP, Math.min(top, win.innerHeight - h - GAP));
    el.style.setProperty("--inkswell-peek-left", `${Math.round(left)}px`);
    el.style.setProperty("--inkswell-peek-top", `${Math.round(top)}px`);
  }
}

/**
 * The Codex entries visible from a scene's book (its book, its series, and
 * global entries), or from the active project when the path isn't a scene.
 */
export function entitiesForScene(plugin: InkswellPlugin, scenePath: string | null): CodexEntity[] {
  const store = plugin.store;
  const active = plugin.activeProject.get();
  const project =
    (scenePath ? store.findSceneByPath(scenePath)?.project : undefined) ??
    (active ? store.getProject(active) : undefined) ??
    null;
  return filterToScope(getCodexEntities(plugin.app), scopeContextForProject(project, store.getProjects()));
}

const HOVER_DELAY = 300;

/**
 * Peek behaviour for a chip that names an entry (Scene inspector Characters /
 * Location): hover shows the card after a short delay, a click or tap shows it
 * until dismissed, Ctrl/Cmd-click opens the entry's note in a new tab.
 * `resolve` runs at event time, so a chip rendered before the Codex loaded
 * still works.
 */
export function attachChipPeek(
  el: HTMLElement,
  plugin: InkswellPlugin,
  resolve: () => { entity: CodexEntity; entities: readonly CodexEntity[] } | null
): void {
  let timer: number | null = null;
  const clear = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
  el.addClass("is-peekable");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.addEventListener("mouseenter", () => {
    clear();
    timer = window.setTimeout(() => {
      const hit = resolve();
      if (hit) plugin.peek.show(hit.entity, el.getBoundingClientRect(), { entities: hit.entities, sticky: false });
    }, HOVER_DELAY);
  });
  el.addEventListener("mouseleave", () => {
    clear();
    plugin.peek.scheduleClose();
  });
  const open = (e: Event) => {
    // The × inside the chip removes the link; it isn't a peek.
    if ((e.target as HTMLElement | null)?.closest(".inkswell-chip__x")) return;
    clear();
    const hit = resolve();
    if (!hit) return;
    if (plugin.peek.showing()?.path === hit.entity.path) plugin.peek.pin();
    else plugin.peek.show(hit.entity, el.getBoundingClientRect(), { entities: hit.entities, sticky: true });
  };
  el.addEventListener("click", open);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(e);
    }
  });
  attachOpenInTab(el, () => {
    const hit = resolve();
    const file = hit ? plugin.app.vault.getAbstractFileByPath(hit.entity.path) : null;
    if (file instanceof TFile) openFileInTab(plugin.app, file);
  });
}
