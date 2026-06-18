import { describe, expect, it } from "vitest";
import {
  filterDecisions,
  pendingCount,
  removeDecision,
  setDecisionStatus,
  upsertDecision,
} from "../src/revisions/decisions";
import { RevisionDecision } from "../src/revisions/types";

function d(
  id: string,
  over: Partial<RevisionDecision> = {}
): RevisionDecision {
  return {
    id,
    text: `decision ${id}`,
    scene: null,
    status: "pending",
    created: "2026-06-18T00:00:00.000Z",
    ...over,
  };
}

describe("upsertDecision", () => {
  it("appends a new decision", () => {
    const out = upsertDecision([d("1")], d("2"));
    expect(out.map((x) => x.id)).toEqual(["1", "2"]);
  });
  it("replaces an existing decision by id", () => {
    const out = upsertDecision([d("1", { text: "old" })], d("1", { text: "new" }));
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("new");
  });
  it("does not mutate the input", () => {
    const list = [d("1")];
    upsertDecision(list, d("2"));
    expect(list).toHaveLength(1);
  });
});

describe("setDecisionStatus", () => {
  it("flips status by id only", () => {
    const out = setDecisionStatus([d("1"), d("2")], "2", "applied");
    expect(out[0].status).toBe("pending");
    expect(out[1].status).toBe("applied");
  });
});

describe("removeDecision", () => {
  it("removes by id", () => {
    expect(removeDecision([d("1"), d("2")], "1").map((x) => x.id)).toEqual(["2"]);
  });
});

describe("filterDecisions", () => {
  const list = [
    d("1", { status: "pending", scene: "Ch1" }),
    d("2", { status: "applied", scene: "Ch1" }),
    d("3", { status: "pending", scene: null }),
  ];
  it("filters by status", () => {
    expect(filterDecisions(list, { status: "pending" }).map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("filters by scene", () => {
    expect(filterDecisions(list, { scene: "Ch1" }).map((x) => x.id)).toEqual(["1", "2"]);
  });
  it("filters project-wide (scene null)", () => {
    expect(filterDecisions(list, { scene: null }).map((x) => x.id)).toEqual(["3"]);
  });
  it("combines status and scene", () => {
    expect(filterDecisions(list, { status: "pending", scene: "Ch1" }).map((x) => x.id)).toEqual(["1"]);
  });
});

describe("pendingCount", () => {
  it("counts only pending", () => {
    expect(pendingCount([d("1"), d("2", { status: "applied" }), d("3")])).toBe(2);
  });
});
