import { describe, expect, it } from "vitest";
import { MarkKind, toggleInlineMark } from "../src/lib/inline-format";

/**
 * Fixture notation: `|` marks a collapsed cursor, `⟦`/`⟧` a selection. `run`
 * parses the fixture, applies the toggle, splices the change into the doc and
 * re-marks the resulting selection so expectations read like the input.
 */
function parse(fixture: string): { doc: string; from: number; to: number } {
  const cursor = fixture.indexOf("|");
  if (cursor !== -1) {
    return { doc: fixture.slice(0, cursor) + fixture.slice(cursor + 1), from: cursor, to: cursor };
  }
  const open = fixture.indexOf("⟦");
  const close = fixture.indexOf("⟧");
  const doc = fixture.slice(0, open) + fixture.slice(open + 1, close) + fixture.slice(close + 1);
  return { doc, from: open, to: close - 1 };
}

function run(fixture: string, kind: MarkKind): string {
  const { doc, from, to } = parse(fixture);
  const r = toggleInlineMark(doc, from, to, kind);
  const out = doc.slice(0, r.from) + r.insert + doc.slice(r.to);
  if (r.anchor === r.head) return out.slice(0, r.anchor) + "|" + out.slice(r.anchor);
  return out.slice(0, r.anchor) + "⟦" + out.slice(r.anchor, r.head) + "⟧" + out.slice(r.head);
}

describe("toggleInlineMark — bold", () => {
  const cases: [string, string][] = [
    ["he|llo", "**he|llo**"],
    ["hello |world", "hello **|world**"],
    ["hello | world", "hello **|** world"],
    ["|", "**|**"],
    ["**|**", "|"],
    ["⟦hello⟧", "**⟦hello⟧**"],
    ["**⟦hello⟧**", "⟦hello⟧"],
    ["⟦**hello**⟧", "⟦hello⟧"],
    ["*⟦hello⟧*", "***⟦hello⟧***"],
    ["***⟦hello⟧***", "*⟦hello⟧*"],
    ["__⟦hello⟧__", "⟦hello⟧"],
    ["⟦  hello ⟧", "  **⟦hello⟧** "],
    ["**wo|rd**", "wo|rd"],
    ["do|n't", "**do|n't**"],
    ["caf|é", "**caf|é**"],
    ["snake_ca|se", "**snake_ca|se**"],
    ["⟦a\nb⟧", "**⟦a\nb⟧**"],
    ["one ⟦two three⟧ four", "one **⟦two three⟧** four"],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(run(input, "bold")).toBe(expected);
    });
  }
});

describe("toggleInlineMark — italic", () => {
  const cases: [string, string][] = [
    ["⟦hello⟧", "*⟦hello⟧*"],
    ["**⟦hello⟧**", "***⟦hello⟧***"],
    ["⟦**hello**⟧", "*⟦**hello**⟧*"],
    ["***⟦hello⟧***", "**⟦hello⟧**"],
    ["_⟦hello⟧_", "⟦hello⟧"],
    ["**|**", "***|***"],
    ["*|*", "|"],
    ["*⟦hello⟧", "**⟦hello⟧*"], // an unbalanced run is not a marker → wraps
    ["wo|rd", "*wo|rd*"],
    ["*wo|rd*", "wo|rd"],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(run(input, "italic")).toBe(expected);
    });
  }
});

describe("toggleInlineMark — strikethrough", () => {
  const cases: [string, string][] = [
    ["⟦x⟧", "~~⟦x⟧~~"],
    ["~~⟦x⟧~~", "⟦x⟧"],
    ["~~|~~", "|"],
    ["wo|rd", "~~wo|rd~~"],
    ["*⟦x⟧*", "*~~⟦x⟧~~*"], // families are independent
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(run(input, "strike")).toBe(expected);
    });
  }
});

describe("toggleInlineMark — raw offsets", () => {
  it("wraps the word under a cursor (offsets in original coordinates)", () => {
    expect(toggleInlineMark("hello", 2, 2, "bold")).toEqual({
      from: 0,
      to: 5,
      insert: "**hello**",
      anchor: 4,
      head: 4,
    });
  });
  it("unwraps markers just outside a selection", () => {
    expect(toggleInlineMark("**hello**", 2, 7, "bold")).toEqual({
      from: 0,
      to: 9,
      insert: "hello",
      anchor: 0,
      head: 5,
    });
  });
  it("grows an empty bold pair into bold-italic", () => {
    expect(toggleInlineMark("****", 2, 2, "italic")).toEqual({
      from: 2,
      to: 2,
      insert: "**",
      anchor: 3,
      head: 3,
    });
  });
  it("normalizes a reversed range and clamps to the document", () => {
    expect(toggleInlineMark("hello", 5, 0, "bold")).toEqual(toggleInlineMark("hello", 0, 5, "bold"));
    expect(toggleInlineMark("hi", 0, 99, "bold").to).toBe(2);
  });
});
