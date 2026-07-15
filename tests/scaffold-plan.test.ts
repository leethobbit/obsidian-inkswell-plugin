import { describe, expect, it } from "vitest";
import { numberWord, planScaffold } from "../src/outliner/scaffold-plan";
import { getTemplate, templateActs } from "../src/outliner/beat-templates";

describe("numberWord", () => {
  it("spells 1–99", () => {
    expect(numberWord(1)).toBe("One");
    expect(numberWord(15)).toBe("Fifteen");
    expect(numberWord(20)).toBe("Twenty");
    expect(numberWord(21)).toBe("Twenty-One");
    expect(numberWord(27)).toBe("Twenty-Seven");
    expect(numberWord(99)).toBe("Ninety-Nine");
  });

  it("falls back to digits out of range", () => {
    expect(numberWord(0)).toBe("0");
    expect(numberWord(100)).toBe("100");
  });
});

/** Beat count per act title, in act order. */
function split(templateId: string): Array<[string, number]> {
  const plan = planScaffold(getTemplate(templateId), templateActs(templateId));
  return plan.acts.map((a) => [
    a.title,
    plan.scenes.filter((s) => s.actTitle === a.title).length,
  ]);
}

describe("planScaffold act boundaries", () => {
  it("save-the-cat splits 5/7/3 (Break Into Two/Three start their acts)", () => {
    expect(split("save-the-cat")).toEqual([["Act I", 5], ["Act II", 7], ["Act III", 3]]);
  });

  it("three-act splits 2/3/2", () => {
    expect(split("three-act")).toEqual([["Act I", 2], ["Act II", 3], ["Act III", 2]]);
  });

  it("heros-journey splits 4/5/3", () => {
    expect(split("heros-journey")).toEqual([["Act I", 4], ["Act II", 5], ["Act III", 3]]);
  });

  it("seven-point splits 1/5/1", () => {
    expect(split("seven-point")).toEqual([["Act I", 1], ["Act II", 5], ["Act III", 1]]);
  });

  it("story-circle splits 2/4/2", () => {
    expect(split("story-circle")).toEqual([["Act I", 2], ["Act II", 4], ["Act III", 2]]);
  });

  it("romancing-the-beat uses Gwen Hayes' four part names, 4/3/4/3", () => {
    expect(split("romancing-the-beat")).toEqual([
      ["Setup", 4],
      ["Falling", 3],
      ["Retreating", 4],
      ["Fighting for Love", 3],
    ]);
  });

  it("twenty-seven-chapter splits 9/9/9", () => {
    expect(split("twenty-seven-chapter")).toEqual([["Act I", 9], ["Act II", 9], ["Act III", 9]]);
  });
});

describe("planScaffold shape", () => {
  const plan = planScaffold(getTemplate("save-the-cat"), templateActs("save-the-cat"));

  it("numbers chapters globally across acts, one per beat, unique", () => {
    expect(plan.chapters).toHaveLength(15);
    expect(plan.chapters[0].title).toBe("Chapter One");
    expect(plan.chapters[5].title).toBe("Chapter Six"); // first Act II chapter continues the count
    expect(plan.chapters[14].title).toBe("Chapter Fifteen");
    expect(new Set(plan.chapters.map((c) => c.title)).size).toBe(15);
  });

  it("pairs each scene with its beat, chapter, and act", () => {
    const s = plan.scenes[5];
    expect(s.beatId).toBe("break-into-2");
    expect(s.title).toBe("Break Into Two");
    expect(s.chapterTitle).toBe("Chapter Six");
    expect(s.actTitle).toBe("Act II");
    expect(s.synopsis).toContain("new world");
  });

  it("chapter actIndex points into the emitted acts", () => {
    for (const c of plan.chapters) {
      expect(plan.acts[c.actIndex]).toBeDefined();
    }
  });

  it("omits acts that receive no beats", () => {
    const acts = [
      { title: "A", from: 0 },
      { title: "Empty", from: 0.4 },
      { title: "B", from: 0.5 },
    ];
    const beats = [
      { id: "x", name: "X", position: 0, blurb: "" },
      { id: "y", name: "Y", position: 0.9, blurb: "" },
    ];
    const p = planScaffold(beats, acts);
    expect(p.acts.map((a) => a.title)).toEqual(["A", "B"]);
  });

  it("unknown template id falls back to a valid 3-act layout", () => {
    const p = planScaffold(getTemplate("nope"), templateActs("nope"));
    expect(p.acts.length).toBeGreaterThan(0);
    expect(p.scenes).toHaveLength(15); // getTemplate falls back to Save the Cat
  });
});
