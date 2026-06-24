/**
 * Pure style-sheet logic (no Obsidian imports — unit-testable). A
 * consistency tool: a codified list of preferred spellings /
 * names / terms / number & format conventions, and a scan that flags the
 * "variant" forms the writer wants to avoid.
 *
 * Storage: `inkswell.styleSheet` on the project index (see types.ts). The scan is
 * case-sensitive on word boundaries so capitalization slips ("regime" vs the
 * canonical "Regime") are caught.
 */

export type StyleKind = "spelling" | "name" | "term" | "number" | "format";

export const STYLE_KINDS: { id: StyleKind; label: string }[] = [
  { id: "spelling", label: "Spelling" },
  { id: "name", label: "Name" },
  { id: "term", label: "Term" },
  { id: "number", label: "Number" },
  { id: "format", label: "Format" },
];

export interface StyleEntry {
  id: string;
  /** The preferred form. */
  canonical: string;
  /** Forms to flag when they appear. */
  variants: string[];
  kind: StyleKind;
  note?: string;
}

export interface StyleSheetData {
  entries: StyleEntry[];
}

export interface Deviation {
  entryId: string;
  canonical: string;
  variant: string;
  /** 1-based line number. */
  line: number;
  excerpt: string;
}

const EXCERPT_MAX = 120;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Scan `text` for each entry's variant forms, reporting line + excerpt per hit. */
export function scanDeviations(text: string, entries: StyleEntry[]): Deviation[] {
  const out: Deviation[] = [];
  for (const entry of entries) {
    for (const variant of entry.variants) {
      const v = variant.trim();
      if (!v || v === entry.canonical) continue;
      const re = new RegExp(`\\b${escapeRegExp(v)}\\b`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const idx = m.index;
        const line = text.slice(0, idx).split("\n").length;
        const lineStart = text.lastIndexOf("\n", idx - 1) + 1;
        let lineEnd = text.indexOf("\n", idx);
        if (lineEnd === -1) lineEnd = text.length;
        const raw = text.slice(lineStart, lineEnd).trim();
        out.push({
          entryId: entry.id,
          canonical: entry.canonical,
          variant: v,
          line,
          excerpt: raw.length > EXCERPT_MAX ? `${raw.slice(0, EXCERPT_MAX - 1)}…` : raw,
        });
        if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
      }
    }
  }
  return out;
}

/** Generate a reasonably-unique id for a new style entry. */
export function newStyleId(): string {
  return `s-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
