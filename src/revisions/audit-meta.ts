/**
 * Per-scene revision-audit metadata I/O. Mirrors `scenes/scene-meta.ts` exactly
 * (read from the metadata cache, write via `fileManager.processFrontMatter` so the
 * prose body is never touched), but kept SEPARATE so the StoryLine-compatible
 * `SceneMeta` field set stays untouched.
 *
 * Storage: the 14 scene checkpoints live under a single nested object key
 * `revScene` (only ticked checks are stored), plus a freeform `revSceneNote`.
 * Cleared checks/notes are deleted so nothing lingers in frontmatter. Arc data
 * (`revArc`) is a list of `{character: "[[link]]", internal, external}` so it
 * follows character renames; see arc.ts for the (de)serialization.
 */

import type { App, TFile } from "obsidian";
import { ArcSnapshot, parseSceneArc, serializeSceneArc } from "./arc";
import { SCENE_CHECK_IDS, SceneCheckId } from "./audit";
import { OpeningType } from "./openings";

const SCENE_KEY = "revScene";
const NOTE_KEY = "revSceneNote";
const PURPOSE_KEY = "revPurpose";
const VERDICT_KEY = "revVerdict";
const OPENING_KEY = "revOpening";
const ARC_KEY = "revArc";

/** Lift-out test verdict: does this scene earn its place? */
export type SceneVerdict = "keep" | "cut" | "merge";
const VERDICTS: SceneVerdict[] = ["keep", "cut", "merge"];
const OPENINGS: OpeningType[] = ["action", "dialogue", "thought", "reflection", "unknown"];

export interface SceneAudit {
  /** Ticked scene-level checkpoints (only `true` ones are present). */
  checks: Partial<Record<SceneCheckId, boolean>>;
  /** Freeform revision note for the scene. */
  note?: string;
  /** Lift-out test cascade note ("if removed, what breaks?"). */
  purpose?: string;
  /** Lift-out verdict. */
  verdict?: SceneVerdict;
  /** Manual override of the heuristic opening classification. */
  opening?: OpeningType;
  /** Per-character arc snapshot (internal/external state) for this scene. */
  arc: Record<string, ArcSnapshot>;
}

/** A patch for `writeSceneAudit`: any subset of fields to set/clear. */
export interface SceneAuditPatch {
  checks?: Partial<Record<SceneCheckId, boolean>>;
  note?: string;
  purpose?: string;
  verdict?: SceneVerdict | "";
  opening?: OpeningType | "";
  /** Per-character arc snapshots to merge; a null value clears that character. */
  arc?: Record<string, ArcSnapshot | null>;
}

/** Read a scene's audit state from the metadata cache. */
export function readSceneAudit(app: App, file: TFile): SceneAudit {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const raw = fm[SCENE_KEY];
  const checks: Partial<Record<SceneCheckId, boolean>> = {};
  if (raw && typeof raw === "object") {
    for (const id of SCENE_CHECK_IDS) {
      if ((raw as Record<string, unknown>)[id] === true) checks[id] = true;
    }
  }
  const note = typeof fm[NOTE_KEY] === "string" ? fm[NOTE_KEY] : undefined;
  const purpose = typeof fm[PURPOSE_KEY] === "string" ? fm[PURPOSE_KEY] : undefined;
  const verdict = VERDICTS.includes(fm[VERDICT_KEY]) ? (fm[VERDICT_KEY] as SceneVerdict) : undefined;
  const opening = OPENINGS.includes(fm[OPENING_KEY]) ? (fm[OPENING_KEY] as OpeningType) : undefined;
  const arc = parseSceneArc(fm[ARC_KEY]);
  return { checks, note, purpose, verdict, opening, arc };
}

/**
 * Merge a patch into a scene's audit frontmatter. Only the checkpoints present in
 * `patch.checks` are touched; setting `false` clears that check. A blank note
 * clears the note key. Empty objects are removed so cleared scenes leave no trace.
 */
export async function writeSceneAudit(
  app: App,
  file: TFile,
  patch: SceneAuditPatch
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    if (patch.checks) {
      const cur: Record<string, unknown> =
        fm[SCENE_KEY] && typeof fm[SCENE_KEY] === "object" ? { ...fm[SCENE_KEY] } : {};
      for (const id of SCENE_CHECK_IDS) {
        if (!(id in patch.checks)) continue;
        if (patch.checks[id]) cur[id] = true;
        else delete cur[id];
      }
      if (Object.keys(cur).length === 0) delete fm[SCENE_KEY];
      else fm[SCENE_KEY] = cur;
    }
    if (patch.note !== undefined) {
      if (patch.note.trim()) fm[NOTE_KEY] = patch.note;
      else delete fm[NOTE_KEY];
    }
    if (patch.purpose !== undefined) {
      if (patch.purpose.trim()) fm[PURPOSE_KEY] = patch.purpose;
      else delete fm[PURPOSE_KEY];
    }
    if (patch.verdict !== undefined) {
      if (patch.verdict) fm[VERDICT_KEY] = patch.verdict;
      else delete fm[VERDICT_KEY];
    }
    if (patch.opening !== undefined) {
      if (patch.opening) fm[OPENING_KEY] = patch.opening;
      else delete fm[OPENING_KEY];
    }
    if (patch.arc) {
      // Read the current arc as a plain-name record, merge the patch, re-serialize
      // to the wikilinked list form so renames stay rewriteable by Obsidian.
      const cur = parseSceneArc(fm[ARC_KEY]);
      for (const [name, snap] of Object.entries(patch.arc)) {
        const internal = (snap?.internal ?? "").trim();
        const external = (snap?.external ?? "").trim();
        if (!snap || (!internal && !external)) delete cur[name];
        else cur[name] = { ...(internal ? { internal } : {}), ...(external ? { external } : {}) };
      }
      const list = serializeSceneArc(cur);
      if (list.length === 0) delete fm[ARC_KEY];
      else fm[ARC_KEY] = list;
    }
  });
}
