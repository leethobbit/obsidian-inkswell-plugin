#!/usr/bin/env node
/**
 * Find UI text that bypasses t()/tp(): string literals passed to the usual
 * Obsidian/DOM text sinks (setName, text:, new Notice, aria-label, …).
 *
 *   node scripts/find-ui-literals.mjs [path ...]   (default: src main.ts)
 *
 * Exit 1 when anything is found. A deliberate literal (text written into the
 * vault, a brand name, a symbol) is exempted with `// i18n-ignore` on the same
 * line or the line above. Heuristic by design: it catches the common sinks, not
 * every string; review still matters. tests/i18n-literals.test.ts runs it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = ["src/i18n"];

// A literal "has words" when it contains two consecutive letters (so "×", "—",
// "1/2", "%", "#" and single-letter glyphs pass).
const WORDY = /\p{L}{2}/u;
// "area.thing.detail": a catalog key, not text.
const MESSAGE_KEY = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9-]+)+$/;

const STR = String.raw`(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|` + "`((?:[^`\\\\]|\\\\.)*)`)";
const SINKS = [
  String.raw`\btext:\s*` + STR,
  String.raw`\.(?:setText|setName|setDesc|setTitle|setPlaceholder|setButtonText|setTooltip|setHeading|appendText)\(\s*` + STR,
  String.raw`\bnew Notice\(\s*` + STR,
  String.raw`["']aria-label["']\s*[:,]\s*` + STR,
  String.raw`\b(?:placeholder|title|ariaLabel|tooltip|label|desc|emptyText|buttonText|confirmText|cta):\s*` + STR,
  String.raw`\.addOption\(\s*` + STR + String.raw`\s*,\s*` + STR,
  String.raw`\.(?:textContent|innerText|title|placeholder)\s*=\s*` + STR,
  String.raw`\b(?:confirm|alert)\(\s*` + STR,
];
const RE = SINKS.map((s) => new RegExp(s, "g"));

function* walk(p) {
  const norm = p.replace(/\\/g, "/");
  if (SKIP_DIRS.some((d) => norm === d || norm.startsWith(d + "/"))) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) yield* walk(join(p, name));
  } else if (/\.ts$/.test(p) && !/\.d\.ts$/.test(p)) {
    yield p;
  }
}

/** Literal text worth flagging: has words once `${…}` holes are removed. */
function wordy(lit) {
  if (lit == null) return false;
  if (MESSAGE_KEY.test(lit)) return false; // a t() key passed around as data
  const stripped = lit.replace(/\$\{[^}]*\}/g, " ");
  return WORDY.test(stripped);
}

export function scan(paths) {
  const hits = [];
  for (const root of paths) {
    for (const file of walk(root)) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (line.includes("i18n-ignore") || (i > 0 && lines[i - 1].includes("i18n-ignore"))) return;
        for (const re of RE) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(line))) {
            const lits = m.slice(1).filter((g) => g !== undefined);
            // addOption(value, label): only the label (last literal) is UI text.
            const candidates = re.source.startsWith("\\.addOption") ? lits.slice(-1) : lits;
            if (candidates.some(wordy)) {
              hits.push({ file: relative(process.cwd(), file).replace(/\\/g, "/"), line: i + 1, text: trimmed });
              break;
            }
          }
        }
      });
    }
  }
  // One report per line even if two sinks matched it.
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${h.file}:${h.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const args = process.argv.slice(2);
  const hits = scan(args.length ? args : ["src", "main.ts"]);
  for (const h of hits) console.log(`${h.file}:${h.line}  ${h.text.slice(0, 140)}`);
  const files = new Set(hits.map((h) => h.file)).size;
  console.log(`\n${hits.length} literal(s) in ${files} file(s)`);
  process.exit(hits.length ? 1 : 0);
}
