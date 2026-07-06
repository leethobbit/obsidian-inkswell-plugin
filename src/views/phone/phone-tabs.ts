/**
 * Bottom tab bar builder for the phone frontend. The slots derive from the
 * single nav model (nav-model.ts) — this file only renders. On phones this bar
 * replaces the desktop icon rail (which is hidden via CSS).
 */
import { setIcon } from "obsidian";
import { InkswellMode, phoneBarDestinations } from "../nav-model";

export { phoneTabForMode } from "../nav-model";

export interface BottomBarHandlers {
  onTab: (mode: InkswellMode, subtab?: string) => void;
  onMore: (e: MouseEvent) => void;
}

/** Build the bottom bar into `parent`; returns the bar element for active-state toggling. */
export function buildBottomBar(parent: HTMLElement, handlers: BottomBarHandlers): HTMLElement {
  const bar = parent.createDiv({ cls: "inkswell-bottombar" });
  for (const dest of phoneBarDestinations()) {
    const label = dest.phone?.label ?? dest.label;
    const btn = bar.createEl("button", { cls: "inkswell-bottombar__tab" });
    btn.type = "button";
    btn.dataset.tab = dest.id;
    setIcon(btn.createSpan({ cls: "inkswell-bottombar__icon" }), dest.icon);
    btn.createSpan({ cls: "inkswell-bottombar__label", text: label });
    btn.setAttribute("aria-label", label);
    btn.onclick = () => handlers.onTab(dest.id, dest.phone?.subtab);
  }
  // The fixed "More" slot (an action, not a destination).
  const more = bar.createEl("button", { cls: "inkswell-bottombar__tab" });
  more.type = "button";
  more.dataset.tab = "more";
  setIcon(more.createSpan({ cls: "inkswell-bottombar__icon" }), "more-horizontal");
  more.createSpan({ cls: "inkswell-bottombar__label", text: "More" });
  more.setAttribute("aria-label", "More");
  more.onclick = (e) => handlers.onMore(e);
  return bar;
}
