import { afterEach, describe, expect, it } from "vitest";
import { isMessageKey, setLocale } from "../src/i18n";
import {
  BEAT_TEMPLATES,
  TEMPLATE_META,
  beatBlurb,
  beatName,
  templateLabel,
} from "../src/outliner/beat-templates";

// Built-in beat names/blurbs are English DATA (scaffolded scene titles and
// synopses, the story bible); the UI shows catalog translations. In English the
// two must be identical, and every built-in beat must have its catalog entry.
describe("built-in beat display text", () => {
  afterEach(() => setLocale("en"));

  it("every built-in beat has a catalog name, and blurbs where the data has one", () => {
    for (const [id, beats] of Object.entries(BEAT_TEMPLATES)) {
      for (const b of beats) {
        expect(isMessageKey(`beats.tpl.${id}.${b.id}.name`), `${id}/${b.id} name`).toBe(true);
        expect(isMessageKey(`beats.tpl.${id}.${b.id}.blurb`), `${id}/${b.id} blurb`).toBe(b.blurb !== "");
      }
    }
  });

  it("English display text equals the stored data", () => {
    for (const [id, beats] of Object.entries(BEAT_TEMPLATES)) {
      for (const b of beats) {
        expect(beatName(id, b)).toBe(b.name);
        expect(beatBlurb(id, b)).toBe(b.blurb);
      }
    }
    for (const m of TEMPLATE_META) expect(templateLabel(m)).toBe(m.label);
  });

  it("translates built-ins only; custom and synthesized beats show as stored", () => {
    setLocale("qps");
    const cat = BEAT_TEMPLATES["save-the-cat"][0];
    expect(beatName("save-the-cat", cat)).toMatch(/^⟦.*⟧$/);
    expect(beatName(undefined, cat)).toMatch(/^⟦.*⟧$/); // no sheet yet = default template
    const custom = { id: "opening-image", name: "My opener", blurb: "Mine", position: 0 };
    expect(beatName("my-template", custom)).toBe("My opener");
    expect(beatBlurb("my-template", custom)).toBe("Mine");
    expect(templateLabel({ id: "my-template", label: "Mine (3)" })).toBe("Mine (3)");
  });
});
