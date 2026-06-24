/**
 * Pure scene-composition diagnostic (no Obsidian imports — unit-testable).
 *
 * HONESTY: description vs. action cannot be separated without NLP, so this v1
 * classifies each PARAGRAPH into only three defensible buckets:
 *   - dialogue    — contains a quoted span (high confidence)
 *   - interiority — interior-thought cue words or leading italics (medium)
 *   - narration   — everything else (description AND action merged; NOT split)
 *
 * It then reports the mix and where it clusters (by quartile of the scene) so you
 * can spot front-loaded narration or back-loaded interiority. The UI must state
 * the limits; do not present "narration" as pure description.
 */

import { stripMarkdown } from "../lib/wordcount";

export type ParaClass = "dialogue" | "interiority" | "narration";

const INTERIORITY_RE =
  /\b(wondered|thought|thinking|felt|feeling|remembered|knew|realized|realised|wished|imagined|hoped|feared|doubted|suspected|understood|recalled|considered|mused|ached)\b/i;

/** Classify a single paragraph. Dialogue wins, then interiority, else narration. */
export function classifyParagraph(p: string): ParaClass {
  const t = p.trim();
  if (!t) return "narration";
  if (/["“”«][^"“”«»]+["”»]/.test(t) || /^["“«]/.test(t)) return "dialogue";
  if (INTERIORITY_RE.test(t) || /^[*_]\S/.test(t)) return "interiority";
  return "narration";
}

export interface CompositionProfile {
  paragraphs: number;
  counts: Record<ParaClass, number>;
  /** Share of each class (0..1), 0 when there are no paragraphs. */
  ratios: Record<ParaClass, number>;
  /** Four contiguous buckets (start→end), each a per-class count. */
  byQuartile: Record<ParaClass, number>[];
  /** Human-readable balance warnings (may be empty). */
  flags: string[];
}

function emptyCounts(): Record<ParaClass, number> {
  return { dialogue: 0, interiority: 0, narration: 0 };
}

/** Split a sequence into 4 contiguous, nearly-equal buckets. */
function quartiles<T>(items: T[]): T[][] {
  const n = items.length;
  const out: T[][] = [];
  for (let q = 0; q < 4; q++) {
    out.push(items.slice(Math.floor((q * n) / 4), Math.floor(((q + 1) * n) / 4)));
  }
  return out;
}

export function compositionProfile(text: string): CompositionProfile {
  const paras = stripMarkdown(text)
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const classes = paras.map(classifyParagraph);

  const counts = emptyCounts();
  for (const c of classes) counts[c] += 1;
  const total = classes.length;
  const ratios = emptyCounts();
  if (total > 0) {
    (Object.keys(counts) as ParaClass[]).forEach((k) => (ratios[k] = counts[k] / total));
  }

  const byQuartile = quartiles(classes).map((bucket) => {
    const c = emptyCounts();
    for (const cls of bucket) c[cls] += 1;
    return c;
  });

  const flags: string[] = [];
  if (total >= 4) {
    const q0 = byQuartile[0];
    const q0n = q0.dialogue + q0.interiority + q0.narration;
    if (q0n > 0 && q0.narration / q0n >= 0.8) {
      flags.push("Opens with a block of narration — little dialogue or interiority up front.");
    }
    const q3 = byQuartile[3];
    const q3n = q3.dialogue + q3.interiority + q3.narration;
    if (q3n > 0 && q3.interiority / q3n >= 0.5) {
      flags.push("Ends on heavy interiority — consider grounding the close in action or dialogue.");
    }
    if (total >= 6 && counts.dialogue === 0) {
      flags.push("No dialogue detected in this scene.");
    }
  }

  return { paragraphs: total, counts, ratios, byQuartile, flags };
}
