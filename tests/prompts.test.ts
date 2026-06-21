import { describe, expect, it } from "vitest";
import {
  PROMPT_CATEGORIES,
  WRITING_PROMPTS,
  pickPrompt,
} from "../src/ideation/prompts";

const byPhase = (phase: "draft" | "revise") =>
  WRITING_PROMPTS.filter((p) => p.phase === phase);

describe("prompt bank", () => {
  it("has roughly 50 prompts per phase", () => {
    expect(byPhase("draft").length).toBeGreaterThanOrEqual(50);
    expect(byPhase("revise").length).toBeGreaterThanOrEqual(50);
  });

  it("only uses declared categories", () => {
    const ids = new Set(PROMPT_CATEGORIES.map((c) => c.id));
    for (const p of WRITING_PROMPTS) expect(ids.has(p.category)).toBe(true);
  });

  it("has no duplicate prompt texts", () => {
    const seen = new Set(WRITING_PROMPTS.map((p) => p.text));
    expect(seen.size).toBe(WRITING_PROMPTS.length);
  });
});

describe("pickPrompt", () => {
  const first = () => 0; // deterministic: always the first candidate

  it("filters by phase", () => {
    expect(pickPrompt({ phase: "draft" }, first)!.prompt.phase).toBe("draft");
    expect(pickPrompt({ phase: "revise" }, first)!.prompt.phase).toBe("revise");
  });

  it("filters by category", () => {
    const r = pickPrompt({ phase: "draft", category: "dialogue" }, first)!;
    expect(r.prompt.category).toBe("dialogue");
  });

  it("substitutes {pov} when a POV is given", () => {
    // Find a {pov} prompt and force it via category + phase + rng.
    const povPrompt = WRITING_PROMPTS.find((p) => /\{pov\}/.test(p.text))!;
    const r = pickPrompt(
      { phase: povPrompt.phase, category: povPrompt.category, pov: "Anna" },
      first
    )!;
    expect(r.text).not.toMatch(/\{pov\}/);
  });

  it("never shows a raw {pov} token when POV is unknown", () => {
    for (let i = 0; i < 50; i++) {
      const r = pickPrompt({ phase: "draft" }, () => i / 50);
      if (r) expect(r.text).not.toMatch(/\{pov\}/);
      const rev = pickPrompt({ phase: "revise" }, () => i / 50);
      if (rev) expect(rev.text).not.toMatch(/\{pov\}/);
    }
  });

  it("avoids repeating the excluded prompt", () => {
    const a = pickPrompt({ phase: "draft" }, first)!;
    const b = pickPrompt({ phase: "draft", exclude: a.text }, first)!;
    expect(b.text).not.toBe(a.text);
  });

  it("returns null when nothing matches", () => {
    // A category whose only members are {pov} prompts, with no POV context.
    // (pov category in revise: 'Look at what {pov}…' and 'Cut anything {pov}…')
    const povOnly = pickPrompt({ phase: "revise", category: "pov" }, first);
    // If the pov category is entirely {pov}-token prompts, this is null.
    const hasNonToken = WRITING_PROMPTS.some(
      (p) => p.phase === "revise" && p.category === "pov" && !/\{pov\}/.test(p.text)
    );
    if (!hasNonToken) expect(povOnly).toBeNull();
  });
});
