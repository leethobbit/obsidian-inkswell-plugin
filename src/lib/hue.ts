/**
 * Deterministic hue (0–359) for a string — the generated cover placeholder's
 * colour, so a book without art keeps the same tint every render and across
 * devices. Pure, tested. Not a hash for anything security-related.
 */
export function hueFor(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h % 360;
}
