import { describe, expect, it } from "vitest";
import { SAVE_THE_CAT, TEN_POINT, TEMPLATE_META } from "../src/outliner/beat-templates";
import {
  BeatTemplateDef,
  allTemplateMeta,
  normalizeCustomBeatTemplates,
  parseBeatLines,
  resolveTemplate,
  serializeBeatLines,
  synthesizeBeats,
} from "../src/outliner/custom-templates";

const TEN_THINGS: BeatTemplateDef = {
  id: "ten-things",
  name: "Ten Things",
  beats: [
    { id: "opening", name: "Opening", blurb: "", position: 0 },
    { id: "turn", name: "Turn", blurb: "the pivot", position: 0.5 },
    { id: "landing", name: "Landing", blurb: "", position: 1 },
  ],
};

describe("resolveTemplate", () => {
  it("undefined id (no sheet yet) resolves to the default template", () => {
    expect(resolveTemplate(undefined)).toBe(SAVE_THE_CAT);
  });

  it("resolves built-ins and customs by id", () => {
    expect(resolveTemplate("ten-point")).toBe(TEN_POINT);
    expect(resolveTemplate("ten-things", [TEN_THINGS])).toBe(TEN_THINGS.beats);
  });

  it("returns null for an unknown id — never another template's beats", () => {
    expect(resolveTemplate("nope")).toBeNull();
    expect(resolveTemplate("nope", [TEN_THINGS])).toBeNull();
  });
});

describe("allTemplateMeta", () => {
  it("appends customs after the built-ins with a beat-count label", () => {
    const metas = allTemplateMeta([TEN_THINGS]);
    expect(metas.slice(0, TEMPLATE_META.length)).toEqual(TEMPLATE_META);
    expect(metas.at(-1)).toEqual({ id: "ten-things", label: "Ten Things (3)" });
  });
});

describe("parseBeatLines", () => {
  it("distributes plain lines evenly across 0–1", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Thing ${i + 1}`).join("\n");
    const r = parseBeatLines(text);
    if ("error" in r) throw new Error(r.error);
    expect(r.beats).toHaveLength(10);
    expect(r.beats[0]).toEqual({ id: "thing-1", name: "Thing 1", blurb: "", position: 0 });
    expect(r.beats[9].position).toBe(1);
    expect(r.beats[3].position).toBeCloseTo(3 / 9);
  });

  it("pins an explicit NN% and keeps blurbs", () => {
    const r = parseBeatLines("Opening\n50% | Turn | the pivot\nLanding");
    if ("error" in r) throw new Error(r.error);
    expect(r.beats[1]).toEqual({ id: "turn", name: "Turn", blurb: "the pivot", position: 0.5 });
    expect(r.beats[0].position).toBe(0);
    expect(r.beats[2].position).toBe(1);
  });

  it("clamps out-of-range percentages", () => {
    const r = parseBeatLines("150% | Beyond\nStart");
    if ("error" in r) throw new Error(r.error);
    expect(r.beats[0].position).toBe(1);
  });

  it("suffixes duplicate names so ids never collide within a template", () => {
    const r = parseBeatLines("Action\nAction\nAction");
    if ("error" in r) throw new Error(r.error);
    expect(r.beats.map((b) => b.id)).toEqual(["action", "action-2", "action-3"]);
  });

  it("ignores blank lines and rejects an empty list", () => {
    const ok = parseBeatLines("A\n\n\nB\n");
    if ("error" in ok) throw new Error(ok.error);
    expect(ok.beats).toHaveLength(2);
    expect(parseBeatLines("\n  \n")).toHaveProperty("error");
  });

  it("falls back to beat-N for a name that slugifies to nothing", () => {
    const r = parseBeatLines("!!!\nReal");
    if ("error" in r) throw new Error(r.error);
    expect(r.beats[0].id).toBe("beat-1");
  });

  it("a single beat sits at position 0", () => {
    const r = parseBeatLines("Only");
    if ("error" in r) throw new Error(r.error);
    expect(r.beats[0].position).toBe(0);
  });

  it("round-trips through serializeBeatLines without drift", () => {
    const r = parseBeatLines(serializeBeatLines(TEN_THINGS.beats));
    if ("error" in r) throw new Error(r.error);
    expect(r.beats).toEqual(TEN_THINGS.beats);
  });
});

describe("synthesizeBeats", () => {
  it("keeps assignment keys and order so edits stay in the same keyspace", () => {
    const beats = synthesizeBeats({
      "opening-image": { note: "a" },
      midpoint: { done: true },
      finale: { scenes: ["End"] },
    });
    expect(beats.map((b) => b.id)).toEqual(["opening-image", "midpoint", "finale"]);
    expect(beats[0].name).toBe("Opening image");
    expect(beats[0].position).toBe(0);
    expect(beats[2].position).toBe(1);
  });

  it("handles zero and one assignment", () => {
    expect(synthesizeBeats({})).toEqual([]);
    expect(synthesizeBeats({ solo: {} })[0].position).toBe(0);
  });
});

describe("normalizeCustomBeatTemplates", () => {
  it("passes a valid list through unchanged", () => {
    expect(normalizeCustomBeatTemplates([TEN_THINGS])).toEqual([TEN_THINGS]);
  });

  it("returns [] for non-arrays and drops malformed entries", () => {
    expect(normalizeCustomBeatTemplates(undefined)).toEqual([]);
    expect(normalizeCustomBeatTemplates("junk")).toEqual([]);
    expect(normalizeCustomBeatTemplates([null, 42, { id: "x" }])).toEqual([]);
  });

  it("drops ids that collide with built-ins or earlier customs (first wins)", () => {
    const clash = { ...TEN_THINGS, id: "save-the-cat" };
    const dup = { ...TEN_THINGS, name: "Second" };
    expect(normalizeCustomBeatTemplates([clash])).toEqual([]);
    expect(normalizeCustomBeatTemplates([TEN_THINGS, dup])).toEqual([TEN_THINGS]);
  });

  it("drops non-slug ids", () => {
    expect(normalizeCustomBeatTemplates([{ ...TEN_THINGS, id: "Ten Things" }])).toEqual([]);
    expect(normalizeCustomBeatTemplates([{ ...TEN_THINGS, id: "9lives" }])).toEqual([]);
  });

  it("clamps beat positions and drops malformed or duplicate beats", () => {
    const [tpl] = normalizeCustomBeatTemplates([
      {
        id: "t",
        name: "T",
        beats: [
          { id: "a", name: "A", blurb: "", position: -2 },
          { id: "b", name: "B", blurb: 7, position: Infinity },
          { id: "a", name: "A again", blurb: "", position: 0.5 }, // dup id
          { id: "", name: "no id", blurb: "", position: 0 },
          { id: "c", name: "", blurb: "", position: 0 }, // no name
        ],
      },
    ]);
    expect(tpl.beats).toEqual([
      { id: "a", name: "A", blurb: "", position: 0 },
      { id: "b", name: "B", blurb: "", position: 0 },
    ]);
  });

  it("drops a template left with no beats", () => {
    expect(normalizeCustomBeatTemplates([{ id: "t", name: "T", beats: [] }])).toEqual([]);
    expect(normalizeCustomBeatTemplates([{ id: "t", name: "T", beats: [null] }])).toEqual([]);
  });
});
