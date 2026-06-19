/**
 * Pure codex helpers (no Obsidian imports — unit-testable): wikilink formatting,
 * and auto-detecting entity mentions in scene text.
 */

import { CodexCategory, CodexEntity } from "./types";

/** Wrap a name as a wikilink, e.g. "Anna" → "[[Anna]]". */
export function toLink(name: string): string {
  return `[[${name}]]`;
}

/** Extract the display target from a wikilink or plain string: "[[Anna|A]]" → "Anna". */
export function linkTarget(value: string): string {
  const m = value.match(/^\[\[([^\]|#]+)/);
  return (m ? m[1] : value).trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface Mention {
  path: string;
  name: string;
  category: CodexCategory;
}

/**
 * Find codex entities whose name or any alias appears in `text` as a whole word
 * (case-insensitive). Returns one Mention per matched entity (deduped by path).
 */
export function detectMentions(text: string, entities: CodexEntity[]): Mention[] {
  if (!text) return [];
  const found: Mention[] = [];
  for (const e of entities) {
    const needles = [e.name, ...e.aliases].map((s) => s.trim()).filter(Boolean);
    const hit = needles.some((n) => {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(n)}(?![\\p{L}\\p{N}])`, "iu");
      return re.test(text);
    });
    if (hit) found.push({ path: e.path, name: e.name, category: e.category });
  }
  return found;
}

/** Group entities by category, preserving input order within each group. */
export function groupByCategory(
  entities: CodexEntity[]
): Map<CodexCategory, CodexEntity[]> {
  const map = new Map<CodexCategory, CodexEntity[]>();
  for (const e of entities) {
    const list = map.get(e.category) ?? [];
    list.push(e);
    map.set(e.category, list);
  }
  return map;
}
