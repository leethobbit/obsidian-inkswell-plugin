/**
 * Pure extraction of inline editorial comments from scene text (no Obsidian
 * imports — unit-testable). Recognizes Obsidian comments `%% ... %%` and the
 * web-app-style `@@ ... @@` markers, preserving document order.
 */

export interface InlineComment {
  kind: "%%" | "@@";
  text: string;
}

const COMMENT_RE = /%%([\s\S]*?)%%|@@([\s\S]*?)@@/g;

export function extractComments(text: string): InlineComment[] {
  const out: InlineComment[] = [];
  for (const m of text.matchAll(COMMENT_RE)) {
    if (m[1] !== undefined) {
      const t = m[1].trim();
      if (t) out.push({ kind: "%%", text: t });
    } else if (m[2] !== undefined) {
      const t = m[2].trim();
      if (t) out.push({ kind: "@@", text: t });
    }
  }
  return out;
}
