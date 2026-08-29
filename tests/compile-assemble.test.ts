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

describe("flatten-links step", () => {
  const only = (contents: string) =>
    assembleManuscript(
      [{ title: "A", indent: 0, contents }],
      config({ sceneSteps: [{ id: "flatten-links", options: {} }], manuscriptSteps: [] })
    );

  it("is registered as a configurable scene step, after the cleanup steps", () => {
    const ids = BUILTIN_STEPS.map((s) => s.id);
    expect(STEP_REGISTRY.get("flatten-links")?.kind).toBe("scene");
    expect(ids.indexOf("flatten-links")).toBeGreaterThan(ids.indexOf("remove-todos"));
    expect(ids.indexOf("flatten-links")).toBeLessThan(ids.indexOf("prepend-title"));
  });

  it("resolves wikilinks to their display text (the #32 report)", () => {
    expect(only("how she'd tell her [[Beatrice|sister]].")).toBe("how she'd tell her sister.");
    expect(only("Inspector [[Coll]] frowned.")).toBe("Inspector Coll frowned.");
    expect(only("Once in [[The Lattice#Origins]].")).toBe("Once in The Lattice.");
    expect(only("[[Target#Heading|Alias]] led.")).toBe("Alias led.");
    expect(only("See [[#Origins]] and [[#^ab12]].")).toBe("See Origins and ab12.");
    expect(only("[[A]][[B]]")).toBe("AB");
  });

  it("flattens inline markdown links to their text but leaves images alone", () => {
    expect(only("Read [the archive](https://example.com/a \"Archive\").")).toBe(
      "Read the archive."
    );
    expect(only("See [notes](<My Notes.md>) and [x](a_(b).md).")).toBe("See notes and x.");
    expect(only("![A map](maps/city.png) stays.")).toBe("![A map](maps/city.png) stays.");
    expect(only("[text][ref] stays.")).toBe("[text][ref] stays."); // reference links: out of scope
    expect(only("<https://example.com> stays.")).toBe("<https://example.com> stays.");
  });

  it("turns image embeds into markdown images and drops note embeds", () => {
    expect(only("![[map.png]]")).toBe("![](map.png)");
    expect(only("![[Old Map.PNG|The old city]]")).toBe("![The old city](<Old Map.PNG>)");
    expect(only("![[map.png|300]] and ![[m.jpg|300x200]]")).toBe("![](map.png) and ![](m.jpg)");
    expect(only("Before.\n![[Other Scene]]\nAfter.")).toBe("Before.\n\nAfter.");
    expect(only("![[Other Scene#Part|alias]] ![[paper.pdf]]")).toBe(" ");
  });

  it("leaves malformed or non-link brackets alone", () => {
    expect(only("A stray [[Foo marker.")).toBe("A stray [[Foo marker.");
    expect(only("[TODO: fix] and [sic] stay.")).toBe("[TODO: fix] and [sic] stay.");
    expect(only("Chapter [[*One*]] begins.")).toBe("Chapter *One* begins.");
  });

  it("runs before trim-blank-lines so a dropped embed leaves no extra gap", () => {
    const out = assembleManuscript(
      [{ title: "A", indent: 0, contents: "Before.\n\n![[Other Scene]]\n\nAfter.\n" }],
      config({
        sceneSteps: [{ id: "flatten-links", options: {} }],
        manuscriptSteps: [{ id: "trim-blank-lines", options: {} }],
      })
    );
    expect(out).toBe("Before.\n\nAfter.\n");
  });
});
