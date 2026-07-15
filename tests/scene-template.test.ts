import { describe, expect, it } from "vitest";
import {
  SCENE_TEMPLATE_BASENAME,
  sceneTemplateCandidates,
  starterSceneTemplate,
} from "../src/scenes/scene-template";
import { applyTemplateVars } from "../src/lib/template";

const settings = { baseFolder: "Writing", codexFolder: "Codex", coLocateCodex: true };

describe("sceneTemplateCandidates", () => {
  it("falls back to the shared Templates/Scene.md when the project sets nothing", () => {
    expect(sceneTemplateCandidates(settings, null)).toEqual(["Writing/Templates/Scene.md"]);
    expect(sceneTemplateCandidates(settings, "")).toEqual(["Writing/Templates/Scene.md"]);
  });

  it("puts the project's own sceneTemplate first, tolerating a missing .md", () => {
    expect(sceneTemplateCandidates(settings, "Notes/My Scene")).toEqual([
      "Notes/My Scene",
      "Notes/My Scene.md",
      "Writing/Templates/Scene.md",
    ]);
    expect(sceneTemplateCandidates(settings, "Notes/My Scene.md")).toEqual([
      "Notes/My Scene.md",
      "Writing/Templates/Scene.md",
    ]);
  });

  it("handles a blank base folder (vault root)", () => {
    expect(sceneTemplateCandidates({ ...settings, baseFolder: "" }, null)).toEqual([
      `Templates/${SCENE_TEMPLATE_BASENAME}.md`,
    ]);
  });
});

describe("starterSceneTemplate", () => {
  it("is a comment-only scaffold with no frontmatter of its own", () => {
    const s = starterSceneTemplate();
    expect(s.startsWith("%%")).toBe(true);
    expect(s).not.toMatch(/^---/m); // no frontmatter — new scenes stay minimal
  });

  it("substitutes {{title}} when applied (matching the codex starter's behavior)", () => {
    const s = applyTemplateVars(starterSceneTemplate(), { title: "Opening" });
    expect(s).not.toMatch(/\{\{\s*title\s*\}\}/i);
    expect(applyTemplateVars("# {{ Title }}", { title: "Opening" })).toBe("# Opening");
  });
});
