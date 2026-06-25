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

/** Ordered H2 sections the Overview panel manages. Heading text is the key. */
export const PLAN_SECTIONS = [
  "Synopsis",
  "Plot groundwork",
  "Act I",
  "Act II",
  "Act III",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

function sanitizeTitle(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

/** Default planning-note path: sibling of the index note, "<Title> — Plan.md". */
export function planningNotePath(project: Project): string {
  const indexBase = project.vaultPath.replace(/\.md$/i, "");
  const slash = indexBase.lastIndexOf("/");
  const folder = slash >= 0 ? indexBase.slice(0, slash) : "";
  const name = sanitizeTitle(project.draft.title) || "Project";
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
  let i = lines.findIndex((l) => /^##\s+/.test(l) && norm(l.replace(/^##\s+/, "")) === norm(heading));
  if (i < 0) return "";
  const body: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s+/.test(lines[j])) break;
    body.push(lines[j]);
  }
  return body.join("\n").trim();
}

/**
 * Replace (or append) the body under an H2 heading and write the note back. Other
 * sections — including ones the user added by hand — are preserved.
 */
export async function writeSection(
  app: App,
  file: TFile,
  heading: string,
  text: string
): Promise<void> {
  const source = await app.vault.read(file);
  const lines = source.split(/\r?\n/);
  const norm = (s: string) => s.trim().toLowerCase();
  const block = text.trim();

  const start = lines.findIndex(
    (l) => /^##\s+/.test(l) && norm(l.replace(/^##\s+/, "")) === norm(heading)
  );

  if (start < 0) {
    // Section missing: append it.
    const tail = source.replace(/\s*$/, "");
    const next = `${tail ? tail + "\n\n" : ""}## ${heading}\n\n${block}\n`;
    await app.vault.modify(file, next);
    return;
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
  await app.vault.modify(file, next.replace(/\s*$/, "") + "\n");
}
