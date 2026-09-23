/**
 * `html-align` compile step's pure transform: raw HTML alignment blocks →
 * pandoc fenced divs carrying a Word paragraph style. No Obsidian import.
 *
 * Why: pandoc's docx/LaTeX writers DROP raw HTML — `<p align="right">` and
 * `<br>` vanish, leaving the words run together on one unaligned line. A
 * `::: {custom-style="Right Aligned"}` div survives: pandoc creates the style in
 * the .docx (unaligned — the writer sets its alignment once in the reference
 * doc) and each segment becomes its own styled paragraph. One paragraph per
 * `<br>`-separated segment, NOT a hard line break — a `\` break inside a div
 * proved fragile in pandoc 3.10. EPUB/HTML targets keep the raw HTML (it
 * renders natively there), so the step is a no-op for them.
 *
 * Block rules mirror the Write editor's scanner (lib/markdown-syntax.ts): an
 * aligned opening `p`/`div`/`center` tag at the (whitespace-led) start of a line
 * opens a block; the block ends at the matching close tag or at a blank line.
 */

import { Align, htmlTagRe, isBlockHtmlTag, tagAlignment } from "../lib/html-tags";
import { StepContext } from "./types";

/** Word paragraph-style names emitted per alignment. */
export const ALIGN_STYLE_NAMES: Record<Align, string> = {
  left: "Left Aligned",
  right: "Right Aligned",
  center: "Centered",
  justify: "Justified",
};

const BR_RE = /<br\s*\/?>/gi;

/** Targets whose pandoc writer drops raw HTML: everything but EPUB (HTML-based). */
export function htmlAlignApplies(ctx: StepContext): boolean {
  return ctx.format === "pandoc" && ctx.target !== "epub";
}

interface Opening {
  align: Align;
  name: string;
  /** Offset just past the opening tag. */
  end: number;
}

/** The aligned opening block tag that leads `line`, or null. */
function openingAlignAt(line: string): Opening | null {
  const m = htmlTagRe().exec(line);
  if (!m || m[1] === "/") return null;
  if (!/^\s*$/.test(line.slice(0, m.index))) return null;
  const name = m[2].toLowerCase();
  if (!isBlockHtmlTag(name) || name === "hr") return null;
  const align = tagAlignment(name, m[0]);
  return align ? { align, name, end: m.index + m[0].length } : null;
}

/** Rewrite every aligned HTML block in `text`; everything else is untouched. */
export function convertHtmlAlignment(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = openingAlignAt(lines[i]);
    if (!open) {
      out.push(lines[i]);
      continue;
    }
    // Gather the block's inner text up to the matching close tag or a blank line.
    const closeRe = new RegExp(`<\\/${open.name}\\s*>`, "i");
    const inner: string[] = [];
    let rest = lines[i].slice(open.end);
    let tail = "";
    let j = i;
    for (;;) {
      const c = closeRe.exec(rest);
      if (c) {
        inner.push(rest.slice(0, c.index));
        tail = rest.slice(c.index + c[0].length);
        break;
      }
      inner.push(rest);
      if (j + 1 >= lines.length || lines[j + 1].trim() === "") break;
      j++;
      rest = lines[j];
    }
    // `<br>` separates paragraphs; soft line breaks inside a segment are spaces.
    const segments = inner
      .join("\n")
      .split(BR_RE)
      .map((s) => s.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    if (segments.length > 0) {
      out.push("", `::: {custom-style="${ALIGN_STYLE_NAMES[open.align]}"}`);
      segments.forEach((s, k) => {
        if (k > 0) out.push("");
        out.push(s);
      });
      out.push(":::", "");
    }
    if (tail.trim()) out.push(tail.trim());
    i = j;
  }
  return out.join("\n");
}
