/**
 * The Customize destination's catalog: every customizable thing, grouped by the
 * pipeline phase it shapes. PURE (no Obsidian import) so `tests/customize-catalog.test.ts`
 * can assert the same invariants nav-model.test.ts asserts for destinations:
 * unique ids, known groups, contiguous group runs.
 *
 * Renderers live beside it in `sections/` (they import Obsidian); the panel
 * fails loudly at construction if a catalog id has no renderer.
 *
 * Customize is where the SHAPE of the tool is edited — types, fields, starter
 * templates, structures, checklists, prompts, which features show. Preferences
 * (goals, editor toggles, folders…) stay in Settings. Never add a shape row to
 * Settings; add a section here.
 */

import { FeatureId } from "../features";
import type { MessageKey } from "../i18n";

export type CustomizeGroup = "codex" | "plan" | "write" | "revise" | "publish" | "inkswell";

/** Group order + display label keys for the catalog column (resolve with `t()`). */
export const CUSTOMIZE_GROUP_ORDER: { id: CustomizeGroup; labelKey: MessageKey }[] = [
  { id: "codex", labelKey: "customize.group.codex" },
  { id: "plan", labelKey: "customize.group.plan" },
  { id: "write", labelKey: "customize.group.write" },
  { id: "revise", labelKey: "customize.group.revise" },
  { id: "publish", labelKey: "customize.group.publish" },
  { id: "inkswell", labelKey: "customize.group.inkswell" },
];

export interface CustomizeEntry {
  id: string;
  /** Display name key (resolve with `t()` at render). */
  labelKey: MessageKey;
  /** Lucide icon for the catalog row. */
  icon: string;
  group: CustomizeGroup;
  /**
   * The optional feature this section shapes, if any. It never hides the section
   * (you may want to edit a hidden feature's checklist) — the row just shows a
   * muted "hidden" badge and the page a link to turn it back on.
   */
  feature?: FeatureId;
}

/** Every section, in catalog order (groups must be contiguous runs). */
export const CUSTOMIZE_CATALOG: CustomizeEntry[] = [
  { id: "codex-types", labelKey: "customize.entry.codexTypes", icon: "book-marked", group: "codex" },
  { id: "beat-templates", labelKey: "customize.entry.beatTemplates", icon: "list-ordered", group: "plan", feature: "beats" },
  { id: "scene-template", labelKey: "customize.entry.sceneTemplate", icon: "file-plus", group: "write" },
  { id: "scene-statuses", labelKey: "customize.entry.sceneStatuses", icon: "tag", group: "write" },
  { id: "scene-fields", labelKey: "customize.entry.sceneFields", icon: "panel-right", group: "write" },
  { id: "writing-prompts", labelKey: "customize.entry.writingPrompts", icon: "lightbulb", group: "write", feature: "prompts" },
  { id: "todo-markers", labelKey: "customize.entry.todoMarkers", icon: "list-todo", group: "write" },
  { id: "revision-checklists", labelKey: "customize.entry.revisionChecklists", icon: "list-checks", group: "revise", feature: "audit" },
  { id: "publishing-checklist", labelKey: "customize.entry.publishingChecklist", icon: "clipboard-check", group: "publish", feature: "checklist" },
  { id: "features", labelKey: "customize.entry.features", icon: "eye", group: "inkswell" },
];

/** The section shown when Customize opens with no deep link. */
export const DEFAULT_SECTION = "codex-types";

/** Catalog entries bucketed by group, in group order (empty groups omitted). */
export function catalogByGroup(): { group: { id: CustomizeGroup; labelKey: MessageKey }; entries: CustomizeEntry[] }[] {
  return CUSTOMIZE_GROUP_ORDER.map((group) => ({
    group,
    entries: CUSTOMIZE_CATALOG.filter((e) => e.group === group.id),
  })).filter((g) => g.entries.length > 0);
}

export function catalogEntry(id: string): CustomizeEntry | undefined {
  return CUSTOMIZE_CATALOG.find((e) => e.id === id);
}
