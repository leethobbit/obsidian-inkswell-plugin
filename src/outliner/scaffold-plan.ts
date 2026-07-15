/**
 * Pure planning for "Scaffold structure" (no Obsidian import, unit-tested):
 * maps a beat template + its act boundaries onto the Act › Chapter › Scene
 * shape — one chapter per beat (named "Chapter One", "Chapter Two", … globally,
 * so titles stay unique across acts), one placeholder scene per beat. The I/O
 * that materializes the plan (files, index, structure config) lives in
 * scaffold.ts; ids are minted there (newStructureId), keeping this deterministic.
 */

import { BeatDef, TemplateAct } from "./beat-templates";

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** English word for 1–99 ("One", "Twenty-Seven"). Out of range → the digits. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return r === 0 ? TENS[t] : `${TENS[t]}-${ONES[r]}`;
}

export interface ScaffoldPlan {
  /** Acts that received at least one beat, in template order. */
  acts: Array<{ title: string }>;
  /** One chapter per beat, in template order; actIndex → plan.acts. */
  chapters: Array<{ title: string; actIndex: number }>;
  /** One scene per beat, in template order; titles are raw beat names. */
  scenes: Array<{
    beatId: string;
    title: string;
    synopsis: string;
    chapterTitle: string;
    actTitle: string;
  }>;
}

/**
 * Lay the template out as a full structure. A beat belongs to the LAST act
 * whose `from` ≤ its `position`; acts that end up with no beats are omitted.
 */
export function planScaffold(beats: BeatDef[], acts: TemplateAct[]): ScaffoldPlan {
  const actForPosition = (pos: number): number => {
    let idx = 0;
    for (let i = 0; i < acts.length; i++) if (acts[i].from <= pos) idx = i;
    return idx;
  };

  const usedActs = new Map<number, number>(); // template act index → plan.acts index
  const plan: ScaffoldPlan = { acts: [], chapters: [], scenes: [] };

  beats.forEach((beat, i) => {
    const tplIdx = actForPosition(beat.position);
    let actIndex = usedActs.get(tplIdx);
    if (actIndex === undefined) {
      actIndex = plan.acts.length;
      usedActs.set(tplIdx, actIndex);
      plan.acts.push({ title: acts[tplIdx].title });
    }
    const chapterTitle = `Chapter ${numberWord(i + 1)}`;
    plan.chapters.push({ title: chapterTitle, actIndex });
    plan.scenes.push({
      beatId: beat.id,
      title: beat.name,
      synopsis: beat.blurb,
      chapterTitle,
      actTitle: acts[tplIdx].title,
    });
  });

  return plan;
}
