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

export type CustomizeGroup = "codex" | "plan" | "write" | "revise" | "publish" | "inkswell";

/** Group order + display labels for the catalog column. */
export const CUSTOMIZE_GROUP_ORDER: { id: CustomizeGroup; label: string }[] = [
  { id: "codex", label: "Codex" },
  { id: "plan", label: "Plan" },
  { id: "write", label: "Write" },
  { id: "revise", label: "Revise" },
  { id: "publish", label: "Publish" },
  { id: "inkswell", label: "Inkswell" },
];

export interface CustomizeEntry {
  id: string;
  label: string;
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
  { id: "codex-types", label: "Codex types & fields", icon: "book-marked", group: "codex" },
  { id: "beat-templates", label: "Beat templates", icon: "list-ordered", group: "plan", feature: "beats" },
  { id: "scene-template", label: "Scene template", icon: "file-plus", group: "write" },
  { id: "scene-statuses", label: "Scene statuses", icon: "tag", group: "write" },
  { id: "writing-prompts", label: "Writing prompts", icon: "lightbulb", group: "write", feature: "prompts" },
  { id: "revision-checklists", label: "Revision checklists", icon: "list-checks", group: "revise", feature: "audit" },
  { id: "publishing-checklist", label: "Publishing checklist", icon: "clipboard-check", group: "publish", feature: "checklist" },
  { id: "features", label: "Features", icon: "eye", group: "inkswell" },
];

/** The section shown when Customize opens with no deep link. */
export const DEFAULT_SECTION = "codex-types";

/** Catalog entries bucketed by group, in group order (empty groups omitted). */
export function catalogByGroup(): { group: { id: CustomizeGroup; label: string }; entries: CustomizeEntry[] }[] {
  return CUSTOMIZE_GROUP_ORDER.map((group) => ({
    group,
    entries: CUSTOMIZE_CATALOG.filter((e) => e.group === group.id),
  })).filter((g) => g.entries.length > 0);
}

export function catalogEntry(id: string): CustomizeEntry | undefined {
  return CUSTOMIZE_CATALOG.find((e) => e.id === id);
}
