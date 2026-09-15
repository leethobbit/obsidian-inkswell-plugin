/**
 * The Customize beat editor (rows) and the text grammar must share ONE id
 * policy, or a template edited both ways would cross-wire saved beat notes.
 */
import { describe, expect, it } from "vitest";
import {
  assignBeatIds,
  beatsFromRows,
  parseBeatLines,
  repositionBeat,
  serializeBeatLines,
} from "../src/outliner/custom-templates";
import { duplicateAsCustom } from "../src/outliner/template-actions";
import { BEAT_TEMPLATES } from "../src/outliner/beat-templates";

describe("assignBeatIds / beatsFromRows", () => {
  it("rows and text lines produce identical beats for equivalent input", () => {
    const text = "Opening Image | First glimpse\nOpening Image\n50% | Midpoint | The turn\nFinale";
    const fromText = parseBeatLines(text);
    const fromRows = beatsFromRows([
      { name: "Opening Image", blurb: "First glimpse", position: null },
      { name: "Opening Image", blurb: "", position: null },
      { name: "Midpoint", blurb: "The turn", position: 0.5 },
      { name: "Finale", blurb: "", position: null },
    ]);
    expect(fromText).toEqual(fromRows);
    if ("beats" in fromRows) {
      expect(fromRows.beats.map((b) => b.id)).toEqual(["opening-image", "opening-image-2", "midpoint", "finale"]);
    }
  });

  it("assignBeatIds spreads unpinned beats evenly and keeps pinned ones", () => {
    const beats = assignBeatIds([
      { name: "A", blurb: "", position: null },
      { name: "B", blurb: "", position: 0.9 },
      { name: "C", blurb: "", position: null },
    ]);
    expect(beats.map((b) => b.position)).toEqual([0, 0.9, 1]);
  });

  it("beatsFromRows validates like the grammar", () => {
    expect(beatsFromRows([])).toEqual({ error: "Add at least one beat." });
    expect(beatsFromRows([{ name: " ", blurb: "", position: null }])).toEqual({ error: "Beat 1 needs a name." });
    expect(beatsFromRows([{ name: "X", blurb: "", position: 7 }])).toEqual({
      beats: [{ id: "x", name: "X", blurb: "", position: 1 }],
    });
  });

  it("serialize → parse round-trips a user template's beats (ids re-derived, positions to 0.1%)", () => {
    // Built-in ids are hand-authored and needn't match their names; a user template's
    // ids always come from assignBeatIds, so the grammar reproduces them exactly.
    const beats = assignBeatIds(
      BEAT_TEMPLATES["seven-point"].map((b) => ({ name: b.name, blurb: b.blurb, position: b.position }))
    );
    const parsed = parseBeatLines(serializeBeatLines(beats));
    expect("beats" in parsed).toBe(true);
    if ("beats" in parsed) {
      expect(parsed.beats.map((b) => [b.id, b.name, b.blurb])).toEqual(beats.map((b) => [b.id, b.name, b.blurb]));
      parsed.beats.forEach((b, i) => expect(b.position).toBeCloseTo(beats[i].position, 3));
    }
  });
});

describe("repositionBeat", () => {
  const beats = assignBeatIds([
    { name: "A", blurb: "", position: 0 },
    { name: "B", blurb: "", position: 0.4 },
    { name: "C", blurb: "", position: 0.6 },
    { name: "D", blurb: "", position: 1 },
  ]);

  it("moves a beat between its new neighbours without touching theirs", () => {
    const next = repositionBeat(beats, 0, 2); // A → between C and D
    expect(next.map((b) => b.id)).toEqual(["b", "c", "a", "d"]);
    expect(next[2].position).toBeCloseTo(0.8);
    expect(next.filter((b) => b.id !== "a").map((b) => b.position)).toEqual([0.4, 0.6, 1]);
  });

  it("steps just past the end beats when moved to an edge", () => {
    expect(repositionBeat(beats, 1, 0)[0]).toMatchObject({ id: "b", position: 0 });
    expect(repositionBeat(beats, 1, 3)[3]).toMatchObject({ id: "b", position: 1 });
  });

  it("is a no-op for the same slot and returns beats sorted by position", () => {
    const shuffled = [beats[2], beats[0], beats[3], beats[1]];
    expect(repositionBeat(shuffled, 1, 1).map((b) => b.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("duplicateAsCustom", () => {
  it("names the copy, slugs a unique id, and deep-copies the beats", () => {
    const copy = duplicateAsCustom("Save the Cat", BEAT_TEMPLATES["save-the-cat"], []);
    expect(copy.name).toBe("Save the Cat (copy)");
    expect(copy.id).toBe("save-the-cat-copy");
    expect(copy.beats).toEqual(BEAT_TEMPLATES["save-the-cat"]);
    expect(copy.beats[0]).not.toBe(BEAT_TEMPLATES["save-the-cat"][0]);
    const again = duplicateAsCustom("Save the Cat", BEAT_TEMPLATES["save-the-cat"], [copy]);
    expect(again.id).toBe("save-the-cat-copy-2");
  });
});
