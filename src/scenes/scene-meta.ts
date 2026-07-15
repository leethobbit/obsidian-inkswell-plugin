/**
 * Per-scene metadata, stored as flat top-level frontmatter on each scene file
 * (NOT on the project index, NOT in the body). Field names match StoryLine's
 * scene fields where they overlap (`status`, `pov`, `subtitle`, `synopsis`,
 * `act`, `chapter`, `color`, `inactive`) for cross-tool compatibility.
 *
 * Writes go through `fileManager.processFrontMatter`, which edits frontmatter
 * without touching the scene's prose.
 */

import type { App, TFile } from "obsidian";

export type SceneStatus =
  | "idea"
  | "outlined"
  | "draft"
  | "written"
  | "revised"
  | "final";

export const SCENE_STATUSES: SceneStatus[] = [
  "idea",
  "outlined",
  "draft",
  "written",
  "revised",
  "final",
];

export interface SceneMeta {
  status?: SceneStatus;
  pov?: string;
  synopsis?: string;
  subtitle?: string;
  act?: string;
  chapter?: string;
  /** Hex color tint, e.g. "#FF6B6B". */
  color?: string;
  /** Archived / excluded from compile + stats. */
  inactive?: boolean;
  /** Linked codex characters, as wikilink strings (e.g. "[[Anna]]"). */
  characters?: string[];
  /** Linked codex location, as a wikilink string. */
  location?: string;
  /** Plotlines this scene advances — plain titles matching `inkswell.plotlines`
   *  entries (like `act`/`chapter` strings, NOT wikilinks). */
  plotlines?: string[];
  /** Per-scene word-count target. */
  targetWords?: number;
}

const FIELD_KEYS: (keyof SceneMeta)[] = [
  "status",
  "pov",
  "synopsis",
  "subtitle",
  "act",
  "chapter",
  "color",
  "inactive",
  "characters",
  "location",
  "plotlines",
  "targetWords",
];

/** Coerce an arbitrary frontmatter value to a known status, or undefined. */
export function coerceStatus(value: unknown): SceneStatus | undefined {
  return SCENE_STATUSES.includes(value as SceneStatus)
    ? (value as SceneStatus)
    : undefined;
}

/** Title-cased label for a status (for badges/dropdowns). */
export function statusLabel(status: SceneStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Read a scene's metadata from the metadata cache (flat fields are reliable). */
export function readSceneMeta(app: App, file: TFile): SceneMeta {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const str = (v: unknown) =>
    v === undefined || v === null ? undefined : String(v);
  return {
    status: coerceStatus(fm["status"]),
    pov: str(fm["pov"]),
    synopsis: str(fm["synopsis"]),
    subtitle: str(fm["subtitle"]),
    act: str(fm["act"]),
    chapter: str(fm["chapter"]),
    color: str(fm["color"]),
    inactive: fm["inactive"] === true,
    characters: Array.isArray(fm["characters"])
      ? fm["characters"].filter((x: unknown): x is string => typeof x === "string")
      : typeof fm["characters"] === "string"
        ? [fm["characters"]]
        : undefined,
    location: str(fm["location"]),
    plotlines: Array.isArray(fm["plotlines"])
      ? fm["plotlines"].filter((x: unknown): x is string => typeof x === "string")
      : typeof fm["plotlines"] === "string"
        ? [fm["plotlines"]]
        : undefined,
    targetWords: typeof fm["targetWords"] === "number" ? fm["targetWords"] : undefined,
  };
}

/**
 * Merge a metadata patch into a scene file's frontmatter. Empty/false/undefined
 * values clear the key so cleared fields don't linger. `defaults` fill keys the
 * file doesn't already have (and the patch doesn't set) — so a scene template's
 * own frontmatter wins over a default like `status: idea`.
 */
export async function writeSceneMeta(
  app: App,
  file: TFile,
  patch: Partial<SceneMeta>,
  defaults?: Partial<SceneMeta>
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    for (const key of FIELD_KEYS) {
      if (!(key in patch)) continue;
      const value = patch[key];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        value === false ||
        (Array.isArray(value) && value.length === 0);
      if (empty) delete fm[key];
      else fm[key] = value;
    }
    if (defaults) {
      for (const key of FIELD_KEYS) {
        if (!(key in defaults) || key in patch || fm[key] !== undefined) continue;
        const value = defaults[key];
        if (value !== undefined) fm[key] = value;
      }
    }
  });
}
