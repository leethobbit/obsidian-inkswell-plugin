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

import { PROMPT_CATEGORIES, PromptCategory, PromptExtra, PromptPhase, WRITING_PROMPTS } from "../ideation/prompts";
import { ListItem, ListOverride, ListSpec, normalizeListOverride } from "../lib/list-override";
import { PUBLISHING_CHECKLIST, PublishingExtra } from "../publishing/checklist-def";
import { PAGE_GROUPS, SCENE_CHECKPOINTS, STORY_CHECKPOINTS } from "../revisions/audit";
import { SCENE_STATUSES, statusLabel } from "../scenes/scene-meta";

export type OverridableListId =
  | "audit.scene"
  | "audit.story"
  | "audit.page"
  | "publishing"
  | "prompts"
  | "scene.status";

/** The stored shape — one optional override per list. */
export interface ListOverrides {
  "audit.scene"?: ListOverride;
  "audit.story"?: ListOverride;
  "audit.page"?: ListOverride;
  publishing?: ListOverride<PublishingExtra>;
  prompts?: ListOverride<PromptExtra>;
  "scene.status"?: ListOverride;
}

/** The settings subset resolvers need (like CodexSettings / FolderSettings). */
export interface ListOverrideSettings {
  listOverrides: ListOverrides;
}

export interface ListMeta {
  label: string;
  /** Prefix for {@link newListItemId} when adding a custom item. */
  idPrefix: string;
  /** Prefix for custom groups (grouped lists). */
  groupPrefix?: string;
}

const flatten = (groups: readonly { id: string; items: readonly ListItem[] }[]): ListItem[] =>
  groups.flatMap((g) => g.items.map((i) => ({ id: i.id, label: i.label, group: g.id })));

export const LIST_META: Record<OverridableListId, ListMeta> = {
  "audit.scene": { label: "Scene checkpoints", idPrefix: "sc" },
  "audit.story": { label: "Story checkpoints", idPrefix: "st" },
  "audit.page": { label: "Prose checkpoints", idPrefix: "pr", groupPrefix: "pg" },
  publishing: { label: "Publishing checklist", idPrefix: "pt", groupPrefix: "pg" },
  prompts: { label: "Writing prompts", idPrefix: "wp" },
  "scene.status": { label: "Scene statuses", idPrefix: "ss" },
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
export const SPEC_AUDIT_PAGE: ListSpec = {
  shipped: flatten(PAGE_GROUPS),
  shippedGroups: PAGE_GROUPS.map((g) => ({ id: g.id, label: g.label })),
  allowAdded: true,
  allowGroups: true,
  allowOrder: true,
};
export const SPEC_PUBLISHING: ListSpec<PublishingExtra> = {
  shipped: flatten(PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, items: p.tasks }))),
  shippedGroups: PUBLISHING_CHECKLIST.map((p) => ({ id: p.id, label: p.label })),
  allowAdded: true,
  allowGroups: true,
  allowOrder: true,
  // `deepLink` is never user-settable; only the optional flag survives.
  parseExtra: (rec) => (rec["optional"] === true ? { optional: true } : {}),
};
export const SPEC_PROMPTS: ListSpec<PromptExtra> = {
  shipped: WRITING_PROMPTS.map((p) => ({ id: p.id, label: p.text })),
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
  shipped: SCENE_STATUSES.map((s) => ({ id: s, label: statusLabel(s) })),
  allowAdded: false,
  allowGroups: false,
  allowOrder: true,
  uniqueLabels: true,
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
  const page = normalizeListOverride(rec["audit.page"], SPEC_AUDIT_PAGE);
  if (page) out["audit.page"] = page;
  const publishing = normalizeListOverride(rec["publishing"], SPEC_PUBLISHING);
  if (publishing) out.publishing = publishing;
  const prompts = normalizeListOverride(rec["prompts"], SPEC_PROMPTS);
  if (prompts) out.prompts = prompts;
  const status = normalizeListOverride(rec["scene.status"], SPEC_SCENE_STATUS);
  if (status) out["scene.status"] = status;
  return out;
}
