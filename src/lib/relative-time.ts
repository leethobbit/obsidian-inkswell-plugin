/**
 * Coarse "how long ago" label for timestamps (pure, tested). Deliberately
 * lossy — a book card wants "3d ago", not a clock.
 */

import { t, tp } from "../i18n";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeTime(then: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - then);
  if (diff < MIN) return t("lib.relativeTime.justNow");
  if (diff < HOUR) return tp("lib.relativeTime.minutes", Math.floor(diff / MIN));
  if (diff < DAY) return tp("lib.relativeTime.hours", Math.floor(diff / HOUR));
  const days = Math.floor(diff / DAY);
  if (days < 7) return tp("lib.relativeTime.days", days);
  if (days < 30) return tp("lib.relativeTime.weeks", Math.floor(days / 7));
  if (days < 365) return tp("lib.relativeTime.months", Math.floor(days / 30));
  return tp("lib.relativeTime.years", Math.floor(days / 365));
}
