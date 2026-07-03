/**
 * Single source of truth for phone/form-factor layout decisions.
 *
 * Layout adapts via CSS (Obsidian adds `is-mobile` / `is-phone` / `is-ios` /
 * `is-android` to <body>); this module is only for the *behavioral* branches
 * CSS can't express — gating which panels mount on a phone (redirecting heavy
 * multi-pane surfaces to a "use a larger screen" placeholder).
 *
 * Form factor is a screen-WIDTH heuristic, not device identity: Obsidian gives
 * us `isPhone` / `isTablet` (≈600dp split), with no iPad-vs-iPhone or e-ink
 * signal. Treat `isPhone()` as "very limited width", not "is an iPhone".
 *
 * Node/Electron access is NOT gated here — use a `FileSystemAdapter instanceof`
 * check (see `src/compile/pandoc.ts`, `engine.ts`), never a `Platform` flag:
 * `isMobileApp`/`isDesktopApp` flip under the desktop "emulate mobile" toggle
 * while Node is still present.
 */

import { Platform, setIcon } from "obsidian";

/** True on a phone-sized mobile screen (limited width). Heavy multi-pane
 *  surfaces (Board, the Write inspector, Codex master-detail) redirect here. */
export function isPhone(): boolean {
  return Platform.isPhone;
}

/**
 * On a phone, replace a heavy multi-pane surface with a lightweight "use a
 * larger screen" placeholder and return true (so the caller bails). On any
 * wider build returns false and renders nothing. Reads as a guard:
 *   `if (renderPhoneRedirect(el, "The board")) return;`
 */
export function renderPhoneRedirect(container: HTMLElement, surface: string): boolean {
  if (!isPhone()) return false;
  const wrap = container.createDiv({ cls: "inkswell-phone-redirect" });
  setIcon(wrap.createDiv({ cls: "inkswell-phone-redirect__icon" }), "monitor");
  wrap.createDiv({
    cls: "inkswell-phone-redirect__title",
    text: `${surface} needs a larger screen`,
  });
  wrap.createDiv({
    cls: "inkswell-phone-redirect__body",
    text: "Open this project on an iPad or desktop for this view. Drafting and your scene list work here on a phone.",
  });
  return true;
}
