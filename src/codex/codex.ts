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
      // Whole-word (Unicode) match. The leading group consumes one preceding
      // non-word char (or start-of-string) in place of a lookbehind, which
      // throws at parse time on iOS < 16.4. Safe here because we only need a
      // boolean existence test, not the match position.
      const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(n)}(?![\\p{L}\\p{N}])`, "iu");
      return re.test(text);
    });
    if (hit) found.push({ path: e.path, name: e.name, category: e.category });
  }
  return found;
}

/**
 * Offset of the first whole-word appearance of an entity's name or any alias in
 * `text` (case-insensitive), or null if none is present. Used to flash the first
 * mention when jumping to a scene from a Codex "Appears in" link. Offsets index
 * `text` directly, so pass a frontmatter-stripped body (matching the editor's
 * document). A scene that references the entity only via a `characters`/`location`
 * frontmatter link — not by name in the prose — yields null (nothing to flash).
 */
export function firstMentionOffset(
  text: string,
  entity: CodexEntity
): { from: number; to: number } | null {
  if (!text) return null;
  const needles = [entity.name, ...entity.aliases].map((s) => s.trim()).filter(Boolean);
  let best: { from: number; to: number } | null = null;
  for (const n of needles) {
    // Same whole-word matcher as detectMentions, but capturing so we can read the
    // needle's position. The leading group consumes one preceding non-word char
    // (in place of a lookbehind, which throws at parse time on iOS < 16.4), so the
    // needle itself starts after it — hence the m[0]/m[1] length delta below.
    const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${escapeRegex(n)})(?![\\p{L}\\p{N}])`, "iu");
    const m = re.exec(text);
    if (!m) continue;
    const from = m.index + (m[0].length - m[1].length);
    if (!best || from < best.from) best = { from, to: from + m[1].length };
  }
  return best;
}
