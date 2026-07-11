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

  it("tags optional sub-tabs with their feature id and leaves core ones untagged", () => {
    const featureOf = (mode: string, sub: string) =>
      DESTINATIONS.find((d) => d.id === mode)?.subtabs?.find((s) => s.id === sub)?.feature;
    // Optional tabs carry a feature id...
    expect(featureOf("plan", "beats")).toBe("beats");
    expect(featureOf("revise", "audit")).toBe("audit");
    expect(featureOf("revise", "analysis")).toBe("analysis");
    expect(featureOf("publish", "checklist")).toBe("checklist");
    expect(featureOf("publish", "launch")).toBe("launch");
    // ...core tabs stay untagged (always shown).
    expect(featureOf("plan", "overview")).toBeUndefined();
    expect(featureOf("plan", "structure")).toBeUndefined();
    expect(featureOf("revise", "todos")).toBeUndefined();
    // The merged worklist (old Log folded in) keeps the phone-matching label.
    expect(
      DESTINATIONS.find((d) => d.id === "revise")?.subtabs?.find((s) => s.id === "todos")?.label
    ).toBe("To-dos");
    expect(
      DESTINATIONS.find((d) => d.id === "revise")?.subtabs?.some((s) => s.id === "log")
    ).toBe(false);
    expect(featureOf("publish", "compile")).toBeUndefined();
  });

  it("groups the rail: Home / pipeline / insight / tools", () => {
    const byGroup = (g: string) => DESTINATIONS.filter((d) => d.group === g).map((d) => d.id);
    expect(byGroup("hub")).toEqual(["home"]);
    expect(byGroup("pipeline")).toEqual(["plan", "write", "revise", "publish"]);
    expect(byGroup("insight")).toEqual(["codex", "track"]);
    expect(byGroup("tools")).toEqual(["search", "help"]);
  });
});
