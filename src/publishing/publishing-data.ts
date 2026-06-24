/**
 * Self-publishing data model + pure helpers (no Obsidian imports — unit-testable).
 * All per-book, all optional; stored under `inkswell.publishing` on the project
 * index. Checklist/launch state keys off the stable IDs in checklist-def.ts /
 * preorder.ts. Persistence uses the read-merge-write `persistPublishing` helper
 * (because `persistInkswellData` shallow-merges and would clobber sub-objects).
 */

import { PUBLISHING_CHECKLIST } from "./checklist-def";

export interface ChecklistTaskState {
  done?: boolean;
  date?: string;
  notes?: string;
}

export interface FormatInfo {
  enabled?: boolean;
  price?: number;
  isbn?: string;
}

export interface PublishingMetadata {
  title?: string;
  subtitle?: string;
  seriesTitle?: string;
  tagline?: string;
  blurb?: string;
  genre?: string;
  subgenres?: string[];
  targetReader?: string;
  keywords?: string[];
  categories?: { main?: string; sub?: string[] };
  kuExclusive?: boolean;
  formats?: { ebook?: FormatInfo; paperback?: FormatInfo; hardcover?: FormatInfo };
}

export interface LaunchData {
  releaseDate?: string;
  preorder?: boolean;
  strategy?: "short" | "medium" | "long";
  milestones?: Record<string, { done?: boolean; date?: string }>;
}

export interface BudgetItem {
  id: string;
  label: string;
  category: "need" | "want";
  estimate?: number;
  actual?: number;
}

export interface CoverComp {
  id: string;
  title: string;
  note?: string;
  done?: boolean;
}

export interface MarketingItem {
  id: string;
  strategy: string;
  date?: string;
  budget?: number;
  result?: string;
  done?: boolean;
}

export interface ArcReader {
  id: string;
  name: string;
  contact?: string;
  sent?: boolean;
  reviewed?: boolean;
  note?: string;
}

export interface PublishingData {
  /** phaseId → taskId → state. */
  checklist?: Record<string, Record<string, ChecklistTaskState>>;
  metadata?: PublishingMetadata;
  launch?: LaunchData;
  budget?: { items?: BudgetItem[] };
  cover?: { plan?: string; comps?: CoverComp[] };
  marketing?: { items?: MarketingItem[] };
  arcs?: { readers?: ArcReader[] };
}

export interface Progress {
  done: number;
  total: number;
}

/** Done/total for one checklist phase (optional tasks still count toward total). */
export function phaseProgress(data: PublishingData | undefined, phaseId: string): Progress {
  const phase = PUBLISHING_CHECKLIST.find((p) => p.id === phaseId);
  if (!phase) return { done: 0, total: 0 };
  const state = data?.checklist?.[phaseId] ?? {};
  let done = 0;
  for (const task of phase.tasks) if (state[task.id]?.done) done += 1;
  return { done, total: phase.tasks.length };
}

/** Done/total across every checklist phase. */
export function overallProgress(data: PublishingData | undefined): Progress {
  let done = 0;
  let total = 0;
  for (const phase of PUBLISHING_CHECKLIST) {
    const p = phaseProgress(data, phase.id);
    done += p.done;
    total += p.total;
  }
  return { done, total };
}

export interface BudgetTotals {
  needs: number;
  wants: number;
  estimate: number;
  actual: number;
}

/** Sum a budget item list into needs/wants + estimate/actual totals. */
export function budgetTotals(items: BudgetItem[] | undefined): BudgetTotals {
  const t: BudgetTotals = { needs: 0, wants: 0, estimate: 0, actual: 0 };
  for (const it of items ?? []) {
    const est = it.estimate ?? 0;
    t.estimate += est;
    t.actual += it.actual ?? 0;
    if (it.category === "need") t.needs += est;
    else t.wants += est;
  }
  return t;
}

/** Keyword count guidance: 7–10 is the common recommendation. */
export function keywordsInBand(keywords: string[] | undefined): boolean {
  const n = keywords?.length ?? 0;
  return n >= 7 && n <= 10;
}

/** Categories guidance: 1 main + up to 3 sub. */
export function categoriesOk(cats: PublishingMetadata["categories"]): boolean {
  if (!cats?.main) return false;
  return (cats.sub?.length ?? 0) <= 3;
}

export function newPublishingId(): string {
  return `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
