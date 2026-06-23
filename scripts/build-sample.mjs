/**
 * Deploy the built plugin artifacts into the bundled sample vault so it opens
 * turnkey. Run AFTER a build: `npm run build:sample` does both.
 *
 * The sample vault commits only its seeded `data.json` (the writing history);
 * the binaries (main.js, manifest.json, styles.css) are git-ignored there and
 * (re)deployed by this script — so the committed vault never carries a stale
 * build, and a fresh clone becomes openable with one command.
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const dest = join(root, "examples", "sample-vault", ".obsidian", "plugins", "inkswell");
const artifacts = ["main.js", "manifest.json", "styles.css"];

mkdirSync(dest, { recursive: true });

const missing = artifacts.filter((f) => !existsSync(join(root, f)));
if (missing.length) {
  console.error(`[build:sample] missing artifact(s): ${missing.join(", ")}`);
  console.error("[build:sample] run `npm run build` first.");
  process.exit(1);
}

for (const f of artifacts) {
  copyFileSync(join(root, f), join(dest, f));
}
console.log(`[build:sample] deployed ${artifacts.join(", ")} -> ${dest}`);
console.log("[build:sample] open examples/sample-vault as a vault in Obsidian.");
