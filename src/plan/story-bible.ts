/**
 * Story bible assembly (pure, Obsidian-free, tested): turns a project's planning
 * data — overview + planning-note prose, beat sheet, outline, codex — into ONE
 * readable markdown note for sharing (#50). The I/O wrapper (`story-bible-io.ts`)
 * gathers plain data from the vault; this module only formats it.
 *
 * Readers aren't in the vault, so links render as plain names, tool state (beat
 * done flags, blurbs) is left out, and archived scenes and private working notes
 * never appear. Sections the writer didn't pick, or that are empty, are skipped.
 */

import { linkAlias, linkTarget } from "../codex/codex";
import { ProfileFieldType, ProfileValue, isEmptyValue } from "../codex/profile-schema";
import type { MergedBeat } from "../outliner/beats";
import type { MessageKey } from "../i18n";
import type { ChapterNode, OutlineTree, SceneRef } from "../outliner/outline";

/** Marks a note as generated (and safe to replace on the next run). */
export const STORY_BIBLE_MARKER = "<!-- inkswell:story-bible -->";

export type StoryBibleSection = "overview" | "beats" | "outline" | "codex";

/** The export dialog's section toggles (labels are UI only; the note's own
 *  headings are written in English by the section builders below). */
export const STORY_BIBLE_SECTIONS: { id: StoryBibleSection; labelKey: MessageKey }[] = [
  { id: "overview", labelKey: "plan.bible.section.overview" },
  { id: "beats", labelKey: "plan.bible.section.beats" },
  { id: "outline", labelKey: "plan.bible.section.outline" },
  { id: "codex", labelKey: "plan.bible.section.codex" },
];

export interface CodexEntryField {
  label: string;
  type: ProfileFieldType;
  value: ProfileValue | undefined;
}

export interface CodexEntryData {
  name: string;
  aliases: string[];
  /** Vault path of the entry's image, if any (embedded in the bible). */
  image?: string;
  fields: CodexEntryField[];
}

export interface OutlineSceneInfo {
  pov?: string;
  synopsis?: string;
  inactive?: boolean;
}

export interface StoryBibleInput {
  title: string;
  /** YYYY-MM-DD, shown in the generated-on line. */
  generated: string;
  overview?: {
    fields: { label: string; value: string | undefined }[];
    sections: { heading: string; text: string }[];
  };
  beats?: { templateName: string; beats: MergedBeat[] };
  outline?: { tree: OutlineTree; scenes: Record<string, OutlineSceneInfo> };
  /** Already filtered to the chosen types, in display order. */
  codex?: { label: string; entries: CodexEntryData[] }[];
}

function oneLine(v: ProfileValue, type: ProfileFieldType): string {
  if (Array.isArray(v)) {
    return v
      .map((x) => (type === "links" ? linkName(x) : x.trim()))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof v === "number") return String(v);
  return type === "links" ? linkName(v) : v.trim();
}

/** "[[Anna|sister]]" → "Anna (sister)"; a plain string stays as written. */
function linkName(value: string): string {
  const name = linkTarget(value);
  const alias = linkAlias(value);
  return alias ? `${name} (${alias})` : name;
}

/**
 * One codex entry as readable text — the bible's entry body, and what
 * "Copy as text" puts on the clipboard. `markdown` bolds the labels (for the
 * note); off gives plain `Label: value` lines that paste cleanly anywhere.
 */
export function codexEntryText(
  entry: CodexEntryData,
  opts: { title?: boolean; markdown?: boolean } = {}
): string {
  const label = (l: string) => (opts.markdown ? `**${l}:**` : `${l}:`);
  const blocks: string[] = [];
  if (opts.title) blocks.push(opts.markdown ? `**${entry.name}**` : entry.name);
  const aliases = entry.aliases.map((a) => a.trim()).filter(Boolean);
  if (aliases.length) blocks.push(`${label("Also known as")} ${aliases.join(", ")}`);
  for (const f of entry.fields) {
    if (f.type === "image" || f.value === undefined || isEmptyValue(f.value)) continue;
    if (f.type === "textarea" && typeof f.value === "string") {
      blocks.push(`${label(f.label)}\n${f.value.trim()}`);
    } else {
      const text = oneLine(f.value, f.type);
      if (text) blocks.push(`${label(f.label)} ${text}`);
    }
  }
  return blocks.join(opts.markdown ? "\n\n" : "\n");
}

