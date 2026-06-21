import { describe, expect, it } from "vitest";
import { formatReadTime, heatLevel } from "../src/stats/format";

describe("formatReadTime", () => {
  it("formats zero, sub-minute, minutes, and hours", () => {
    expect(formatReadTime(0)).toBe("0m");
    expect(formatReadTime(100)).toBe("<1m"); // 100/250 rounds to 0
    expect(formatReadTime(3000)).toBe("12m"); // 3000/250 = 12
    expect(formatReadTime(80000)).toBe("5h 20m"); // 80000/250 = 320 min
  });

  it("respects a custom WPM", () => {
    expect(formatReadTime(200, 100)).toBe("2m");
  });
});

describe("heatLevel", () => {
  it("buckets a day's words against the period max", () => {
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(10, 100)).toBe(1); // < 33%
    expect(heatLevel(40, 100)).toBe(2); // >= 33%, < 66%
    expect(heatLevel(70, 100)).toBe(3); // >= 66%
    expect(heatLevel(100, 100)).toBe(3);
  });

  it("treats negative/zero as empty", () => {
    expect(heatLevel(-5, 100)).toBe(0);
  });
});
