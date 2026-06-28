/**
 * Single source of truth for platform/form-factor decisions.
 *
 * Layout adapts via CSS (Obsidian adds `is-mobile` / `is-phone` / `is-ios` /
 * `is-android` to <body>); this module is only for the handful of *behavioral*
 * branches CSS can't express — gating which panels mount on a phone, choosing a
 * modal vs. an inline panel, and guarding Node/Electron access.
 *
 * Form factor is a screen-WIDTH heuristic, not device identity: Obsidian gives
 * us `isPhone` / `isTablet` (≈600dp split), with no iPad-vs-iPhone or e-ink
 * signal. Treat `isPhone()` as "very limited width", not "is an iPhone".
 */

import { Platform, setIcon } from "obsidian";

/** True on a phone-sized mobile screen (limited width). Heavy multi-pane
 *  surfaces (Board, the Write inspector, Codex master-detail) redirect here. */
export function isPhone(): boolean {
  return Platform.isPhone;
}

/** True when there's room for the full multi-pane layout: tablets + desktop.
 *  The inverse of {@link isPhone}. */
export function isWide(): boolean {
  return !Platform.isPhone;
}

/** True on any mobile app build (phone OR tablet, iOS OR Android). */
export function isMobile(): boolean {
  return Platform.isMobileApp;
}

/** True only in the Electron desktop app — the ONLY safe gate for Node/Electron
 *  APIs. Never gate Node access on `isMobile`/`isDesktop` (those flip under the
 *  desktop "emulate mobile" toggle while Node is still present). */
export function isDesktopApp(): boolean {
  return Platform.isDesktopApp;
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
