/**
 * Codex TYPE persistence, shared by Customize → Codex types and the Codex
 * panel's "New type…" option (the Settings tab used to own these). None of them
 * refresh a view — the caller decides (Customize re-renders itself in place;
 * the Codex panel forces a rebuild so its dropdown picks the new type up).
 */

import { App } from "obsidian";
import type InkswellPlugin from "../../main";
import { confirmDelete } from "../scenes/scene-actions";
import { CategoryModal } from "./category-modal";
import { getCodexEntities } from "./codex-store";
import {
  BuiltinCodexCategory,
  CategoryDef,
  CategoryOverrides,
  allCategories,
  builtinCategories,
  defaultBuiltinDef,
  isBuiltinCategory,
  takenLabelsForBuiltin,
} from "./types";

/**
 * Open the add/edit dialog for a type. A built-in edits its display (and can
 * reset); a custom edits label/plural/icon; `null` adds a new custom type.
 * `onDone` fires after the write with the saved definition.
 */
export function openCategoryEditor(
  app: App,
  plugin: InkswellPlugin,
  existing: CategoryDef | null,
  onDone?: (def: CategoryDef) => void
): void {
  const s = plugin.settings;
  if (existing && isBuiltinCategory(existing.id)) {
    const id = existing.id;
    const shipped = defaultBuiltinDef(id);
    if (!shipped) return;
    new CategoryModal(app, {
      existing,
      builtin: shipped,
      takenIds: [],
      takenLabels: takenLabelsForBuiltin(id, s.customCategories, s.categoryOverrides),
      onSubmit: async (def) => {
        await saveBuiltinOverride(plugin, id, def);
        onDone?.(def);
      },
    }).open();
    return;
  }
  // Ids/labels a new or edited custom type may not collide with (excludes
  // itself). Shipped built-in names stay reserved even when renamed away from
  // (they're that built-in's template fallback), so they're taken too.
  const others = allCategories(s.customCategories, s.categoryOverrides).filter(
    (c) => c.id !== existing?.id
  );
  const takenLabels = new Set(others.map((c) => c.label.toLowerCase()));
  for (const c of builtinCategories()) takenLabels.add(c.label.toLowerCase());
  new CategoryModal(app, {
    existing,
    takenIds: others.map((c) => c.id),
    takenLabels: [...takenLabels],
    onSubmit: async (def) => {
      await saveCustomCategory(plugin, def);
      onDone?.(def);
    },
  }).open();
}

/** Persist a built-in's display as a diff against the shipped definition
 *  (an override equal to shipped is removed, so "reset" = pass the shipped def). */
export async function saveBuiltinOverride(
  plugin: InkswellPlugin,
  id: BuiltinCodexCategory,
  def: CategoryDef
): Promise<void> {
  const shipped = defaultBuiltinDef(id);
  if (!shipped) return;
  const s = plugin.settings;
  const next: CategoryOverrides = { ...s.categoryOverrides };
  const o: Partial<CategoryDef> = {};
  if (def.label !== shipped.label) o.label = def.label;
  if (def.plural !== shipped.plural) o.plural = def.plural;
  if (def.icon !== shipped.icon) o.icon = def.icon;
  if (Object.keys(o).length > 0) next[id] = o;
  else delete next[id];
  s.categoryOverrides = next;
  await plugin.saveSettings();
}

/** Upsert a custom type by id. */
export async function saveCustomCategory(plugin: InkswellPlugin, def: CategoryDef): Promise<void> {
  const list = plugin.settings.customCategories;
  const i = list.findIndex((c) => c.id === def.id);
  if (i >= 0) list[i] = def;
  else list.push(def);
  await plugin.saveSettings();
}

/**
 * Delete a custom type after confirmation (the message counts affected entries).
 * Notes are never touched — entries show under "Uncategorized". Returns whether
 * the type was deleted.
 */
export async function deleteCustomCategory(
  app: App,
  plugin: InkswellPlugin,
  cat: CategoryDef
): Promise<boolean> {
  const n = getCodexEntities(app).filter((e) => e.category === cat.id).length;
  const msg =
    n > 0
      ? `Delete the "${cat.label}" type? ${n} existing entr${n === 1 ? "y" : "ies"} ` +
        "will show under Uncategorized — the notes themselves are not touched."
      : `Delete the "${cat.label}" type?`;
  if (!(await confirmDelete(app, msg))) return false;
  plugin.settings.customCategories = plugin.settings.customCategories.filter(
    (c) => c.id !== cat.id
  );
  await plugin.saveSettings();
  return true;
}
