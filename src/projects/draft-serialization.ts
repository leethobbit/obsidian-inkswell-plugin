/**
 * Longform-compatible (de)serialization of the `longform` frontmatter entry.
 *
 * The nested-array encoding of scene indentation and the field-presence rules
 * are ported verbatim from Longform (kevboh/longform, src/model/draft-utils.ts)
 * so that a project edited by Inkswell stays recognizable to Longform and vice
 * versa. Do NOT "simplify" the encoding — compatibility depends on it.
 */

import type { Draft, IndentedScene } from "./types";

/**
 * Convert a flat, indented scene list into the nested-array form stored in YAML.
 * A scene at indent 0 is a bare string; deeper scenes nest inside arrays.
 * Ported from Longform's `indentedScenesToArrays`.
 */
export function indentedScenesToArrays(indented: IndentedScene[]): any[] {
  const result: any = [];
  let currentIndent = 0;
  let currentNesting = result;
  const nestingAt: Record<number, any> = {};
  nestingAt[0] = currentNesting;

  indented.forEach(({ title, indent }) => {
    if (indent > currentIndent) {
      while (currentIndent < indent) {
        currentIndent = currentIndent + 1;
        const newNesting: any = [];
        currentNesting.push(newNesting);
        nestingAt[currentIndent] = newNesting;
        currentNesting = newNesting;
      }
    } else if (indent < currentIndent) {
      currentNesting = nestingAt[indent];
      currentIndent = indent;
    }
    currentNesting.push(title);
  });
  return result;
}

/**
 * Inverse of {@link indentedScenesToArrays}: flatten nested arrays back into an
 * indented scene list. Ported from Longform's `arraysToIndentedScenes`.
 *
 * WARNING: this mutates `arr` via `.shift()`. Callers must pass a throwaway deep
 * clone — see {@link parseScenes}.
 */
export function arraysToIndentedScenes(
  arr: any,
  result: IndentedScene[] = [],
  currentIndent = -1
): IndentedScene[] {
  if (arr instanceof Array) {
    if (arr.length === 0) {
      return result;
    }
    const next = arr.shift();
    const inner = arraysToIndentedScenes(next, [], currentIndent + 1);
    return arraysToIndentedScenes(arr, [...result, ...inner], currentIndent);
  } else {
    return [{ title: arr, indent: currentIndent }];
  }
}

/** Safely parse the frontmatter `scenes` array into indented scenes. */
export function parseScenes(rawScenes: unknown): IndentedScene[] {
  if (!Array.isArray(rawScenes)) return [];
  // Deep clone: arraysToIndentedScenes destroys its input via .shift().
  const clone = JSON.parse(JSON.stringify(rawScenes));
  return arraysToIndentedScenes(clone);
}

/**
 * Parse a `longform` frontmatter value into a {@link Draft}, or null if the
 * value isn't a recognizable Longform entry.
 *
 * `fallbackTitle` (typically the index note's basename) is used when the title
 * isn't authored in frontmatter.
 */
export function parseDraft(
  longform: any,
  fallbackTitle: string
): Draft | null {
  if (!longform || typeof longform !== "object") return null;

  const titleInFrontmatter = typeof longform.title === "string";
  const title = titleInFrontmatter ? longform.title : fallbackTitle;
  const draftTitle =
    typeof longform.draftTitle === "string" ? longform.draftTitle : null;
  const workflow =
    typeof longform.workflow === "string" ? longform.workflow : null;

  if (longform.format === "single") {
    return { format: "single", title, titleInFrontmatter, draftTitle, workflow };
  }

  // Default to multi-scene when format is "scenes" or absent but scene fields exist.
  if (longform.format === "scenes" || longform.sceneFolder || longform.scenes) {
    return {
      format: "scenes",
      title,
      titleInFrontmatter,
      draftTitle,
      workflow,
      sceneFolder:
        typeof longform.sceneFolder === "string" ? longform.sceneFolder : "/",
      scenes: parseScenes(longform.scenes),
      ignoredFiles: Array.isArray(longform.ignoredFiles)
        ? longform.ignoredFiles.filter((f: unknown) => typeof f === "string")
        : [],
      sceneTemplate:
        typeof longform.sceneTemplate === "string"
          ? longform.sceneTemplate
          : null,
    };
  }

  return null;
}

/**
 * Build the `longform` frontmatter object for a draft, matching Longform's
 * field-presence rules (ported from `setDraftOnFrontmatterObject`). Assigns onto
 * the provided frontmatter object in place; leaves any sibling keys (e.g.
 * `inkswell`) untouched.
 */
export function writeDraftToFrontmatter(
  frontmatter: Record<string, any>,
  draft: Draft
): void {
  const lf: Record<string, any> = {};
  lf["format"] = draft.format;
  if (draft.titleInFrontmatter) {
    lf["title"] = draft.title;
  }
  if (draft.draftTitle) {
    lf["draftTitle"] = draft.draftTitle;
  }
  if (draft.workflow) {
    lf["workflow"] = draft.workflow;
  }
  if (draft.format === "scenes") {
    lf["sceneFolder"] = draft.sceneFolder;
    lf["scenes"] = indentedScenesToArrays(draft.scenes);
    if (draft.sceneTemplate) {
      lf["sceneTemplate"] = draft.sceneTemplate;
    }
    lf["ignoredFiles"] = draft.ignoredFiles;
  }
  frontmatter["longform"] = lf;
}
