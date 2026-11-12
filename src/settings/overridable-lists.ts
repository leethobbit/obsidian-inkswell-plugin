/**
 * Registry of the shipped lists a writer can override from Customize, and the
 * one settings key that stores those overrides: `settings.listOverrides`
 * (per vault, data.json). PURE — no Obsidian import.
 *
 * Each list's spec says what its override may do (add custom items? groups?
 * reorder?) and how to validate custom items' extra fields. Resolvers live
 * beside their shipped lists (`sceneCheckpoints(o)` in audit.ts,
 * `publishingChecklist(o)` in checklist-def.ts, `writingPrompts(o)`,
 * `sceneStatuses(o)`…) and are called INSIDE render() with
 * `plugin.settings.listOverrides[id]` — never cached (AGENTS.md gotcha 17).
 *
 * Custom-id prefixes keep ids self-describing and structurally distinct from
 * the shipped camelCase ids (customs always contain a `-`).
 */

import {
  PROMPT_CATEGORIES,
  PromptCategory,
  PromptExtra,
  PromptPhase,
  WRITING_PROMPTS,
  shippedPromptText,
} from "../ideation/prompts";
import type { MessageKey } from "../i18n";
import { ListItem, ListOverride, ListSpec, normalizeListOverride } from "../lib/list-override";
import { MarkerExtra, SHIPPED_MARKERS, isValidKeyword, normalizeKeyword } from "../lib/placeholders";
import { PUBLISHING_CHECKLIST, PublishingExtra } from "../publishing/checklist-def";
import { CHAPTER_CHECKPOINTS, PAGE_GROUPS, SCENE_CHECKPOINTS, STORY_CHECKPOINTS } from "../revisions/audit";
import { INSPECTOR_FIELDS, SCENE_STATUS_ITEMS, shippedInspectorFields, statusLabel } from "../scenes/scene-meta";

export type OverridableListId =
  | "audit.scene"
  | "audit.story"
  | "audit.chapter"
  | "audit.page"
  | "publishing"
  | "prompts"
  | "scene.status"
  | "scene.fields"
  | "markers";

/** The stored shape — one optional override per list. */
export interface ListOverrides {
  "audit.scene"?: ListOverride;
  "audit.story"?: ListOverride;
  "audit.chapter"?: ListOverride;
  "audit.page"?: ListOverride;
  publishing?: ListOverride<PublishingExtra>;
  prompts?: ListOverride<PromptExtra>;
  "scene.status"?: ListOverride;
  "scene.fields"?: ListOverride;
  markers?: ListOverride<MarkerExtra>;
}

/** The settings subset resolvers need (like CodexSettings / FolderSettings). */
export interface ListOverrideSettings {
  listOverrides: ListOverrides;
}

export interface ListMeta {
  /** Display name (a catalog key — resolve with `t()` at render). */
  labelKey: MessageKey;
  /** Prefix for {@link newListItemId} when adding a custom item. */
  idPrefix: string;
  /** Prefix for custom groups (grouped lists). */
  groupPrefix?: string;
}

/** Stable English source labels by id (import-safe data, no catalog lookup). */
const sourceMap = (items: readonly { id: string; label: string }[]): ReadonlyMap<string, string> =>
  new Map(items.map((i) => [i.id, i.label]));

// Shipped labels are translated on read (lazy getters in their tables), so every
// spec below reads them at normalize/render time — via a getter here too —
// never copying them at import (i18n rule 5).
const flatten = (groups: readonly { id: string; items: readonly ListItem[] }[]): ListItem[] =>
  groups.flatMap((g) => g.items.map((i) => ({ id: i.id, label: i.label, group: g.id })));

export const LIST_META: Record<OverridableListId, ListMeta> = {
  "audit.scene": { labelKey: "list.meta.auditScene", idPrefix: "sc" },
  "audit.story": { labelKey: "list.meta.auditStory", idPrefix: "st" },
  "audit.chapter": { labelKey: "list.meta.auditChapter", idPrefix: "ch" },
  "audit.page": { labelKey: "list.meta.auditPage", idPrefix: "pr", groupPrefix: "pg" },
  publishing: { labelKey: "customize.entry.publishingChecklist", idPrefix: "pt", groupPrefix: "pg" },
  prompts: { labelKey: "customize.entry.writingPrompts", idPrefix: "wp" },
  "scene.status": { labelKey: "customize.entry.sceneStatuses", idPrefix: "ss" },
  "scene.fields": { labelKey: "customize.entry.sceneFields", idPrefix: "sf" },
  markers: { labelKey: "customize.entry.todoMarkers", idPrefix: "mk" },
};

const PHASES: PromptPhase[] = ["draft", "revise"];
const CATEGORY_IDS: PromptCategory[] = PROMPT_CATEGORIES.map((c) => c.id);

