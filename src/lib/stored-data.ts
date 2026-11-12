/**
 * Judging a data.json payload before trusting it (#61). Pure (no Obsidian
 * import) so the rules are unit-tested.
 *
 * Obsidian's `loadData()` returns `undefined` — after logging "failed to read
 * JSON" — for a missing, empty, truncated or corrupt file. A sync tool can
 * leave data.json in exactly that state for a moment (mid-write, or an iCloud
 * file not downloaded yet). Treating that as "no settings" starts Inkswell on
 * defaults, and its next save writes those defaults over the writer's real
 * settings. So a payload is only USABLE when it is a plain object carrying a
 * `settings` object — the shape `persist` always writes (AGENTS gotcha 6).
 */

import { t, tp } from "../i18n";

export type StoredData = Record<string, unknown> & { settings?: unknown };

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A data.json payload Inkswell can load or adopt: `{ settings: {…}, … }`. */
export function isUsableData(raw: unknown): raw is StoredData & { settings: Record<string, unknown> } {
  return isPlainObject(raw) && isPlainObject(raw["settings"]);
}

/**
 * One line describing the shape-the-tool settings a backup holds — enough for
 * a writer to recognise the backup from before something went wrong:
 * "3 custom codex types · 2 renamed types · rail arranged". Settings left at
 * their defaults say so.
 */
export function settingsSummary(settings: unknown): string {
  if (!isPlainObject(settings)) return t("lib.settingsSummary.none");
  const parts: string[] = [];
  const customs = Array.isArray(settings["customCategories"]) ? settings["customCategories"].length : 0;
  if (customs) parts.push(tp("lib.settingsSummary.customTypes", customs));
  const renamed = isPlainObject(settings["categoryOverrides"]) ? Object.keys(settings["categoryOverrides"]).length : 0;
  if (renamed) parts.push(tp("lib.settingsSummary.renamedTypes", renamed));
  const templates = Array.isArray(settings["customBeatTemplates"]) ? settings["customBeatTemplates"].length : 0;
  if (templates) parts.push(tp("lib.settingsSummary.beatTemplates", templates));
  const lists = isPlainObject(settings["listOverrides"]) ? Object.keys(settings["listOverrides"]).length : 0;
  if (lists) parts.push(tp("lib.settingsSummary.lists", lists));
  if (isPlainObject(settings["railLayout"])) parts.push(t("lib.settingsSummary.rail"));
  if (isPlainObject(settings["challenge"])) parts.push(t("lib.settingsSummary.challenge"));
  return parts.length > 0 ? parts.join(" · ") : t("lib.settingsSummary.defaults");
}
