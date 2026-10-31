/**
 * Write → Stream: a book's scenes as one continuous page, in Longform order.
 *
 * Safety model: exactly ONE scene is editable at a time, the live one. Its
 * editor and SceneSession belong to WritePanel and are the same code as
 * single-scene Write (same saves, same conflict handling, same word
 * tracking). Every other scene is drawn as static HTML (static-scene.ts) and
 * can't write; clicking one asks the panel to move the live editor there.
 * This module only draws, measures and scrolls.
 *
 * Scale: a 200k-word book is roughly 70–400 scenes. Only scenes near the
 * visible area are drawn. The rest are placeholders sized from the file and a
 * pixels-per-character ratio learned from drawn scenes, and a drawn scene that
 * scrolls far away drops back to a placeholder of its measured height.
 *
 * Steady text: sizes settle above the visible area all the time (a scene is
 * drawn, the live editor measures lines it had only estimated). The stream
 * keeps whatever is at the top of the visible area where it was ({@link
 * restoreAnchor}) rather than relying on the browser's scroll anchoring, which
 * measurably missed CodeMirror's corrections and doesn't exist in older WebKit.
 */

import { EditorView } from "@codemirror/view";
import { App, EventRef, TAbstractFile, TFile } from "obsidian";
import { splitFrontmatter } from "../../lib/frontmatter";
import { MarkerSet } from "../../lib/placeholders";
import { DEFAULT_PX_PER_CHAR, calibrate, estimateHeight } from "../../lib/stream-plan";
import { countWords } from "../../lib/wordcount";
import { StaticScene, renderStaticScene } from "./static-scene";

/** One scene as the stream shows it. */
export interface StreamSceneSpec {
  path: string;
  title: string;
  /** Chapter title to show above this scene, when it opens a chapter here. */
  chapterHead: string | null;
  /** Status chip, if the scene has one. */
  status: { id: string; label: string } | null;
}

export interface SceneStreamOptions {
  app: App;
  /** The live to-do marker set (drawn scenes highlight markers as the editor does). */
  markers: () => MarkerSet;
  /** Book-style typography (the `is-manuscript` class on each scene host). */
  manuscript: () => boolean;
  /** The writer clicked into a scene's text (`pos`) or its title (`"start"`). */
  onActivate: (path: string, pos: number | "start") => void;
  /** The scene at the top of the visible area changed. */
  onInView: (path: string | null) => void;
}

/** The live editor's slot in a scene. */
export interface LiveSlot {
  banner: HTMLElement;
  host: HTMLElement;
}

interface Section {
  spec: StreamSceneSpec;
  el: HTMLElement;
  top: HTMLElement;
  wordsEl: HTMLElement | null;
  body: HTMLElement;
  /** The drawn text (static), when the scene is drawn and not live. */
  drawn: StaticScene | null;
  drawnHost: HTMLElement | null;
  /** The body text last drawn, kept to redraw on a preference change. */
  text: string | null;
  live: (LiveSlot & { ready: boolean }) | null;
  /** Bumped per read; a stale async read checks it and bails. */
  token: number;
  /** Within the drawing margin of the visible area. */
  near: boolean;
  /** Body length once read (for estimates). */
  chars: number | null;
  /** The body's height when it was last drawn. */
  measured: number | null;
}

type Anchor =
  | { kind: "text"; view: EditorView; pos: number; top: number; scroll: number }
  | { kind: "el"; el: HTMLElement; top: number; scroll: number };

/** How far beyond the visible area scenes are drawn (so scrolling meets text, not gaps). */
const DRAW_MARGIN = "1500px 0px";
/** The band at the top of the visible area whose scene counts as "in view". */
const IN_VIEW_BAND = "0px 0px -80% 0px";

export class SceneStream {
  readonly scroller: HTMLElement;
  private list: HTMLElement;
  private emptyEl: HTMLElement | null = null;
  private byPath = new Map<string, Section>();
  private order: Section[] = [];
  private byEl = new Map<Element, Section>();
  private nearObs: IntersectionObserver;
  private spyObs: IntersectionObserver;
  private sizeObs: ResizeObserver;
  private spyHits = new Set<Section>();
  private inView: string | null = null;
  private pxPerChar = DEFAULT_PX_PER_CHAR;
  private samples = new Map<string, { chars: number; px: number }>();
  private modifyRef: EventRef;
  private destroyed = false;
  /** What's at the top of the visible area, where it was on screen, and the
   *  scroll position that was measured at (see {@link restoreAnchor}). */
  private held: Anchor | null = null;

