import { describe, expect, it } from "vitest";
import { applyStepToggle, resolveCompileConfig } from "../src/compile/config";
import { CompileConfig, DEFAULT_COMPILE_CONFIG } from "../src/compile/types";
import { Project } from "../src/projects/types";

/** Minimal Project stub — resolveCompileConfig only reads `inkswell.compile`. */
function project(compile?: unknown): Project {
  return { inkswell: compile ? { compile } : {} } as unknown as Project;
}

describe("resolveCompileConfig", () => {
  it("returns an equal but CLONED config when one is saved", () => {
    const saved = {
      sceneSteps: [{ id: "strip-frontmatter", options: {} }],
      manuscriptSteps: [],
      separator: "\n\n",
      targetBasename: "my-book",
      format: "html",
    };
    const resolved = resolveCompileConfig(project(saved));
    expect(resolved).toEqual(saved);
    // Never the same object: `saved` is the ProjectStore's shared cached parse,
    // and the compile panel mutates the resolved config in place. Returning the
    // cache by reference corrupted it (UI showed unsaved changes as applied).
    expect(resolved).not.toBe(saved);
    resolved.separator = "***";
    resolved.sceneSteps[0].options["x"] = true;
    expect(saved.separator).toBe("\n\n");
    expect(saved.sceneSteps[0].options).toEqual({});
  });

  it("saved format wins over the fallback", () => {
    const saved = {
      sceneSteps: [],
      manuscriptSteps: [],
      separator: "\n\n",
      targetBasename: "x",
      format: "md",
    };
    expect(resolveCompileConfig(project(saved), "pandoc").format).toBe("md");
  });

  it("falls back to a default seeded with the given format", () => {
    const config = resolveCompileConfig(project(), "html");
    expect(config.format).toBe("html");
    expect(config.sceneSteps).toEqual(DEFAULT_COMPILE_CONFIG.sceneSteps);
    expect(config.targetBasename).toBe(DEFAULT_COMPILE_CONFIG.targetBasename);
  });

  it("defaults to md when no fallback is given", () => {
    expect(resolveCompileConfig(project()).format).toBe("md");
  });

  it("seeds pandoc options when the fallback format is pandoc", () => {
    const config = resolveCompileConfig(project(), "pandoc");
    expect(config.format).toBe("pandoc");
    expect(config.pandoc).toEqual({ to: "docx", extension: "docx", extraArgs: [] });
  });

  it("returns a fresh default object each call (no shared mutation)", () => {
    const a = resolveCompileConfig(project());
    const b = resolveCompileConfig(project());
    expect(a).not.toBe(b);
    a.targetBasename = "mutated";
    expect(b.targetBasename).toBe(DEFAULT_COMPILE_CONFIG.targetBasename);
  });

  it("ignores a malformed saved config (no sceneSteps array)", () => {
    const config = resolveCompileConfig(project({ format: "html" }), "md");
    expect(config.sceneSteps).toEqual(DEFAULT_COMPILE_CONFIG.sceneSteps);
    expect(config.format).toBe("md");
  });
});

describe("applyStepToggle", () => {
  const SCENE_IDS = [
    "strip-frontmatter",
    "remove-comments",
    "remove-todos",
    "prepend-title",
    "group-by-chapter",
  ] as const;
  const DEFAULTS = { sceneHeadingLevel: 2 };

  function cfg(stepIds: string[]): CompileConfig {
    return {
      sceneSteps: stepIds.map((id) => ({ id, options: {} })),
      manuscriptSteps: [],
      separator: "\n\n",
      targetBasename: "manuscript",
      format: "md",
    };
  }

  it("enables a step in registry order and seeds heading defaults", () => {
    const c = cfg(["remove-todos"]);
    applyStepToggle(c, "sceneSteps", SCENE_IDS, "prepend-title", true, DEFAULTS);
    expect(c.sceneSteps.map((s) => s.id)).toEqual(["remove-todos", "prepend-title"]);
    expect(c.sceneSteps[1].options).toEqual({ level: 2 });
  });

  it("heading steps are mutually exclusive — enabling one disables the other", () => {
    const c = cfg(["strip-frontmatter", "prepend-title"]);
    applyStepToggle(c, "sceneSteps", SCENE_IDS, "group-by-chapter", true, DEFAULTS);
    expect(c.sceneSteps.map((s) => s.id)).toEqual(["strip-frontmatter", "group-by-chapter"]);
    expect(c.sceneSteps[1].options).toEqual({ level: 2, sceneBreak: "* * *" });
  });

  it("two toggles applied to the SAME current config compose (the delta contract)", () => {
    const c = cfg(["strip-frontmatter"]);
    applyStepToggle(c, "sceneSteps", SCENE_IDS, "remove-comments", true, DEFAULTS);
    applyStepToggle(c, "sceneSteps", SCENE_IDS, "remove-todos", true, DEFAULTS);
    expect(c.sceneSteps.map((s) => s.id)).toEqual([
      "strip-frontmatter",
      "remove-comments",
      "remove-todos",
    ]);
  });

  it("disabling preserves the other steps' existing options", () => {
    const c = cfg(["strip-frontmatter", "prepend-title"]);
    c.sceneSteps[1].options = { level: 4 };
    applyStepToggle(c, "sceneSteps", SCENE_IDS, "strip-frontmatter", false, DEFAULTS);
    expect(c.sceneSteps).toEqual([{ id: "prepend-title", options: { level: 4 } }]);
  });
});