export const SPEC_AUDIT_SCENE: ListSpec = {
  shipped: SCENE_CHECKPOINTS,
  allowAdded: true,
  allowGroups: false,
  allowOrder: true,
};
export const SPEC_AUDIT_STORY: ListSpec = {
  shipped: STORY_CHECKPOINTS,
  allowAdded: true,
  allowGroups: false,
  allowOrder: true,
};
export const SPEC_AUDIT_CHAPTER: ListSpec = {
  shipped: CHAPTER_CHECKPOINTS,
  allowAdded: true,
  allowGroups: false,
  allowOrder: true,
};
export const SPEC_AUDIT_PAGE: ListSpec = {
  get shipped() {
    return flatten(PAGE_GROUPS);
  },
  get shippedGroups() {
    return PAGE_GROUPS.map((g) => ({ id: g.id, label: g.label }));
  },
  allowAdded: true,
  allowGroups: true,
  allowOrder: true,
};
export const SPEC_PUBLISHING: ListSpec<PublishingExtra> = {
  get shipped() {
    return PUBLISHING_CHECKLIST.flatMap((p) =>
      p.tasks.map((t) => ({ id: t.id, label: t.label, group: p.id, ...(t.optional ? { optional: true } : {}) }))
    );
  },
  get shippedGroups() {
    return PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, label: p.label }));
  },
  allowAdded: true,
  allowGroups: true,
  allowOrder: true,
  // `deepLink` is never user-settable; only the optional flag survives. An
  // explicit `optional: false` is kept so a shipped optional task can be made
  // required (it differs from shipped, so normalize stores it).
  parseExtra: (rec) =>
    rec["optional"] === true ? { optional: true } : rec["optional"] === false ? { optional: false } : {},
};
export const SPEC_PROMPTS: ListSpec<PromptExtra> = {
  // Shipped extras ride along so `extras` overrides can be diffed against them.
  // Labels: the translated display text; `sourceLabels` keeps the English source.
  get shipped() {
    return WRITING_PROMPTS.map((p) => ({
      id: p.id,
      label: shippedPromptText(p.id, p.text),
      phase: p.phase,
      category: p.category,
    }));
  },
  sourceLabels: new Map(WRITING_PROMPTS.map((p) => [p.id, p.text])),
  allowAdded: true,
  allowGroups: false,
  allowOrder: false,
  parseExtra: (rec) => {
    const phase = rec["phase"];
    const category = rec["category"];
    if (!PHASES.includes(phase as PromptPhase)) return null;
    if (!CATEGORY_IDS.includes(category as PromptCategory)) return null;
    return { phase: phase as PromptPhase, category: category as PromptCategory };
  },
};
/** Statuses: rename / hide / reorder only — the stored enum is frozen in 1.x. */
export const SPEC_SCENE_STATUS: ListSpec = {
  get shipped() {
    return SCENE_STATUS_ITEMS.map((s) => ({ id: s.id, label: statusLabel(s.id) }));
  },
  sourceLabels: sourceMap(SCENE_STATUS_ITEMS),
  allowAdded: false,
  allowGroups: false,
  allowOrder: true,
  uniqueLabels: true,
};

/** Inspector fields: rename / hide / reorder — each is wired to a fixed scene key. */
export const SPEC_SCENE_FIELDS: ListSpec = {
  get shipped() {
    return shippedInspectorFields();
  },
  sourceLabels: sourceMap(INSPECTOR_FIELDS),
  allowAdded: false,
  allowGroups: false,
  allowOrder: true,
};

/**
 * To-do markers: hide / reorder the shipped five, add your own. The keyword
 * lives in prose, so it's validated here and never editable after the marker
 * exists; a shipped marker's keyword is fixed (`markerSet` ignores any stored
 * `extras.keyword`). Shipped markers can't be renamed either: the button must
 * say what it types — a writer who wants another word adds their own marker.
 * Keyword uniqueness across items is enforced by `markerSet` (first claim wins)
 * and at creation in Customize.
 */
export const SPEC_MARKERS: ListSpec<MarkerExtra> = {
  shipped: SHIPPED_MARKERS,
  allowAdded: true,
  allowGroups: false,
  allowOrder: true,
  allowRename: false,
  // No uniqueLabels: the keyword is the identity, and a clashing label would be
  // dropped silently at save (the add flow can't see the label it validates).
  parseExtra: (rec) => {
    const raw = rec["keyword"];
    if (typeof raw !== "string" || !isValidKeyword(raw)) return null;
    return { keyword: normalizeKeyword(raw) };
  },
};

/** Sanitize the stored map on load (unknown list ids dropped, each override normalized). */
export function normalizeListOverrides(raw: unknown): ListOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const out: ListOverrides = {};
  const scene = normalizeListOverride(rec["audit.scene"], SPEC_AUDIT_SCENE);
  if (scene) out["audit.scene"] = scene;
  const story = normalizeListOverride(rec["audit.story"], SPEC_AUDIT_STORY);
  if (story) out["audit.story"] = story;
  const chapter = normalizeListOverride(rec["audit.chapter"], SPEC_AUDIT_CHAPTER);
  if (chapter) out["audit.chapter"] = chapter;
  const page = normalizeListOverride(rec["audit.page"], SPEC_AUDIT_PAGE);
  if (page) out["audit.page"] = page;
  const publishing = normalizeListOverride(rec["publishing"], SPEC_PUBLISHING);
  if (publishing) out.publishing = publishing;
  const prompts = normalizeListOverride(rec["prompts"], SPEC_PROMPTS);
  if (prompts) out.prompts = prompts;
  const status = normalizeListOverride(rec["scene.status"], SPEC_SCENE_STATUS);
  if (status) out["scene.status"] = status;
  const fields = normalizeListOverride(rec["scene.fields"], SPEC_SCENE_FIELDS);
  if (fields) out["scene.fields"] = fields;
  const markers = normalizeListOverride(rec["markers"], SPEC_MARKERS);
  if (markers) out.markers = markers;
  return out;
}
