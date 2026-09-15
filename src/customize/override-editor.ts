/**
 * The generic editor for one overridable list (Customize → Scene statuses,
 * Writing prompts, Revision checklists, Publishing checklist). Renders the
 * EFFECTIVE list — shipped + the writer's override — as a reorderable list
 * editor: rename inline, hide/show and remove from the row menu, add customs,
 * reset. Grouped lists render one list per group with group rename/hide and
 * custom groups.
 *
 * Persistence: every edit → override op → normalize against the list's spec →
 * `settings.listOverrides[id]` → saveSettings → ctx.rerender(). Consumers read
 * the resolvers at their next render (AGENTS.md gotcha 17).
 */

import { Menu, Notice } from "obsidian";
import {
  AddedItem,
  EffectiveGroup,
  EffectiveItem,
  ListGroup,
  ListOverride,
  ListSpec,
  applyGroupedOverride,
  applyOverride,
  newListItemId,
  normalizeListOverride,
} from "../lib/list-override";
import { renderListEditor } from "../lib/list-editor";
import { promptText } from "../scenes/scene-actions";
import { taggedInput } from "../views/panel-kit";
import { LIST_META, ListOverrides, OverridableListId } from "../settings/overridable-lists";
import * as ops from "./override-ops";
import type { SectionCtx } from "./section";

export interface OverrideEditorOptions<X> {
  listId: OverridableListId;
  spec: ListSpec<X>;
  /** Flat shipped items (grouped lists: each carries `group`). */
  shipped: readonly AddedItem<X>[];
  /** Shipped groups, for grouped lists. */
  shippedGroups?: readonly { id: string; label: string }[];
  /** Whether the writer can add custom items (statuses: no). */
  allowAdd: boolean;
  /** Whether the writer can add custom groups (grouped lists only). */
  allowAddGroup?: boolean;
  /** Extra controls per row (a custom prompt's phase/category, a task's optional flag). */
  renderExtra?(body: HTMLElement, item: EffectiveItem<X>, patch: (p: Partial<AddedItem<X>>) => void): void;
  /** Build a new custom item (the label is asked for here; return extras). Null cancels. */
  newItemExtra?(): Promise<X | null> | X | null;
  /** Noun for buttons/prompts, e.g. "checkpoint", "prompt", "task". */
  noun: string;
  intro?: string;
}

/** Read the current stored override for a list (typed loosely — the spec re-narrows on write). */
function current<X>(ctx: SectionCtx, id: OverridableListId): ListOverride<X> | undefined {
  return (ctx.plugin.settings.listOverrides as Record<string, ListOverride<X> | undefined>)[id];
}

async function persist<X>(
  ctx: SectionCtx,
  id: OverridableListId,
  next: ListOverride<X> | undefined,
  spec: ListSpec<X>
): Promise<void> {
  const normalized = next ? normalizeListOverride(next, spec) : undefined;
  const all = ctx.plugin.settings.listOverrides as Record<string, unknown>;
  if (normalized) all[id] = normalized;
  else delete all[id];
  ctx.plugin.settings.listOverrides = all as ListOverrides;
  await ctx.plugin.saveSettings();
  ctx.rerender();
}

