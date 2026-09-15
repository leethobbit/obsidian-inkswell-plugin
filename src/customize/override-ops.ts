/**
 * Pure edits to a {@link ListOverride} — what the Customize list sections do
 * when a writer renames, hides, reorders, adds, or removes an item or group.
 * Each returns a NEW override; callers normalize + persist. Tested in
 * tests/override-ops.test.ts.
 */

import { AddedItem, ListGroup, ListOverride } from "../lib/list-override";

function clone<X>(o: ListOverride<X> | undefined): ListOverride<X> {
  return {
    ...(o ?? {}),
    hidden: [...(o?.hidden ?? [])],
    hiddenGroups: [...(o?.hiddenGroups ?? [])],
    labels: { ...(o?.labels ?? {}) },
    order: [...(o?.order ?? [])],
    added: (o?.added ?? []).map((a) => ({ ...a })),
    groups: (o?.groups ?? []).map((g) => ({ ...g })),
  };
}

/** Rename an item. A shipped item equal to its shipped label drops the override;
 *  a custom item's own label is edited in place. */
export function setItemLabel<X>(
  o: ListOverride<X> | undefined,
  id: string,
  label: string,
  shippedLabel: string | undefined
): ListOverride<X> {
  const next = clone(o);
  const trimmed = label.trim();
  const custom = next.added?.find((a) => a.id === id);
  if (custom) {
    if (trimmed) custom.label = trimmed;
    return next;
  }
  if (!trimmed || trimmed === shippedLabel) delete next.labels?.[id];
  else next.labels = { ...next.labels, [id]: trimmed };
  return next;
}

export function setItemHidden<X>(o: ListOverride<X> | undefined, id: string, hidden: boolean): ListOverride<X> {
  const next = clone(o);
  const set = new Set(next.hidden);
  if (hidden) set.add(id);
  else set.delete(id);
  next.hidden = [...set];
  return next;
}

/** Record a full order (every effective id, in the new order). */
export function setOrder<X>(o: ListOverride<X> | undefined, ids: readonly string[]): ListOverride<X> {
  const next = clone(o);
  next.order = [...ids];
  return next;
}

export function addItem<X>(o: ListOverride<X> | undefined, item: AddedItem<X>): ListOverride<X> {
  const next = clone(o);
  next.added = [...(next.added ?? []).filter((a) => a.id !== item.id), item];
  return next;
}

/** Update a custom item's extra fields (phase/category, optional…). */
export function patchItem<X>(
  o: ListOverride<X> | undefined,
  id: string,
  patch: Partial<AddedItem<X>>
): ListOverride<X> {
  const next = clone(o);
  next.added = (next.added ?? []).map((a) => (a.id === id ? { ...a, ...patch, id: a.id } : a));
  return next;
}

/** Remove a CUSTOM item (shipped items are hidden, never removed) and any
 *  reference to it in hidden/order. */
export function removeItem<X>(o: ListOverride<X> | undefined, id: string): ListOverride<X> {
  const next = clone(o);
  next.added = (next.added ?? []).filter((a) => a.id !== id);
  next.hidden = (next.hidden ?? []).filter((x) => x !== id);
  next.order = (next.order ?? []).filter((x) => x !== id);
  return next;
}

export function setGroupLabel<X>(
  o: ListOverride<X> | undefined,
  groupId: string,
  label: string,
  shippedLabel: string | undefined
): ListOverride<X> {
  const next = clone(o);
  const trimmed = label.trim();
  const groups = (next.groups ?? []).filter((g) => g.id !== groupId);
  if (shippedLabel === undefined) {
    // Custom group: keep its entry (renamed) — dropping it would orphan its items.
    const existing = next.groups?.find((g) => g.id === groupId);
    groups.push({ id: groupId, label: trimmed || existing?.label || groupId });
  } else if (trimmed && trimmed !== shippedLabel) {
    groups.push({ id: groupId, label: trimmed });
  }
  next.groups = groups;
  return next;
}

export function setGroupHidden<X>(o: ListOverride<X> | undefined, groupId: string, hidden: boolean): ListOverride<X> {
  const next = clone(o);
  const set = new Set(next.hiddenGroups);
  if (hidden) set.add(groupId);
  else set.delete(groupId);
  next.hiddenGroups = [...set];
  return next;
}

export function addGroup<X>(o: ListOverride<X> | undefined, group: ListGroup): ListOverride<X> {
  const next = clone(o);
  next.groups = [...(next.groups ?? []).filter((g) => g.id !== group.id), group];
  return next;
}

/** Remove a CUSTOM group and every custom item in it. */
export function removeGroup<X>(o: ListOverride<X> | undefined, groupId: string): ListOverride<X> {
  const next = clone(o);
  const doomed = new Set((next.added ?? []).filter((a) => a.group === groupId).map((a) => a.id));
  next.groups = (next.groups ?? []).filter((g) => g.id !== groupId);
  next.added = (next.added ?? []).filter((a) => a.group !== groupId);
  next.hiddenGroups = (next.hiddenGroups ?? []).filter((g) => g !== groupId);
  next.hidden = (next.hidden ?? []).filter((x) => !doomed.has(x));
  next.order = (next.order ?? []).filter((x) => !doomed.has(x));
  return next;
}
