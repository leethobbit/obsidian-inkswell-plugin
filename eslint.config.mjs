import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// Flat config (ESLint 9). The headline reason this exists: obsidianmd's
// `no-unsupported-api` rule reads `minAppVersion` from manifest.json and flags
// any Obsidian API newer than it — the exact check the community-store bot runs.
// Run it locally (`npm run lint`) BEFORE every release so we never ship an
// unsupported API again.
export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**", "examples/**", "scripts/**", "*.mjs"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "main.ts"],
    plugins: { obsidianmd },
    languageOptions: {
      parserOptions: {
        // Type info so no-unsupported-api can resolve receiver types
        // (e.g. that `b.setDestructive()` is called on a ButtonComponent).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "obsidianmd/no-unsupported-api": "error",
    },
  },
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-prototype-builtins": "off",
    },
  }
);
