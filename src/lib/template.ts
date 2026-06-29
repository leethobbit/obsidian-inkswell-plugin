/**
 * Minimal template-variable substitution for content the plugin scaffolds from
 * user-authored template notes.
 *
 * Deliberately tiny: the ONLY supported token is `{{title}}` (the new content's
 * name). This is not a Templater clone — the app creates files programmatically,
 * so dynamic/scripted template engines don't apply here, and a small, predictable
 * substitution keeps templates portable and obvious. Kept Obsidian-free so it's
 * unit-testable and reusable by other content types (e.g. scenes) later.
 */

export interface TemplateVars {
  /** Replaces every `{{title}}` (case-insensitive, optional inner spaces). */
  title: string;
}

const TITLE_TOKEN = /\{\{\s*title\s*\}\}/gi;

/** Substitute supported `{{...}}` tokens in raw template text. */
export function applyTemplateVars(raw: string, vars: TemplateVars): string {
  return raw.replace(TITLE_TOKEN, vars.title);
}
