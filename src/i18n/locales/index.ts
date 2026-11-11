/**
 * Locale registry. Adding a language = one file in this folder exporting a
 * `Catalog` (any subset of the English keys) plus one line in `LOCALES`, keyed
 * by the lower-case code Obsidian reports (`getLanguage()` / `moment.locale()`),
 * e.g. "de", "pt-br", "zh". Missing keys fall back to English per key.
 */
import { en, MessageKey } from "./en";

export type Catalog = Partial<Record<MessageKey, string>>;

export const LOCALES: Record<string, Catalog> = {
  en,
};
