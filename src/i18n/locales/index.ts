/**
 * Locale registry. Adding a language = one file in this folder exporting a
 * `Catalog` (any subset of the English keys) plus one line in `LOCALES` and one
 * in `LOCALE_INFO`, keyed by the lower-case code Obsidian reports
 * (`getLanguage()` / `moment.locale()`), e.g. "de", "pt-br", "zh". Missing keys
 * fall back to English per key.
 */
import { en, MessageKey } from "./en";

export type Catalog = Partial<Record<MessageKey, string>>;

export interface LocaleInfo {
  /** The language's own name, shown in Settings → Interface language ("Deutsch"). */
  name: string;
  /**
   * Checked by a fluent speaker. An unreviewed (machine-drafted) catalog is
   * never picked automatically from Obsidian's language — only when the writer
   * chooses it in Settings — so nobody is surprised by a rough translation.
   */
  reviewed: boolean;
}

export const LOCALES: Record<string, Catalog> = {
  en,
};

export const LOCALE_INFO: Record<string, LocaleInfo> = {
  en: { name: "English", reviewed: true },
};
