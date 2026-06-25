/**
 * Tiny helpers for working with Obsidian frontmatter, whose values arrive
 * untyped (the metadata cache and `processFrontMatter` hand us `any`). Narrowing
 * through these keeps the rest of the codebase free of unsafe `any` access.
 */

/** Narrow an unknown frontmatter value to a plain object (empty if not one). */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
