/**
 * Shared id-slug derivation for user-named things whose ids get written into
 * stored data (codex category ids, custom beat-template/beat ids): lowercase,
 * spaces/underscores to dashes, everything outside [a-z0-9-] stripped. May
 * return "" (caller rejects). Slugs are immutable once stored — they key user
 * data, so renaming derives a NEW id rather than rewriting the old one.
 */

/** Legal shape for a stored id slug (also keeps YAML values quote-free). */
export const SLUG_RE = /^[a-z][a-z0-9-]*$/;

export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
