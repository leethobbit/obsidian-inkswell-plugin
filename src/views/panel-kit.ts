/**
 * Shared panel-rendering helpers used across the plugin's various panels
 * (Explorer, Write, Outliner, Plan, Revisions, Stats, …). Kept tiny and
 * Obsidian-light (DOM only, no plugin/store deps) so any panel can pull from
 * it without new coupling.
 */

/**
 * Whole-panel empty state: a single muted line, e.g. "No project yet."
 * Mirrors the `inkswell-stats__muted` convention hand-rolled across panels.
 * Returns the created div so callers that need to mutate it further
 * (setText/addClass/etc.) still can.
 */
export function renderEmptyState(parent: HTMLElement, text: string): HTMLElement {
  return parent.createDiv({ cls: "inkswell-stats__muted", text });
}

/** One action button in an onboarding empty state. `cta` styles it as the primary. */
export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  cta?: boolean;
}

/**
 * A richer empty state than {@link renderEmptyState}: a centered box with a muted
 * message and one or more action buttons that point the user at the natural next
 * step (e.g. "Go to Beats"). Generalizes the plot grid's onboarding box so every
 * Plan surface can guide a newcomer with the same look. Returns the box.
 */
export function renderEmptyStateAction(
  parent: HTMLElement,
  text: string,
  actions: EmptyStateAction[] = []
): HTMLElement {
  const box = parent.createDiv({ cls: "inkswell-onboard" });
  box.createDiv({ cls: "inkswell-stats__muted", text });
  if (actions.length > 0) {
    const row = box.createDiv({ cls: "inkswell-onboard__actions" });
    for (const a of actions) {
      const btn = row.createEl("button", { text: a.label, cls: a.cta ? "mod-cta" : undefined });
      btn.onclick = () => a.onClick();
    }
  }
  return box;
}

/** Options for `SectionState.section()` — the caller supplies its own classes
 *  so this stays reusable across panels with different section styling. */
export interface SectionOptions {
  /** CSS class for the `<details>` element. */
  detailsCls?: string;
  /** CSS class for the body div passed to `build`. */
  bodyCls?: string;
}

/**
 * Tracks which `<details>` sections (by caller-chosen key) are open across
 * re-renders, so a host re-render (e.g. after a frontmatter write) doesn't
 * collapse what the user opened. Lifted out of `AuditPanel`, which also uses
 * the same open-set for ad-hoc per-row `<details>` (not built via `section()`)
 * — hence the standalone `isOpen`/`setOpen` accessors alongside `section()`.
 */
export class SectionState {
  private opened: Set<string>;

  constructor(initiallyOpen: Iterable<string> = []) {
    this.opened = new Set(initiallyOpen);
  }

  /** Whether `key` was left open across the last render. */
  isOpen(key: string): boolean {
    return this.opened.has(key);
  }

  /** Record `key`'s open/closed state (for `<details>` toggled outside `section()`). */
  setOpen(key: string, open: boolean): void {
    if (open) this.opened.add(key);
    else this.opened.delete(key);
  }

  /**
   * Render a collapsible `<details>` section keyed by `key`, restoring its
   * open/closed state from the last render and tracking future toggles.
   */
  section(
    parent: HTMLElement,
    key: string,
    title: string,
    build: (host: HTMLElement) => void,
    opts: SectionOptions = {}
  ): HTMLElement {
    const details = parent.createEl("details", { cls: opts.detailsCls });
    details.open = this.opened.has(key);
    details.createEl("summary", { text: title });
    details.addEventListener("toggle", () => this.setOpen(key, details.open));
    build(details.createDiv({ cls: opts.bodyCls }));
    return details;
  }
}
