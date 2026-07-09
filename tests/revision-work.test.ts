import { describe, expect, it } from "vitest";
import { PROJECT_GROUP_KEY, buildRevisionGroups } from "../src/revisions/revision-work";
import type { SceneTodos } from "../src/revisions/todos-scan";
import type { RevisionDecision } from "../src/revisions/types";
import type { GapHit } from "../src/lib/placeholders";

const scenes = [
  { title: "One", path: "Book/1.md" },
  { title: "Two", path: "Book/2.md" },
  { title: "Three", path: "Book/3.md" },
];

const gap = (from: number): GapHit => ({
  from,
  to: from + 6,
  kind: "todo",
  line: 1,
  excerpt: "[TODO: x]",
});

const decision = (id: string, scene: string | null, status: "pending" | "applied" = "pending"): RevisionDecision => ({
  id,
  text: `decision ${id}`,
  scene,
  status,
  created: "2026-01-01T00:00:00.000Z",
});

const todos = (path: string, ...hits: GapHit[]): SceneTodos => ({
  title: scenes.find((s) => s.path === path)!.title,
  path,
  todos: hits,
});

describe("buildRevisionGroups", () => {
  it("puts the current scene first and always shows it, even when empty", () => {
    const groups = buildRevisionGroups(scenes, [], [], "Book/2.md");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ path: "Book/2.md", title: "Two", isCurrent: true });
    expect(groups[0].todos).toEqual([]);
    expect(groups[0].decisions).toEqual([]);
  });

  it("groups scene-less decisions under 'Whole project'", () => {
    const groups = buildRevisionGroups(scenes, [], [decision("a", null)], "Book/1.md");
    const project = groups.find((g) => g.key === PROJECT_GROUP_KEY);
    expect(project).toBeDefined();
    expect(project?.title).toBe("Whole project");
    expect(project?.decisions.map((d) => d.id)).toEqual(["a"]);
  });

  it("puts decisions whose scene no longer resolves into 'Whole project' (nothing dropped)", () => {
    const groups = buildRevisionGroups(scenes, [], [decision("orphan", "Deleted Scene")], "Book/1.md");
    const project = groups.find((g) => g.key === PROJECT_GROUP_KEY);
    expect(project?.decisions.map((d) => d.id)).toEqual(["orphan"]);
  });

  it("shows other scenes only when they have work, in manuscript order", () => {
    const groups = buildRevisionGroups(
      scenes,
      [todos("Book/3.md", gap(0))],
      [decision("d", "Two")],
      "Book/1.md"
    );
    // current (One) first, then Two (has a decision), then Three (has a marker).
    expect(groups.map((g) => g.title)).toEqual(["One", "Two", "Three"]);
    expect(groups[1].decisions.map((d) => d.id)).toEqual(["d"]);
    expect(groups[2].todos).toHaveLength(1);
  });

  it("co-groups a scene's markers and decisions together", () => {
    const groups = buildRevisionGroups(
      scenes,
      [todos("Book/2.md", gap(0), gap(20))],
      [decision("d", "Two")],
      "Book/2.md"
    );
    const two = groups.find((g) => g.path === "Book/2.md")!;
    expect(two.isCurrent).toBe(true);
    expect(two.todos).toHaveLength(2);
    expect(two.decisions).toHaveLength(1);
  });

  it("honours the caller's status filtering (pending-only vs. all)", () => {
    // Caller passes only the decisions it wants shown; an empty list → that scene
    // has no work and (when not current) is omitted.
    const groups = buildRevisionGroups(scenes, [], [], "Book/1.md");
    expect(groups.map((g) => g.title)).toEqual(["One"]); // Two/Three omitted (no work)
  });

  it("has no current group when no scene is open, but still shows work + project", () => {
    const groups = buildRevisionGroups(
      scenes,
      [todos("Book/2.md", gap(0))],
      [decision("p", null)],
      null
    );
    expect(groups.some((g) => g.isCurrent)).toBe(false);
    expect(groups[0].key).toBe(PROJECT_GROUP_KEY); // project group precedes scene groups
    expect(groups.map((g) => g.title)).toEqual(["Whole project", "Two"]);
  });
});
