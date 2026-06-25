import { describe, expect, it } from "vitest";
import { assembleManuscript } from "../src/compile/assemble";
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
