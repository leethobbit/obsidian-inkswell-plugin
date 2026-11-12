/**
 * Locale registry. Adding a language = a folder here mirroring ../en/ (one
 * `Catalog` per area, merged in its index.ts), plus one line in `LOCALES` and
 * one in `LOCALE_INFO`, keyed by the lower-case code Obsidian reports
 * (`getLanguage()` / `moment.locale()`), e.g. "de", "pt-br", "zh". Missing keys
 * fall back to English per key. See ../TRANSLATING.md.
 */
import { en } from "./en";
import { zh } from "./zh";
import { es } from "./es";
import { de } from "./de";
import { fr } from "./fr";
import { ptBr } from "./pt-br";
import { ja } from "./ja";
import type { Catalog, LocaleInfo } from "./types";

export type { Catalog, LocaleInfo } from "./types";

export const LOCALES: Record<string, Catalog> = {
  en,
  "zh": zh,
  "es": es,
  "de": de,
  "fr": fr,
  "pt-br": ptBr,
  "ja": ja,
};

/** Picker name + review state. `reviewed: false` = a draft: opt-in only. */
export const LOCALE_INFO: Record<string, LocaleInfo> = {
  en: { name: "English", reviewed: true },
  "zh": { name: "简体中文", reviewed: false },
  "es": { name: "Español", reviewed: false },
  "de": { name: "Deutsch", reviewed: false },
  "fr": { name: "Français", reviewed: false },
  "pt-br": { name: "Português (Brasil)", reviewed: false },
  "ja": { name: "日本語", reviewed: false },
};
