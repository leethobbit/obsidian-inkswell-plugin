/**
 * Pre-export manuscript checks (pure — no Obsidian, unit-testable). Scans scene
 * prose for the things that cause cleanup in a publishing tool (Vellum, Atticus,
 * Word→KDP): hard formatting, raw layout, inconsistent scene breaks, empties.
 * It lints the PROSE that actually ships — frontmatter and `%%` comments are
 * stripped first, exactly as the compile does, so they never false-flag.
 */

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;

export interface SceneText {
  title: string;
  /** Raw scene file contents (frontmatter + comments still present). */
  text: string;
}

export interface PreflightFinding {
  rule: string;
  /** Human-facing description of the issue + why it matters. */
  label: string;
  /** Total occurrences across all scenes. */
  count: number;
  /** Titles of affected scenes. */
  scenes: string[];
  /** Optional extra context (e.g. the distinct scene-break styles found). */
  detail?: string;
}

/** Strip frontmatter + comments to get the prose that will be compiled. */
function prose(raw: string): string {
  return raw.replace(FRONTMATTER_RE, "").replace(OBSIDIAN_COMMENT_RE, "");
}

/** Canonicalize a scene-break glyph line to a style label, or null if not one. */
function breakStyle(line: string): string | null {
  const t = line.trim();
  if (/^\*[\s*]*\*$/.test(t) && t.replace(/\s/g, "").length >= 3) return "* * *";
  if (/^-{3,}$/.test(t)) return "---";
  if (/^_{3,}$/.test(t)) return "___";
  if (/^~{3,}$/.test(t)) return "~~~";
  if (/^#$/.test(t)) return "#";
  if (/^<hr\s*\/?>$/i.test(t)) return "<hr>";
  return null;
}

const RAW_HTML_RE = /<\/?(?:div|span|center|font|hr|br|p|sub|sup|u|b|i|small)\b[^>]*>/gi;
const PAGEBREAK_RE = /\f|<!--\s*page\s*break\s*-->|\\newpage|\\pagebreak/gi;
const DOUBLE_SPACE_RE = /\S {2,}/g; // a non-space then 2+ spaces (e.g. double space after a period)

/** Run all checks. Returns one finding per triggered rule (empty = clean). */
export function preflight(scenes: SceneText[]): PreflightFinding[] {
  const tabs = new Map<string, number>();
  const doubleSpace = new Map<string, number>();
  const html = new Map<string, number>();
  const pagebreak = new Map<string, number>();
  const empty: string[] = [];
  const styles = new Set<string>();

  const count = (re: RegExp, text: string) => (text.match(re) || []).length;

  for (const s of scenes) {
    const text = prose(s.text);
    if (!text.trim()) {
      empty.push(s.title);
      continue;
    }
    let n: number;
    if ((n = count(/\t/g, text))) tabs.set(s.title, n);
    if ((n = count(DOUBLE_SPACE_RE, text))) doubleSpace.set(s.title, n);
    if ((n = count(RAW_HTML_RE, text))) html.set(s.title, n);
    if ((n = count(PAGEBREAK_RE, text))) pagebreak.set(s.title, n);
    for (const line of text.split("\n")) {
      const style = breakStyle(line);
      if (style) styles.add(style);
    }
  }

  const findings: PreflightFinding[] = [];
  const fromMap = (rule: string, label: string, m: Map<string, number>) => {
    if (m.size === 0) return;
    let total = 0;
    for (const v of m.values()) total += v;
    findings.push({ rule, label, count: total, scenes: [...m.keys()] });
  };

  fromMap("tabs", "Tab characters — set indents in the publishing tool, not with tabs", tabs);
  fromMap("double-space", "Double spaces — collapse to single spaces", doubleSpace);
  fromMap("html", "Raw HTML tags — won't survive cleanly into DOCX", html);
  fromMap("page-break", "Manual page breaks — let the chapter style handle breaks", pagebreak);

  if (empty.length > 0) {
    findings.push({
      rule: "empty",
      label: "Empty scenes — nothing to compile",
      count: empty.length,
      scenes: empty,
    });
  }

  if (styles.size > 1) {
    findings.push({
      rule: "scene-break",
      label: "Mixed scene-break markers — standardize on one",
      count: styles.size,
      scenes: [],
      detail: [...styles].join("  ·  "),
    });
  }

  return findings;
}
