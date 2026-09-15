/**
 * Single source of truth for phone/form-factor layout decisions.
 *
 * Layout adapts via CSS; this module is for the *behavioral* branches CSS
 * can't express — gating which panels mount on a phone (redirecting heavy
 * multi-pane surfaces to a "use a larger screen" placeholder).
 *
 * Form factor is a screen-WIDTH heuristic, not device identity: Obsidian gives
 * us `isPhone` / `isTablet` (≈600dp split), with no iPad-vs-iPhone or e-ink
 * signal. Treat `isPhone()` as "very limited width", not "is an iPhone".
 *
 * Obsidian sometimes gets that split wrong (a 10" Android tablet flagged as a
 * phone — #41), so the classification can be overridden by a setting. Because
 * of that, Inkswell's phone-layout CSS keys on its OWN body class,
 * `body.inkswell-phone` (kept in sync with `isPhone()` by the plugin), never on
 * Obsidian's `body.is-phone`. Touch-target sizing still keys on Obsidian's
 * `body.is-mobile` — that's a touch-device property, not a layout one.
 *
 * Node/Electron access is NOT gated here — use a `FileSystemAdapter instanceof`
 * check (see `src/compile/pandoc.ts`, `engine.ts`), never a `Platform` flag:
 * `isMobileApp`/`isDesktopApp` flip under the desktop "emulate mobile" toggle
 * while Node is still present.
 */

import { Platform, setIcon } from "obsidian";

/** Body class marking Inkswell's phone layout (see module doc). */
export const PHONE_BODY_CLASS = "inkswell-phone";

/** The user's "use the full layout on this device" override (a setting). */
let forceTabletLayout = false;

/** Set by the plugin on load and whenever the setting changes. */
export function setForceTabletLayout(on: boolean): void {
  forceTabletLayout = on;
}

/**
 * True on a phone-sized mobile screen (limited width) unless the user overrode
 * the classification. Heavy multi-pane surfaces (Board, the Write inspector,
 * Codex master-detail) redirect when this is true.
 */
export function isPhone(): boolean {
  return Platform.isPhone && !forceTabletLayout;
}

/** Obsidian's RAW classification, ignoring the override — only for deciding
 *  whether to offer the override at all (the Settings row). */
export function deviceFlaggedAsPhone(): boolean {
  return Platform.isPhone;
}

/** Running in the mobile app (phone or tablet). A device property, not a layout
 *  one: the keyboard-blind-webview workarounds key on this, not on `isPhone()`. */
export function isMobileApp(): boolean {
  return Platform.isMobileApp;
}

/**
 * On a phone, replace a heavy multi-pane surface with a lightweight "use a
 * larger screen" placeholder and return true (so the caller bails). On any
 * wider build returns false and renders nothing. Reads as a guard:
 *   `if (renderPhoneRedirect(el, "The board")) return;`
 * `onUseFullLayout`, when given, adds a link that lets a misdetected tablet
 * opt into the full layout right here (it flips the same setting).
 */
export function renderPhoneRedirect(
  container: HTMLElement,
  surface: string,
  onUseFullLayout?: () => void
): boolean {
  if (!isPhone()) return false;
  const wrap = container.createDiv({ cls: "inkswell-phone-redirect" });
  setIcon(wrap.createDiv({ cls: "inkswell-phone-redirect__icon" }), "monitor");
  wrap.createDiv({
    cls: "inkswell-phone-redirect__title",
    text: `${surface} needs a larger screen`,
  });
  wrap.createDiv({
    cls: "inkswell-phone-redirect__body",
    text: "Open this project on a tablet or desktop for this view. Drafting and your scene list work here on a phone.",
  });
  if (onUseFullLayout) {
    const link = wrap.createEl("a", {
      cls: "inkswell-phone-redirect__link",
      text: "Not a phone? Use the full layout",
    });
    link.onclick = (e) => {
      e.preventDefault();
      onUseFullLayout();
    };
  }
  return true;
}
