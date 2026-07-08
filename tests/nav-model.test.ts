import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  PHONE_REDIRECTED,
  RAIL_GROUP_ORDER,
  phoneBarDestinations,
  phoneMoreDestinations,
  phoneTabForMode,
} from "../src/views/nav-model";

describe("nav model", () => {
  it("keeps the phone bar slots in order: Write, Scenes(Home), Codex", () => {
    const bar = phoneBarDestinations();
    expect(bar.map((d) => d.id)).toEqual(["write", "home", "codex"]);
    expect(bar[1].phone?.label).toBe("Scenes");
  });

  it("splits the More sheet into usable rows then redirected ones", () => {
    const { usable, redirected } = phoneMoreDestinations();
    expect(usable.map((d) => d.id)).toEqual(["track", "revise", "help", "search"]);
    expect(redirected.map((d) => d.id)).toEqual(["plan", "publish"]);
    // Revise's sheet row jumps straight to the phone-usable Todos slice.
    expect(usable.find((d) => d.id === "revise")?.phone?.subtab).toBe("todos");
  });

  it("highlights the owning bar tab, falling back to More", () => {
    expect(phoneTabForMode("write")).toBe("write");
    expect(phoneTabForMode("home")).toBe("home");
    expect(phoneTabForMode("codex")).toBe("codex");
    expect(phoneTabForMode("track")).toBe("more");
    expect(phoneTabForMode("plan")).toBe("more");
  });

  it("derives the redirect set from destination flags", () => {
    expect([...PHONE_REDIRECTED].sort()).toEqual(["plan", "publish"]);
  });

  it("every destination has a unique id and an icon", () => {
    const ids = DESTINATIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DESTINATIONS) expect(d.icon).toBeTruthy();
  });

  it("assigns every destination to a known rail group", () => {
    for (const d of DESTINATIONS) expect(RAIL_GROUP_ORDER).toContain(d.group);
  });

  it("keeps rail groups as contiguous runs in declared order (so the rail draws one divider per boundary)", () => {
    // The sequence of groups with consecutive duplicates collapsed must equal the
    // canonical order — i.e. each group appears exactly once, uninterrupted. This
    // guarantees exactly RAIL_GROUP_ORDER.length - 1 dividers.
    const runs: string[] = [];
    for (const d of DESTINATIONS) {
      if (runs[runs.length - 1] !== d.group) runs.push(d.group);
    }
    expect(runs).toEqual(RAIL_GROUP_ORDER);
  });

  it("gives Plan three sub-tabs: Overview, Beats, Structure", () => {
    const plan = DESTINATIONS.find((d) => d.id === "plan");
    expect(plan?.subtabs?.map((s) => s.id)).toEqual(["overview", "beats", "structure"]);
  });

  it("groups the rail: Home / pipeline / insight / tools", () => {
    const byGroup = (g: string) => DESTINATIONS.filter((d) => d.group === g).map((d) => d.id);
    expect(byGroup("hub")).toEqual(["home"]);
    expect(byGroup("pipeline")).toEqual(["plan", "write", "revise", "publish"]);
    expect(byGroup("insight")).toEqual(["codex", "track"]);
    expect(byGroup("tools")).toEqual(["search", "help"]);
  });
});
