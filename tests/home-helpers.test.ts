import { describe, expect, it } from "vitest";
import { hueFor } from "../src/lib/hue";
import { relativeTime } from "../src/lib/relative-time";

describe("relativeTime", () => {
  const now = Date.UTC(2026, 8, 23, 12, 0, 0);
  const ago = (ms: number) => relativeTime(now - ms, now);

  it("buckets coarsely from seconds to years", () => {
    expect(ago(0)).toBe("just now");
    expect(ago(59_000)).toBe("just now");
    expect(ago(5 * 60_000)).toBe("5m ago");
    expect(ago(3 * 3_600_000)).toBe("3h ago");
    expect(ago(2 * 86_400_000)).toBe("2d ago");
    expect(ago(13 * 86_400_000)).toBe("1w ago");
    expect(ago(45 * 86_400_000)).toBe("1mo ago");
    expect(ago(400 * 86_400_000)).toBe("1y ago");
  });

  it("never reports the future", () => {
    expect(relativeTime(now + 10_000, now)).toBe("just now");
  });
});

describe("hueFor", () => {
  it("is deterministic and within 0–359", () => {
    expect(hueFor("The Lattice Cycle")).toBe(hueFor("The Lattice Cycle"));
    for (const t of ["", "a", "Lamplight", "Smoke Book Three", "Ünïcödé 🐉"]) {
      const h = hueFor(t);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it("spreads similar titles apart", () => {
    expect(hueFor("Book One")).not.toBe(hueFor("Book Two"));
  });
});
