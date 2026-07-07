import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  PHONE_REDIRECTED,
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
});
