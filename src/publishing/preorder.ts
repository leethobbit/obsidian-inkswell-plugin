/**
 * Pre-order timeline math (no Obsidian imports — unit-testable). Given a release
 * date and a strategy, compute the milestone calendar by subtracting day-offsets
 * from the release date. Date-only (YYYY-MM-DD), local — never uses `new Date()`
 * with no args at module scope; callers inject `today` for status.
 */

export type PreorderStrategy = "short" | "medium" | "long";

export interface MilestoneDef {
  id: string;
  label: string;
  /** Days before release this milestone falls on. */
  offsetDays: number;
  /** For windows (e.g. cover reveal): days before release the window ends. */
  windowEndOffset?: number;
}

export interface StrategyDef {
  id: PreorderStrategy;
  label: string;
  leadDays: number;
  milestones: MilestoneDef[];
}

export const STRATEGIES: Record<PreorderStrategy, StrategyDef> = {
  short: {
    id: "short",
    label: "Short (~2 weeks)",
    leadDays: 21,
    milestones: [
      { id: "submit", label: "Submit for pre-order", offsetDays: 21 },
      { id: "verify", label: "Verify approval", offsetDays: 18 },
      { id: "finishChecklist", label: "Finish remaining checklist", offsetDays: 7 },
      { id: "deliverIncentives", label: "Deliver pre-order incentives", offsetDays: 1 },
    ],
  },
  medium: {
    id: "medium",
    label: "Medium (~90 days)",
    leadDays: 90,
    milestones: [
      { id: "submit", label: "Submit for pre-order", offsetDays: 90 },
      { id: "verify", label: "Verify approval", offsetDays: 83 },
      { id: "coverReveal", label: "Cover reveal window", offsetDays: 75, windowEndOffset: 60 },
      { id: "finishChecklist", label: "Finish remaining checklist", offsetDays: 7 },
      { id: "deliverIncentives", label: "Deliver pre-order incentives", offsetDays: 1 },
    ],
  },
  long: {
    id: "long",
    label: "Long (~8 months)",
    leadDays: 240,
    milestones: [
      { id: "submit", label: "Submit for pre-order", offsetDays: 240 },
      { id: "verify", label: "Verify approval", offsetDays: 225 },
      { id: "coverReveal", label: "Cover reveal window", offsetDays: 120, windowEndOffset: 90 },
      { id: "finishChecklist", label: "Finish remaining checklist", offsetDays: 14 },
      { id: "deliverIncentives", label: "Deliver pre-order incentives", offsetDays: 1 },
    ],
  },
};

export interface ComputedMilestone {
  id: string;
  label: string;
  date: string;
  /** End date for window milestones. */
  windowEnd?: string;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minusDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

/** Compute milestone dates for a release date + strategy. Pure (no input mutation). */
export function computeMilestones(
  releaseDate: string,
  strategy: PreorderStrategy
): ComputedMilestone[] {
  const release = parseDate(releaseDate);
  return STRATEGIES[strategy].milestones.map((m) => {
    const out: ComputedMilestone = {
      id: m.id,
      label: m.label,
      date: fmt(minusDays(release, m.offsetDays)),
    };
    if (m.windowEndOffset !== undefined) {
      out.windowEnd = fmt(minusDays(release, m.windowEndOffset));
    }
    return out;
  });
}

export type MilestoneStatus = "done" | "overdue" | "upcoming" | "future";

/** Status of a milestone date relative to `today` (within 7 days = upcoming). */
export function milestoneStatus(
  dateStr: string,
  done: boolean,
  today: Date = new Date()
): MilestoneStatus {
  if (done) return "done";
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = parseDate(dateStr);
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "upcoming";
  return "future";
}
