/**
 * Built-in compile steps and the registry the compile UI/engine resolve against.
 *
 * Add a step here and register it in {@link STEP_REGISTRY} to make it available;
 * see AGENTS.md "Adding a compile step".
 */

import { stripFrontmatter as stripLeadingFrontmatter } from "../lib/frontmatter";
import { stripPlaceholders } from "../lib/placeholders";
import { CompileScene, CompileStep, ManuscriptStep, SceneStep } from "./types";

const OBSIDIAN_COMMENT_RE = /%%[\s\S]*?%%/g;

// Embeds (`![[Target]]`) must be resolved BEFORE plain wikilinks below, or the
// plain-wikilink pass would still match the inner `[[Target]]`, resolve it to
// display text, and leave the leading `!` dangling (e.g. "! Target").
const WIKILINK_EMBED_RE = /!\[\[[^\]]+\]\]/g;
// Target stops at the first `#`, `|`, or `]` so a heading/block reference
// (`#Heading`) is captured separately and discarded — deliberately different
// from the word-count WIKILINK_RE (src/lib/wordcount.ts), which keeps it.
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

/** Remove a leading YAML frontmatter block from each scene. Shares the ONE
 *  splitter (lib/frontmatter), which requires the block to parse as a YAML
 *  mapping — a scene opening with a `---` divider keeps its opening prose in
 *  the compiled manuscript instead of losing it as fake "frontmatter". */
const stripFrontmatter: SceneStep = {
  id: "strip-frontmatter",
  description: "Strip YAML frontmatter from each scene",
  kind: "scene",
  run: (scenes) =>
    scenes.map((s) => ({ ...s, contents: stripLeadingFrontmatter(s.contents) })),
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

/**
 * Remove drafting to-do markers ([TODO:], [NOTE:], [RESEARCH:], [DIALOGUE:],
 * [SCENE:]) from each scene. These are "defer everything" placeholders, never
 * part of the finished manuscript — without this step they ship verbatim.
 */
const removeTodos: SceneStep = {
  id: "remove-todos",
  description: "Remove drafting markers ([TODO], [NOTE], [SCENE]…) — unfinished spots",
  kind: "scene",
  run: (scenes) =>
    scenes.map((s) => ({ ...s, contents: stripPlaceholders(s.contents) })),
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

/**
 * Remove Obsidian wikilink syntax (`[[Target]]`, `[[Target|Alias]]`,
 * `[[Target#Heading]]`, and embeds `![[Target]]`) from the compiled
 * manuscript, keeping only the readable display text (nothing, for embeds).
 *
 * Deliberately NOT added to {@link BUILTIN_STEPS} / the step registry: this
 * cleanup is unconditional (spec FR-005) — it always runs and is never a
 * toggleable entry in the compile step configuration UI. `assembleManuscript`
 * (compile/assemble.ts) calls `.run()` on this directly instead of resolving
 * it through a configured step id. Never resolves targets against actual
 * vault notes — syntax-only, keeping this module Obsidian-free.
 */
export const stripWikilinks: ManuscriptStep = {
  id: "strip-wikilinks",
  description: "Remove Obsidian wikilink syntax, keeping the display text",
  kind: "manuscript",
  run: (manuscript) =>
    manuscript
      .replace(WIKILINK_EMBED_RE, "")
      .replace(WIKILINK_RE, (_m: string, target: string, alias: string | undefined) => alias ?? target),
};

export const BUILTIN_STEPS: CompileStep[] = [
  stripFrontmatter,
  removeComments,
  removeTodos,
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
