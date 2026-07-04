import { describe, expect, it } from "vitest";
import { resolveCompileConfig } from "../src/compile/config";
import { DEFAULT_COMPILE_CONFIG } from "../src/compile/types";
import { Project } from "../src/projects/types";

/** Minimal Project stub — resolveCompileConfig only reads `inkswell.compile`. */
function project(compile?: unknown): Project {
  return { inkswell: compile ? { compile } : {} } as unknown as Project;
}

describe("resolveCompileConfig", () => {
  it("returns the saved config verbatim when present", () => {
    const saved = {
      sceneSteps: [{ id: "strip-frontmatter", options: {} }],
      manuscriptSteps: [],
      separator: "\n\n",
      targetBasename: "my-book",
      format: "html",
    };
    expect(resolveCompileConfig(project(saved))).toBe(saved);
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