  constructor(
    parent: HTMLElement,
    private opts: SceneStreamOptions
  ) {
    this.scroller = parent.createDiv({ cls: "inkswell-stream" });
    this.list = this.scroller.createDiv({ cls: "inkswell-stream__list" });
    // The window that owns the panel (a popout has its own observers).
    const win = parent.win as unknown as {
      IntersectionObserver: typeof IntersectionObserver;
      ResizeObserver: typeof ResizeObserver;
    };
    this.nearObs = new win.IntersectionObserver((entries) => this.onNear(entries), {
      root: this.scroller,
      rootMargin: DRAW_MARGIN,
    });
    this.spyObs = new win.IntersectionObserver((entries) => this.onSpy(entries), {
      root: this.scroller,
      rootMargin: IN_VIEW_BAND,
    });
    this.sizeObs = new win.ResizeObserver((entries) => this.onResize(entries));
    this.modifyRef = opts.app.vault.on("modify", (f) => this.onModify(f));
    // A scroll is intended, but a scene drawn since the last frame may already
    // have shifted the page: settle that first (the scroll itself is
    // subtracted out), then re-take the anchor from where the page now is.
    this.scroller.addEventListener("scroll", () => this.restoreAnchor(), { passive: true });
  }

  /**
   * Show `specs`, in order. Scenes already on the page are kept (a drawn one
   * stays drawn, the live one keeps its editor); only nodes that are out of
   * place move, so a refresh that changes nothing moves nothing.
   */
  setScenes(specs: StreamSceneSpec[]): void {
    const next = new Map<string, Section>();
    const order: Section[] = [];
    for (const spec of specs) {
      let s = this.byPath.get(spec.path);
      if (!s) {
        s = this.createSection(spec);
      } else if (!sameSpec(s.spec, spec)) {
        s.spec = spec;
        this.renderTop(s);
      }
      next.set(spec.path, s);
      order.push(s);
    }
    for (const [path, s] of this.byPath) if (!next.has(path)) this.removeSection(s);
    this.byPath = next;
    this.order = order;

    order.forEach((s, i) => {
      const at = this.list.children.item(i);
      if (at !== s.el) this.list.insertBefore(s.el, at);
    });

    this.emptyEl?.remove();
    this.emptyEl = null;
  }

  /** Replace the page with a message (nothing to show). */
  showEmpty(text: string): void {
    this.setScenes([]);
    this.emptyEl = this.scroller.createDiv({ cls: "inkswell-stream__empty", text });
  }

  has(path: string): boolean {
    return this.byPath.has(path);
  }

  /** Scroll so `path`'s scene starts `within` px above the top of the visible area. */
  scrollToScene(path: string, within = 0): void {
    const s = this.byPath.get(path);
    if (!s) return;
    this.scroller.scrollTop = Math.max(0, s.el.offsetTop + within);
    this.pickAnchor();
  }

  /** The scene at the top of the visible area and how far into it the page is scrolled. */
  anchor(): { path: string; within: number } | null {
    const s = this.sectionAtTop();
    return s ? { path: s.spec.path, within: this.scroller.scrollTop - s.el.offsetTop } : null;
  }

  /**
   * Make room for the live editor in `path`'s scene. The drawn text stays
   * until {@link liveReady}, so nothing jumps while the scene loads.
   */
  openLive(path: string): LiveSlot | null {
    const s = this.byPath.get(path);
    if (!s) return null;
    if (s.live) this.dropLive(s);
    const banner = s.body.createDiv({ cls: "inkswell-write__conflict" });
    const host = s.body.createDiv({ cls: "inkswell-write__cm is-stream" });
    host.toggleClass("is-manuscript", this.opts.manuscript());
    s.live = { banner, host, ready: false };
    s.el.addClass("is-live");
    return s.live;
  }

  /** The live editor is in place: drop the drawn text it replaces. */
  liveReady(path: string): void {
    const s = this.byPath.get(path);
    if (!s?.live) return;
    s.live.ready = true;
    s.token++; // a read still in flight must not draw over the editor
    this.undraw(s);
    s.body.removeClass("is-placeholder");
  }

