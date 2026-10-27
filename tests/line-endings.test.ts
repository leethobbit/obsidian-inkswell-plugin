import { describe, expect, it } from "vitest";
import { detectEol, sameText, toLf, withEol } from "../src/lib/line-endings";

describe("line endings (#64: no write without an edit)", () => {
  it("toLf turns Windows and old-Mac breaks into \\n", () => {
    expect(toLf("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });

  it("detectEol picks the ending a file mostly uses", () => {
    expect(detectEol("a\r\nb\r\nc\n")).toBe("\r\n");
    expect(detectEol("a\nb\nc\r\n")).toBe("\n");
    expect(detectEol("no breaks at all")).toBe("\n");
  });

  it("withEol writes normalized text back in the file's ending", () => {
    expect(withEol("a\nb\n", "\r\n")).toBe("a\r\nb\r\n");
    expect(withEol("a\r\nb\n", "\r\n")).toBe("a\r\nb\r\n"); // never "\r\r\n"
    expect(withEol("a\r\nb", "\n")).toBe("a\nb");
  });

  it("sameText ignores endings but not words", () => {
    expect(sameText("a\r\nb\r\n", "a\nb\n")).toBe(true);
    expect(sameText("a\nb\n", "a\nc\n")).toBe(false);
    expect(sameText("a\n", "a")).toBe(false); // a trailing line is a real difference
  });
});