export function renderOverrideEditor<X extends object>(
  host: HTMLElement,
  ctx: SectionCtx,
  opts: OverrideEditorOptions<X>
): void {
  const { listId, spec } = opts;
  const meta = LIST_META[listId];
  const o = current<X>(ctx, listId);
  const save = (next: ListOverride<X>) => void persist(ctx, listId, next, spec);

  if (opts.intro) host.createEl("p", { cls: "inkswell-stats__muted", text: opts.intro });

  const grouped = !!opts.shippedGroups;
  if (grouped) {
    const groups = applyGroupedOverride(
      (opts.shippedGroups ?? []).map((g) => ({
        id: g.id,
        label: g.label,
        items: opts.shipped.filter((s) => s.group === g.id),
      })),
      o
    );
    for (const g of groups) renderGroup(host, ctx, opts, o, g, groups, save);
    if (opts.allowAddGroup) {
      const foot = host.createDiv({ cls: "inkswell-listedit__foot" });
      const add = foot.createEl("button", { text: "Add group…" });
      add.type = "button";
      add.onclick = async () => {
        const label = await promptText(ctx.app, { title: "New group", value: "", multiline: false, cta: "Add" });
        if (!label?.trim()) return;
        save(ops.addGroup(o, { id: newListItemId(meta.groupPrefix ?? "pg"), label: label.trim() }));
      };
      renderReset(foot, ctx, listId, spec, o);
    } else {
      renderReset(host.createDiv({ cls: "inkswell-listedit__foot" }), ctx, listId, spec, o);
    }
    return;
  }

  const items = applyOverride(opts.shipped, o);
  renderItems(host, ctx, opts, o, items, save, (ids) => save(ops.setOrder(o, ids)));
}

function renderGroup<X extends object>(
  host: HTMLElement,
  ctx: SectionCtx,
  opts: OverrideEditorOptions<X>,
  o: ListOverride<X> | undefined,
  g: EffectiveGroup<X>,
  all: EffectiveGroup<X>[],
  save: (next: ListOverride<X>) => void
): void {
  const shipped = opts.shippedGroups?.find((s) => s.id === g.id);
  const card = host.createEl("details", { cls: "inkswell-customize__card" });
  card.open = ctx.cards.isOpen(`${opts.listId}:${g.id}`);
  card.addEventListener("toggle", () => ctx.cards.setOpen(`${opts.listId}:${g.id}`, card.open));
  const summary = card.createEl("summary", { cls: "inkswell-customize__groupsum" });
  summary.createSpan({ text: g.label });
  if (g.hidden) summary.createSpan({ cls: "inkswell-customize__badge", text: "hidden" });
  if (g.custom) summary.createSpan({ cls: "inkswell-customize__badge", text: "yours" });
  const body = card.createDiv({ cls: "inkswell-customize__cardbody" });

  // Group header controls: rename + hide/show (+ remove for custom groups).
  const head = body.createDiv({ cls: "inkswell-customize__grouphead" });
  const name = taggedInput(head, `customize:${opts.listId}:group:${g.id}`, { type: "text" });
  name.value = g.label;
  name.setAttribute("aria-label", "Group name");
  name.onchange = () => save(ops.setGroupLabel(o, g.id, name.value, shipped?.label));
  const hide = head.createEl("button", { text: g.hidden ? "Show group" : "Hide group" });
  hide.type = "button";
  hide.onclick = () => save(ops.setGroupHidden(o, g.id, !g.hidden));
  if (g.custom) {
    const rm = head.createEl("button", { text: "Remove group" });
    rm.type = "button";
    rm.onclick = () => {
      if (g.items.some((i) => !i.custom)) return; // can't happen — shipped items never sit in custom groups
      save(ops.removeGroup(o, g.id));
    };
  }

  // Reorder within a group = a new GLOBAL order: this group's new item order
  // spliced into the other groups' current orders.
  const reorder = (ids: readonly string[]) => {
    const global = all.flatMap((x) => (x.id === g.id ? [...ids] : x.items.map((i) => i.id)));
    save(ops.setOrder(o, global));
  };
  renderItems(body, ctx, opts, o, g.items, save, reorder, g.id);
}

