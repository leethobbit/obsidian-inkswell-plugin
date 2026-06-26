/**
 * Re-seed the local dev scratch vault from the pristine committed sample vault.
 *
 * Day-to-day testing happens in `examples/dev-vault/` (git-ignored) so the
 * committed `examples/sample-vault/` never accumulates test churn. This script
 * wipes dev-vault and copies the sample vault into it (content + seeded
 * data.json + whatever binaries are currently deployed). Run it whenever you
 * want a clean slate; then `npm run dev`/`build` redeploys current binaries.
 */
import { cpSync, existsSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "examples", "sample-vault");
const dest = join(root, "examples", "dev-vault");

if (!existsSync(src)) {
  console.error("[dev-vault] examples/sample-vault not found — nothing to copy.");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`[dev-vault] reset ${dest} from sample-vault`);
console.log("[dev-vault] run `npm run dev` (or `npm run build`) to deploy current binaries,");
console.log("[dev-vault] then 'Open folder as vault' on examples/dev-vault in Obsidian.");
