import { afterEach, describe, expect, it } from "vitest";
import { en, EN_MODULES } from "../src/i18n/locales/en";
import { LOCALE_INFO, LOCALES } from "../src/i18n/locales";
import { formatDate, formatNumber, interpolate, isMessageKey, pseudoize, setLocale, t, tp } from "../src/i18n";

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

  it("every key lives in exactly one English area module", () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [mod, strings] of Object.entries(EN_MODULES)) {
      for (const k of Object.keys(strings)) {
        const prev = seen.get(k);
        if (prev) dupes.push(`${k} (${prev}, ${mod})`);
        else seen.set(k, mod);
      }
    }
    expect(dupes).toEqual([]);
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
    LOCALE_INFO["zz"] = { name: "Zz", reviewed: true };
    try {
      expect(setLocale("zz_AA")).toBe("zz-aa");
      expect(t("compile.heading")).toBe("Zz-compile");
      // Missing keys fall back to English per key.
      expect(t("compile.run")).toBe("Compile");
    } finally {
      delete LOCALES["zz"];
      delete LOCALE_INFO["zz"];
    }
  });

  it("follows Obsidian only into reviewed catalogs; an explicit choice may pick a draft", () => {
    LOCALES["zz"] = { "compile.heading": "Zz-compile" };
    LOCALE_INFO["zz"] = { name: "Zz", reviewed: false };
    try {
      expect(setLocale("zz")).toBe("en");
      expect(t("compile.heading")).toBe("Compile");
      expect(setLocale("zz", { includeUnreviewed: true })).toBe("zz");
      expect(t("compile.heading")).toBe("Zz-compile");
    } finally {
      delete LOCALES["zz"];
      delete LOCALE_INFO["zz"];
    }
  });

  it("every registered locale has picker metadata, and vice versa", () => {
    expect(Object.keys(LOCALE_INFO).sort()).toEqual(Object.keys(LOCALES).sort());
  });

  it("isMessageKey guards runtime-built keys", () => {
    expect(isMessageKey("compile.step.flatten-links")).toBe(true);
    expect(isMessageKey("compile.step.nope")).toBe(false);
  });
});

describe("formatDate / pseudo-locale", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("reads a bare ISO day as a local date (no time-zone shift)", () => {
    expect(formatDate("2026-11-12", { year: "numeric", month: "2-digit", day: "2-digit" })).toBe("11/12/2026");
    setLocale("de");
    // No German catalog: English fallback formats English-style (see setLocale).
    expect(formatDate("2026-01-05", { month: "long" })).toBe("January");
  });

  it("returns unparseable input unchanged", () => {
    expect(formatDate("someday")).toBe("someday");
  });

  it("pseudo-locale wraps and accents text but keeps placeholders", () => {
    expect(pseudoize("Open {name} now")).toBe("⟦Ópéñ {name} ñów⟧");
    expect(setLocale("qps")).toBe("qps");
    expect(t("common.cancel")).toBe("⟦Çáñçél⟧");
    expect(tp("common.words", 2)).toBe("⟦2 wórdš⟧");
  });
});
