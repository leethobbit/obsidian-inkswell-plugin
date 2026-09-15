/**
 * A reorderable list editor for flat, settings/spec-backed lists (Customize:
 * codex fields, checklist items, prompts, beats, statuses). One implementation of
 * the affordances the rest of the app hand-rolls per panel:
 *   - desktop drag with an above/below drop hint (the outline-panel rule),
 *   - touch fallback: Move up / Move down in the row's ⋯ menu (drag events don't
 *     fire on touch — same approach as the explorer's scene rows),
 *   - Remove in the same menu, plus caller-specific items via `extendMenu`,
 *   - optional Add and Reset footers.
 *
 * Stateless: it renders `items` and reports intents (`onReorder`, `onRemove`);
 * the caller persists and re-renders. Inputs inside `renderRow` should use the
 * tagged helpers from panel-kit with `keyPrefix` so `preserveFocus` can re-find
 * them across the rebuild.
 *
 * NOT for the existing scene tree / outline / board / plot grid — those have
 * bespoke write paths (nesting, cross-container drops) and regression suites.
 */

import { Menu, setIcon } from "obsidian";
import { dropIndex, moveItem } from "./list-ops";
import { attachRowMenu } from "./row-menu";

export interface ListEditorOptions<T extends { id: string }> {
  items: readonly T[];
  /** Fill the row's body (label, inline controls). */
  renderRow(body: HTMLElement, item: T, index: number): void;
  onReorder(next: T[]): void | Promise<void>;
  /** Present → rows get Remove in their menu (unless `locked(item)`). */
  onRemove?(item: T, index: number): void | Promise<void>;
  /** Caller-specific menu items, added before Remove. */
  extendMenu?(menu: Menu, item: T, index: number): void;
  /** Rows that can't be removed (built-ins). They still reorder. */
  locked?(item: T): boolean;
  /** Rows that can't move at all (e.g. "Aliases — always first"). */
  pinned?(item: T): boolean;
  /** False → no drag handles or Move items at all (a list whose order is fixed). */
  reorderable?: boolean;
  /** Extra CSS class(es) for a row, e.g. "is-hidden" for a hidden checkpoint. */
  rowClass?(item: T): string | undefined;
  add?: { label: string; action(): void | Promise<void> };
  /** Rendered only when present — the caller decides whether the list is customized. */
  reset?: { label: string; action(): void | Promise<void> };
  emptyText?: string;
  /** Drag payload type, unique per editor kind (e.g. "inkswell/customize-fields"). */
  dragType: string;
  /** `tagField` prefix for inputs the caller renders. */
  keyPrefix: string;
}

export function renderListEditor<T extends { id: string }>(
  parent: HTMLElement,
  opts: ListEditorOptions<T>
): HTMLElement {
  const root = parent.createDiv({ cls: "inkswell-listedit" });
  const items = opts.items;
  const last = items.length - 1;
  const fixed = opts.reorderable === false;
  const isPinned = (it: T) => fixed || (opts.pinned?.(it) ?? false);
  const isLocked = (it: T) => opts.locked?.(it) ?? false;
  const commit = (from: number, to: number) => {
    if (to === from) return;
    // A pinned row never moves, and nothing may take a pinned row's place.
    if (isPinned(items[from])) return;
    if (to >= 0 && to <= last && isPinned(items[to])) return;
    void opts.onReorder(moveItem(items, from, to));
  };

  if (items.length === 0 && opts.emptyText) {
    root.createDiv({ cls: "inkswell-stats__muted inkswell-listedit__empty", text: opts.emptyText });
  }

  items.forEach((item, index) => {
    const row = root.createDiv({ cls: "inkswell-listedit__row" });
    row.dataset["id"] = item.id;
    const extraCls = opts.rowClass?.(item);
    if (extraCls) row.addClass(...extraCls.split(/\s+/).filter(Boolean));
    const pinned = isPinned(item);
    row.toggleClass("is-pinned", pinned);

    if (!fixed) {
      const grip = row.createSpan({ cls: "inkswell-listedit__grip" });
      setIcon(grip, pinned ? "pin" : "grip-vertical");
    }

    opts.renderRow(row.createDiv({ cls: "inkswell-listedit__body" }), item, index);

    // --- Desktop drag (payload = index; same editor instance only via dragType) ---
    if (!pinned) {
      row.draggable = true;
      row.addEventListener("dragstart", (e) => {
        row.addClass("is-dragging");
        e.dataTransfer?.setData(opts.dragType, String(index));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        row.removeClass("is-dragging");
        clearHints();
      });
    }
    const isAfter = (e: DragEvent): boolean => {
      const r = row.getBoundingClientRect();
      return e.clientY > r.top + r.height / 2;
    };
    const clearHints = () => row.removeClasses(["is-drop-above", "is-drop-below"]);
    row.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types.includes(opts.dragType) || pinned) return;
      e.preventDefault();
      clearHints();
      row.addClass(isAfter(e) ? "is-drop-below" : "is-drop-above");
    });
    row.addEventListener("dragleave", clearHints);
    row.addEventListener("drop", (e) => {
      clearHints();
      const raw = e.dataTransfer?.getData(opts.dragType);
      if (!raw || pinned) return;
      e.preventDefault();
      const from = Number(raw);
      if (!Number.isInteger(from)) return;
      commit(from, dropIndex(from, index, isAfter(e)));
    });

    // --- Menu: Move up / Move down (touch path) → caller items → Remove ---
    attachRowMenu(row, row, () => {
      const menu = new Menu();
      let any = false;
      if (!pinned && index > 0 && !isPinned(items[index - 1])) {
        any = true;
        menu.addItem((i) =>
          i.setTitle("Move up").setIcon("arrow-up").onClick(() => commit(index, index - 1))
        );
      }
      if (!pinned && index < last && !isPinned(items[index + 1])) {
        any = true;
        menu.addItem((i) =>
          i.setTitle("Move down").setIcon("arrow-down").onClick(() => commit(index, index + 1))
        );
      }
      if (opts.extendMenu) {
        if (any) menu.addSeparator();
        opts.extendMenu(menu, item, index);
        any = true;
      }
      if (opts.onRemove && !isLocked(item)) {
        if (any) menu.addSeparator();
        menu.addItem((i) =>
          i
            .setTitle("Remove")
            .setIcon("trash")
            .onClick(() => void opts.onRemove?.(item, index))
        );
      }
      return menu;
    });
  });

  if (opts.add || opts.reset) {
    const foot = root.createDiv({ cls: "inkswell-listedit__foot" });
    if (opts.add) {
      const btn = foot.createEl("button", { text: opts.add.label });
      btn.type = "button";
      btn.onclick = () => void opts.add?.action();
    }
    if (opts.reset) {
      const btn = foot.createEl("button", {
        cls: "inkswell-listedit__reset",
        text: opts.reset.label,
      });
      btn.type = "button";
      btn.onclick = () => void opts.reset?.action();
    }
  }
  return root;
}
