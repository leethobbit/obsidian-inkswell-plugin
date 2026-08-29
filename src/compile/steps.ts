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

// --- Link syntax (see `flattenLinks`) -------------------------------------
// Any embed: `![[target]]`, `![[target|alias-or-size]]`, `![[target#heading]]`.
// Captures target (up to `#`/`|`) and the optional alias. Must run before the
// plain-wikilink pass or that pass would leave a dangling `!` behind.
const EMBED_RE = /!\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
// Plain wikilink: target stops at `#` or `|`; the `#heading`/`#^block` part is
// captured so `[[#Heading]]` (same-note link, empty target) can still show text.
// Deliberately different from wordcount.ts's WIKILINK_RE, which keeps the whole
// inner text for counting — here we want what the reader should SEE.
const WIKILINK_RE = /\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g;
// Inline markdown link `[text](url "title")` — NOT an image (`![alt](src)`,
// guarded by the lookbehind) and not a reference link (`[text][ref]`).
const MD_LINK_RE = /(?<!!)\[([^\][]*)\]\((?:<[^>]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|bmp|avif)$/i;
// An Obsidian image alias that's really a size hint: `300` or `300x200`.
const SIZE_ALIAS_RE = /^\d+(?:x\d+)?$/;

/** True when an embed target is an image file (kept, as a markdown image). */
export function isImageEmbedTarget(target: string): boolean {
  return IMAGE_EXT_RE.test(target.trim());
}

/**
 * Rewrite every link in `text` to what a reader should see (pure — shared by
 * the compile step and, for the count, preflight):
 *   `[[Note|Alias]]` → `Alias`, `[[Note]]` → `Note`, `[[Note#H]]` → `Note`,
 *   `[[#Heading]]` → `Heading`, `[text](url)` → `text`,
 *   `![[map.png|alt]]` → `![alt](map.png)` (an image the exporter can embed),
 *   any other `![[…]]` (note/PDF transclusion) → removed.
 */
export function flattenLinkSyntax(text: string): string {
  return text
    .replace(EMBED_RE, (_m, target: string, alias: string | undefined) => {
      const path = target.trim();
      if (!isImageEmbedTarget(path)) return "";
      const alt = alias && !SIZE_ALIAS_RE.test(alias.trim()) ? alias.trim() : "";
      const dest = /\s/.test(path) ? `<${path}>` : path;
      return `![${alt}](${dest})`;
    })
    .replace(
      WIKILINK_RE,
      (_m, target: string, heading: string | undefined, alias: string | undefined) => {
        if (alias !== undefined && alias.trim()) return alias;
        if (target.trim()) return target;
        // `[[#Heading]]` / `[[#^block]]`: nothing else to show but the fragment.
        return (heading ?? "").replace(/^\^/, "");
      }
    )
    .replace(MD_LINK_RE, (_m, text: string) => text);
}

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

/**
 * Flatten link syntax to reader-visible text in each scene: `[[Note|Alias]]`
 * and `[text](url)` both become just the text; image embeds become markdown
 * images (so pandoc/HTML can include them); note embeds are dropped (preflight
 * warns about those). Nothing here resolves against the vault — syntax only.
 * Default-on; on by migration for projects configured before it existed
 * (see `resolveCompileValue`).
 */
const flattenLinks: SceneStep = {
  id: "flatten-links",
  description: "Flatten links to plain text ([[wikilinks]] and [markdown](links))",
  kind: "scene",
  run: (scenes) =>
    scenes.map((s) => ({ ...s, contents: flattenLinkSyntax(s.contents) })),
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
  removeTodos,
  flattenLinks,
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