function overviewSection(o: NonNullable<StoryBibleInput["overview"]>): string | null {
  const parts: string[] = [];
  const fields = o.fields
    .filter((f) => f.value && f.value.trim())
    .map((f) => `**${f.label}:** ${f.value!.trim()}`);
  if (fields.length) parts.push(fields.join("  \n"));
  for (const s of o.sections) {
    if (s.text.trim()) parts.push(`### ${s.heading}\n\n${s.text.trim()}`);
  }
  return parts.length ? `## Overview\n\n${parts.join("\n\n")}` : null;
}

function beatsSection(b: NonNullable<StoryBibleInput["beats"]>): string | null {
  const parts: string[] = [];
  for (const beat of b.beats) {
    const scenes = (beat.assignment.scenes ?? []).filter(Boolean);
    const note = beat.assignment.note?.trim();
    if (!scenes.length && !note) continue; // an unfilled beat says nothing to a reader
    const lines = [`### ${beat.name}`];
    if (scenes.length) lines.push(`*Scenes: ${scenes.join(", ")}*`);
    if (note) lines.push(note);
    parts.push(lines.join("\n\n"));
  }
  if (!parts.length) return null;
  return `## Beat sheet — ${b.templateName}\n\n${parts.join("\n\n")}`;
}

function outlineSection(o: NonNullable<StoryBibleInput["outline"]>): string | null {
  const sceneLines = (scenes: SceneRef[]): string[] =>
    scenes
      .filter((s) => !o.scenes[s.title]?.inactive)
      .map((s) => {
        const info = o.scenes[s.title] ?? {};
        let line = `- **${s.title}**`;
        if (info.pov?.trim()) line += ` *(POV: ${info.pov.trim()})*`;
        if (info.synopsis?.trim()) line += ` — ${info.synopsis.trim().replace(/\s*\n\s*/g, " ")}`;
        return line;
      });
  const chapterBlock = (c: ChapterNode, level: string): string | null => {
    const lines = sceneLines(c.scenes);
    return lines.length ? `${level} ${c.title}\n\n${lines.join("\n")}` : null;
  };

  const { tree } = o;
  const hasActs = tree.acts.length > 0;
  const blocks: string[] = [];
  for (const act of tree.acts) {
    const chapters = act.chapters
      .map((c) => chapterBlock(c, "####"))
      .filter((x): x is string => !!x);
    if (chapters.length) blocks.push(`### ${act.title}\n\n${chapters.join("\n\n")}`);
  }
  const loose = tree.looseChapters
    .map((c) => chapterBlock(c, hasActs ? "####" : "###"))
    .filter((x): x is string => !!x);
  if (loose.length) {
    blocks.push(hasActs ? `### Chapters with no act\n\n${loose.join("\n\n")}` : loose.join("\n\n"));
  }
  const unassigned = sceneLines(tree.unassignedScenes);
  if (unassigned.length) {
    const head = hasActs || tree.looseChapters.length ? "### Unassigned scenes\n\n" : "";
    blocks.push(`${head}${unassigned.join("\n")}`);
  }
  return blocks.length ? `## Outline\n\n${blocks.join("\n\n")}` : null;
}

function codexSection(groups: NonNullable<StoryBibleInput["codex"]>): string | null {
  const blocks: string[] = [];
  for (const g of groups) {
    if (!g.entries.length) continue;
    const entries = g.entries.map((e) => {
      const body = codexEntryText(e, { markdown: true });
      const image = e.image ? `![[${e.image}|240]]` : "";
      return [`#### ${e.name}`, image, body].filter(Boolean).join("\n\n");
    });
    blocks.push(`### ${g.label}\n\n${entries.join("\n\n")}`);
  }
  return blocks.length ? `## Codex\n\n${blocks.join("\n\n")}` : null;
}

/** The whole note. `sections` = what the writer picked; empty ones are skipped. */
export function assembleStoryBible(
  input: StoryBibleInput,
  sections: ReadonlySet<StoryBibleSection>
): string {
  const parts: (string | null)[] = [];
  if (sections.has("overview") && input.overview) parts.push(overviewSection(input.overview));
  if (sections.has("beats") && input.beats) parts.push(beatsSection(input.beats));
  if (sections.has("outline") && input.outline) parts.push(outlineSection(input.outline));
  if (sections.has("codex") && input.codex) parts.push(codexSection(input.codex));
  const body = parts.filter((p): p is string => !!p);
  return [
    STORY_BIBLE_MARKER,
    `*Generated by Inkswell on ${input.generated}. Regenerating replaces this note.*`,
    `# ${input.title} — Story bible`,
    ...(body.length ? body : ["*Nothing to show yet for the sections you picked.*"]),
  ].join("\n\n") + "\n";
}
