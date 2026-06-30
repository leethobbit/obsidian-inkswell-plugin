/**
 * Bottom tab bar config + builder for the phone frontend. Pure UI — callbacks
 * only, no view coupling — so it can be unit-reasoned and reused. On phones this
 * replaces the desktop icon rail (which is hidden via CSS).
 */
import { setIcon } from "obsidian";
import type { InkswellMode } from "../inkswell-view";

export interface PhoneTab {
  id: string;
  label: string;
  icon: string;
  /** "tab" → switch destination; "more" → open the More sheet. */
  kind: "tab" | "more";
  mode?: InkswellMode;
  subtab?: string;
}

/** Bottom-bar slots, left→right. Capture and Track live in the More sheet. */
export const PHONE_TABS: PhoneTab[] = [
  { id: "write", label: "Write", icon: "pencil", kind: "tab", mode: "write" },
  { id: "scenes", label: "Scenes", icon: "home", kind: "tab", mode: "home" },
  { id: "codex", label: "Codex", icon: "book-marked", kind: "tab", mode: "codex" },
  { id: "more", label: "More", icon: "more-horizontal", kind: "more" },
];

/** Which bottom tab should be highlighted for a given destination. */
export function phoneTabForMode(mode: InkswellMode): string {
  if (mode === "write") return "write";
  if (mode === "home") return "scenes";
  if (mode === "codex") return "codex";
  return "more"; // track, revise→todos, help, and the redirected destinations
}

export interface BottomBarHandlers {
  onTab: (mode: InkswellMode, subtab?: string) => void;
  onMore: (e: MouseEvent) => void;
}

/** Build the bottom bar into `parent`; returns the bar element for active-state toggling. */
export function buildBottomBar(parent: HTMLElement, handlers: BottomBarHandlers): HTMLElement {
  const bar = parent.createDiv({ cls: "inkswell-bottombar" });
  for (const tab of PHONE_TABS) {
    const btn = bar.createEl("button", { cls: "inkswell-bottombar__tab" });
    btn.type = "button";
    btn.dataset.tab = tab.id;
    setIcon(btn.createSpan({ cls: "inkswell-bottombar__icon" }), tab.icon);
    btn.createSpan({ cls: "inkswell-bottombar__label", text: tab.label });
    btn.setAttribute("aria-label", tab.label);
    if (tab.kind === "more") {
      btn.onclick = (e) => handlers.onMore(e);
    } else if (tab.mode) {
      const mode = tab.mode;
      const subtab = tab.subtab;
      btn.onclick = () => handlers.onTab(mode, subtab);
    }
  }
  return bar;
}
