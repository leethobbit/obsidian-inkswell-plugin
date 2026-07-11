import { describe, expect, it } from "vitest";
import { OPTIONAL_FEATURES, featureEnabled, isOptionalFeature } from "../src/features";
import { DESTINATIONS, enabledSubtabs, resolveSubtab } from "../src/views/nav-model";

const plan = DESTINATIONS.find((d) => d.id === "plan")!;
const revise = DESTINATIONS.find((d) => d.id === "revise")!;
const publish = DESTINATIONS.find((d) => d.id === "publish")!;

describe("featureEnabled", () => {
  it("defaults every optional feature to on (empty disabled list)", () => {
    for (const f of OPTIONAL_FEATURES) {
      expect(featureEnabled([], f.id)).toBe(true);
    }
  });

  it("reports a feature off exactly when its id is listed", () => {
    expect(featureEnabled(["plot-grid"], "plot-grid")).toBe(false);
    expect(featureEnabled(["plot-grid"], "board")).toBe(true);
  });

  it("guards stale/typo'd ids", () => {
    expect(isOptionalFeature("plot-grid")).toBe(true);
    expect(isOptionalFeature("not-a-feature")).toBe(false);
  });
});

describe("enabledSubtabs", () => {
  it("keeps core tabs and drops the disabled optional ones", () => {
    expect(enabledSubtabs(plan, []).map((s) => s.id)).toEqual(["overview", "beats", "structure"]);
    expect(enabledSubtabs(plan, ["beats"]).map((s) => s.id)).toEqual(["overview", "structure"]);
    // Core tabs (no feature) are never dropped.
    expect(enabledSubtabs(revise, ["audit", "analysis"]).map((s) => s.id)).toEqual(["todos"]);
    expect(enabledSubtabs(publish, ["checklist", "launch"]).map((s) => s.id)).toEqual(["compile"]);
  });
});

describe("resolveSubtab", () => {
  it("keeps the remembered tab when it is still enabled", () => {
    expect(resolveSubtab(plan, "beats", [])).toBe("beats");
    expect(resolveSubtab(revise, "analysis", [])).toBe("analysis");
  });

  it("falls back to the first enabled tab when the remembered one is hidden", () => {
    expect(resolveSubtab(plan, "beats", ["beats"])).toBe("overview");
    // Audit hidden → Revise's first enabled tab is the merged To-dos.
    expect(resolveSubtab(revise, "audit", ["audit"])).toBe("todos");
    // Publish with both optionals hidden falls back to Compile.
    expect(resolveSubtab(publish, "launch", ["checklist", "launch"])).toBe("compile");
  });

  it("uses the first enabled tab when nothing is remembered", () => {
    expect(resolveSubtab(plan, undefined, [])).toBe("overview");
    expect(resolveSubtab(revise, undefined, ["audit"])).toBe("todos");
  });
});
