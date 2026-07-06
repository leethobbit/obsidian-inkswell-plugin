/**
 * Shared "active project" selection. One project is active across the whole
 * Inkswell host (the persistent header owns the selector); every project-scoped
 * panel reads it instead of keeping its own sticky choice. Pure controller (no
 * Obsidian deps) so it's unit-testable; the active path is persisted in data.json
 * — it's session/UI state, not user config.
 */

import { Project } from "./types";

type Listener = (path: string | null) => void;

export class ActiveProject {
  private path: string | null;
  private listeners = new Set<Listener>();

  constructor(initial: string | null = null) {
    this.path = initial;
  }

  get(): string | null {
    return this.path;
  }

  /** Set the active project; notifies subscribers only when it actually changes. */
  set(path: string | null): void {
    if (path === this.path) return;
    this.path = path;
    for (const fn of this.listeners) fn(this.path);
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/**
 * Resolve the active path against a (possibly filtered) project list: the match,
 * else the first project, else null. Callers that only handle multi-scene
 * projects should filter the list before calling.
 */
export function resolveActive(projects: Project[], activePath: string | null): Project | null {
  return projects.find((p) => p.vaultPath === activePath) ?? projects[0] ?? null;
}
