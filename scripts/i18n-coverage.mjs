#!/usr/bin/env node
/**
 * Translation coverage: how much of the English catalog each locale covers,
 * and which keys are missing or stale (no longer in English).
 *
 *   node scripts/i18n-coverage.mjs            summary for every locale
 *   node scripts/i18n-coverage.mjs de         + the missing/stale keys for "de"
 *   node scripts/i18n-coverage.mjs de --area=write   only keys from en/write.ts
 *
 * Missing keys fall back to English at runtime, so a gap is never an error.
 */
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export { LOCALES, LOCALE_INFO } from "./src/i18n/locales"; export { EN_MODULES } from "./src/i18n/locales/en";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const code = result.outputFiles[0].text;
const { LOCALES, LOCALE_INFO, EN_MODULES } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const args = process.argv.slice(2);
const want = args.find((a) => !a.startsWith("--"));
const area = args.find((a) => a.startsWith("--area="))?.slice(7);

const enKeys = Object.keys(LOCALES.en);
const areaKeys = area ? new Set(Object.keys(EN_MODULES[area] ?? {})) : null;
const extraPlural = /\.(zero|two|few|many)$/;

for (const [code, catalog] of Object.entries(LOCALES)) {
  if (code === "en" || (want && code !== want)) continue;
  const keys = enKeys.filter((k) => !areaKeys || areaKeys.has(k));
  const missing = keys.filter((k) => !(k in catalog));
  const stale = Object.keys(catalog).filter((k) => !(k in LOCALES.en) && !extraPlural.test(k));
  const pct = (((keys.length - missing.length) / keys.length) * 100).toFixed(1);
  const info = LOCALE_INFO[code];
  console.log(
    `${code.padEnd(6)} ${info?.name ?? ""}${info?.reviewed ? "" : " (draft)"}: ${keys.length - missing.length}/${keys.length} (${pct}%)` +
      (stale.length ? `, ${stale.length} stale` : "")
  );
  if (want) {
    for (const k of missing) console.log(`  missing  ${k}`);
    for (const k of stale) console.log(`  stale    ${k}`);
  }
}
