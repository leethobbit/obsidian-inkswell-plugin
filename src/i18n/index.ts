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
 * - `formatDate(d)`: locale-aware calendar date (ISO `YYYY-MM-DD` read as local).
 *
 * Testing aid: `setLocale("qps")` switches to a pseudo-locale (every catalog
 * string accented and wrapped in ⟦…⟧), so any visible text WITHOUT the
 * brackets is a literal that never went through `t()`.
 *
 * Only UI chrome goes through here. Text written into the vault stays English.
 */
import { en, MessageKey } from "./locales/en";
import { Catalog, LOCALE_INFO, LOCALES } from "./locales";

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
 * as a bug). Unreviewed catalogs are skipped unless `includeUnreviewed` (the
 * writer picked the language explicitly; see LOCALE_INFO).
 */
export function setLocale(
  code: string | null | undefined,
  options: { includeUnreviewed?: boolean } = {}
): string {
  const want = (code ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (want === PSEUDO_LOCALE) {
    localeCode = "en";
    catalog = pseudoCatalog();
    return PSEUDO_LOCALE;
  }
  const base = want.split("-")[0];
  const usable = (c: string) => !!c && !!LOCALES[c] && (options.includeUnreviewed || LOCALE_INFO[c]?.reviewed === true);
  const hit = usable(want) ? want : usable(base) ? base : "en";
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

/**
 * Locale-aware calendar date. A bare `YYYY-MM-DD` (how the plugin stores days)
 * is read as a LOCAL date, so it never shifts a day across time zones.
 */
export function formatDate(
  d: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  let date: Date;
  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  } else {
    date = typeof d === "number" ? new Date(d) : d;
  }
  if (Number.isNaN(date.getTime())) return String(d);
  try {
    // English UI keeps the system's date order (en-GB writes 12/11/2026), as
    // toLocaleDateString() did; a translated UI formats for its own language.
    return new Intl.DateTimeFormat(localeCode === "en" ? undefined : localeCode, options).format(date);
  } catch {
    return date.toDateString();
  }
}

// --- Pseudo-locale (testing aid) ---------------------------------------------

export const PSEUDO_LOCALE = "qps";

const ACCENTS: Record<string, string> = {
  a: "á", e: "é", i: "í", o: "ó", u: "ú", c: "ç", n: "ñ", y: "ý", s: "š", z: "ž",
  A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", C: "Ç", N: "Ñ", Y: "Ý", S: "Š", Z: "Ž",
};

/** Accent the letters outside `{placeholders}` and wrap in ⟦…⟧. */
export function pseudoize(s: string): string {
  const accented = s
    .split(/(\{\w+\})/)
    .map((part) => (/^\{\w+\}$/.test(part) ? part : part.replace(/[a-zA-Z]/g, (ch) => ACCENTS[ch] ?? ch)))
    .join("");
  return `⟦${accented}⟧`;
}

let pseudo: Catalog | null = null;
function pseudoCatalog(): Catalog {
  if (!pseudo) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(en)) out[k] = pseudoize(v);
    pseudo = out as Catalog;
  }
  return pseudo;
}
