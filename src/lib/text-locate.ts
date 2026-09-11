/**
 * Locate a literal in text after the text may have shifted (pure, no Obsidian).
 * Shared by the Write panel's highlight re-location (Search / Style-sheet hits)
 * and Quick Codex's link insertion (the selection may move while a dialog is
 * open — an autosave reload, a sync reseed).
 */

/**
 * Find the occurrence of `needle` in `haystack` closest to `near` (by start
 * offset). Returns -1 when the literal is absent.
 */
export function nearestIndexOf(haystack: string, needle: string, near: number): number {
  if (!needle) return -1;
  let best = -1;
  let bestDist = Infinity;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    const dist = Math.abs(i - near);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
    // Once we're past `near`, matches only get farther — stop early.
    if (i >= near) break;
    i = haystack.indexOf(needle, i + 1);
  }
  return best;
}