  /**
   * Hand the live scene back to static text: draw `text` (the editor's final
   * text) first, then run `detach` (which destroys the editor), then remove the
   * live slot. In that order the scene never collapses on screen.
   */
  retireLive<T>(path: string | null, text: string | null, detach: () => T): T {
    const s = path ? this.byPath.get(path) : undefined;
    if (!s?.live) return detach();
    if (text !== null && !s.drawn) this.draw(s, text);
    const result = detach();
    this.dropLive(s);
    return result;
  }

  /** Give up a live slot whose editor never arrived (the scene couldn't be read). */
  cancelLive(path: string): void {
    const s = this.byPath.get(path);
    if (s?.live) this.dropLive(s);
  }

  /** The offset at horizontal `x` on a drawn scene's first or last line, for arrowing in. */
  edgePos(path: string, x: number, edge: "first" | "last"): number | null {
    return this.byPath.get(path)?.drawn?.edgePos(x, edge) ?? null;
  }

  /** Redraw the drawn scenes after a preference change (typography, the marker list). */
  applyPrefs(): void {
    const manuscript = this.opts.manuscript();
    for (const s of this.order) {
      s.live?.host.toggleClass("is-manuscript", manuscript);
      if (s.drawn && s.text !== null) this.draw(s, s.text);
    }
  }

  /** Disconnect everything. The live editor is the panel's to destroy. */
  destroy(): void {
    this.destroyed = true;
    this.held = null;
    this.nearObs.disconnect();
    this.spyObs.disconnect();
    this.sizeObs.disconnect();
    this.opts.app.vault.offref(this.modifyRef);
    this.byPath.clear();
    this.byEl.clear();
    this.order = [];
  }

  // --- sections -----------------------------------------------------------------

  private createSection(spec: StreamSceneSpec): Section {
    const el = createDiv({ cls: "inkswell-stream__section" });
    const top = el.createDiv({ cls: "inkswell-stream__top" });
    const body = el.createDiv({ cls: "inkswell-stream__body" });
    const s: Section = {
      spec,
      el,
      top,
      wordsEl: null,
      body,
      drawn: null,
      drawnHost: null,
      text: null,
      live: null,
      token: 0,
      near: false,
      chars: null,
      measured: null,
    };
    this.renderTop(s);
    this.setPlaceholder(s, this.estimate(s));
    this.byEl.set(el, s);
    this.byEl.set(body, s);
    this.nearObs.observe(el);
    this.spyObs.observe(el);
    this.sizeObs.observe(el);
    this.sizeObs.observe(body);
    return s;
  }

  /** The chapter heading (when this scene opens one) and the scene's title row. */
  private renderTop(s: Section): void {
    s.top.empty();
    if (s.spec.chapterHead) {
      s.top.createDiv({ cls: "inkswell-stream__chapter", text: s.spec.chapterHead });
    }
    const head = s.top.createDiv({ cls: "inkswell-stream__head" });
    head.createSpan({ cls: "inkswell-stream__title", text: s.spec.title });
    if (s.spec.status) {
      head.createSpan({
        cls: `inkswell-status inkswell-status--${s.spec.status.id}`,
        text: s.spec.status.label,
      });
    }
    s.wordsEl = head.createSpan({ cls: "inkswell-stream__words" });
    if (s.text !== null) s.wordsEl.setText(wordsText(countWords(s.text)));
    head.setAttribute("aria-label", `Edit “${s.spec.title}”`);
    head.onclick = () => this.opts.onActivate(s.spec.path, "start");
  }

  private removeSection(s: Section): void {
    this.nearObs.unobserve(s.el);
    this.spyObs.unobserve(s.el);
    this.sizeObs.unobserve(s.el);
    this.sizeObs.unobserve(s.body);
    this.spyHits.delete(s);
    this.byEl.delete(s.el);
    this.byEl.delete(s.body);
    this.samples.delete(s.spec.path);
    s.token++;
    s.el.remove();
  }

  private estimate(s: Section): number {
    if (s.measured !== null) return s.measured;
    let chars = s.chars;
    if (chars === null) {
      const f = this.opts.app.vault.getAbstractFileByPath(s.spec.path);
      if (f instanceof TFile) {
        // The file minus its properties block: about the length of the text drawn.
        const fmEnd = this.opts.app.metadataCache.getFileCache(f)?.frontmatterPosition?.end.offset ?? 0;
        chars = Math.max(0, f.stat.size - fmEnd);
      }
    }
    return estimateHeight(chars ?? 0, this.pxPerChar);
  }

