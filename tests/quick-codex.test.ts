import { describe, expect, it } from "vitest";
import { getQuickCodexRange } from "../src/views/scene-editor";

describe("getQuickCodexRange", () => {
  it("uses the selected text when text is selected", () => {
    const doc = "Create Sarah Jones here";
    const from = doc.indexOf("Sarah");
    const to = from + "Sarah Jones".length;

    expect(getQuickCodexRange(doc, from, to)).toEqual({
      text: "Sarah Jones",
      from,
      to,
    });
  });

  it("uses the word immediately before the cursor when nothing is selected", () => {
    const doc = "Create Sarah Jones";
    const from = doc.length;

    expect(getQuickCodexRange(doc, from, from)).toEqual({
      text: "Jones",
      from: doc.indexOf("Jones"),
      to: from,
    });
  });

  it("uses the word before the cursor when the cursor is after whitespace", () => {
    const doc = "Create Sarah   ";
    const from = doc.length;

    expect(getQuickCodexRange(doc, from, from)).toEqual({
      text: "",
      from,
      to: from,
    });
  });

  it("handles a word at the beginning of the document", () => {
    const doc = "Sarah";
    const from = doc.length;

    expect(getQuickCodexRange(doc, from, from)).toEqual({
      text: "Sarah",
      from: 0,
      to: from,
    });
  });
});
