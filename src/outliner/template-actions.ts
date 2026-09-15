/**
 * Beat-template persistence, shared by Customize → Beat templates (the Settings
 * tab used to own it). Nothing here refreshes a view — the caller decides.
 */

import { App } from "obsidian";
import type InkswellPlugin from "../../main";
import { slugify } from "../lib/slug";
import { confirmDelete } from "../scenes/scene-actions";
import { BEAT_TEMPLATES, BeatDef } from "./beat-templates";
import { BeatTemplateDef } from "./custom-templates";

/** Upsert a custom template by id. */
export async function saveBeatTemplate(plugin: InkswellPlugin, def: BeatTemplateDef): Promise<void> {
  const list = plugin.settings.customBeatTemplates;
  const i = list.findIndex((t) => t.id === def.id);
  if (i >= 0) list[i] = def;
  else list.push(def);
  await plugin.saveSettings();
}

/** Persist a new order for the custom templates (the picker order in Plan → Beats). */
export async function reorderBeatTemplates(
  plugin: InkswellPlugin,
  next: BeatTemplateDef[]
): Promise<void> {
  plugin.settings.customBeatTemplates = next;
  await plugin.saveSettings();
}

/**
 * Delete a custom template after confirmation. Project notes are never touched —
 * sheets using it show a missing-template notice with every beat note intact.
 */
export async function deleteBeatTemplate(
  app: App,
  plugin: InkswellPlugin,
  tpl: BeatTemplateDef
): Promise<boolean> {
  const msg =
    `Delete the "${tpl.name}" template? Projects using it keep every beat ` +
    "note — they show a missing-template notice until you re-create it " +
    "(same name) or pick another template.";
  if (!(await confirmDelete(app, msg))) return false;
  plugin.settings.customBeatTemplates = plugin.settings.customBeatTemplates.filter(
    (t) => t.id !== tpl.id
  );
  await plugin.saveSettings();
  return true;
}

/**
 * A custom copy of a template (built-in or custom) — the on-ramp most writers
 * want ("Save the Cat, but…"). Name gets " (copy)"; the id is slugified from
 * it and de-duplicated against built-ins and existing customs.
 */
export function duplicateAsCustom(
  name: string,
  beats: readonly BeatDef[],
  customs: readonly BeatTemplateDef[]
): BeatTemplateDef {
  const copyName = `${name} (copy)`;
  const taken = new Set<string>([...Object.keys(BEAT_TEMPLATES), ...customs.map((t) => t.id)]);
  const base = slugify(copyName) || "template";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return { id, name: copyName, beats: beats.map((b) => ({ ...b })) };
}
