/**
 * Pure tally helper for structure breakdowns (scenes per status / act / chapter).
 * No Obsidian imports — unit-testable.
 */

export interface Tally {
  key: string;
  count: number;
}

/**
 * Count occurrences of each value. `order` lists known keys to emit first (in
 * that order); remaining keys follow sorted; empty/undefined values collapse to
 * a trailing `noneLabel` bucket.
 */
export function tallyBy(
  values: (string | undefined)[],
  order: string[] = [],
  noneLabel = "None"
): Tally[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const k = v && v.trim() ? v : "__none__";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const result: Tally[] = [];
  const seen = new Set<string>();
  for (const k of order) {
    if (counts.has(k)) {
      result.push({ key: k, count: counts.get(k)! });
      seen.add(k);
    }
  }
  const others = [...counts.keys()]
    .filter((k) => k !== "__none__" && !seen.has(k))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const k of others) result.push({ key: k, count: counts.get(k)! });
  if (counts.has("__none__")) result.push({ key: noneLabel, count: counts.get("__none__")! });
  return result;
}
