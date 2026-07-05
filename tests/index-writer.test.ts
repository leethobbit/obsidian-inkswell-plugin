/**
 * THE data-safety invariant suite (AGENTS.md gotcha #3): every index-writer
 * operation may rewrite ONLY the index note's frontmatter. Scene file contents
 * must be byte-identical afterwards, the index body must be byte-identical,
 * and the Longform nested-array scene encoding must round-trip.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  persistDraft,
  persistInkswellData,
  persistOverview,
  persistPublishing,
  persistStructure,
  updateScenes,
  writeSeries,
} from "../src/projects/index-writer";
import { parseDraft, parseScenes } from "../src/projects/draft-serialization";
import { Draft } from "../src/projects/types";
import { FakeApp } from "./fakes/fake-app";

const INDEX_PATH = "Books/My Novel/My Novel.md";

const INDEX = `---
longform:
  format: scenes
  title: My Novel
  sceneFolder: Scenes
  scenes:
    - Alpha
    - - Beta
      - Gamma
  ignoredFiles:
    - Notes
inkswell:
  overview:
    logline: A tale of trust.
    theme: Trust
  publishing:
    metadata:
      isbn: "978-0000000000"
---
# My Novel

Index body prose — planning notes the writer typed by hand.
It must survive every frontmatter write untouched.
`;

// Deliberately hostile bodies: own frontmatter, trailing spaces, tabs, unicode,
// CRLF line endings, and a missing trailing newline.
const SCENES: Record<string, string> = {
  "Books/My Novel/Scenes/Alpha.md": `---
status: draft
pov: Mara
---
The lamplighter came at dusk.
\tIndented with a tab — and an em-dash… “curly quotes” too.
No trailing newline here`,
  "Books/My Novel/Scenes/Beta.md":
    "---\r\nstatus: written\r\n---\r\nCRLF prose line one.\r\nCRLF prose line two.\r\n",
  "Books/My Novel/Scenes/Gamma.md": `Plain body, no frontmatter at all.

[TODO: fix pacing] and a %%comment%%.
`,
};

function seededApp(): FakeApp {
  return new FakeApp({ [INDEX_PATH]: INDEX, ...SCENES });
}

function draftOf(app: FakeApp): Draft {
  const fm = app.metadataCache.getFileCache(app.file(INDEX_PATH) as never)?.frontmatter;
  const draft = parseDraft(fm?.["longform"], "My Novel");
  if (!draft) throw new Error("seed index did not parse");
  return draft;
}

function indexFm(app: FakeApp): Record<string, unknown> {
  const fm = app.metadataCache.getFileCache(app.file(INDEX_PATH) as never)?.frontmatter;
  if (!fm) throw new Error("index lost its frontmatter");
  return fm;
}

function indexBody(app: FakeApp): string {
  const raw = app.vault.raw(INDEX_PATH) ?? "";
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return m ? raw.slice(m[0].length) : raw;
}

describe("index-writer invariants", () => {
  let app: FakeApp;
  let sceneBytesBefore: Record<string, string>;
  let indexBodyBefore: string;

  beforeEach(() => {
    app = seededApp();
    sceneBytesBefore = Object.fromEntries(
      Object.keys(SCENES).map((p) => [p, app.vault.raw(p) as string])
    );
    indexBodyBefore = indexBody(app);
  });

  function assertNothingElseChanged(): void {
    for (const [path, before] of Object.entries(sceneBytesBefore)) {
      expect(app.vault.raw(path), `scene body changed: ${path}`).toBe(before);
    }
    expect(indexBody(app), "index BODY changed (only frontmatter may change)").toBe(
      indexBodyBefore
    );
  }

  it("updateScenes reorders/indents in frontmatter only, preserving the nested encoding", async () => {
    const draft = draftOf(app);
    await updateScenes(app.asApp(), app.file(INDEX_PATH), draft, (scenes) => {
      // Gamma promoted to top level and moved first; Beta stays nested under Alpha.
      return [
        { title: "Gamma", indent: 0 },
        { title: "Alpha", indent: 0 },
        { title: "Beta", indent: 1 },
      ];
    });

    assertNothingElseChanged();

    const lf = indexFm(app)["longform"] as Record<string, unknown>;
    // Nested-array encoding (Longform compat): indent-1 scenes nest in arrays.
    expect(lf["scenes"]).toEqual(["Gamma", "Alpha", ["Beta"]]);
    expect(parseScenes(lf["scenes"])).toEqual([
      { title: "Gamma", indent: 0 },
      { title: "Alpha", indent: 0 },
      { title: "Beta", indent: 1 },
    ]);
    // Field-presence rules survive the rewrite.
    expect(lf["title"]).toBe("My Novel");
    expect(lf["sceneFolder"]).toBe("Scenes");
    expect(lf["ignoredFiles"]).toEqual(["Notes"]);
    // Sibling inkswell data untouched.
    const inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect((inkswell["overview"] as Record<string, unknown>)["theme"]).toBe("Trust");
  });

  it("persistDraft round-trips a draft through frontmatter losslessly", async () => {
    const draft = draftOf(app);
    await persistDraft(app.asApp(), app.file(INDEX_PATH), draft);
    assertNothingElseChanged();
    expect(draftOf(app)).toEqual(draft);
  });

  it("persistInkswellData merges top-level keys without touching longform", async () => {
    const before = draftOf(app);
    await persistInkswellData(app.asApp(), app.file(INDEX_PATH), {
      arcTracked: ["[[Mara]]"],
    });
    assertNothingElseChanged();
    expect(draftOf(app)).toEqual(before);
    const inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect(inkswell["arcTracked"]).toEqual(["[[Mara]]"]);
    // Shallow-merge preserved the existing sub-objects.
    expect((inkswell["overview"] as Record<string, unknown>)["logline"]).toBe(
      "A tale of trust."
    );
  });

  it("persistOverview patches one field without clobbering overview siblings", async () => {
    await persistOverview(app.asApp(), app.file(INDEX_PATH), { logline: "New logline." });
    assertNothingElseChanged();
    const overview = (indexFm(app)["inkswell"] as Record<string, unknown>)[
      "overview"
    ] as Record<string, unknown>;
    expect(overview).toEqual({ logline: "New logline.", theme: "Trust" });
  });

  it("persistOverview drops cleared fields instead of writing empties", async () => {
    await persistOverview(app.asApp(), app.file(INDEX_PATH), { theme: "" });
    assertNothingElseChanged();
    const overview = (indexFm(app)["inkswell"] as Record<string, unknown>)[
      "overview"
    ] as Record<string, unknown>;
    expect(overview).toEqual({ logline: "A tale of trust." });
  });

  it("persistPublishing read-merge-writes nested publishing data", async () => {
    await persistPublishing(app.asApp(), app.file(INDEX_PATH), (pub) => {
      pub["budget"] = [{ item: "Cover", cost: 300 }];
    });
    assertNothingElseChanged();
    const publishing = (indexFm(app)["inkswell"] as Record<string, unknown>)[
      "publishing"
    ] as Record<string, unknown>;
    expect(publishing["budget"]).toEqual([{ item: "Cover", cost: 300 }]);
    // The pre-existing nested metadata survived the mutation.
    expect(publishing["metadata"]).toEqual({ isbn: "978-0000000000" });
  });

  it("persistStructure writes chapters; an empty array deletes the key", async () => {
    await persistStructure(app.asApp(), app.file(INDEX_PATH), "chapter", [
      { id: "c1", title: "One", targetWords: 4000 },
    ]);
    assertNothingElseChanged();
    let inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect(inkswell["chapters"]).toEqual([{ id: "c1", title: "One", targetWords: 4000 }]);

    await persistStructure(app.asApp(), app.file(INDEX_PATH), "chapter", []);
    inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect("chapters" in inkswell).toBe(false);
  });

  it("writeSeries sets and clears series membership", async () => {
    await writeSeries(app.asApp(), app.file(INDEX_PATH), { name: "The Cycle", order: 2 });
    assertNothingElseChanged();
    let inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect(inkswell["series"]).toEqual({ name: "The Cycle", order: 2 });

    await writeSeries(app.asApp(), app.file(INDEX_PATH), null);
    inkswell = indexFm(app)["inkswell"] as Record<string, unknown>;
    expect("series" in inkswell).toBe(false);
  });

  it("survives a burst of mixed writes with every body still byte-identical", async () => {
    const draft = draftOf(app);
    await Promise.all([
      updateScenes(app.asApp(), app.file(INDEX_PATH), draft, (s) => [...s].reverse()),
      persistOverview(app.asApp(), app.file(INDEX_PATH), { genre: "Fantasy" }),
      writeSeries(app.asApp(), app.file(INDEX_PATH), { name: "The Cycle" }),
    ]);
    await persistInkswellData(app.asApp(), app.file(INDEX_PATH), {
      draftCreated: "2026-07-04T00:00:00Z",
    });
    assertNothingElseChanged();
    // The index still parses as a valid Longform draft.
    expect(draftOf(app).format).toBe("scenes");
  });
});
