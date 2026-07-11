/**
 * Tracks which vault paths THIS plugin just wrote, so the view can tell a
 * store notify caused by its own inline-form save apart from a genuinely
 * external change (sync, another device, manual edit).
 *
 * Why: an inline field save rewrites frontmatter → mtime bump → store
 * fingerprint change → notify → full panel rebuild, which destroys the very
 * field the user is typing in (caret to 0 — the mobile "backwards typing"
 * bug). When every changed path in a notify was self-written moments ago, the
 * view can do a soft refresh that leaves the focused editor DOM alone.
 *
 * Pure and Obsidian-free so vitest can cover the window/coverage semantics;
 * the clock is injected for tests.
 */

/** How long a mark vouches for a change notification. Generous because the
 *  notify arrives after async coalescing + a full store refresh, which can
 *  lag by hundreds of ms on a slow phone. */
const DEFAULT_WINDOW_MS = 3000;

export class SelfWriteRegistry {
  private marks = new Map<string, number>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Record that the plugin itself is writing `path` right now. */
  mark(path: string): void {
    this.marks.set(path, this.now());
  }

  /**
   * True iff EVERY changed path was self-written within the window — only
   * then is the whole notification self-inflicted and safe to soften. A batch
   * that includes even one unmarked path means something external changed,
   * so the caller must fall through to a full rebuild. An empty set never
   * counts as covered (nothing vouches for it).
   */
  coveredBy(changed: ReadonlySet<string>, windowMs = DEFAULT_WINDOW_MS): boolean {
    this.prune(windowMs);
    if (changed.size === 0) return false;
    for (const path of changed) {
      if (!this.marks.has(path)) return false;
    }
    return true;
  }

  /** Drop marks older than the window so the map can't grow unbounded. */
  private prune(windowMs: number): void {
    const cutoff = this.now() - windowMs;
    for (const [path, at] of this.marks) {
      if (at < cutoff) this.marks.delete(path);
    }
  }
}
