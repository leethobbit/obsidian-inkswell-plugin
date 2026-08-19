/**
 * User-defined beat-sheet templates (no Obsidian imports — unit-testable).
 * Definitions persist in settings as `customBeatTemplates` and are merged after
 * the built-ins wherever templates are listed — via {@link allTemplateMeta},
 * computed at render/call time, never cached at module load.
 *
 * `inkswell.beats.template` may therefore name a template this device doesn't
 * have (deleted, or data.json didn't sync). {@link resolveTemplate} returns
 * null for unknown ids — NEVER a Save-the-Cat fallback, which would render the
 * wrong beat keyspace over the user's assignments. Callers degrade instead:
 * {@link synthesizeBeats} rebuilds displayable rows from the assignment keys so
 * every saved note stays visible and editable.
 */

import { SLUG_RE, slugify } from "../lib/slug";
import {
  BEAT_TEMPLATES,
  BeatAssignment,
  BeatDef,
  DEFAULT_TEMPLATE,
  TEMPLATE_META,
} from "./beat-templates";

/** One user-defined template: a named, ordered list of beats. */
export interface BeatTemplateDef {
  /** Picker/frontmatter slug, derived from the name and immutable once created
   *  (it's written into `inkswell.beats.template` on project index notes). */
  id: string;
  /** Display name. */
  name: string;
  beats: BeatDef[];
}

/** Upper bound on beats per template (numberWord in scaffold-plan words 1–99). */
export const MAX_BEATS = 99;

/** Built-ins first, then the user's custom templates in stored order. */
export function allTemplateMeta(customs: BeatTemplateDef[] = []): { id: string; label: string }[] {
  return [
    ...TEMPLATE_META,
    ...customs.map((t) => ({ id: t.id, label: `${t.name} (${t.beats.length})` })),
  ];
}

/**
 * Beats for a template id. `undefined` means "no sheet yet" → the default
 * template (current behavior); an UNKNOWN id returns null so callers render a
 * degraded-but-lossless state instead of silently mixing beat keyspaces.
 */
export function resolveTemplate(
  id: string | undefined,
  customs: BeatTemplateDef[] = []
): BeatDef[] | null {
  if (id === undefined) return BEAT_TEMPLATES[DEFAULT_TEMPLATE];
  return BEAT_TEMPLATES[id] ?? customs.find((t) => t.id === id)?.beats ?? null;
}

/** "inciting-incident" → "Inciting incident" (best-effort display for orphaned ids). */
function unslug(id: string): string {
  const words = id.replace(/-+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id;
}

/**
 * Displayable beat rows for a sheet whose template is missing on this device:
 * one per assignment, keyed by the SAME ids so per-beat edits keep writing to
 * the entries the real template will pick up again when it's back.
 */
export function synthesizeBeats(assignments: Record<string, BeatAssignment>): BeatDef[] {
  const ids = Object.keys(assignments);
  return ids.map((id, i) => ({
    id,
    name: unslug(id),
    blurb: "",
    position: ids.length > 1 ? i / (ids.length - 1) : 0,
  }));
}

/**
 * Parse the template editor's line-per-beat text. Grammar per line (blank
 * lines ignored):
 *
 *     Name
 *     Name | blurb
 *     NN% | Name | blurb
 *
 * An explicit leading `NN%` pins that beat's position (clamped 0–100); beats
 * without one are auto-distributed evenly across 0–1 by list order (the
 * 27-chapter convention). Beat ids are slugified from names — duplicates get
 * `-2`/`-3`… suffixes so reordering lines can never cross-wire saved notes.
 */
export function parseBeatLines(text: string): { beats: BeatDef[] } | { error: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { error: "Add at least one beat (one per line)." };
  if (lines.length > MAX_BEATS) return { error: `At most ${MAX_BEATS} beats per template.` };

  const parsed: Array<{ name: string; blurb: string; position: number | null }> = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    let position: number | null = null;
    const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(parts[0]);
    if (pct && parts.length > 1) {
      position = Math.min(100, Math.max(0, parseFloat(pct[1]))) / 100;
      parts.shift();
    }
    const name = parts[0] ?? "";
    if (!name) return { error: `A beat is missing its name: "${line}"` };
    parsed.push({ name, blurb: parts.slice(1).join(" | "), position });
  }

  const taken = new Set<string>();
  const beats: BeatDef[] = parsed.map((b, i) => {
    const base = slugify(b.name) || `beat-${i + 1}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return {
      id,
      name: b.name,
      blurb: b.blurb,
      position: b.position ?? (parsed.length > 1 ? i / (parsed.length - 1) : 0),
    };
  });
  return { beats };
}

/** Editor prefill: the inverse of {@link parseBeatLines}. Positions are always
 *  written explicitly so a round-trip can't shift a pinned beat. */
export function serializeBeatLines(beats: BeatDef[]): string {
  return beats
    .map((b) => {
      const pct = `${Math.round(b.position * 1000) / 10}%`;
      return b.blurb ? `${pct} | ${b.name} | ${b.blurb}` : `${pct} | ${b.name}`;
    })
    .join("\n");
}

/**
 * Sanitize the persisted custom-template list (data.json is hand-editable, and
 * settings load does no per-field validation). Drops malformed entries, ids
 * that aren't slugs or collide with built-ins/earlier customs (first wins),
 * malformed beats, and templates left with no beats.
 */
export function normalizeCustomBeatTemplates(raw: unknown): BeatTemplateDef[] {
  if (!Array.isArray(raw)) return [];
  const out: BeatTemplateDef[] = [];
  const takenIds = new Set<string>(Object.keys(BEAT_TEMPLATES));
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec["id"] === "string" ? rec["id"].trim().toLowerCase() : "";
    const name = typeof rec["name"] === "string" ? rec["name"].trim() : "";
    if (!name || !SLUG_RE.test(id)) continue;
    if (takenIds.has(id)) continue;
    const beats: BeatDef[] = [];
    const beatIds = new Set<string>();
    for (const b of Array.isArray(rec["beats"]) ? (rec["beats"] as unknown[]) : []) {
      if (typeof b !== "object" || b === null) continue;
      const br = b as Record<string, unknown>;
      const bid = typeof br["id"] === "string" ? br["id"].trim() : "";
      const bname = typeof br["name"] === "string" ? br["name"].trim() : "";
      if (!bid || !bname || beatIds.has(bid)) continue;
      const pos = typeof br["position"] === "number" && Number.isFinite(br["position"]) ? br["position"] : 0;
      beatIds.add(bid);
      beats.push({
        id: bid,
        name: bname,
        blurb: typeof br["blurb"] === "string" ? br["blurb"] : "",
        position: Math.min(1, Math.max(0, pos)),
      });
      if (beats.length >= MAX_BEATS) break;
    }
    if (beats.length === 0) continue;
    takenIds.add(id);
    out.push({ id, name, beats });
  }
  return out;
}
