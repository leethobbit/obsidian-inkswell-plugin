import { describe, expect, it } from "vitest";
import { assembleManuscript } from "../src/compile/assemble";
import { BUILTIN_STEPS, STEP_REGISTRY } from "../src/compile/steps";
import { CompileConfig, CompileScene } from "../src/compile/types";

const scenes: CompileScene[] = [
  { title: "Opening", indent: 0, contents: "---\nx: 1\n---\nThe storm broke. %% fix later %%" },
  { title: "Aftermath", indent: 0, contents: "Calm returned." },
];

function config(overrides: Partial<CompileConfig> = {}): CompileConfig {
  return {
    sceneSteps: [
      { id: "strip-frontmatter", options: {} },
      { id: "remove-comments", options: {} },
      { id: "prepend-title", options: { level: 1 } },
    ],
    manuscriptSteps: [{ id: "trim-blank-lines", options: {} }],
    separator: "\n\n",
    targetBasename: "manuscript",
    format: "md",
    ...overrides,
  };
}

describe("assembleManuscript", () => {
  it("runs scene steps, joins, then manuscript steps in order", () => {
    const out = assembleManuscript(scenes, config());
    expect(out).toBe(
      "# Opening\n\nThe storm broke.\n\n# Aftermath\n\nCalm returned.\n"
    );
  });

  it("respects the configured heading level", () => {
    const out = assembleManuscript(scenes, config(), undefined);
    expect(out.startsWith("# Opening")).toBe(true);
    const h3 = assembleManuscript(
      scenes,
      config({
        sceneSteps: [{ id: "prepend-title", options: { level: 3 } }],
        manuscriptSteps: [],
      })
    );
    expect(h3.startsWith("### Opening")).toBe(true);
  });

  it("uses the configured separator", () => {
    const out = assembleManuscript(
      [
        { title: "A", indent: 0, contents: "one" },
        { title: "B", indent: 0, contents: "two" },
      ],
      config({ sceneSteps: [], manuscriptSteps: [], separator: "\n---\n" })
    );
    expect(out).toBe("one\n---\ntwo");
  });

  it("groups scenes into chapters with a heading and scene breaks", () => {
    const chapScenes: CompileScene[] = [
      { title: "s1", indent: 0, contents: "Opening beat.", chapter: "One" },
      { title: "s2", indent: 0, contents: "Second beat.", chapter: "One" },
      { title: "s3", indent: 0, contents: "New chapter.", chapter: "Two" },
    ];
    const out = assembleManuscript(
      chapScenes,
      config({
        sceneSteps: [{ id: "group-by-chapter", options: { level: 1, sceneBreak: "* * *" } }],
        manuscriptSteps: [],
        separator: "\n\n",
      })
    );
    expect(out).toBe(
      "# One\n\nOpening beat.\n\n* * *\n\nSecond beat.\n\n# Two\n\nNew chapter."
    );
  });

  it("passes chapterless scenes through group-by-chapter unheaded", () => {
    const out = assembleManuscript(
      [
        { title: "a", indent: 0, contents: "one" },
        { title: "b", indent: 0, contents: "two" },
      ],
      config({
        sceneSteps: [{ id: "group-by-chapter", options: {} }],
        manuscriptSteps: [],
        separator: "\n\n",
      })
    );
    expect(out).toBe("one\n\ntwo");
  });

  it("removes drafting markers via the remove-todos step", () => {
    const out = assembleManuscript(
      [
        { title: "A", indent: 0, contents: "He paused [NOTE: check this] then left." },
        { title: "B", indent: 0, contents: "[TODO: open] and [SCENE: the duel] follow." },
      ],
      config({
        sceneSteps: [{ id: "remove-todos", options: {} }],
        manuscriptSteps: [],
        separator: "\n\n",
      })
    );
    expect(out).not.toMatch(/\[(TODO|NOTE|SCENE)/);
    expect(out).toContain("He paused");
    expect(out).toContain("then left.");
  });

  it("throws on an unknown step id", () => {
    expect(() =>
      assembleManuscript(scenes, config({ sceneSteps: [{ id: "nope", options: {} }] }))
    ).toThrow(/Unknown compile step/);
  });

  it("throws when a step is used in the wrong stage", () => {
    expect(() =>
      assembleManuscript(
        scenes,
        config({ manuscriptSteps: [{ id: "prepend-title", options: {} }] })
      )
    ).toThrow(/not a manuscript step/);
  });
});

// Wikilink removal is unconditional — it runs regardless of sceneSteps/manuscriptSteps,
// So these cases use an empty config to isolate it.
describe("wikilink removal (unconditional manuscript transform)", () => {
  const bare = (overrides: Partial<CompileConfig> = {}) =>
    config({ sceneSteps: [], manuscriptSteps: [], ...overrides });

  it("resolves a plain wikilink to its target text", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "Inspector [[Inspector Coll]] frowned." }],
      bare()
    );
    expect(out).toBe("Inspector Inspector Coll frowned.");
  });

  it("resolves an aliased wikilink to the alias, dropping the target and pipe", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "She read [[The Undercroft Archive|the Archive]]." }],
      bare()
    );
    expect(out).toBe("She read the Archive.");
  });

  it("drops the heading fragment from a heading-reference wikilink", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "Once in [[The Lattice#Origins]]." }],
      bare()
    );
    expect(out).toBe("Once in The Lattice.");
    expect(out).not.toMatch(/[[\]#]/);
  });

  it("prefers the alias over the heading fragment when both are present", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "[[Target#Heading|Alias]] led the way." }],
      bare()
    );
    expect(out).toBe("Alias led the way.");
  });

  it("removes an embedded wikilink entirely, including the leading !", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "Before.\n![[Location.png]]\nAfter." }],
      bare()
    );
    expect(out).toBe("Before.\n\nAfter.");
    expect(out).not.toContain("!");
  });

  it("leaves a scene with no wikilinks unchanged", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "Plain prose, nothing to resolve." }],
      bare()
    );
    expect(out).toBe("Plain prose, nothing to resolve.");
  });

  it("passes markdown-style characters in a wikilink target through unreinterpreted", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "[[Chapter *One*]] begins." }],
      bare()
    );
    expect(out).toBe("Chapter *One* begins.");
  });

  it("resolves adjacent wikilinks independently", () => {
    const out = assembleManuscript([{ title: "A", indent: 0, contents: "[[A]][[B]]" }], bare());
    expect(out).toBe("AB");
  });

  it("leaves a malformed, unclosed wikilink untouched", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "A stray [[Foo marker with no close." }],
      bare()
    );
    expect(out).toBe("A stray [[Foo marker with no close.");
  });

  it("resolves a wikilink but leaves a standard markdown link untouched", () => {
    const out = assembleManuscript(
      [
        {
          title: "A",
          indent: 0,
          contents: "See [[Character]] and [a link](https://example.com).",
        },
      ],
      bare()
    );
    expect(out).toBe("See Character and [a link](https://example.com).");
  });

  it("is not registered as a configurable step", () => {
    // BUILTIN_STEPS is exactly what src/views/compile-panel.ts filters to build
    // its checkbox list — asserting against it proves the step is absent from
    // the configurable list itself, not just from the registry derived from it.
    expect(BUILTIN_STEPS.some((s) => s.id === "strip-wikilinks")).toBe(false);
    // A registry entry with no BUILTIN_STEPS entry would still make the step
    // referenceable by id in a hand-edited config, so guard that too.
    expect(STEP_REGISTRY.has("strip-wikilinks")).toBe(false);
  });

  it("still runs no matter what the configured sceneSteps/manuscriptSteps contain", () => {
    // A config's sceneSteps/manuscriptSteps can never reference "strip-wikilinks"
    // (it's not in the registry — see the test above), so every config, empty
    // or fully populated with unrelated steps, is equally "legacy" with respect
    // to this cleanup. Prove it strips wikilinks both with no configured steps
    // at all AND alongside a full, normal set of other enabled steps.
    const wikilinkScene: CompileScene = {
      title: "A",
      indent: 0,
      contents: "Read [[Inspector Coll]]'s file.",
    };

    const withNoSteps = assembleManuscript(
      [wikilinkScene],
      config({ sceneSteps: [], manuscriptSteps: [] })
    );
    expect(withNoSteps).toBe("Read Inspector Coll's file.");

    const withFullDefaultConfig = assembleManuscript([wikilinkScene], config());
    expect(withFullDefaultConfig).toContain("Read Inspector Coll's file.");
    expect(withFullDefaultConfig).not.toMatch(/\[\[|\]\]/);
  });
});
