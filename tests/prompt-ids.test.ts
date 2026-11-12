import { afterEach, describe, expect, it } from "vitest";
import { en } from "../src/i18n/locales/en";
import { setLocale } from "../src/i18n";
import { PROMPT_CATEGORIES, WRITING_PROMPTS, pickPrompt, promptId, writingPrompts } from "../src/ideation/prompts";

/**
 * Users hide, rename and re-file shipped prompts BY ID (settings.listOverrides.prompts),
 * so the shipped id set is frozen. An id is a hash of the English source text: rewording
 * a prompt in PROMPT_ROWS changes it unless the old id is set explicitly. Adding a
 * prompt is fine (append its id here); removing or re-hashing one is not.
 */
const SHIPPED_PROMPT_IDS = [
  "pa1ce5a44", "p34eeca7a", "p09f10bb9", "pf7142b9d", "p12e0c5b0", "p931f7fd1", "p4b1b188d", "p5aa3cbe0",
  "p8c2b5956", "p6cb04fe9", "pbd3c42b3", "p9ef6bae5", "p5b4bbfbd", "p63507e8d", "pb8f8be68", "pacf99461",
  "peb7523b5", "p585664bd", "pd595cffa", "p975cdf8e", "p4bfd2149", "p38070bb2", "p295eaf5a", "p39e31801",
  "p4c2f6f43", "p96f15275", "pda9aaae2", "pdf70f708", "p9e54c45f", "pcb07ec32", "p0e1de154", "p5b52d94d",
  "pe26a4c5a", "p537f4789", "p2eb14a8f", "pf9984434", "pc0b31dd9", "p95b2251d", "pb45ba567", "pb752c279",
  "p44b7a72d", "p326d4150", "pd8eaed0f", "p17fc6518", "pe7523d2f", "p7111cd62", "p505b8eab", "pa1dd693b",
  "p702b1081", "p845ec124", "pc5a6c857", "pe86316f6", "p57446f8c", "p212bdc74", "p73ea9eef", "p761f1ae5",
  "peda9bbaf", "pa259ae07", "pca51bc7f", "p0067960d", "p9040f5e6", "p98728a00", "p7950dad6", "p9a48f537",
  "pa734bcee", "p7838eb94", "p03e27051", "p5e28f8ed", "p70b28f1d", "p986af946", "pbef48f54", "pef69da2b",
  "p3b1f43f6", "p21db43da", "p35f64419", "p58ee6fab", "pc5398efe", "p8918576d", "pfff89232", "p8f8f6d95",
  "p523df697", "p497532c1", "p8d925879", "p3470d6fe", "pcb107128", "p07cb92c8", "pae87fdae", "p8d79a3bc",
  "p9acdabe5", "pc347ab51", "p7f31eb4c", "p463a0768", "p7035f450", "pb5110ae2", "p30fe483d", "p56c340e9",
  "p6a7233cd", "p1db9149e", "p7db71359", "pa2cb3543", "p66ca017e", "p5b75a0b7", "p16f858d6",
];

describe("shipped prompt ids", () => {
  it("are exactly the frozen set, in order", () => {
    expect(WRITING_PROMPTS.map((p) => p.id)).toEqual(SHIPPED_PROMPT_IDS);
  });

  it("still hash from the English source text", () => {
    expect(WRITING_PROMPTS[0]).toMatchObject({ id: "pa1ce5a44", phase: "draft", category: "pov" });
    expect(promptId({ phase: "draft", category: "pov", text: "Write the scene from the antagonist's point of view." })).toBe("pa1ce5a44");
  });
});

describe("prompt catalog", () => {
  const catalog = en as Record<string, string>;
  afterEach(() => {
    setLocale("en");
  });

  it("has an English entry identical to the source text for every shipped prompt", () => {
    const bad = WRITING_PROMPTS.filter((p) => catalog[`prompt.${p.id}`] !== p.text).map((p) => p.id);
    expect(bad).toEqual([]);
  });

  it("has no orphan prompt text keys", () => {
    const ids = new Set(WRITING_PROMPTS.map((p) => p.id));
    const orphans = Object.keys(catalog)
      .filter((k) => /^prompt\.p[0-9a-f]{8}$/.test(k))
      .filter((k) => !ids.has(k.slice("prompt.".length)));
    expect(orphans).toEqual([]);
  });

  it("shows translated text for shipped prompts but never for the writer's own or renamed ones", () => {
    setLocale("qps");
    const [a, b] = WRITING_PROMPTS;
    const bank = writingPrompts({
      labels: { [b.id]: "Reworded" },
      added: [{ id: "wp-1", label: "Mine about {pov}.", phase: "draft", category: "dialogue" }],
    });
    expect(bank.find((p) => p.id === a.id)?.text).toMatch(/^⟦.*⟧$/);
    expect(bank.find((p) => p.id === b.id)?.text).toBe("Reworded");
    expect(bank.find((p) => p.id === "wp-1")?.text).toBe("Mine about {pov}.");
    expect(WRITING_PROMPTS[0].text).toBe(a.text); // source data untouched
    expect(PROMPT_CATEGORIES[0].label).toBe("⟦PÓV⟧");
  });

  it("fills {pov} in translated text", () => {
    setLocale("qps");
    const povPrompt = WRITING_PROMPTS.find((p) => /\{pov\}/.test(p.text))!;
    const onlyThis = writingPrompts({
      hidden: WRITING_PROMPTS.filter((p) => p.id !== povPrompt.id).map((p) => p.id),
    });
    const r = pickPrompt({ phase: povPrompt.phase, category: povPrompt.category, pov: "Anna" }, () => 0, onlyThis)!;
    expect(r.prompt.id).toBe(povPrompt.id);
    expect(r.text).toContain("Anna");
    expect(r.text).not.toMatch(/\{pov\}/);
  });
});
