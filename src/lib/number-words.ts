/**
 * English number words 1–99, both directions (pure, tested). Scaffolded
 * chapters are titled "Chapter One", "Chapter Twenty-Seven"…; the chapter sort
 * reads those back as numbers.
 */

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

const ONES_VALUE = new Map(ONES.map((w, i) => [w.toLowerCase(), i] as const).filter(([w]) => w));
const TENS_VALUE = new Map(TENS.map((w, i) => [w.toLowerCase(), i * 10] as const).filter(([w]) => w));

/**
 * The value of a number word ("twelve", "Twenty-Seven", "twenty seven") for
 * 1–99, or null when `text` isn't one. Case-insensitive; hyphen or space
 * between tens and ones.
 */
export function wordToNumber(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, "-");
  if (!t) return null;
  const whole = ONES_VALUE.get(t) ?? TENS_VALUE.get(t);
  if (whole !== undefined) return whole;
  const parts = t.split("-");
  if (parts.length !== 2) return null;
  const tens = TENS_VALUE.get(parts[0]);
  const ones = ONES_VALUE.get(parts[1]);
  if (tens === undefined || ones === undefined || ones > 9) return null;
  return tens + ones;
}
