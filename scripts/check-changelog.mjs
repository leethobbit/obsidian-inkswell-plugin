/**
 * CHANGELOG guard — runs as a Claude Code PreToolUse hook on Bash commands.
 *
 * The CHANGELOG is the spine of the release pipeline (store listing, GitHub
 * release body, Discord post) and was being forgotten. This blocks a `git commit`
 * that stages source changes without a matching CHANGELOG.md entry. Skips
 * non-commit commands; allows an explicit `[skip changelog]` bypass for genuinely
 * non-user-facing work (pure refactor/chore). Fails open (exit 0) on any doubt so
 * it never wedges unrelated commands.
 *
 * Hook contract: reads the tool payload as JSON on stdin; exit 2 blocks the tool
 * and shows stderr to the model; any other exit allows it.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function allow() {
  process.exit(0);
}

let command = "";
try {
  const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  command = payload?.tool_input?.command ?? "";
} catch {
  allow(); // no/garbled payload → don't interfere
}

// Only gate commands that actually create a commit.
const isCommit = /\bgit\b[^|&;]*\bcommit\b/.test(command) && !/--dry-run\b/.test(command);
if (!isCommit) allow();

// Conscious bypass for non-user-facing commits.
if (/\[skip changelog\]/i.test(command)) allow();

let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { encoding: "utf8" });
} catch {
  allow(); // not a repo / git unavailable → don't block
}

const files = staged.split(/\r?\n/).filter(Boolean);
const isSource = (f) => f.startsWith("src/") || f === "main.ts" || f === "styles.css";
const sourceChanged = files.some(isSource);
const changelogChanged = files.some((f) => f === "CHANGELOG.md");

if (sourceChanged && !changelogChanged) {
  process.stderr.write(
    "BLOCKED: source files are staged but CHANGELOG.md is not part of this commit.\n\n" +
      "Add a line under '## [Unreleased]' in CHANGELOG.md (Added / Changed / Fixed / Removed)\n" +
      "describing the user-facing change, and stage it — then commit again.\n\n" +
      "If this change is genuinely NOT user-facing (pure refactor, internal tooling, chore),\n" +
      "append '[skip changelog]' to the commit message to bypass this check.\n"
  );
  process.exit(2);
}
allow();
