// @vitest-environment happy-dom
/**
 * DOM-level tests for the focus-preservation layer: `preserveFocus` must carry
 * focus, caret, and UNCOMMITTED text across a rebuild that recreates a tagged
 * field (the "live value wins over the recreated value" rule), and
 * `commitFocusedField` must blur a focused form field so its pending change
 * commits before a modal empties its DOM.
 *
 * Runs under happy-dom. Obsidian extends the DOM with `instanceOf` (popout-safe
 * instanceof) and `doc` (owner document) — both are polyfilled here exactly as
 * the app provides them, since focus-preserve.ts depends on them.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { commitFocusedField, preserveFocus, tagField } from "../src/lib/focus-preserve";

beforeAll(() => {
  // Obsidian's DOM extensions, minimally reproduced for the test env.
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

function input(parent: HTMLElement, key?: string, value = ""): HTMLInputElement {
  const el = document.createElement("input");
  el.type = "text";
  el.value = value;
  if (key) tagField(el, key);
  parent.appendChild(el);
  return el;
}

describe("preserveFocus", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("restores focus, caret, and UNCOMMITTED text into the recreated field", () => {
    const host = scope();
    const field = input(host, "panel:name", "typed but never committed");
    field.focus();
    field.setSelectionRange(5, 5);

    preserveFocus(host, () => {
      host.innerHTML = "";
      // The rebuild reseeds from (older) persisted state — the classic gap the
      // "live value wins" rule closes: the user's keystrokes never hit change.
      input(host, "panel:name", "old persisted value");
    });

    const rebuilt = host.querySelector("input") as HTMLInputElement;
    expect(document.activeElement).toBe(rebuilt);
    expect(rebuilt.value).toBe("typed but never committed");
    expect(rebuilt.selectionStart).toBe(5);
    expect(rebuilt.selectionEnd).toBe(5);
  });

  it("restores a collapsed vs extended selection faithfully", () => {
    const host = scope();
    const ta = document.createElement("textarea");
    tagField(ta, "panel:notes");
    ta.value = "some longer text";
    host.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(5, 11);

    preserveFocus(host, () => {
      host.innerHTML = "";
      const next = document.createElement("textarea");
      tagField(next, "panel:notes");
      next.value = "";
      host.appendChild(next);
    });

    const rebuilt = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(rebuilt);
    expect(rebuilt.value).toBe("some longer text");
    expect(rebuilt.selectionStart).toBe(5);
    expect(rebuilt.selectionEnd).toBe(11);
  });

  it("no-ops when the focused field is untagged (why the tagField sweep matters)", () => {
    const host = scope();
    const field = input(host, undefined, "will be lost");
    field.focus();

    preserveFocus(host, () => {
      host.innerHTML = "";
      input(host, undefined, "");
    });

    const rebuilt = host.querySelector("input") as HTMLInputElement;
    expect(document.activeElement).not.toBe(rebuilt);
    expect(rebuilt.value).toBe(""); // nothing carried across — untagged
  });

  it("no-ops when focus is outside the scope", () => {
    const host = scope();
    input(host, "panel:inside", "scope value");
    const outside = input(document.body as unknown as HTMLElement, "other:field", "x");
    outside.focus();

    preserveFocus(host, () => {
      host.innerHTML = "";
      input(host, "panel:inside", "rebuilt");
    });

    expect(document.activeElement).toBe(outside); // untouched
    expect((host.querySelector("input") as HTMLInputElement).value).toBe("rebuilt");
  });

  it("selects get focus-only restore (value left as the rebuild set it)", () => {
    const host = scope();
    const sel = document.createElement("select");
    tagField(sel, "panel:pick");
    for (const v of ["a", "b"]) {
      const o = document.createElement("option");
      o.value = v;
      o.text = v;
      sel.appendChild(o);
    }
    sel.value = "b";
    host.appendChild(sel);
    sel.focus();

    preserveFocus(host, () => {
      host.innerHTML = "";
      const next = document.createElement("select");
      tagField(next, "panel:pick");
      for (const v of ["a", "b"]) {
        const o = document.createElement("option");
        o.value = v;
        o.text = v;
        next.appendChild(o);
      }
      next.value = "a"; // rebuild's (authoritative) value stays
      host.appendChild(next);
    });

    const rebuilt = host.querySelector("select") as HTMLSelectElement;
    expect(document.activeElement).toBe(rebuilt);
    expect(rebuilt.value).toBe("a");
  });

  it("number inputs restore value without a setSelectionRange throw", () => {
    const host = scope();
    const num = document.createElement("input");
    num.type = "number";
    tagField(num, "panel:target");
    num.value = "4242";
    host.appendChild(num);
    num.focus();

    expect(() =>
      preserveFocus(host, () => {
        host.innerHTML = "";
        const next = document.createElement("input");
        next.type = "number";
        tagField(next, "panel:target");
        next.value = "";
        host.appendChild(next);
      })
    ).not.toThrow();

    const rebuilt = host.querySelector("input") as HTMLInputElement;
    expect(document.activeElement).toBe(rebuilt);
    expect(rebuilt.value).toBe("4242");
  });

  it("does nothing when the tag vanished from the rebuilt subtree", () => {
    const host = scope();
    const field = input(host, "panel:gone", "text");
    field.focus();
    expect(() =>
      preserveFocus(host, () => {
        host.innerHTML = ""; // field not recreated at all
      })
    ).not.toThrow();
  });
});

describe("commitFocusedField", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("blurs a focused input inside the scope (so its pending change commits)", () => {
    const host = scope();
    const field = input(host, "scene:synopsis", "typed into a modal");
    field.focus();
    expect(document.activeElement).toBe(field);

    commitFocusedField(host);
    expect(document.activeElement).not.toBe(field);
  });

  it("leaves focus alone when it sits outside the scope", () => {
    const host = scope();
    input(host, "scene:synopsis");
    const outside = input(document.body as unknown as HTMLElement, undefined, "");
    outside.focus();

    commitFocusedField(host);
    expect(document.activeElement).toBe(outside);
  });

  it("ignores focused non-form elements", () => {
    const host = scope();
    const btn = document.createElement("button");
    host.appendChild(btn);
    btn.focus();

    commitFocusedField(host);
    expect(document.activeElement).toBe(btn); // buttons have no pending change
  });
});
