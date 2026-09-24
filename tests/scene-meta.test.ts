import { describe, expect, it } from "vitest";
import {
  SCENE_STATUSES,
  coerceStatus,
  readSceneMeta,
  statusLabel,
} from "../src/scenes/scene-meta";
import { FakeApp } from "./fakes/fake-app";

describe("coerceStatus", () => {
  it("accepts known statuses", () => {
    for (const s of SCENE_STATUSES) expect(coerceStatus(s)).toBe(s);
  });
  it("rejects unknown / non-string values", () => {
    expect(coerceStatus("nope")).toBeUndefined();
    expect(coerceStatus(undefined)).toBeUndefined();
    expect(coerceStatus(42)).toBeUndefined();
    expect(coerceStatus(null)).toBeUndefined();
  });
});

describe("statusLabel", () => {
  it("title-cases", () => {
    expect(statusLabel("draft")).toBe("Draft");
    expect(statusLabel("final")).toBe("Final");
  });
});

describe("readSceneMeta plotlines coercion", () => {
  const read = (yaml: string) => {
    const app = new FakeApp({ "Scenes/S.md": `---\n${yaml}\n---\nBody.\n` });
    return readSceneMeta(app.asApp(), app.file("Scenes/S.md"));
  };

  it("reads a string array, dropping non-string entries", () => {
    expect(read("plotlines:\n  - Main\n  - Romance").plotlines).toEqual([
      "Main",
      "Romance",
    ]);
  });

  it("coerces a single string to a one-element array (like characters)", () => {
    expect(read("plotlines: Main").plotlines).toEqual(["Main"]);
  });

  it("is undefined when absent", () => {
    expect(read("status: draft").plotlines).toBeUndefined();
  });
});

describe("readSceneMeta location (string or list — #44)", () => {
  const read = (yaml: string) => {
    const app = new FakeApp({ "Scenes/S.md": `---\n${yaml}\n---\nBody.\n` });
    return readSceneMeta(app.asApp(), app.file("Scenes/S.md"));
  };

  it("folds the pre-1.18 single string into a one-element list", () => {
    expect(read('location: "[[The Lattice]]"').location).toEqual(["[[The Lattice]]"]);
  });

  it("reads a list, dropping non-string entries", () => {
    expect(read('location:\n  - "[[Docks]]"\n  - "[[Tower]]"\n  - 3').location).toEqual([
      "[[Docks]]",
      "[[Tower]]",
    ]);
  });

  it("is undefined when absent or blank", () => {
    expect(read("status: draft").location).toBeUndefined();
    expect(read('location: ""').location).toBeUndefined();
  });
});
