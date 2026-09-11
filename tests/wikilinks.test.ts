import { describe, expect, it } from "vitest";
import { scanWikilinks, wikilinkAt } from "../src/lib/wikilinks";

describe("scanWikilinks", () => {
  it("parses a plain [[Target]]", () => {
    const [l] = scanWikilinks("see [[Anna]] now");
    expect(l).toMatchObject({ from: 4, to: 12, target: "Anna", linktext: "Anna", display: "Anna" });
    expect("see [[Anna]] now".slice(l.contentFrom, l.contentTo)).toBe("Anna");
    expect(l.heading).toBeUndefined();
    expect(l.alias).toBeUndefined();
  });

  it("parses [[Target|alias]] with the alias as the content", () => {
    const text = "[[Anna|her sister]]";
    const [l] = scanWikilinks(text);
    expect(l).toMatchObject({ target: "Anna", alias: "her sister", linktext: "Anna", display: "her sister" });
    expect(text.slice(l.contentFrom, l.contentTo)).toBe("her sister");
  });

  it("parses [[Target#Heading]] and keeps the heading in linktext and content", () => {
    const text = "[[Anna#Early life]]";
    const [l] = scanWikilinks(text);
    expect(l).toMatchObject({ target: "Anna", heading: "Early life", linktext: "Anna#Early life" });
    expect(text.slice(l.contentFrom, l.contentTo)).toBe("Anna#Early life");
  });

  it("parses [[Target#Heading|alias]] and ^block refs", () => {
    const text = "[[Anna#^abc|there]]";
    const [l] = scanWikilinks(text);
    expect(l).toMatchObject({ heading: "^abc", alias: "there", linktext: "Anna#^abc", display: "there" });
    expect(text.slice(l.contentFrom, l.contentTo)).toBe("there");
  });

  it("allows a same-note [[#Heading]] link", () => {
    const [l] = scanWikilinks("[[#Scene break]]");
    expect(l).toMatchObject({ target: "", heading: "Scene break", linktext: "#Scene break" });
  });

  it("skips embeds and empty links", () => {
    expect(scanWikilinks("![[map.png]] and [[]] and [[   ]]")).toEqual([]);
  });

  it("treats a blank alias as no alias", () => {
    const text = "[[Anna|]]";
    const [l] = scanWikilinks(text);
    expect(l.alias).toBeUndefined();
    expect(l.display).toBe("Anna");
    expect(text.slice(l.contentFrom, l.contentTo)).toBe("Anna");
  });

  it("reports correct offsets for two links on one line", () => {
    const text = "[[A]] met [[B|Bea]].";
    const [a, b] = scanWikilinks(text);
    expect([a.from, a.to]).toEqual([0, 5]);
    expect([b.from, b.to]).toEqual([10, 19]);
    expect(text.slice(b.contentFrom, b.contentTo)).toBe("Bea");
  });

  it("trims the target for linktext but keeps raw offsets", () => {
    const text = "[[ Anna ]]";
    const [l] = scanWikilinks(text);
    expect(l.target).toBe("Anna");
    expect(text.slice(l.contentFrom, l.contentTo)).toBe(" Anna ");
  });
});

describe("wikilinkAt", () => {
  it("finds the link containing the position, inclusive of its edges", () => {
    const text = "x [[Anna]] y";
    expect(wikilinkAt(text, 2)?.linktext).toBe("Anna");
    expect(wikilinkAt(text, 10)?.linktext).toBe("Anna");
    expect(wikilinkAt(text, 11)).toBeNull();
    expect(wikilinkAt(text, 0)).toBeNull();
  });
});
