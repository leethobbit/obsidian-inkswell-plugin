import { afterEach, describe, expect, it } from "vitest";
import { en } from "../src/i18n/locales/en";
import { LOCALES } from "../src/i18n/locales";
import { formatNumber, interpolate, isMessageKey, setLocale, t, tp } from "../src/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locale catalogs", () => {
  const enKeys = new Set(Object.keys(en));

  for (const [code, catalog] of Object.entries(LOCALES)) {
    it(`${code}: only uses keys the English catalog defines`, () => {
      const unknown = Object.keys(catalog).filter((k) => !enKeys.has(k) && !isExtraPluralForm(k));
      expect(unknown).toEqual([]);
    });

    it(`${code}: every string keeps the English placeholders`, () => {
      const bad = Object.entries(catalog)
        .filter(([k]) => enKeys.has(k))
        .filter(([k, v]) => placeholders(v ?? "").join() !== placeholders((en as Record<string, string>)[k]).join())
        .map(([k]) => k);
      expect(bad).toEqual([]);
    });
  }

  it("English plural pairs are complete (every .one has an .other and vice versa)", () => {
    const keys = Object.keys(en);
    const broken = keys
      .filter((k) => k.endsWith(".one") || k.endsWith(".other"))
      .filter((k) => {
        const base = k.replace(/\.(one|other)$/, "");
        return !keys.includes(`${base}.one`) || !keys.includes(`${base}.other`);
      });
    expect(broken).toEqual([]);
  });

  it("no English string is empty", () => {
    expect(Object.entries(en).filter(([, v]) => !v.trim())).toEqual([]);
  });
});

/** A non-English locale may add CLDR forms English lacks (`.few`, `.many`, …). */
function isExtraPluralForm(key: string): boolean {
  const m = /^(.*)\.(zero|two|few|many)$/.exec(key);
  return !!m && Object.prototype.hasOwnProperty.call(en, `${m[1]}.other`);
}

describe("t / tp / setLocale", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(t("compile.refdoc.created", { path: "Book/reference.docx" })).toBe(
      "Reference doc created: Book/reference.docx. Edit its styles in Word."
    );
    expect(interpolate("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });

  it("picks the plural form and formats the count", () => {
    expect(tp("compile.done", 1, { path: "m.md" })).toBe("Compiled 1 word to m.md");
    expect(tp("compile.done", 12345, { path: "m.md" })).toBe("Compiled 12,345 words to m.md");
  });

  it("falls back to English for an unknown language — formatting included", () => {
    expect(setLocale("xx-yy")).toBe("en");
    expect(t("compile.heading")).toBe("Compile");
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("matches a base language for a regional code and keeps the regional tag", () => {
    LOCALES["zz"] = { "compile.heading": "Zz-compile" };
    try {
      expect(setLocale("zz_AA")).toBe("zz-aa");
      expect(t("compile.heading")).toBe("Zz-compile");
      // Missing keys fall back to English per key.
      expect(t("compile.run")).toBe("Compile");
    } finally {
      delete LOCALES["zz"];
    }
  });

  it("isMessageKey guards runtime-built keys", () => {
    expect(isMessageKey("compile.step.flatten-links")).toBe(true);
    expect(isMessageKey("compile.step.nope")).toBe(false);
  });
});
