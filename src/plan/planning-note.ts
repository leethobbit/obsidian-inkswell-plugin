/**
 * The project's planning note — a normal markdown note (`<Project> — Plan.md`,
 * sibling of the index note) that holds the long-form planning prose the Overview
 * tab edits: synopsis, plot groundwork, and a light 3-act sketch.
 *
 * It is NEVER the Longform index and carries NO `longform` key, so the project
 * store won't mis-detect it. Because we own this file outright, section writes do a
 * full-body read/replace/write — safe here in a way it would never be on the index.
 */

import { App, TFile, normalizePath } from "obsidian";
import { Project } from "../projects/types";
import { sanitizeSegment } from "../settings/folders";

/** Ordered H2 sections the Overview panel manages. Heading text is the key. */
export const PLAN_SECTIONS = [
  "Synopsis",
  "Plot groundwork",
  "Act I",
  "Act II",
  "Act III",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

/** Default planning-note path: sibling of the index note, "<Title> — Plan.md". */
export function planningNotePath(project: Project): string {
  const indexBase = project.vaultPath.replace(/\.md$/i, "");
  const slash = indexBase.lastIndexOf("/");
  const folder = slash >= 0 ? indexBase.slice(0, slash) : "";
  const name = sanitizeSegment(project.draft.title) || "Project";
  const file = `${name} — Plan.md`;
  return normalizePath(folder ? `${folder}/${file}` : file);
}

function skeleton(): string {
  return PLAN_SECTIONS.map((h) => `## ${h}\n\n`).join("").trimEnd() + "\n";
}

/**
 * Return the project's planning note, creating it (with a section skeleton) on
 * first use. Prefers the stored `inkswell.overview.planningNote` path, falling
 * back to the default sibling path.
 */
export async function ensurePlanningNote(app: App, project: Project): Promise<TFile> {
  const stored = project.inkswell?.overview?.planningNote;
  const path = stored && stored.trim() ? normalizePath(stored) : planningNotePath(project);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;
  return app.vault.create(path, skeleton());
}

/** Extract the body text under an H2 heading (between it and the next H2 / EOF). */
export function readSection(source: string, heading: string): string {
  const lines = source.split(/\r?\n/);
  const norm = (s: string) => s.trim().toLowerCase();
  const i = lines.findIndex((l) => /^##\s+/.test(l) && norm(l.replace(/^##\s+/, "")) === norm(heading));
  if (i < 0) return "";
  const body: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s+/.test(lines[j])) break;
    body.push(lines[j]);
  }
  return body.join("\n").trim();
}

/**
 * Pure transform: replace (or append) the body under an H2 heading. Other
 * sections — including ones the user added by hand — are preserved.
 */
export function replaceSection(source: string, heading: string, text: string): string {
  const lines = source.split(/\r?\n/);
  const norm = (s: string) => s.trim().toLowerCase();
  const block = text.trim();

  const start = lines.findIndex(
    (l) => /^##\s+/.test(l) && norm(l.replace(/^##\s+/, "")) === norm(heading)
  );

  if (start < 0) {
    // Section missing: append it.
    const tail = source.replace(/\s*$/, "");
    return `${tail ? tail + "\n\n" : ""}## ${heading}\n\n${block}\n`;
  }

  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) {
    if (/^##\s+/.test(lines[j])) {
      end = j;
      break;
    }
  }
  const before = lines.slice(0, start + 1);
  const after = lines.slice(end);
  const middle = block ? ["", block, ""] : [""];
  const next = [...before, ...middle, ...after].join("\n").replace(/\n{3,}/g, "\n\n");
  return next.replace(/\s*$/, "") + "\n";
}

/**
 * Replace (or append) a section and write the note back — atomically via
 * `vault.process`, because each Overview textarea saves independently on blur
 * and two sections blurring in quick succession must not race each other.
 */
export async function writeSection(
  app: App,
  file: TFile,
  heading: string,
  text: string
): Promise<void> {
  await app.vault.process(file, (source) => replaceSection(source, heading, text));
}
