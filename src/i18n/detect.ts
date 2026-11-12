/**
 * Obsidian-facing half of i18n: read the app's UI language once at load.
 *
 * `getLanguage()` is the sanctioned API but needs Obsidian 1.8.7, above our
 * 1.7.4 floor. It's called through an untyped lookup (AGENTS.md gotcha 13's
 * progressive-enhancement pattern) with a full fallback: Obsidian sets
 * moment's global locale to the app language at startup, so floor users get
 * the same answer from `moment.locale()`.
 */
import * as obsidian from "obsidian";
import { setLocale } from "./index";

/** The app's UI language code, lower-cased (e.g. "en", "de", "zh-tw"). */
export function appLanguage(): string {
  const getLanguage = (obsidian as unknown as { getLanguage?: unknown }).getLanguage;
  if (typeof getLanguage === "function") {
    const code: unknown = (getLanguage as () => unknown)();
    if (typeof code === "string" && code) return code.toLowerCase();
  }
  return obsidian.moment.locale().toLowerCase();
}

/**
 * Resolve and apply the UI locale. Call early in `onload` (before any command
 * is registered), and again when Settings → Interface language changes.
 * `preference` is that setting: "auto" (or empty) follows Obsidian's language,
 * using reviewed catalogs only; any other code is the writer's explicit choice.
 */
export function initLocale(preference?: string): string {
  if (preference && preference !== "auto") return setLocale(preference, { includeUnreviewed: true });
  return setLocale(appLanguage());
}
