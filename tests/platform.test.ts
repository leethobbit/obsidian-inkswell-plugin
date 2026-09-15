import { afterEach, describe, expect, it } from "vitest";
import { Platform } from "obsidian";
import {
  deviceFlaggedAsPhone,
  isMobileApp,
  isPhone,
  renderPhoneRedirect,
  setForceTabletLayout,
} from "../src/lib/platform";

/** Minimal stand-in for Obsidian's augmented HTMLElement (createDiv/createEl). */
interface FakeEl {
  cls?: string;
  text?: string;
  children: FakeEl[];
  onclick?: (e: { preventDefault(): void }) => void;
  createDiv(o: { cls?: string; text?: string }): FakeEl;
  createEl(tag: string, o: { cls?: string; text?: string }): FakeEl;
}

function fakeEl(cls?: string, text?: string): FakeEl {
  const el: FakeEl = {
    cls,
    text,
    children: [],
    createDiv(o) {
      const child = fakeEl(o.cls, o.text);
      el.children.push(child);
      return child;
    },
    createEl(_tag, o) {
      const child = fakeEl(o.cls, o.text);
      el.children.push(child);
      return child;
    },
  };
  return el;
}

function find(root: FakeEl, cls: string): FakeEl | undefined {
  for (const c of root.children) {
    if (c.cls === cls) return c;
    const hit = find(c, cls);
    if (hit) return hit;
  }
  return undefined;
}

afterEach(() => {
  Platform.isPhone = false;
  Platform.isMobileApp = false;
  setForceTabletLayout(false);
});

describe("isPhone / override (#41)", () => {
  it("follows Obsidian's flag by default", () => {
    expect(isPhone()).toBe(false);
    Platform.isPhone = true;
    expect(isPhone()).toBe(true);
  });

  it("the override wins over a phone flag, and is a no-op elsewhere", () => {
    Platform.isPhone = true;
    setForceTabletLayout(true);
    expect(isPhone()).toBe(false);
    // The Settings row keys on the RAW flag so the override stays reachable.
    expect(deviceFlaggedAsPhone()).toBe(true);
    Platform.isPhone = false;
    expect(isPhone()).toBe(false);
  });

  it("isMobileApp is independent of the layout override", () => {
    Platform.isMobileApp = true;
    setForceTabletLayout(true);
    expect(isMobileApp()).toBe(true);
  });
});

describe("renderPhoneRedirect", () => {
  it("renders nothing and returns false off a phone (including under the override)", () => {
    const root = fakeEl();
    expect(renderPhoneRedirect(root as unknown as HTMLElement, "Plan")).toBe(false);
    expect(root.children).toHaveLength(0);

    Platform.isPhone = true;
    setForceTabletLayout(true);
    expect(renderPhoneRedirect(root as unknown as HTMLElement, "Plan")).toBe(false);
    expect(root.children).toHaveLength(0);
  });

  it("on a phone renders the notice with device-neutral copy and returns true", () => {
    Platform.isPhone = true;
    const root = fakeEl();
    expect(renderPhoneRedirect(root as unknown as HTMLElement, "Plan")).toBe(true);
    expect(find(root, "inkswell-phone-redirect__title")?.text).toBe("Plan needs a larger screen");
    const body = find(root, "inkswell-phone-redirect__body")?.text ?? "";
    expect(body).toContain("tablet or desktop");
    expect(body).not.toContain("iPad");
    // No callback → no escape-hatch link.
    expect(find(root, "inkswell-phone-redirect__link")).toBeUndefined();
  });

  it("offers the full-layout link only when given a callback, and fires it", () => {
    Platform.isPhone = true;
    const root = fakeEl();
    let fired = 0;
    renderPhoneRedirect(root as unknown as HTMLElement, "Publish", () => fired++);
    const link = find(root, "inkswell-phone-redirect__link");
    expect(link?.text).toBe("Not a phone? Use the full layout");
    let prevented = false;
    link?.onclick?.({ preventDefault: () => (prevented = true) });
    expect(fired).toBe(1);
    expect(prevented).toBe(true);
  });
});
