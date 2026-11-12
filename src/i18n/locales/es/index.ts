/**
 * Spanish (Español) UI strings, by area (mirrors ../en/). Machine-drafted;
 * see ../../TRANSLATING.md and GLOSSARY.md in this folder before editing.
 */
import type { Catalog } from "../types";
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

export const es: Catalog = {
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
};
