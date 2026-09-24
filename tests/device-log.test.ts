import { describe, expect, it } from "vitest";
import {
  DeviceLogSnapshot,
  mergeLogs,
  parseDeviceLog,
  serializeDeviceLog,
  snapshotOf,
} from "../src/tracking/device-log";
import { emptyLog } from "../src/tracking/types";

const sprint = (start: string, words: number) => ({ start, durationSec: 1500, words, goal: null });

const IPAD: DeviceLogSnapshot = {
  id: "abc123",
  name: "Kris's iPad",
  updated: "2026-09-23T18:00:00.000Z",
  daily: { "2026-09-22": 800, "2026-09-23": 250 },
  dailyBy: { "2026-09-23": { scene: 200, codex: 50 } },
  sprints: [sprint("2026-09-22T10:00:00.000Z", 700)],
};

describe("serializeDeviceLog / parseDeviceLog", () => {
  it("round-trips a snapshot through a markdown note", () => {
    const text = serializeDeviceLog(IPAD);
    expect(text.startsWith('---\ninkswell-log: "abc123"\ndevice: "Kris\'s iPad"\n')).toBe(true);
    expect(text).toContain("```json");
    expect(parseDeviceLog(text)).toEqual(IPAD);
  });

  it("tolerates bare and single-quoted frontmatter scalars and CRLF", () => {
    const text = serializeDeviceLog(IPAD)
      .replace('inkswell-log: "abc123"', "inkswell-log: abc123")
      .replace('device: "Kris\'s iPad"', "device: 'Tablet'")
      .replace(/\n/g, "\r\n");
    const snap = parseDeviceLog(text);
    expect(snap?.id).toBe("abc123");
    expect(snap?.name).toBe("Tablet");
    expect(snap?.daily).toEqual(IPAD.daily);
  });

  it("returns null for notes that aren't device logs or have an unreadable block", () => {
    expect(parseDeviceLog("---\ncodex: character\n---\n# Ada")).toBeNull();
    expect(parseDeviceLog("no frontmatter at all")).toBeNull();
    expect(parseDeviceLog('---\ninkswell-log: "x"\n---\n```json\n{not json\n```')).toBeNull();
    expect(parseDeviceLog('---\ninkswell-log: "x"\n---\n```json\n{"daily":"nope"}\n```')).toBeNull();
  });

  it("drops malformed entries instead of failing the whole note", () => {
    const text =
      '---\ninkswell-log: "x"\n---\n```json\n' +
      JSON.stringify({
        daily: { "2026-01-01": 10, "2026-01-02": "ten" },
        dailyBy: { "2026-01-01": { scene: 10, bogus: 5 } },
        sprints: [sprint("2026-01-01T00:00:00.000Z", 10), { nope: true }],
      }) +
      "\n```";
    const snap = parseDeviceLog(text);
    expect(snap?.daily).toEqual({ "2026-01-01": 10 });
    expect(snap?.dailyBy).toEqual({ "2026-01-01": { scene: 10 } });
    expect(snap?.sprints).toHaveLength(1);
    expect(snap?.name).toBe("Unknown device");
  });
});

describe("mergeLogs", () => {
  const own = {
    ...emptyLog(),
    daily: { "2026-09-23": 500, "2026-09-21": 100 },
    dailyBy: { "2026-09-23": { scene: 500 } },
    sprints: [sprint("2026-09-23T09:00:00.000Z", 400)],
  };

  it("sums per-day totals and category buckets across devices", () => {
    const m = mergeLogs(own, [IPAD]);
    expect(m.daily).toEqual({ "2026-09-21": 100, "2026-09-22": 800, "2026-09-23": 750 });
    expect(m.dailyBy["2026-09-23"]).toEqual({ scene: 700, codex: 50 });
  });

  it("pools sprints sorted by start and de-duplicates echoes of the same sprint", () => {
    const echo: DeviceLogSnapshot = { ...IPAD, id: "old-self", sprints: [...own.sprints] };
    const m = mergeLogs(own, [IPAD, echo]);
    expect(m.sprints.map((s) => s.start)).toEqual([
      "2026-09-22T10:00:00.000Z",
      "2026-09-23T09:00:00.000Z",
    ]);
  });

  it("never mutates the device's own log", () => {
    const before = JSON.stringify(own);
    mergeLogs(own, [IPAD]);
    expect(JSON.stringify(own)).toBe(before);
  });

  it("with no other devices is the own log's shape", () => {
    const m = mergeLogs(own, []);
    expect(m.daily).toEqual(own.daily);
    expect(m.sprints).toEqual(own.sprints);
  });

  it("snapshotOf carries the own log by reference-free copy semantics for serialization", () => {
    const snap = snapshotOf("id", "Desktop", own, "2026-09-23T00:00:00.000Z");
    expect(parseDeviceLog(serializeDeviceLog(snap))?.daily).toEqual(own.daily);
  });
});
