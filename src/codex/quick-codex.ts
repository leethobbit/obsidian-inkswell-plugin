/**
 * Quick Codex — the pure half (no Obsidian imports; unit-tested). Turns the
 * Write editor's selection (or the word at the cursor) into a codex-entry seed,
 * decides what link text to write back, and re-locates the original text if the
 * document moved while the dialog was open. The I/O half (create the note, add
 * the alias, dispatch the change) lives in WritePanel.quickCodex.
 */

import { nearestIndexOf } from "../lib/text-locate";
import { scanWikilinks } from "../lib/wikilinks";
import { CJK_SRC } from "../lib/wordcount";
import type { CodexEntity } from "./types";

export interface QuickCodexSeed {
  /** The document range the link will replace. */
  rangeFrom: number;
  rangeTo: number;
  /** Exactly `doc.slice(rangeFrom, rangeTo)` — used to re-locate after edits. */
  raw: string;
  /** Whitespace inside the selection's edges, preserved around the inserted link. */
  lead: string;
  trail: string;
  /** The selected text, trimmed — becomes the link alias when it differs from the entry name. */
  core: string;
  /** Suggested entry name: `core` (first line) with edge punctuation removed. */
  name: string;
}

// One CJK grapheme is a word; otherwise letters/numbers with inner ' ’ -.
const CJK_RE = new RegExp(`[${CJK_SRC}]`, "u");
const WORD_CHAR_RE = /[\p{L}\p{N}'’-]/u;
const EDGE_PUNCT_RE = /^[\s.,;:!?"'“”‘’()[\]{}—–\-…]+|[\s.,;:!?"'“”‘’()[\]{}—–\-…]+$/gu;

function trimEdgePunct(s: string): string {
  return s.replace(EDGE_PUNCT_RE, "");
}

/** Whitespace-preserving split of a selection into lead / core / trail. */
function splitEdges(raw: string): { lead: string; core: string; trail: string } {
  const core = raw.trim();
  if (!core) return { lead: raw, core: "", trail: "" };
  const lead = raw.slice(0, raw.length - raw.trimStart().length);
  const trail = raw.slice(raw.trimEnd().length);
  return { lead, core, trail };
}

/**
 * Seed from a selection `[from, to)` — or, when collapsed, from the word under
 * or immediately before the cursor. Null when there's nothing usable (blank
 * selection, cursor in whitespace).
 */
export function seedFromSelection(doc: string, from: number, to: number): QuickCodexSeed | null {
  if (from !== to) {
    const raw = doc.slice(from, to);
    const { lead, core, trail } = splitEdges(raw);
    if (!core) return null;
    const name = trimEdgePunct(core.split(/\r?\n/)[0]);
    if (!name) return null;
    return { rangeFrom: from, rangeTo: to, raw, lead, trail, core, name };
  }
  let s = from;
  let e = from;
  const before = from > 0 ? doc[from - 1] : "";
  const after = from < doc.length ? doc[from] : "";
  if (before && CJK_RE.test(before)) {
    s = from - 1;
  } else if (after && CJK_RE.test(after) && !(before && WORD_CHAR_RE.test(before))) {
    e = from + 1;
  } else {
    while (s > 0 && WORD_CHAR_RE.test(doc[s - 1]) && !CJK_RE.test(doc[s - 1])) s--;
    while (e < doc.length && WORD_CHAR_RE.test(doc[e]) && !CJK_RE.test(doc[e])) e++;
  }
  if (s === e) return null;
  const raw = doc.slice(s, e);
  const name = trimEdgePunct(raw);
  if (!name) return null;
  return { rangeFrom: s, rangeTo: e, raw, lead: "", trail: "", core: raw, name };
}

/** True when `[from, to]` touches an existing wikilink on its line (nothing to create). */
export function selectionInsideWikilink(doc: string, from: number, to: number): boolean {
  const lineStart = doc.lastIndexOf("\n", from - 1) + 1;
  let lineEnd = doc.indexOf("\n", from);
  if (lineEnd === -1) lineEnd = doc.length;
  const line = doc.slice(lineStart, lineEnd);
  const a = from - lineStart;
  const b = Math.min(to, lineEnd) - lineStart;
  return scanWikilinks(line).some((l) => l.from <= b && a <= l.to);
}

/** An entity whose name or an alias matches `name` case-insensitively. */
export function findExistingEntity(entities: CodexEntity[], name: string): CodexEntity | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return (
    entities.find(
      (e) => e.name.toLowerCase() === key || e.aliases.some((a) => a.trim().toLowerCase() === key)
    ) ?? null
  );
}

/** Offer to store the selected text as an alias when it isn't the entry name itself. */
export function shouldOfferAlias(name: string, core: string): boolean {
  const c = core.split(/\r?\n/)[0].trim();
  return !!c && c !== name.trim();
}

/** `[[Basename]]`, or `[[Basename|shown]]` when the prose should keep its wording. */
export function buildLinkText(basename: string, shown: string): string {
  const alias = shown
    .split(/\r?\n/)[0]
    .replace(/[|\]]/g, "")
    .trim();
  return alias && alias !== basename ? `[[${basename}|${alias}]]` : `[[${basename}]]`;
}

/** The text that replaces the seed range: edge whitespace kept, link in the middle. */
export function buildReplacement(seed: QuickCodexSeed, basename: string): string {
  return `${seed.lead}${buildLinkText(basename, seed.core)}${seed.trail}`;
}

/**
 * Where the seed's text sits NOW: the original range if unchanged, else the
 * nearest occurrence of the same literal, else null (insert at the cursor).
 */
export function relocate(doc: string, seed: QuickCodexSeed): { from: number; to: number } | null {
  if (doc.slice(seed.rangeFrom, seed.rangeTo) === seed.raw) {
    return { from: seed.rangeFrom, to: seed.rangeTo };
  }
  const at = nearestIndexOf(doc, seed.raw, seed.rangeFrom);
  return at === -1 ? null : { from: at, to: at + seed.raw.length };
}
