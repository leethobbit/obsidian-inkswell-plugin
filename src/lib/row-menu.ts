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

import { Menu, setIcon } from "obsidian";

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
  btn.setAttribute("aria-label", "More actions");
  btn.onclick = open;
}
