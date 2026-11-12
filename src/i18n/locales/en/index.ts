/**
 * English UI strings: the source catalog every other locale is checked against.
 * Split by area so each destination's text lives together; `en` merges them.
 *
 * Rules (AGENTS.md "Localizing UI text"):
 * - UI chrome ONLY. Never put text here that is written into the vault (file or
 *   folder names, template-note names, app-managed headings, frontmatter, compile
 *   output): those must stay identical across languages and devices.
 * - Keys are `area.thing[.detail]`; a plural pair is `<base>.one` + `<base>.other`
 *   (read with `tp`). Placeholders are `{name}` and must match across locales
 *   (tests/i18n.test.ts). A key lives in exactly one module (tested).
 * - Sentence case is linted on every module here
 *   (`obsidianmd/ui/sentence-case-locale-module`).
 * - A new area module = one file here + one line in EN_MODULES and in `en`.
 */
import { app } from "./app";
import { codex } from "./codex";
import { common } from "./common";
import { companions } from "./companions";
import { help } from "./help";
import { home } from "./home";
import { ideation } from "./ideation";
import { plan } from "./plan";
import { publish } from "./publish";
import { revise } from "./revise";
import { settings } from "./settings";
import { track } from "./track";
import { write } from "./write";

/** The area modules, for the one-key-one-module test. */
export const EN_MODULES: Record<string, Record<string, string>> = {
  common,
  app,
  settings,
  write,
  home,
  codex,
  companions,
  plan,
  track,
  revise,
  publish,
  help,
  ideation,
};

export const en = {
  ...common,
  ...app,
  ...settings,
  ...write,
  ...home,
  ...codex,
  ...companions,
  ...plan,
  ...track,
  ...revise,
  ...publish,
  ...help,
  ...ideation,
} as const;

export type MessageKey = keyof typeof en;
