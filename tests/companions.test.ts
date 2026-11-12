import { describe, expect, it } from "vitest";
import { mentionAt } from "../src/codex/codex";
import { CodexEntity } from "../src/codex/types";
import { beatsForScenes, chapterOf, entitiesInScene } from "../src/companions/context";
import {
  COMPANIONS,
  companionForDestination,
  visibleCompanions,
} from "../src/companions/registry";
import type { BeatDef } from "../src/outliner/beat-templates";
import { CurrentScene } from "../src/scenes/current-scene";

const e = (name: string, aliases: string[] = [], category = "character"): CodexEntity => ({
  path: `Codex/${name}.md`,
  name,
  category,
  aliases,
});

const mara = e("Mara");
const maraVance = e("Mara Vance", ["the lamplighter"]);
const lattice = e("The Lattice", [], "location");
const chen = e("陈");

describe("mentionAt (Codex peek under the pointer)", () => {
  const all = [mara, maraVance, lattice, chen];

  it("finds the name covering the offset, preferring the longest match", () => {
    const text = "Then Mara Vance lit the lamp.";
    const hit = mentionAt(text, text.indexOf("Mara") + 2, all);
    expect(hit?.entity.name).toBe("Mara Vance");
    expect(text.slice(hit?.from, hit?.to)).toBe("Mara Vance");
  });

  it("falls back to the shorter name where only it matches", () => {
    const text = "Mara waited. Vance was gone.";
    expect(mentionAt(text, 1, all)?.entity.name).toBe("Mara");
    expect(mentionAt(text, text.indexOf("Vance") + 1, all)).toBeNull();
  });

  it("matches aliases case-insensitively and later occurrences", () => {
    const text = "The Lattice hummed. Below, the Lattice hummed again; The Lamplighter listened.";
    expect(mentionAt(text, text.lastIndexOf("Lattice") + 1, all)?.entity).toBe(lattice);
    expect(mentionAt(text, text.indexOf("Lamplighter") + 3, all)?.entity).toBe(maraVance);
  });

  it("needs whole words: no match inside another word", () => {
    expect(mentionAt("Marabou feathers", 2, all)).toBeNull();
  });

  it("matches inside unspaced CJK prose", () => {
    const text = "我看见陈走进来";
    expect(mentionAt(text, text.indexOf("陈"), all)?.entity).toBe(chen);
  });

  it("returns null off the end or with no entities", () => {
    expect(mentionAt("Mara", 99, all)).toBeNull();
    expect(mentionAt("Mara", 1, [])).toBeNull();
  });
});

describe("entitiesInScene (Codex companion's In this scene)", () => {
  const visible = [mara, maraVance, lattice];

  it("lists linked entries first in link order, then prose mentions, once each", () => {
    const rows = entitiesInScene(
      ["[[The Lattice]]", "[[Mara Vance|her]]"],
      [mara.path, lattice.path],
      visible
    );
    expect(rows.map((r) => [r.entity.name, r.linked])).toEqual([
      ["The Lattice", true],
      ["Mara Vance", true],
      ["Mara", false],
    ]);
  });

  it("drops links and mentions outside the visible (scoped) set", () => {
    const rows = entitiesInScene(["[[Someone Else]]"], ["Codex/Ghost.md"], visible);
    expect(rows).toEqual([]);
  });
});

describe("chapterOf (Plan companion)", () => {
  const scenes = [
    { title: "A", chapter: "One" },
    { title: "B", chapter: "One" },
    { title: "C", chapter: "Two" },
    { title: "D" },
    { title: "E", chapter: "One" },
  ];

  it("returns the chapter run holding the scene, with its position", () => {
    expect(chapterOf(scenes, undefined, "B")).toMatchObject({ title: "One", scenes: ["A", "B"], current: 1 });
  });

  it("keeps two runs of the same chapter name apart (#58)", () => {
    const later = chapterOf(scenes, undefined, "E");
    expect(later).toMatchObject({ title: "One", scenes: ["E"], current: 0 });
    expect(later?.id).not.toBe(chapterOf(scenes, undefined, "A")?.id);
  });

  it("is null for a scene with no chapter or not in the book", () => {
    expect(chapterOf(scenes, undefined, "D")).toBeNull();
    expect(chapterOf(scenes, undefined, "Z")).toBeNull();
  });
});

describe("beatsForScenes (Plan companion)", () => {
  const beats: BeatDef[] = [
    { id: "hook", name: "Hook", blurb: "", position: 0 },
    { id: "debate", name: "Debate", blurb: "", position: 0.2 },
    { id: "midpoint", name: "Midpoint", blurb: "", position: 0.5 },
  ];

  it("lists beats assigned to any of the scenes, in template order", () => {
    const assignments = {
      midpoint: { scenes: ["C"] },
      hook: { scenes: ["A", "X"], note: "open cold" },
      debate: { scenes: ["Q"] },
    };
    expect(beatsForScenes(beats, assignments, ["A", "C"]).map((b) => b.beat.id)).toEqual(["hook", "midpoint"]);
  });

  it("shows a beat spanning two chapters in each", () => {
    const assignments = { debate: { scenes: ["B", "C"] } };
    expect(beatsForScenes(beats, assignments, ["B"])).toHaveLength(1);
    expect(beatsForScenes(beats, assignments, ["C"])).toHaveLength(1);
  });

  it("is empty with no sheet", () => {
    expect(beatsForScenes(beats, undefined, ["A"])).toEqual([]);
  });
});

describe("CurrentScene", () => {
  it("notifies once per real change, and follows renames and deletes", () => {
    const cs = new CurrentScene();
    const seen: Array<string | null> = [];
    cs.subscribe((p) => seen.push(p));
    cs.set("a.md");
    cs.set("a.md");
    cs.renamed("other.md", "x.md");
    cs.renamed("a.md", "b.md");
    cs.deleted("zzz.md");
    cs.deleted("b.md");
    expect(seen).toEqual(["a.md", "b.md", null]);
    expect(cs.get()).toBeNull();
  });
});

describe("companion registry", () => {
  it("has five companions with unique ids and view types", () => {
    expect(COMPANIONS).toHaveLength(5);
    expect(new Set(COMPANIONS.map((c) => c.id)).size).toBe(5);
    expect(new Set(COMPANIONS.map((c) => c.viewType)).size).toBe(5);
  });

  it("hides a companion whose feature is off, everywhere", () => {
    expect(visibleCompanions(["tracking"]).map((c) => c.id)).not.toContain("track");
    expect(companionForDestination("track", ["tracking"])).toBeNull();
    expect(companionForDestination("track", [])?.id).toBe("track");
  });

  it("maps rail destinations to their companion; Write has none", () => {
    expect(companionForDestination("home", [])?.id).toBe("scenes");
    expect(companionForDestination("write", [])).toBeNull();
  });
});
