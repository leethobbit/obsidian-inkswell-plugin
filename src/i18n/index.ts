/**
 * UI localization. Pure (no `obsidian` import) so it's unit-testable; the
 * Obsidian-facing language detection lives in `detect.ts` and calls
 * {@link setLocale} once at plugin load. Obsidian restarts when the app
 * language changes, so the locale never needs to change mid-session.
 *
 * - `t(key, vars)`: one string, `{name}` placeholders filled from `vars`.
 * - `tp(base, count, vars)`: a plural pair (`<base>.one` / `<base>.other`, plus
 *   any other CLDR category a locale supplies, e.g. `<base>.few`), chosen by
 *   `Intl.PluralRules`; `{count}` is filled with the locale-formatted number.
 * - `formatNumber(n)`: locale-aware digits/grouping.
 *
 * Only UI chrome goes through here. Text written into the vault stays English.
 */
import { en, MessageKey } from "./locales/en";
import { Catalog, LOCALES } from "./locales";

export type { MessageKey };

/** Bases `B` for which both `B.one` and `B.other` exist in the English catalog. */
export type PluralBase = {
  [K in MessageKey]: K extends `${infer B}.other` ? (`${B}.one` extends MessageKey ? B : never) : never;
}[MessageKey];

type Vars = Record<string, string | number>;

let localeCode = "en";
let catalog: Catalog = en;

/**
 * Pick the catalog for an Obsidian language code: exact match, then the base
 * language ("pt-br" → "pt"), else English. Returns the locale code used for
 * number/plural formatting: the full requested tag when a catalog matched (so
 * "pt-br" text from the "pt" catalog still formats Brazilian-style), "en" when
 * we fell back to English (English text with German digit grouping would read
 * as a bug).
 */
export function setLocale(code: string | null | undefined): string {
  const want = (code ?? "").trim().toLowerCase().replace(/_/g, "-");
  const base = want.split("-")[0];
  const hit = want && LOCALES[want] ? want : base && LOCALES[base] ? base : "en";
  localeCode = hit === "en" ? "en" : want;
  catalog = LOCALES[hit];
  return localeCode;
}

/** The locale code currently in use (after fallback). */
export function getLocale(): string {
  return localeCode;
}

/** True when `key` is a known message key (for keys built at runtime, e.g. step ids). */
export function isMessageKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(en, key);
}

function lookup(key: string): string {
  const own = (catalog as Record<string, string | undefined>)[key];
  if (own !== undefined) return own;
  return (en as Record<string, string | undefined>)[key] ?? key;
}

/** Fill `{name}` placeholders. Unknown placeholders are left visible, never dropped. */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

/** Translate one UI string. */
export function t(key: MessageKey, vars?: Vars): string {
  return interpolate(lookup(key), vars);
}

/** Translate a plural pair, choosing the form for `count`. */
export function tp(base: PluralBase, count: number, vars?: Vars): string {
  let category: string = count === 1 ? "one" : "other";
  try {
    category = new Intl.PluralRules(localeCode).select(count);
  } catch {
    /* unknown locale tag — keep the English rule */
  }
  const key = `${base}.${category}`;
  const own = (catalog as Record<string, string | undefined>)[key];
  const template =
    own ?? (category === "one" || category === "other" ? lookup(key) : lookup(`${base}.other`));
  return interpolate(template, { count: formatNumber(count), ...vars });
}

/** Locale-aware number formatting (grouping separators, digits). */
export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(localeCode).format(n);
  } catch {
    return String(n);
  }
}
