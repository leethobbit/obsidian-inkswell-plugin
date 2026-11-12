/**
 * Make a row's secondary actions reachable on both desktop and touch.
 *
 * Desktop keeps right-click (`contextmenu`). On touch — where a hand-rolled
 * `contextmenu` listener doesn't reliably fire — a visible "⋯" button (appended
 * to `host`, styled by `.inkswell-rowmenu`, shown only under `body.is-mobile`)
 * opens the SAME Obsidian Menu. One affordance, one code path, no divergence.
 *
 * `build` returns a fully-populated Menu and is invoked fresh on every open, so
 * the menu always reflects current state.
 *
 * This owns `row.oncontextmenu` (property assignment) — don't set another
 * contextmenu handler on the same row, it would be clobbered.
 */

import { Keymap, Menu, Platform, setIcon } from "obsidian";
import { t } from "../i18n";

export function attachRowMenu(row: HTMLElement, host: HTMLElement, build: () => Menu): void {
  const open = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    build().showAtMouseEvent(e);
  };
  row.oncontextmenu = open;

  const btn = host.createEl("button", { cls: "inkswell-rowmenu" });
  // Not in a <form> today, but a bare button defaults to type="submit" — pin it
  // to a plain button so it can't ever submit a form a row is dropped into.
  btn.type = "button";
  btn.draggable = false;
  setIcon(btn, "more-vertical");
  btn.setAttribute("aria-label", t("lib.rowMenu.more"));
  btn.onclick = open;
}

/**
 * Ctrl/Cmd-click or middle-click on `el` runs `open` (a scene → a regular
 * Obsidian tab, like Ctrl/Cmd-clicking a wikilink) INSTEAD of the element's
 * own click (#53). A plain click is untouched.
 *
 * The modifier check is a capture-phase listener that stops the event, so the
 * row's own `onclick` (select / open in Write / edit dialog) never runs.
 * `Keymap.isModEvent` is Cmd on macOS, where Ctrl-click stays the context menu.
 * A mod-click without pointer movement never starts a drag, so draggable rows
 * are fine. Middle-click fires `auxclick`, not `click`; its mousedown is
 * cancelled so Windows doesn't enter autoscroll. Touch has no modifier — the
 * row menu's "Open in new tab" is the equivalent there.
 */
export function attachOpenInTab(el: HTMLElement, open: () => void): void {
  el.addEventListener(
    "click",
    (e) => {
      if (!Keymap.isModEvent(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    },
    { capture: true }
  );
  el.addEventListener("mousedown", (e) => {
    if (e.button === 1) e.preventDefault();
  });
  el.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    open();
  });
  if (!Platform.isMobile) {
    const hint = t("lib.rowMenu.openInTabHint");
    const label = el.getAttribute("aria-label");
    el.setAttribute("aria-label", label ? `${label} · ${hint}` : hint);
  }
}
