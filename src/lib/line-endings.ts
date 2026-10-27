/**
 * Line endings, for the one place they matter: the Write editor. CodeMirror
 * normalizes every line break to "\n", so a scene saved with Windows endings
 * ("\r\n") never equals its editor text byte-for-byte. Compared raw, merely
 * opening such a scene and clicking away rewrote the file — a change the
 * writer never made, which a sync service then treats as a real edit (#64).
 * Pure; tested in tests/line-endings.test.ts.
 */

export type Eol = "\n" | "\r\n";

/** `text` with every line break ("\r\n", or a lone "\r") as "\n". */
export function toLf(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** The ending a file mostly uses: "\r\n" when Windows breaks outnumber bare "\n". */
export function detectEol(text: string): Eol {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/\n/g) ?? []).length - crlf;
  return crlf > lf ? "\r\n" : "\n";
}

/** Normalized text with its breaks written as `eol`. */
export function withEol(text: string, eol: Eol): string {
  const lf = toLf(text);
  return eol === "\n" ? lf : lf.replace(/\n/g, "\r\n");
}

/** Same words and lines, whatever the line endings. */
export function sameText(a: string, b: string): boolean {
  return a === b || toLf(a) === toLf(b);
}
