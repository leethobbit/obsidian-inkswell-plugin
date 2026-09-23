/**
 * Lossless, reversible overrides for SHIPPED lists (revision checkpoints, the
 * publishing checklist, writing prompts, scene statuses…). PURE — no Obsidian
 * import — tested in tests/list-override.test.ts.
 *
 * One shape serves every list: hide items (state for them is never touched),
 * rename labels (ids stay), reorder, add custom items (ids minted, never
 * label-derived), and for grouped lists rename/hide/add groups. An absent
 * override — or one that normalizes to nothing — means the shipped list verbatim.
 *
 * Invariants consumers rely on (see AGENTS.md gotcha 17):
 *   - hiding is lossless: a hidden item is flagged, never dropped, and progress
 *     math counts VISIBLE items only;
 *   - stale ids in stored state (a deleted custom item) are ignored, never deleted;
 *   - reset = delete the override key; nothing in any note changes.
 */

export interface ListItem {
  id: string;
  label: string;
  /** Grouped lists only: the owning group id. */
  group?: string;
}

export interface ListGroup {
  id: string;
  label: string;
}

/** A user-added item: the core plus list-specific extras (X). */
export type AddedItem<X = object> = ListItem & X;

export interface ListOverride<X = object> {
  /** Item ids (shipped or custom) not rendered. */
  hidden?: string[];
  /** Grouped lists: whole groups not rendered (their items behave as hidden). */
  hiddenGroups?: string[];
  /** Shipped id → display label. */
  labels?: Record<string, string>;
  /** Partial order: listed ids first in this order, then the rest in shipped order. */
  order?: string[];
  /** User-added items (ids from {@link newListItemId}). */
  added?: AddedItem<X>[];
  /** Shipped id → changed list-specific fields (a prompt re-filed under another
   *  phase/category, a task made optional). Merged over the shipped extras. */
  extras?: Record<string, Partial<X>>;
  /** Grouped lists: a shipped group id renames it; a new id declares a custom group. */
  groups?: ListGroup[];
}

export interface EffectiveItem<X = object> extends ListItem {
  custom: boolean;
  hidden: boolean;
  /** Shipped label, for "renamed from…" hints. Undefined for customs. */
  shippedLabel?: string;
  extra: X;
}

export interface EffectiveGroup<X = object> extends ListGroup {
  custom: boolean;
  /** Hidden as a group, or with no visible items. */
  hidden: boolean;
  /** All items (hidden flagged), in effective order. */
  items: EffectiveItem<X>[];
}

function stripCore<X>(item: AddedItem<X>): X {
  const rest = { ...(item as Record<string, unknown>) };
  delete rest["id"];
  delete rest["label"];
  delete rest["group"];
  return rest as X;
}

/** Every item — shipped then custom — hidden ones flagged, in effective order. */
export function applyOverride<X = object>(
  shipped: readonly AddedItem<X>[],
  override: ListOverride<X> | undefined
): EffectiveItem<X>[] {
  const hidden = new Set(override?.hidden ?? []);
  const hiddenGroups = new Set(override?.hiddenGroups ?? []);
  const labels = override?.labels ?? {};
  const shippedIds = new Set(shipped.map((s) => s.id));

  const all: EffectiveItem<X>[] = shipped.map((s) => ({
    id: s.id,
    label: labels[s.id] ?? s.label,
    ...(s.group ? { group: s.group } : {}),
    custom: false,
    hidden: hidden.has(s.id) || (!!s.group && hiddenGroups.has(s.group)),
    shippedLabel: s.label,
    extra: { ...stripCore(s), ...(override?.extras?.[s.id] ?? {}) },
  }));
  for (const a of override?.added ?? []) {
    if (shippedIds.has(a.id) || all.some((i) => i.id === a.id)) continue;
    all.push({
      id: a.id,
      label: a.label,
      ...(a.group ? { group: a.group } : {}),
      custom: true,
      hidden: hidden.has(a.id) || (!!a.group && hiddenGroups.has(a.group)),
      extra: stripCore(a),
    });
  }

  const order = override?.order ?? [];
  if (order.length === 0) return all;
  const rank = new Map(order.map((id, i) => [id, i]));
  const listed = all.filter((i) => rank.has(i.id)).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  const rest = all.filter((i) => !rank.has(i.id));
  return [...listed, ...rest];
}

