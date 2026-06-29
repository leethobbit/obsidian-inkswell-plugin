/**
 * Starter content for the per-category codex template notes the plugin scaffolds
 * (Settings → "Generate starter templates"). Pure (no Obsidian import) so it's
 * unit-testable; the I/O that writes/reads these notes lives in codex-store.ts.
 *
 * A generated template carries the user-facing knobs (a `tags:` default, an
 * `aliases` field, a `{{title}}` body) but deliberately OMITS the `codex:` key —
 * Inkswell stamps that (and scope) on creation, and leaving it out keeps the
 * template itself from being discovered as a codex entity.
 */

import { profileFields } from "./profile-schema";
import { CODEX_CATEGORIES, CodexCategory, categoryLabel } from "./types";

/** Starter note text for a category's template. Tag defaults to the category id. */
export function starterCodexTemplate(category: CodexCategory): string {
  const label = categoryLabel(category);
  // Category-specific field labels (skip the shared `aliases`, already shown above).
  const fields = profileFields(category)
    .slice(1)
    .map((f) => f.label)
    .join(", ");
  return [
    "---",
    "tags:",
    `  - ${category}`,
    "aliases: []",
    "---",
    "# {{title}}",
    "",
    `%% Inkswell sets \`codex: ${category}\` and the project/series scope`,
    "   automatically — don't add a `codex:` key here, or this template note will",
    "   show up as a codex entry. `{{title}}` is replaced with the entry's name.",
    `   Edit this note to change what every new ${label} starts with.`,
    `   ${label} fields you can fill from the Codex panel: ${fields}. %%`,
    "",
  ].join("\n");
}

/** README dropped into the templates folder explaining the system. */
export function codexTemplatesReadme(): string {
  const list = CODEX_CATEGORIES.map((c) => `- **${c.label}** → \`${c.label}.md\``).join("\n");
  return [
    "# Inkswell content templates",
    "",
    "When a note here is named after a codex type, Inkswell scaffolds new entries",
    "of that type from it — copying its frontmatter and body, then adding `codex:`",
    "and the project/series scope automatically.",
    "",
    "Codex types and the note Inkswell looks for:",
    "",
    list,
    "",
    "Tips:",
    "",
    "- Put your own tags / fields / sections in these notes (e.g. `tags: [character]`).",
    "- Use `{{title}}` anywhere — it becomes the new entry's name.",
    "- Don't add a `codex:` key; Inkswell sets it (and the key would make this",
    "  template note appear as a codex entry).",
    "- Delete a template to go back to Inkswell's default scaffold for that type.",
    "",
  ].join("\n");
}
