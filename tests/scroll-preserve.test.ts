// @vitest-environment happy-dom
/**
 * DOM-level tests for the scroll-preservation layer: `preserveScroll` must
 * carry a tagged scroller's scrollTop/scrollLeft across a rebuild that
 * recreates the element, and `preserveUi` must compose it with the
 * focus-preservation layer (caret AND sibling scroller both survive).
 *
 * happy-dom has no layout engine, so positions aren't clamped to content size
 * here — tests assert the value round-trip only. In a real browser an
 * out-of-range restore clamps, which is the intended behavior (e.g. content
 * shrank after a delete).
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { tagField } from "../src/lib/focus-preserve";
import { preserveScroll, preserveUi, tagScroller } from "../src/lib/scroll-preserve";

beforeAll(() => {
  // Obsidian's DOM extensions, minimally reproduced for the test env —
  // needed by focus-preserve, which preserveUi composes with.
  const proto = Node.prototype as unknown as Record<string, unknown>;
  if (!("instanceOf" in proto)) {
    Object.defineProperty(Node.prototype, "instanceOf", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value(this: Node, cls: any): boolean {
        return this instanceof cls;
      },
      configurable: true,
    });
  }
  if (!("doc" in proto)) {
    Object.defineProperty(Node.prototype, "doc", {
      get(this: Node): Document {
        return this.ownerDocument ?? (this as unknown as Document);
      },
      configurable: true,
    });
  }
});

/** A scope div attached to the live document (focus needs a connected tree). */
function scope(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function scroller(parent: HTMLElement, key: string): HTMLElement {
  const el = document.createElement("div");
  tagScroller(el, key);
  parent.appendChild(el);
  return el;
}

describe("preserveScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("restores scrollTop and scrollLeft into a recreated tagged scroller", () => {
    const host = scope();
    const el = scroller(host, "grid");
    el.scrollTop = 150;
    el.scrollLeft = 40;

    preserveScroll(host, () => {
      host.innerHTML = "";
      scroller(host, "grid");
    });

    const rebuilt = host.querySelector<HTMLElement>("[data-inkswell-scroller]");
    expect(rebuilt).not.toBeNull();
    expect(rebuilt!.scrollTop).toBe(150);
    expect(rebuilt!.scrollLeft).toBe(40);
  });

  it("restores multiple tagged scrollers independently by key", () => {
    const host = scope();
    const a = scroller(host, "grid");
    const b = scroller(host, "board-cols");
    a.scrollTop = 100;
    b.scrollLeft = 250;

    preserveScroll(host, () => {
      host.innerHTML = "";
      // Recreated in the opposite order — restore must match by key, not index.
      scroller(host, "board-cols");
      scroller(host, "grid");
    });

    const rebuilt = Array.from(
      host.querySelectorAll<HTMLElement>("[data-inkswell-scroller]")
    );
    const gridEl = rebuilt.find((c) => c.dataset.inkswellScroller === "grid");
    const boardEl = rebuilt.find((c) => c.dataset.inkswellScroller === "board-cols");
    expect(gridEl!.scrollTop).toBe(100);
    expect(gridEl!.scrollLeft).toBe(0);
    expect(boardEl!.scrollLeft).toBe(250);
    expect(boardEl!.scrollTop).toBe(0);
  });

  it("skips keys missing after the rebuild without throwing; others restore", () => {
    const host = scope();
    const a = scroller(host, "gone");
    const b = scroller(host, "kept");
    a.scrollTop = 75;
    b.scrollTop = 33;

    preserveScroll(host, () => {
      host.innerHTML = "";
      scroller(host, "kept"); // "gone" is not recreated
    });

    const rebuilt = host.querySelector<HTMLElement>("[data-inkswell-scroller]");
    expect(rebuilt!.dataset.inkswellScroller).toBe("kept");
    expect(rebuilt!.scrollTop).toBe(33);
  });

  it("is a no-op when nothing under scope is tagged", () => {
    const host = scope();
    host.appendChild(document.createElement("div"));
    expect(() =>
      preserveScroll(host, () => {
        host.innerHTML = "";
      })
    ).not.toThrow();
  });
});

describe("preserveUi", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the focused field's caret AND the sibling scroller's position", () => {
    const host = scope();
    const el = scroller(host, "grid");
    el.scrollTop = 120;
    const field = document.createElement("input");
    field.type = "text";
    field.value = "typed";
    tagField(field, "panel:name");
    host.appendChild(field);
    field.focus();
    field.setSelectionRange(3, 3);

    preserveUi(host, () => {
      host.innerHTML = "";
      scroller(host, "grid");
      const fresh = document.createElement("input");
      fresh.type = "text";
      fresh.value = "stale";
      tagField(fresh, "panel:name");
      host.appendChild(fresh);
    });

    const rebuiltField = host.querySelector("input") as HTMLInputElement;
    const rebuiltScroller = host.querySelector<HTMLElement>("[data-inkswell-scroller]");
    expect(document.activeElement).toBe(rebuiltField);
    expect(rebuiltField.value).toBe("typed");
    expect(rebuiltField.selectionStart).toBe(3);
    expect(rebuiltScroller!.scrollTop).toBe(120);
  });
});
