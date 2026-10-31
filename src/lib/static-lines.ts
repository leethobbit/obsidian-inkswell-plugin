/**
 * The manuscript editor's decorations, flattened into lines of styled text
 * runs: what Write → Stream draws as plain HTML for the scenes that aren't
 * being edited (src/views/stream/static-scene.ts). Pure, so the mapping from
 * `buildSyntaxIntents` to text runs is unit-testable without a DOM.
 */

import { buildSyntaxIntents } from "./markdown-syntax";
import { MarkerSet } from "./placeholders";

/** A run of visible text with the classes (and attributes) covering it. */
export interface StaticRun {
  /** Document offset of the run's first character. */
  from: number;
  text: string;
  cls: string[];
  attrs: Record<string, string>;
}

export interface StaticLine {
  from: number;
  to: number;
  /** Line classes (heading, quote, first paragraph…). */
  cls: string[];
  /** Visible text only: hidden markup (`**`, `#`, …) is left out. */
  runs: StaticRun[];
}

const split = (cls: string | undefined): string[] => (cls ?? "").split(/\s+/).filter(Boolean);

/**
 * `text` as the editor decorates it with no caret anywhere (so every marker
 * is hidden): one entry per line, cut into runs wherever a style starts or
 * ends. Overlapping styles merge onto one run (the editor's CSS keys on
 * classes, never on nesting).
 */
export function staticLines(text: string, markers: MarkerSet): StaticLine[] {
  const lineCls = new Map<number, string[]>();
  const marks: { from: number; to: number; cls: string[]; attrs: Record<string, string> }[] = [];
  const hides: { from: number; to: number }[] = [];
  for (const it of buildSyntaxIntents(text, [], markers)) {
    if (it.type === "line") lineCls.set(it.from, [...(lineCls.get(it.from) ?? []), ...split(it.cls)]);
    else if (it.type === "hide") hides.push({ from: it.from, to: it.to });
    else marks.push({ from: it.from, to: it.to, cls: split(it.cls), attrs: it.attrs ?? {} });
  }

  const out: StaticLine[] = [];
  let from = 0;
  for (const lineText of text.split("\n")) {
    const to = from + lineText.length;
    const lineMarks = marks.filter((m) => m.from < to && m.to > from);
    const lineHides = hides.filter((h) => h.from < to && h.to > from);
    const cuts = new Set<number>([from, to]);
    for (const r of [...lineMarks, ...lineHides]) {
      cuts.add(Math.max(from, r.from));
      cuts.add(Math.min(to, r.to));
    }
    const points = [...cuts].sort((a, b) => a - b);
    const runs: StaticRun[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (lineHides.some((h) => h.from <= a && h.to >= b)) continue;
      const active = lineMarks.filter((m) => m.from <= a && m.to >= b);
      runs.push({
        from: a,
        text: text.slice(a, b),
        cls: active.flatMap((m) => m.cls),
        attrs: Object.assign({}, ...active.map((m) => m.attrs)) as Record<string, string>,
      });
    }
    out.push({ from, to, cls: lineCls.get(from) ?? [], runs });
    from = to + 1;
  }
  return out;
}
