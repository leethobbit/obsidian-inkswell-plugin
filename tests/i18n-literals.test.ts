import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs dev script, no type declarations
import { scan } from "../scripts/find-ui-literals.mjs";

/**
 * Every UI string goes through t()/tp(). The scanner looks at the common text
 * sinks (setName, text:, new Notice, aria-label, …); a deliberate literal (vault
 * text, a symbol, a brand) carries `// i18n-ignore: <reason>`.
 */
describe("UI literals", () => {
  it("no hard-coded UI text outside the catalogs", () => {
    const hits = (scan(["src", "main.ts"]) as Array<{ file: string; line: number; text: string }>).map(
      (h) => `${h.file}:${h.line}  ${h.text}`
    );
    expect(hits).toEqual([]);
  });
});
