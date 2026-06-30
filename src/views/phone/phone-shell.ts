/**
 * Phone chrome: the bottom tab bar + Capture FAB that replace the desktop icon
 * rail on phones. Mounted once as a sibling of the host body (OUTSIDE it), so the
 * body's per-render empty() never tears the bar down and a tab tap can't be
 * swallowed by an in-flight rebuild. It owns only the bar; the drill-down back
 * header and all content live in the view's normal render path.
 */
import { BottomBarHandlers, buildBottomBar, phoneTabForMode } from "./phone-tabs";
import type { InkswellMode } from "../inkswell-view";

export class PhoneShell {
  private bar: HTMLElement | null = null;

  /** Build the bottom bar into `parent` (the host main, after the body). */
  mount(parent: HTMLElement, handlers: BottomBarHandlers): void {
    this.bar = buildBottomBar(parent, handlers);
  }

  /** Reflect the active destination as the highlighted tab (class-toggle only — no rebuild). */
  setActive(mode: InkswellMode): void {
    if (!this.bar) return;
    const active = phoneTabForMode(mode);
    this.bar.querySelectorAll<HTMLElement>(".inkswell-bottombar__tab").forEach((el) => {
      el.toggleClass("is-active", el.dataset.tab === active);
    });
  }

  /**
   * Obsidian's own global mobile toolbar (`.mobile-navbar`) is fixed to the bottom
   * of the app and overlaps our bar. Lift ours to sit flush on top of it. We
   * measure at runtime — navbar height + safe-area inset vary by device, and the
   * user can even hide the toolbar — and adjust by the exact overlap. The formula
   * is idempotent (converges and self-corrects on re-call / resize); no navbar →
   * the bar drops back to the natural bottom.
   */
  alignAboveNavbar(): void {
    const bar = this.bar;
    if (!bar) return;
    const navbar = bar.ownerDocument.querySelector<HTMLElement>(".mobile-navbar");
    if (!navbar) {
      // No Obsidian toolbar (e.g. user hid it) → sit at the natural bottom.
      bar.setCssProps({ "--inkswell-navbar-lift": "0px" });
      return;
    }
    // Drive the lift through a CSS variable (the bar's margin-bottom reads it),
    // via Obsidian's setCssProps — per obsidianmd/no-static-styles-assignment.
    // GAP leaves a small breathing space above Obsidian's toolbar.
    const GAP = 4;
    const current = parseFloat(getComputedStyle(bar).marginBottom) || 0;
    const overlap = bar.getBoundingClientRect().bottom - navbar.getBoundingClientRect().top;
    const next = Math.max(0, Math.round(current + overlap + GAP));
    bar.setCssProps({ "--inkswell-navbar-lift": `${next}px` });
  }
}
