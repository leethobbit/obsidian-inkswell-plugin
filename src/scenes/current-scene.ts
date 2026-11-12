/**
 * The scene you're writing, shared across the plugin (pure controller, no
 * Obsidian import — unit-testable). Write sets it when it loads a scene; the
 * plugin sets it when a normal markdown tab shows a scene file. Sidebar
 * companions follow it. Notifies only on a real change, so typing never
 * produces traffic. In-memory only: it's where you are, not a preference.
 */

type Listener = (path: string | null) => void;

export class CurrentScene {
  private path: string | null = null;
  private listeners = new Set<Listener>();

  get(): string | null {
    return this.path;
  }

  /** Set the current scene path; notifies only when it actually changes. */
  set(path: string | null): void {
    if (path === this.path) return;
    this.path = path;
    for (const fn of this.listeners) fn(this.path);
  }

  /** Follow a rename of the current scene file (no-op for any other file). */
  renamed(oldPath: string, newPath: string): void {
    if (this.path === oldPath) this.set(newPath);
  }

  /** Forget a deleted scene file (no-op for any other file). */
  deleted(path: string): void {
    if (this.path === path) this.set(null);
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
