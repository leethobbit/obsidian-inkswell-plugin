import { describe, expect, it } from "vitest";
import {
  SCENE_STATUSES,
  coerceStatus,
  statusLabel,
} from "../src/scenes/scene-meta";

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
