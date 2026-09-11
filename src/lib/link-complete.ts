/**
 * `[[` link completion for the Write editor — the pure half (no Obsidian or
 * CodeMirror imports; unit-tested). Detects an open wikilink under the cursor,
 * ranks candidates against what's typed so far (fuzzy, alias-aware), and
 * produces the text a pick inserts. The adapter (scene-editor.ts) wires this
 * into CodeMirror's autocompletion; the Write panel supplies the candidates.
 */

export type LinkCandidateKind = "codex" | "scene" | "note";

export interface LinkCandidate {
  /** The note basename the link targets. */
  name: string;
  kind: LinkCandidateKind;
  /** When set, the candidate was matched (or is shown) via this alias → `[[name|alias]]`. */
  alias?: string;
  /** Secondary text in the popup (codex type, "Scene"). */
  detail?: string;
}

export interface LinkContext {
  /** Offset (in the line) just after `[[` — where the completion replaces from. */
  from: number;
  /** What the writer has typed since `[[`. */
  query: string;
}

/**
 * The open `[[…` the cursor sits in on `line`, or null. Open = a `[[` before
 * the cursor with no `]]`, `|`, `#`, or newline between it and the cursor
 * (an alias or heading part is the writer's own business), and not inside an
 * inline code span (odd number of backticks before it).
 */
export function linkContextAt(line: string, pos: number): LinkContext | null {
  const before = line.slice(0, pos);
  const open = before.lastIndexOf("[[");
  if (open === -1) return null;
  const query = before.slice(open + 2);
  if (/[\]|#\n]/.test(query)) return null;
  const ticks = (before.slice(0, open).match(/`/g) ?? []).length;
  if (ticks % 2 === 1) return null;
  return { from: open + 2, query };
}

const KIND_ORDER: Record<LinkCandidateKind, number> = { codex: 0, scene: 1, note: 2 };

/** Match quality of `query` against `text`; null = no match. Higher is better. */
function matchScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 - t.length;
  const wordStart = t.indexOf(` ${q}`);
  if (wordStart !== -1) return 600 - wordStart;
  const sub = t.indexOf(q);
  if (sub !== -1) return 400 - sub;
  // Subsequence: every query char in order, fewer gaps = better.
  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const at = t.indexOf(ch, ti);
    if (at === -1) return null;
    gaps += at - ti;
    ti = at + 1;
  }
  return 200 - gaps;
}

/**
 * Candidates matching `query`, best first, capped at `limit`. A candidate is
 * scored on its alias when it carries one, else on its name; ties fall back to
 * kind (codex, then scenes, then other notes) and name. With an empty query the
 * order is kind, then name — so `[[` alone offers the story bible first.
 */
export function rankCandidates(
  query: string,
  candidates: LinkCandidate[],
  limit = 30
): LinkCandidate[] {
  const q = query.trim();
  const scored: { c: LinkCandidate; s: number }[] = [];
  for (const c of candidates) {
    const s = matchScore(q, c.alias ?? c.name);
    if (s !== null) scored.push({ c, s });
  }
  scored.sort(
    (a, b) =>
      b.s - a.s ||
      KIND_ORDER[a.c.kind] - KIND_ORDER[b.c.kind] ||
      a.c.name.localeCompare(b.c.name) ||
      (a.c.alias ?? "").localeCompare(b.c.alias ?? "")
  );
  return scored.slice(0, limit).map((x) => x.c);
}

/** What replaces `[[query` — `Name]]`, or `Name|alias]]` when picked via an alias. */
export function completionText(c: LinkCandidate): string {
  const alias = c.alias?.replace(/[|\]]/g, "").trim();
  return alias && alias !== c.name ? `${c.name}|${alias}]]` : `${c.name}]]`;
}