/** Visible items only — what consumers render and count. */
export function visibleItems<X = object>(
  shipped: readonly AddedItem<X>[],
  override: ListOverride<X> | undefined
): EffectiveItem<X>[] {
  return applyOverride(shipped, override).filter((i) => !i.hidden);
}

export function visibleIds<X = object>(
  shipped: readonly AddedItem<X>[],
  override: ListOverride<X> | undefined
): string[] {
  return visibleItems(shipped, override).map((i) => i.id);
}

/** "unknown-group" → "Unknown group" (a synthesized group's label). */
function humanizeGroupId(id: string): string {
  const words = id.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id;
}

/**
 * Grouped lists. Shipped groups first (label-overridden), then custom groups in
 * override order, then any group synthesized for an item whose group is unknown
 * (degrade, never drop). Item order inside a group follows {@link applyOverride}.
 */
export function applyGroupedOverride<X = object>(
  shippedGroups: readonly { id: string; label: string; items: readonly AddedItem<X>[] }[],
  override: ListOverride<X> | undefined
): EffectiveGroup<X>[] {
  const flat: AddedItem<X>[] = [];
  for (const g of shippedGroups) for (const it of g.items) flat.push({ ...it, group: g.id });
  const items = applyOverride(flat, override);
  const hiddenGroups = new Set(override?.hiddenGroups ?? []);
  const groupDefs = override?.groups ?? [];
  const shippedIds = new Set(shippedGroups.map((g) => g.id));

  const groups: EffectiveGroup<X>[] = shippedGroups.map((g) => ({
    id: g.id,
    label: groupDefs.find((d) => d.id === g.id)?.label ?? g.label,
    custom: false,
    hidden: hiddenGroups.has(g.id),
    items: [],
  }));
  for (const d of groupDefs) {
    if (shippedIds.has(d.id) || groups.some((g) => g.id === d.id)) continue;
    groups.push({ id: d.id, label: d.label, custom: true, hidden: hiddenGroups.has(d.id), items: [] });
  }
  for (const it of items) {
    const gid = it.group ?? "";
    let g = groups.find((x) => x.id === gid);
    if (!g) {
      g = { id: gid, label: humanizeGroupId(gid || "ungrouped"), custom: true, hidden: false, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }
  for (const g of groups) {
    if (!g.hidden && g.items.every((i) => i.hidden)) g.hidden = true;
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Normalization (data.json is hand-editable)
// ---------------------------------------------------------------------------

export interface ListSpec<X = object> {
  /** Shipped items: ids (and groups) customs may not collide with. */
  shipped: readonly ListItem[];
  shippedGroups?: readonly ListGroup[];
  allowAdded: boolean;
  allowGroups: boolean;
  allowOrder: boolean;
  /** Effective labels must be unique (case-insensitive), e.g. board columns. */
  uniqueLabels?: boolean;
  /** Validate/parse an added item's list-specific fields; null rejects the item. */
  parseExtra?: (rec: Record<string, unknown>) => X | null;
  /** Legal custom-id shape. */
  idRe?: RegExp;
}

const DEFAULT_ID_RE = /^[A-Za-z][A-Za-z0-9-]*$/;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Sanitize one stored override against its spec. Drops unknown ids, colliding
 * or malformed customs, labels equal to shipped, disallowed fields; returns
 * undefined when nothing meaningful remains (= shipped list verbatim).
 */
export function normalizeListOverride<X = object>(
  raw: unknown,
  spec: ListSpec<X>
): ListOverride<X> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  const idRe = spec.idRe ?? DEFAULT_ID_RE;
  const shippedIds = new Set(spec.shipped.map((s) => s.id));
  const shippedLabels = new Map(spec.shipped.map((s) => [s.id, s.label]));
  const shippedGroupIds = new Set((spec.shippedGroups ?? []).map((g) => g.id));
  const out: ListOverride<X> = {};

  // Groups first: custom group ids are needed to validate added items.
  const groupIds = new Set(shippedGroupIds);
  if (spec.allowGroups && Array.isArray(rec["groups"])) {
    const groups: ListGroup[] = [];
    const seenG = new Set<string>();
    for (const g of rec["groups"] as unknown[]) {
      if (!g || typeof g !== "object") continue;
      const gr = g as Record<string, unknown>;
      const id = str(gr["id"]);
      const label = str(gr["label"]);
      if (!id || !label || seenG.has(id)) continue;
      if (shippedGroupIds.has(id)) {
        const shipped = (spec.shippedGroups ?? []).find((x) => x.id === id);
        if (shipped && shipped.label === label) continue; // equal to shipped → drop
      } else if (!idRe.test(id)) continue;
      seenG.add(id);
      groupIds.add(id);
      groups.push({ id, label });
    }
    if (groups.length > 0) out.groups = groups;
  }

  const takenLabels = new Set<string>();
  const labels: Record<string, string> = {};
  if (rec["labels"] && typeof rec["labels"] === "object" && !Array.isArray(rec["labels"])) {
    for (const [id, v] of Object.entries(rec["labels"] as Record<string, unknown>)) {
      const label = str(v);
      if (!label || !shippedIds.has(id) || shippedLabels.get(id) === label) continue;
      if (spec.uniqueLabels) {
        const lower = label.toLowerCase();
        const clash =
          takenLabels.has(lower) ||
          spec.shipped.some((s) => s.id !== id && (s.label.toLowerCase() === lower));
        if (clash) continue;
        takenLabels.add(lower);
      }
      labels[id] = label;
    }
  }
  if (Object.keys(labels).length > 0) out.labels = labels;
  if (spec.uniqueLabels) {
    for (const s of spec.shipped) if (!labels[s.id]) takenLabels.add(s.label.toLowerCase());
  }

  const knownIds = new Set(shippedIds);
  if (spec.allowAdded && Array.isArray(rec["added"])) {
    const added: AddedItem<X>[] = [];
    for (const a of rec["added"] as unknown[]) {
      if (!a || typeof a !== "object") continue;
      const ar = a as Record<string, unknown>;
      const id = str(ar["id"]);
      const label = str(ar["label"]);
      if (!id || !label || !idRe.test(id) || knownIds.has(id)) continue;
      let group: string | undefined;
      if (spec.allowGroups) {
        group = str(ar["group"]);
        if (!group || !groupIds.has(group)) continue; // grouped lists: every item needs a real group
      }
      if (spec.uniqueLabels) {
        const lower = label.toLowerCase();
        if (takenLabels.has(lower)) continue;
        takenLabels.add(lower);
      }
      let extra: X = {} as X;
      if (spec.parseExtra) {
        const parsed = spec.parseExtra(ar);
        if (parsed === null) continue;
        extra = parsed;
      }
      knownIds.add(id);
      added.push({ id, label, ...(group ? { group } : {}), ...extra });
    }
    if (added.length > 0) out.added = added;
  }

  // Extras on shipped items: merge over the shipped fields, validate with the
  // list's parser, keep only what actually differs from shipped.
  if (spec.parseExtra && rec["extras"] && typeof rec["extras"] === "object" && !Array.isArray(rec["extras"])) {
    const extras: Record<string, Partial<X>> = {};
    for (const [id, raw] of Object.entries(rec["extras"] as Record<string, unknown>)) {
      if (!shippedIds.has(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const shippedItem = spec.shipped.find((s) => s.id === id) as AddedItem<X> | undefined;
      if (!shippedItem) continue;
      const shippedExtra = stripCore(shippedItem) as Record<string, unknown>;
      const parsed = spec.parseExtra({ ...shippedExtra, ...(raw as Record<string, unknown>) });
      if (parsed === null) continue;
      const diff: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (shippedExtra[k] !== v) diff[k] = v;
      }
      // A key present in shipped but absent from the parse result (e.g. optional
      // switched off) reads as a reset to shipped — nothing to store.
      if (Object.keys(diff).length > 0) extras[id] = diff as Partial<X>;
    }
    if (Object.keys(extras).length > 0) out.extras = extras;
  }

  const idList = (v: unknown, known: ReadonlySet<string>): string[] => {
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of v) {
      if (typeof x !== "string" || !known.has(x) || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
    }
    return out;
  };
  const hidden = idList(rec["hidden"], knownIds);
  if (hidden.length > 0) out.hidden = hidden;
  if (spec.allowGroups) {
    const hiddenGroups = idList(rec["hiddenGroups"], groupIds);
    if (hiddenGroups.length > 0) out.hiddenGroups = hiddenGroups;
  }
  if (spec.allowOrder) {
    const order = idList(rec["order"], knownIds);
    if (order.length > 0) out.order = order;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/** A minted, self-describing id for a custom item: `<prefix>-<time36>-<rand36>`. */
export function newListItemId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