  private setPlaceholder(s: Section, px: number): void {
    s.body.addClass("is-placeholder");
    s.body.setCssProps({ "--inkswell-stream-h": `${px}px` });
  }

  // --- drawing -------------------------------------------------------------------

  /** Read the scene and draw it (async), unless it's live or already drawn. */
  private mount(s: Section): void {
    if (s.drawn || s.live?.ready) return;
    const file = this.opts.app.vault.getAbstractFileByPath(s.spec.path);
    if (!(file instanceof TFile)) return;
    const token = ++s.token;
    void this.opts.app.vault.cachedRead(file).then(
      (content) => {
        if (token !== s.token || this.destroyed || !s.near || s.drawn || s.live?.ready) return;
        if (this.byPath.get(s.spec.path) !== s) return;
        this.draw(s, splitFrontmatter(content).body);
      },
      () => {
        /* unreadable: the placeholder stays */
      }
    );
  }

  /** Draw `text` now, replacing any earlier drawing (before the live slot, if any). */
  private draw(s: Section, text: string): void {
    this.undraw(s);
    const host = createDiv({ cls: "inkswell-write__cm is-stream" });
    host.toggleClass("is-manuscript", this.opts.manuscript());
    s.body.insertBefore(host, s.live?.banner ?? null);
    const drawn = renderStaticScene(host, text, this.opts.markers());
    drawn.el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.opts.onActivate(s.spec.path, drawn.posAt(e.clientX, e.clientY) ?? 0);
    });
    s.drawn = drawn;
    s.drawnHost = host;
    s.text = text;
    s.chars = text.length;
    s.wordsEl?.setText(wordsText(countWords(text)));
    s.body.removeClass("is-placeholder");
  }

  /** Far away again: back to a placeholder of the height it had. */
  private unmount(s: Section): void {
    if (!s.drawn || s.live) return;
    s.token++;
    const h = s.body.offsetHeight;
    if (h > 0) s.measured = h;
    this.undraw(s);
    this.setPlaceholder(s, this.estimate(s));
  }

  private undraw(s: Section): void {
    s.drawnHost?.remove();
    s.drawnHost = null;
    s.drawn = null;
  }

  private dropLive(s: Section): void {
    if (!s.live) return;
    s.live.banner.remove();
    s.live.host.remove();
    s.live = null;
    s.el.removeClass("is-live");
    if (!s.drawn) {
      this.setPlaceholder(s, this.estimate(s));
      if (s.near) this.mount(s);
    }
  }

  // --- observers -----------------------------------------------------------------

  private onNear(entries: IntersectionObserverEntry[]): void {
    for (const e of entries) {
      const s = this.byEl.get(e.target);
      if (!s) continue;
      s.near = e.isIntersecting;
      if (s.near) this.mount(s);
      else this.unmount(s);
    }
  }

  private onSpy(entries: IntersectionObserverEntry[]): void {
    for (const e of entries) {
      const s = this.byEl.get(e.target);
      if (!s) continue;
      if (e.isIntersecting) this.spyHits.add(s);
      else this.spyHits.delete(s);
    }
    const first = this.order.find((s) => this.spyHits.has(s)) ?? null;
    const path = first?.spec.path ?? null;
    if (path === this.inView) return;
    this.inView = path;
    this.opts.onInView(path);
  }

  /**
   * Something on the page changed size. A drawn scene's real height is
   * remembered (a placeholder later reuses it) and teaches the
   * pixels-per-character ratio; when the ratio moves a lot, every never-drawn
   * placeholder is re-estimated in one go. Then the text in view is put back
   * where it was. (Resize observations arrive after layout and before paint,
   * so the correction is never seen.)
   */
  private onResize(entries: ResizeObserverEntry[]): void {
    this.learn(entries);
    this.restoreAnchor();
  }

  private learn(entries: ResizeObserverEntry[]): void {
    let learned = false;
    for (const e of entries) {
      const s = this.byEl.get(e.target);
      if (!s || e.target !== s.body || s.body.hasClass("is-placeholder")) continue;
      const h = e.contentRect.height;
      if (h <= 0) continue;
      s.measured = h;
      if (s.drawn && !s.live && s.chars) {
        this.samples.set(s.spec.path, { chars: s.chars, px: h });
        learned = true;
      }
    }
    if (!learned) return;
    const k = calibrate([...this.samples.values()]);
    if (k === null || Math.abs(k - this.pxPerChar) / this.pxPerChar < 0.15) return;
    this.pxPerChar = k;
    for (const s of this.order) {
      if (s.measured === null && s.body.hasClass("is-placeholder")) this.setPlaceholder(s, this.estimate(s));
    }
  }

  // --- keeping the text in view still ---------------------------------------------

  /** The scene at the top of the visible area (binary search on layout offsets). */
  private sectionAtTop(): Section | null {
    const y = this.scroller.scrollTop + 4;
    let lo = 0;
    let hi = this.order.length - 1;
    let found: Section | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.order[mid].el.offsetTop <= y) {
        found = this.order[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found ?? this.order[0] ?? null;
  }

  /**
   * Note what's at the top of the visible area, as something that survives a
   * redraw: a line of a drawn scene; a text position in the live editor
   * (CodeMirror reuses its line elements, so a DOM line is no anchor there);
   * else the scene itself. Plus the scroll position it was measured at.
   */
  private pickAnchor(): void {
    const s = this.sectionAtTop();
    if (!s) {
      this.held = null;
      return;
    }
    const scroll = this.scroller.scrollTop;
    const y = this.scroller.getBoundingClientRect().top + 4;
    if (s.live?.ready) {
      const dom = s.live.host.querySelector<HTMLElement>(".cm-editor");
      const view = dom ? EditorView.findFromDOM(dom) : null;
      if (view) {
        const box = view.dom.getBoundingClientRect();
        if (box.top <= y && box.bottom > y) {
          const pos = view.lineBlockAtHeight(y - view.documentTop).from;
          this.held = { kind: "text", view, pos, top: view.documentTop + view.lineBlockAt(pos).top, scroll };
          return;
        }
      }
    } else if (s.drawn) {
      const line = s.drawn.lineAt(y);
      if (line) {
        this.held = { kind: "el", el: line, top: line.getBoundingClientRect().top, scroll };
        return;
      }
    }
    this.held = { kind: "el", el: s.el, top: s.el.getBoundingClientRect().top, scroll };
  }

  /** Where the held anchor is on screen now, or null when it's gone. */
  private heldTop(a: Anchor): number | null {
    if (a.kind === "el") return a.el.isConnected ? a.el.getBoundingClientRect().top : null;
    if (!a.view.dom.isConnected || a.pos > a.view.state.doc.length) return null;
    return a.view.documentTop + a.view.lineBlockAt(a.pos).top;
  }

  /**
   * Content above the visible area changed size: scroll by however far the
   * anchor moved beyond what scrolling explains, so the text being read stays
   * put. A scroll since the anchor was taken (the writer's, or CodeMirror
   * bringing the caret into view) moves the anchor by exactly minus that
   * scroll — it's meant, so it's subtracted out, never undone. Wheel scrolls
   * and layout changes often land in the same frame, which is why the two
   * can't simply be told apart by "did anything scroll".
   */
  private restoreAnchor(): void {
    const a = this.held;
    if (!a || this.destroyed) return;
    const now = this.heldTop(a);
    if (now !== null) {
      const shift = now - a.top + (this.scroller.scrollTop - a.scroll);
      if (Math.abs(shift) > 0.5) this.scroller.scrollTop += shift;
    }
    this.pickAnchor();
  }

  /** Another tool or device changed a drawn scene: show the new text. */
  private onModify(f: TAbstractFile): void {
    const s = this.byPath.get(f.path);
    if (!s || !(f instanceof TFile)) return;
    s.chars = null;
    if (!s.drawn || s.live?.ready) return;
    const token = ++s.token;
    void this.opts.app.vault.cachedRead(f).then((content) => {
      if (token !== s.token || !s.drawn || this.destroyed) return;
      const body = splitFrontmatter(content).body;
      if (body !== s.text) this.draw(s, body);
    });
  }
}

function sameSpec(a: StreamSceneSpec, b: StreamSceneSpec): boolean {
  return (
    a.title === b.title &&
    a.chapterHead === b.chapterHead &&
    a.status?.id === b.status?.id &&
    a.status?.label === b.status?.label
  );
}

function wordsText(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? "word" : "words"}`;
}
