/**
 * Pure reorder math for flat lists (the Customize list editor, and any future
 * flat, settings-backed list). No Obsidian import.
 *
 * `to` is a POST-removal index — where the moved item sits in the result — so
 * "Move up" is `moveItem(a, i, i - 1)` and "Move down" is `moveItem(a, i, i + 1)`
 * with no arithmetic surprises. (The explorer's `moveScene` uses a pre-removal
 * slot instead; the two serve different write paths and are deliberately not
 * unified.)
 */

/** Move `items[from]` so it ends up at index `to` in the result. Always returns a
 *  new array; out-of-range `from` or a no-op move returns an unchanged copy. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  const n = out.length;
  if (from < 0 || from >= n) return out;
  const target = Math.max(0, Math.min(n - 1, to));
  if (target === from) return out;
  const [moved] = out.splice(from, 1);
  out.splice(target, 0, moved);
  return out;
}

/**
 * Translate a drop gesture — dragging row `from` onto row `targetIndex`, landing
 * above or below it — into `moveItem`'s post-removal `to`. Dropping a row onto
 * itself (either half) is a no-op (`to === from`).
 */
export function dropIndex(from: number, targetIndex: number, after: boolean): number {
  let to = after ? targetIndex + 1 : targetIndex;
  // Removing `from` first shifts every later row up by one.
  if (from < to) to -= 1;
  return to;
}