function renderItems<X extends object>(
  host: HTMLElement,
  ctx: SectionCtx,
  opts: OverrideEditorOptions<X>,
  o: ListOverride<X> | undefined,
  items: EffectiveItem<X>[],
  save: (next: ListOverride<X>) => void,
  reorder: (ids: readonly string[]) => void,
  groupId?: string
): void {
  const { listId, spec } = opts;
  const meta = LIST_META[listId];
  const prefix = `customize:${listId}${groupId ? `:${groupId}` : ""}`;

  renderListEditor<EffectiveItem<X>>(host, {
    items,
    keyPrefix: prefix,
    dragType: `inkswell/customize-${listId}`,
    reorderable: spec.allowOrder,
    emptyText: `No ${opts.noun}s here yet.`,
    rowClass: (it) => `${it.hidden ? "is-hidden" : ""} ${it.custom ? "is-custom" : ""}`.trim() || undefined,
    locked: (it) => !it.custom,
    renderRow(el, it) {
      const label = taggedInput(el, `${prefix}:label:${it.id}`, { type: "text" });
      label.value = it.label;
      label.setAttribute("aria-label", `${opts.noun} label`);
      label.onchange = () => save(ops.setItemLabel(o, it.id, label.value, it.shippedLabel));
      if (it.shippedLabel && it.shippedLabel !== it.label) {
        el.createSpan({ cls: "inkswell-stats__muted inkswell-customize__was", text: `was “${it.shippedLabel}”` });
      }
      if (it.custom) el.createSpan({ cls: "inkswell-customize__badge", text: "yours" });
      if (it.hidden) el.createSpan({ cls: "inkswell-customize__badge", text: "hidden" });
      opts.renderExtra?.(el, it, (p) => save(ops.patchItem(o, it.id, p)));
    },
    extendMenu(menu: Menu, it) {
      menu.addItem((i) =>
        i
          .setTitle(it.hidden ? "Show" : "Hide")
          .setIcon(it.hidden ? "eye" : "eye-off")
          .onClick(() => save(ops.setItemHidden(o, it.id, !it.hidden)))
      );
      if (it.shippedLabel && it.shippedLabel !== it.label) {
        menu.addItem((i) =>
          i
            .setTitle("Restore shipped name")
            .setIcon("rotate-ccw")
            .onClick(() => save(ops.setItemLabel(o, it.id, it.shippedLabel ?? "", it.shippedLabel)))
        );
      }
    },
    onReorder: (next) => reorder(next.map((i) => i.id)),
    onRemove: (it) => {
      if (!it.custom) return;
      save(ops.removeItem(o, it.id));
      new Notice(`Removed "${it.label}". Anything already ticked under it stays in your notes.`);
    },
    add: opts.allowAdd
      ? {
          label: `Add ${opts.noun}…`,
          action: async () => {
            const label = await promptText(ctx.app, {
              title: `New ${opts.noun}`,
              value: "",
              multiline: false,
              cta: "Add",
            });
            if (!label?.trim()) return;
            const extra = opts.newItemExtra ? await opts.newItemExtra() : ({} as X);
            if (extra === null) return;
            const item = {
              id: newListItemId(meta.idPrefix),
              label: label.trim(),
              ...(groupId ? { group: groupId } : {}),
              ...extra,
            } as AddedItem<X>;
            save(ops.addItem(o, item));
          },
        }
      : undefined,
    reset: !groupId ? resetOption(ctx, listId, spec, o) : undefined,
  });
}

function resetOption<X>(
  ctx: SectionCtx,
  listId: OverridableListId,
  spec: ListSpec<X>,
  o: ListOverride<X> | undefined
): { label: string; action(): void } | undefined {
  if (!o) return undefined;
  return {
    label: "Reset to Inkswell's defaults",
    action: () => void persist(ctx, listId, undefined, spec),
  };
}

function renderReset<X>(
  foot: HTMLElement,
  ctx: SectionCtx,
  listId: OverridableListId,
  spec: ListSpec<X>,
  o: ListOverride<X> | undefined
): void {
  const reset = resetOption(ctx, listId, spec, o);
  if (!reset) return;
  const btn = foot.createEl("button", { cls: "inkswell-listedit__reset", text: reset.label });
  btn.type = "button";
  btn.onclick = () => reset.action();
}

/** Re-exported for sections that need to build a ListGroup. */
export type { ListGroup };
