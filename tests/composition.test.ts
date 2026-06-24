import { describe, expect, it } from "vitest";
import { classifyParagraph, compositionProfile } from "../src/insight/composition";

describe("classifyParagraph", () => {
  it("detects dialogue from a quoted span", () => {
    expect(classifyParagraph('"We have to go," she said.')).toBe("dialogue");
    expect(classifyParagraph("He said, “not yet.”")).toBe("dialogue");
  });

  it("detects interiority from cue words or leading italics", () => {
    expect(classifyParagraph("She wondered if it had ever been about the case.")).toBe(
      "interiority"
    );
    expect(classifyParagraph("*Not again.*")).toBe("interiority");
  });

  it("classifies plain description AND action as narration (honest merge)", () => {
    expect(classifyParagraph("The harbor lay grey under a thin cold light.")).toBe("narration");
    expect(classifyParagraph("She slammed the door and ran for the stairs.")).toBe("narration");
  });
});

describe("compositionProfile", () => {
  const text = [
    "The lamp guttered in the window.", // narration
    '"Who is there?" she called.', // dialogue
    "He wondered whether the light remembered him.", // interiority
    "Rain streaked the glass.", // narration
  ].join("\n\n");

  it("counts paragraphs and computes ratios", () => {
    const p = compositionProfile(text);
    expect(p.paragraphs).toBe(4);
    expect(p.counts).toEqual({ dialogue: 1, interiority: 1, narration: 2 });
    expect(p.ratios.narration).toBeCloseTo(0.5);
  });

  it("buckets into four quartiles", () => {
    const p = compositionProfile(text);
    expect(p.byQuartile).toHaveLength(4);
    const totalAcrossBuckets = p.byQuartile.reduce(
      (n, b) => n + b.dialogue + b.interiority + b.narration,
      0
    );
    expect(totalAcrossBuckets).toBe(4);
  });

  it("flags an all-narration opening", () => {
    const narr = Array(8).fill("Grey light filled the empty room.").join("\n\n");
    const p = compositionProfile(narr);
    expect(p.flags.some((f) => f.includes("narration"))).toBe(true);
    expect(p.flags.some((f) => f.includes("No dialogue"))).toBe(true);
  });

  it("returns zeroed profile for empty text", () => {
    const p = compositionProfile("   ");
    expect(p.paragraphs).toBe(0);
    expect(p.ratios).toEqual({ dialogue: 0, interiority: 0, narration: 0 });
    expect(p.flags).toEqual([]);
  });
});
