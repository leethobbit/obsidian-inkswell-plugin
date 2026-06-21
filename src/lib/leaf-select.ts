/**
 * Pure leaf-selection logic (no Obsidian imports — unit-testable). Keeps the
 * "reuse a non-pinned editor, never hijack a pinned one" rule out of the
 * Obsidian-coupled caller so the decision can be tested directly.
 */

/** First leaf that isn't pinned (for reuse), or null when all are pinned / none. */
export function pickReusableLeaf<T>(leaves: T[], isPinned: (leaf: T) => boolean): T | null {
  return leaves.find((leaf) => !isPinned(leaf)) ?? null;
}
