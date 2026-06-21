/**
 * Built-in compile steps and the registry the compile UI/engine resolve against.
 *
 * Add a step here and register it in {@link STEP_REGISTRY} to make it available;
 * see AGENTS.md "Adding a compile step".
 */

import { CompileScene, CompileStep, ManuscriptStep, SceneStep } from "./types";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;

/** Remove a leading YAML frontmatter block from each scene. */
const stripFrontmatter: SceneStep = {
  id: "strip-frontmatter",
  description: "Strip YAML frontmatter from each scene",
  kind: "scene",
  run: (scenes) =>
    scenes.map((s) => ({ ...s, contents: s.contents.replace(FRONTMATTER_RE, "") })),
};

/** Remove Obsidian `%% ... %%` comments from each scene. */
const removeComments: SceneStep = {
  id: "remove-comments",
  description: "Remove %% Obsidian comments %% from each scene",
  kind: "scene",
  run: (scenes) =>
    scenes.map((s) => ({
      ...s,
      contents: s.contents.replace(OBSIDIAN_COMMENT_RE, ""),
    })),
};

/** Prepend a markdown heading (scene title) to each scene. */
const prependTitle: SceneStep = {
  id: "prepend-title",
  description: "Prepend the scene title as a heading",
  kind: "scene",
  run: (scenes, options) => {
    const level = clampLevel(options.level);
    const hashes = "#".repeat(level);
    return scenes.map((s) => ({
      ...s,
      contents: `${hashes} ${s.title}\n\n${s.contents.replace(/^\s+/, "")}`,
    }));
  },
};

/**
 * Group scenes into chapters by their `chapter` frontmatter: emit one chapter
 * heading per run of same-chapter scenes, with a scene-break glyph between scenes
 * inside a chapter. Scenes with no chapter pass through unheaded. This is the
 * alternative to `prepend-title` for multi-scene-per-chapter manuscripts — enable
 * one or the other, not both.
 */
const groupByChapter: SceneStep = {
  id: "group-by-chapter",
  description: "Group scenes into chapters (heading per chapter, scene breaks between)",
  kind: "scene",
  run: (scenes, options) => {
    const hashes = "#".repeat(clampLevel(options.level));
    const sceneBreak =
      typeof options.sceneBreak === "string" && options.sceneBreak.trim()
        ? options.sceneBreak.trim()
        : "* * *";

    // Collapse consecutive same-chapter scenes into one group (preserving order).
    const groups: { chapter?: string; scenes: CompileScene[] }[] = [];
    for (const s of scenes) {
      const ch = s.chapter?.trim() || undefined;
      const last = groups[groups.length - 1];
      if (last && ch !== undefined && last.chapter === ch) last.scenes.push(s);
      else groups.push({ chapter: ch, scenes: [s] });
    }

    return groups.map((g) => {
      const body = g.scenes
        .map((s) => s.contents.replace(/^\s+/, ""))
        .join(`\n\n${sceneBreak}\n\n`);
      const heading = g.chapter ? `${hashes} ${g.chapter}\n\n` : "";
      return { title: g.chapter ?? g.scenes[0].title, indent: 0, contents: heading + body };
    });
  },
};

/** Collapse 3+ consecutive blank lines and trim leading/trailing whitespace. */
const trimBlankLines: ManuscriptStep = {
  id: "trim-blank-lines",
  description: "Collapse excess blank lines and trailing whitespace",
  kind: "manuscript",
  run: (manuscript) =>
    manuscript
      .replace(/[ \t]+$/gm, "") // strip trailing whitespace per line
      .replace(/\n{3,}/g, "\n\n") // collapse 3+ blank lines
      .replace(/^\s+|\s+$/g, "") + "\n",
};

export const BUILTIN_STEPS: CompileStep[] = [
  stripFrontmatter,
  removeComments,
  prependTitle,
  groupByChapter,
  trimBlankLines,
];

export const STEP_REGISTRY: Map<string, CompileStep> = new Map(
  BUILTIN_STEPS.map((s) => [s.id, s])
);

function clampLevel(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(6, Math.floor(n)));
}

export type { CompileScene };
