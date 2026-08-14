/**
 * Keep a panel-owned scroller's position alive across a DOM rebuild.
 *
 * Some panels create their own overflow containers (the plot grid's matrix,
 * the board's column strip) and recreate them wholesale on every render — so
 * even a soft refresh that leaves the host's `.inkswell-content` mounted
 * resets those inner scrollers to 0. Scrollers opt in via
 * `tagScroller(el, "key")`; `preserveScroll` re-finds the recreated element
 * by its stable tag and restores both axes.
 *
 * Companion to {@link ./focus-preserve} — `preserveUi` composes the two for
 * the common "re-render in place" case.
 */

import { preserveFocus } from "./focus-preserve";

interface SavedScroll {
  key: string;
  top: number;
  left: number;
}

/** Stamp a stable identity on a scroller that a re-render recreates. */
export function tagScroller(el: HTMLElement, key: string): void {
  el.dataset.inkswellScroller = key;
}

function scrollers(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-inkswell-scroller]"));
}

/**
 * Run `rebuild` (which may tear down and recreate everything under `scope`),
 * then restore each tagged scroller's scrollTop/scrollLeft by tag. The first
 * element per key wins; keys missing after the rebuild are skipped, and the
 * browser clamps positions that no longer fit the rebuilt content.
 */
export function preserveScroll(scope: HTMLElement, rebuild: () => void): void {
  const saved: SavedScroll[] = [];
  const seen = new Set<string>();
  for (const el of scrollers(scope)) {
    const key = el.dataset.inkswellScroller;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    saved.push({ key, top: el.scrollTop, left: el.scrollLeft });
  }

  rebuild();

  if (saved.length === 0) return;
  const rebuilt = scrollers(scope);
  for (const s of saved) {
    const el = rebuilt.find((c) => c.dataset.inkswellScroller === s.key);
    if (!el) continue;
    el.scrollTop = s.top;
    el.scrollLeft = s.left;
  }
}

/**
 * Scroll + focus preservation for an in-place re-render: scroll capture on the
 * outside, focus on the inside, so focus restores first (it uses
 * `preventScroll`, so it can't fight the scroll restore) and scroll last.
 */
export function preserveUi(scope: HTMLElement, rebuild: () => void): void {
  preserveScroll(scope, () => preserveFocus(scope, rebuild));
}
