/**
 * Archive is "out of sight" only, and story-level: archiving writes
 * `inkswell.archived` to EVERY draft of the story (so a new byte-copied draft is
 * born archived, and a stale sibling can't resurrect the old state), touches no
 * other story, and never writes a scene file — the sync-safety invariant.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { setSeriesArchived, setStoryArchived } from "../src/projects/archive-actions";
import type { Project } from "../src/projects/types";
import type { Series } from "../src/series/series";
import { FakeApp } from "./fakes/fake-app";

const index = (title: string, draftTitle: string, extra = "") =>
  `---\nlongform:\n  format: scenes\n  title: ${title}\n  draftTitle: ${draftTitle}\n  sceneFolder: Scenes\n  scenes:\n    - Alpha\n  ignoredFiles: []\n${extra}---\nBody of ${title} / ${draftTitle}.\n`;

const BASE = "Books/Novel/Novel.md";
const COPY = "Books/Novel/Drafts/Second/Novel — Second.md";
const OTHER = "Books/Other/Other.md";
const SCENE = "Books/Novel/Scenes/Alpha.md";
const SCENE_TEXT = "---\nstatus: draft\n---\nThe lamplighter came at dusk.\n";

function project(path: string, title: string, draftTitle: string): Project {
  return {
    vaultPath: path,
    draft: {
      format: "scenes",
      title,
      titleInFrontmatter: true,
      draftTitle,
      workflow: null,
      sceneFolder: "Scenes",
      scenes: [{ title: "Alpha", indent: 0 }],
      ignoredFiles: [],
      sceneTemplate: null,
    } as unknown as Project["draft"],
    scenes: [],
    unknownFiles: [],
    inkswell: null,
  };
}

const PROJECTS = [
  project(BASE, "Novel", "First"),
  project(COPY, "Novel", "Second"),
  project(OTHER, "Other", "First"),
];

function archivedFlag(app: FakeApp, path: string): unknown {
  const fm = app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(path) as never)?.frontmatter;
  return (fm?.["inkswell"] as Record<string, unknown> | undefined)?.["archived"];
}

describe("archive actions", () => {
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({
      [BASE]: index("Novel", "First"),
      [COPY]: index("Novel", "Second"),
      [OTHER]: index("Other", "First"),
      [SCENE]: SCENE_TEXT,
    });
  });

  it("archives every draft of the story — from any draft — and no other story", async () => {
    const marked: string[] = [];
    const ok = await setStoryArchived(app.asApp(), PROJECTS, PROJECTS[1], true, (p) => marked.push(p));
    expect(ok).toBe(true);
    expect(archivedFlag(app, BASE)).toBe(true);
    expect(archivedFlag(app, COPY)).toBe(true);
    expect(archivedFlag(app, OTHER)).toBeUndefined();
    expect(marked.sort()).toEqual([BASE, COPY].sort());
  });

  it("unarchive removes the key from every draft and keeps the index body", async () => {
    await setStoryArchived(app.asApp(), PROJECTS, PROJECTS[0], true);
    await setStoryArchived(app.asApp(), PROJECTS, PROJECTS[0], false);
    expect(archivedFlag(app, BASE)).toBeUndefined();
    expect(archivedFlag(app, COPY)).toBeUndefined();
    expect(app.vault.raw(BASE)).toContain("Body of Novel / First.");
  });

  it("never writes a scene file", async () => {
    await setStoryArchived(app.asApp(), PROJECTS, PROJECTS[0], true);
    expect(app.vault.raw(SCENE)).toBe(SCENE_TEXT);
  });

  it("a series archive writes every draft of every book", async () => {
    const series: Series = { name: "Saga", books: [PROJECTS[0], PROJECTS[2]] };
    const ok = await setSeriesArchived(app.asApp(), PROJECTS, series, true);
    expect(ok).toBe(true);
    for (const p of [BASE, COPY, OTHER]) expect(archivedFlag(app, p)).toBe(true);
  });
});
