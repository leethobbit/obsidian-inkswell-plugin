import { describe, expect, it } from "vitest";
import { extractComments } from "../src/revisions/comments";

describe("extractComments", () => {
  it("extracts %% and @@ comments in document order", () => {
    const text = "Prose %% fix this %% more @@ check name @@ end.";
    expect(extractComments(text)).toEqual([
      { kind: "%%", text: "fix this" },
      { kind: "@@", text: "check name" },
    ]);
  });

  it("ignores empty markers", () => {
    expect(extractComments("a %%%% b @@@@ c")).toEqual([]);
  });

  it("handles multiline comment bodies", () => {
    expect(extractComments("x %% line one\nline two %% y")).toEqual([
      { kind: "%%", text: "line one\nline two" },
    ]);
  });

  it("returns empty for plain text", () => {
    expect(extractComments("just prose, nothing to see")).toEqual([]);
  });
});
