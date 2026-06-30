import globals from "globals";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// Flat config (ESLint 9). We run eslint-plugin-obsidianmd's **recommended** set —
// this is the published encoding of the community-store automated review (all the
// obsidianmd/* rules plus the type-aware @typescript-eslint rules that the review
// bot reports: no-unsupported-api, no-deprecated, no-misused-promises,
// prefer-window-timers, etc.). Run `npm run lint` BEFORE every release so the
// review never surprises us — errors here are the things the bot blocks on.
//
// Type-aware rules need type info, so we give the src files a projectService.
export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**", "examples/**", "scripts/**", "*.mjs"],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts", "main.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // The compile pipeline is desktop-only and legitimately uses Node APIs
    // (child_process, Buffer). Declare Node globals here only — keeping them out
    // of the rest of the plugin so accidental Node usage in browser/mobile code
    // still trips no-undef.
    files: ["src/compile/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    rules: {
      // --- House preferences (carried over) ---
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-prototype-builtins": "off",

      // --- Rule tuning, with rationale ---
      // WARN + allowlist, not error. The rule has no proper-noun dictionary by
      // default, so out of the box it "corrects" our own names (Inkswell, Codex),
      // file extensions, and hotkeys — false positives. The options below are the
      // guard: teach it our proper nouns/acronyms so it stops flagging them while
      // still catching genuine sentence-case slips (e.g. "Save Changes"). It's
      // kept at WARN because even tuned it has irreducible quirks (it flags some
      // single-word labels), and the community-store review does not gate on it —
      // so it must never block our release. Extend `brands`/`acronyms`/`ignoreRegex`
      // as new proper nouns appear instead of silencing the rule.
      "obsidianmd/ui/sentence-case": ["warn", {
        brands: ["Inkswell", "Pandoc", "Obsidian", "Codex", "Vault"],
        acronyms: ["HTML", "PDF", "EPUB", "DOCX", "POV", "TODO", "DKB"],
        ignoreWords: ["e.g.", "i.e.", "E.g.", "I.e."],
        ignoreRegex: [
          "\\(\\.[a-z0-9]+\\)", // file extensions in parens: (.html), (.pdf)
          "(?:Mod|Ctrl|Cmd|Shift|Alt)-\\S+", // hotkeys: Mod-Shift-L
          "\\((?:Plan|Board|Write|Track|Revise|Publish|Compile|Codex|Home)\\)", // module refs in parens — but NOT the bare verbs ("track a character")
          "\\b\\d+[KMB]\\b", // abbreviated counts: 12K, 0M
        ],
      }],

      // WARN (not error): the few hits are intentional String() coercions of
      // loosely-typed frontmatter / table-row scalars where object input would be
      // a degenerate display, never a crash. Kept visible so a NEW coercion in a
      // riskier spot still surfaces. Not a review blocker.
      "@typescript-eslint/no-base-to-string": "warn",

      // WARN (not error): redundant type assertions — real cleanups worth doing,
      // but mechanical and not review blockers, so they don't gate a release.
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
    },
  }
);
