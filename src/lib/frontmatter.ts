/**
 * Tiny helpers for working with Obsidian frontmatter, whose values arrive
 * untyped (the metadata cache and `processFrontMatter` hand us `any`). Narrowing
 * through these keeps the rest of the codebase free of unsafe `any` access.
 */

import { parseYaml } from "obsidian";

/** Narrow an unknown frontmatter value to a plain object (empty if not one). */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

// Anchored, non-global capture: group 1 = the leading frontmatter block (fence +
// content + trailing newline(s)); group 2 = the inner content between the fences;
// group 3 = everything after the block (the body). The body match is greedy
// `[\s\S]*` to the end, so a note with no leading fence simply doesn't match and
// falls through to { frontmatter: "", body: text }.
const FRONTMATTER_CAPTURE = /^(---\r?\n([\s\S]*?)\r?\n---\r?\n?)([\s\S]*)$/;

export interface SplitNote {
  /** The leading frontmatter block verbatim (incl. fences + trailing newline), or "". */
  frontmatter: string;
  /** Everything after the frontmatter block — the prose body. */
  body: string;
}

/**
 * Split a note into its frontmatter block and body. No frontmatter → all body.
 *
 * A leading fenced block only counts as frontmatter when its content parses as
 * a YAML MAPPING — Obsidian's own rule. Without that check, a novelist's
 * body-leading `---` scene divider was swallowed as "frontmatter": the opening
 * passage became invisible in the Write editor, unsearchable, and silently
 * missing from compiled output. Prose, scalars, arrays, and invalid YAML
 * between the fences all fall through to "no frontmatter, all body" — matching
 * how Obsidian renders such notes (raw text).
 *
 * One definition for "peel the leading `---…---` block off a note and keep the
 * body" — shared by the Write editor (whose document IS the body, so offsets/line
 * numbers must line up), the Todos sweep, preflight, and cross-scene search. Both
 * halves are returned so a write path can reattach the exact frontmatter bytes
 * after rewriting the body.
 */
export function splitFrontmatter(text: string): SplitNote {
  const m = text.match(FRONTMATTER_CAPTURE);
  if (!m) return { frontmatter: "", body: text };
  try {
    const parsed: unknown = parseYaml(m[2]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { frontmatter: "", body: text };
    }
  } catch {
    return { frontmatter: "", body: text };
  }
  return { frontmatter: m[1], body: m[3] };
}

/** The body of a note with any leading frontmatter block removed. */
export function stripFrontmatter(text: string): string {
  return splitFrontmatter(text).body;
}
