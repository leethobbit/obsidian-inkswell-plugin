import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { blocksText, parseInline, parseManuscript } from "../src/compile/docx/blocks";
import {
  buildDocx,
  defaultSurname,
  imageInfo,
  resolveManuscriptOptions,
  roundWordCount,
} from "../src/compile/docx";
import { chapterLevel, documentXml, headerXml, stylesXml, xmlText } from "../src/compile/docx/ooxml";
import { crc32, isOwnCompile, zip, zipComment, ZIP_MARKER } from "../src/compile/docx/zip";

// --- test-only ZIP reader (central directory → entries) -----------------------
function unzip(data: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = data.length - 22;
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("no EOCD");
  const count = v.getUint16(eocd + 10, true);
  let at = v.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    expect(v.getUint32(at, true)).toBe(0x02014b50);
    const method = v.getUint16(at + 10, true);
    const crc = v.getUint32(at + 16, true);
    const csize = v.getUint32(at + 20, true);
    const usize = v.getUint32(at + 24, true);
    const nameLen = v.getUint16(at + 28, true);
    const extraLen = v.getUint16(at + 30, true);
    const commentLen = v.getUint16(at + 32, true);
    const local = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(data.subarray(at + 46, at + 46 + nameLen));
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    const lNameLen = v.getUint16(local + 26, true);
    const lExtraLen = v.getUint16(local + 28, true);
    const body = data.subarray(local + 30 + lNameLen + lExtraLen, local + 30 + lNameLen + lExtraLen + csize);
    const raw = method === 8 ? new Uint8Array(inflateRawSync(body)) : body;
    expect(raw.length).toBe(usize);
    expect(crc32(raw)).toBe(crc);
    out.set(name, raw);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
const text = (b: Uint8Array | undefined) => new TextDecoder().decode(b);

/** Minimal well-formedness: balanced tags, no raw `<`/`&` in text or attributes. */
function assertWellFormed(xml: string): void {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, "");
  const stack: string[] = [];
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g;
  let last = 0;
  for (let m = tagRe.exec(body); m; m = tagRe.exec(body)) {
    const between = body.slice(last, m.index);
    expect(between, `stray markup before <${m[2]}>`).not.toMatch(/[<>]/);
    expect(between).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    expect(m[3]).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    if (m[1]) expect(stack.pop(), `unbalanced </${m[2]}>`).toBe(m[2]);
    else if (!m[4]) stack.push(m[2]);
    last = tagRe.lastIndex;
  }
  expect(body.slice(last).trim()).toBe("");
  expect(stack).toEqual([]);
}

const FIXED = new Date(Date.UTC(2026, 10, 10, 12, 0, 0));
const AUTHOR = { name: "Jane Q. Writer", contact: "1 Main St\nSpringfield\njane@example.com" };

describe("zip", () => {
  it("crc32 matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  for (const compress of [false, true]) {
    it(`round-trips entries (${compress ? "deflate" : "stored"})`, async () => {
      const big = new TextEncoder().encode("lorem ipsum ".repeat(500));
      const bytes = await zip(
        [
          { name: "a.txt", data: new TextEncoder().encode("hello") },
          { name: "dir/ünïcode.xml", data: big },
        ],
        { compress, comment: ZIP_MARKER, date: FIXED }
      );
      const files = unzip(bytes);
      expect(text(files.get("a.txt"))).toBe("hello");
      expect(files.get("dir/ünïcode.xml")).toEqual(big);
      if (compress) expect(bytes.length).toBeLessThan(big.length);
    });
  }

  it("marks its own output and nothing else", async () => {
    const own = await zip([{ name: "x", data: new Uint8Array([1]) }], { comment: ZIP_MARKER });
    const foreign = await zip([{ name: "x", data: new Uint8Array([1]) }]);
    expect(zipComment(own)).toBe(ZIP_MARKER);
    expect(isOwnCompile(own)).toBe(true);
    expect(isOwnCompile(foreign)).toBe(false);
    expect(isOwnCompile(new TextEncoder().encode("not a zip at all"))).toBe(false);
  });
});

describe("parseInline", () => {
  const fmt = (src: string) =>
    parseInline(src).map((r) =>
      "br" in r ? "<br>" : `${r.bold ? "B" : ""}${r.italic ? "I" : ""}${r.strike ? "S" : ""}${r.underline ? "U" : ""}${r.code ? "C" : ""}[${r.text}]`
    );

  it("handles emphasis forms", () => {
    expect(fmt("a *b* c")).toEqual(["[a ]", "I[b]", "[ c]"]);
    expect(fmt("a **b** _c_ ***d***")).toEqual(["[a ]", "B[b]", "[ ]", "I[c]", "[ ]", "BI[d]"]);
    expect(fmt("*a **b** c*")).toEqual(["I[a ]", "BI[b]", "I[ c]"]);
    expect(fmt("~~gone~~ and ==lit==")).toEqual(["S[gone]", "[ and lit]"]);
    expect(fmt("<i>it</i> <b>bo</b> <u>un</u>")).toEqual(["I[it]", "[ ]", "B[bo]", "[ ]", "U[un]"]);
  });

  it("leaves stray or intraword markers literal", () => {
    expect(fmt("snake_case_name")).toEqual(["[snake_case_name]"]);
    expect(fmt("5 * 3 = 15")).toEqual(["[5 * 3 = 15]"]);
    expect(fmt("an *unclosed star")).toEqual(["[an *unclosed star]"]);
    expect(fmt("\\*not italic\\*")).toEqual(["[*not italic*]"]);
  });

  it("keeps unknown angle-bracket text as prose, decodes entities, breaks lines", () => {
    expect(fmt("Dear <Insert name>, &amp; <TK>")).toEqual(["[Dear <Insert name>, & <TK>]"]);
    expect(fmt("one<br>two")).toEqual(["[one]", "<br>", "[two]"]);
    expect(fmt("use `code` here")).toEqual(["[use ]", "C[code]", "[ here]"]);
  });
});

describe("parseManuscript", () => {
  it("recognizes headings, scene breaks, quotes, lists, aligned blocks", () => {
    const md = [
      "# Chapter One",
      "",
      "First para line one",
      "continues here.",
      "",
      "* * *",
      "",
      "> A letter,",
      "> signed.",
      "",
      "- item one",
      "- item two",
      "",
      '<p align="right">Signed,<br>Me</p>',
      "",
      "#",
      "",
      "---",
      "",
      "Last.",
    ].join("\n");
    const { blocks } = parseManuscript(md);
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading", "para", "sceneBreak", "para", "para", "para", "para", "sceneBreak", "sceneBreak", "para",
    ]);
    const para1 = blocks[1];
    expect(para1.kind === "para" && para1.runs).toEqual([{ text: "First para line one continues here." }]);
    expect(blocks[3]).toMatchObject({ kind: "para", quote: true });
    expect(blocks[4]).toMatchObject({ kind: "para", list: { depth: 0, marker: "•" } });
    expect(blocks[6]).toMatchObject({ kind: "para", align: "right" });
  });

  it("flattens tables, footnotes and code fences, and counts them", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |\n\n[^1]: A note.\n\n```\nx = 1\n```\n";
    const { blocks, unsupported } = parseManuscript(md);
    expect(unsupported).toBe(3);
    expect(blocksText(blocks)).toContain("1 · 2");
    expect(blocksText(blocks)).toContain("A note.");
    expect(blocksText(blocks)).toContain("x = 1");
  });

  it("never drops prose words", () => {
    const md =
      "## Title\n\nShe said *hello*, then **left**. Price: 5 * 3.\n\n> quoted words\n\n1. numbered words\n\n" +
      "<center>centered words</center>\n\nDear <Insert name>,\n";
    const words = (s: string) => s.match(/[A-Za-z]+/g) ?? [];
    const out = new Set(words(blocksText(parseManuscript(md).blocks)));
    for (const w of words(md.replace(/<\/?center>/g, ""))) expect(out, w).toContain(w);
  });

  it("treats an image alone on a line as an image block", () => {
    const { blocks } = parseManuscript("![The map](<maps/world map.png>)\n");
    expect(blocks).toEqual([{ kind: "image", alt: "The map", src: "maps/world map.png" }]);
  });
});

describe("manuscript options", () => {
  it("rounds word counts conventionally", () => {
    expect(roundWordCount(0)).toBe(0);
    expect(roundWordCount(42)).toBe(100);
    expect(roundWordCount(4_349)).toBe(4_300);
    expect(roundWordCount(87_501)).toBe(88_000);
  });

  it("derives byline and surname, honoring overrides", () => {
    expect(defaultSurname("Jane Q. Writer")).toBe("Writer");
    const o = resolveManuscriptOptions(undefined, AUTHOR, "My Book", 87_501);
    expect(o).toMatchObject({
      byline: "Jane Q. Writer",
      surname: "Writer",
      font: "times",
      paper: "letter",
      titlePage: true,
      endMarker: true,
      wordCountLabel: "about 88,000 words",
      contact: ["1 Main St", "Springfield", "jane@example.com"],
    });
    const p = resolveManuscriptOptions({ byline: "J. Penname", font: "courier", titlePage: false }, AUTHOR, "X", 10);
    expect(p).toMatchObject({ byline: "J. Penname", surname: "Penname", font: "courier", titlePage: false });
  });
});

describe("ooxml", () => {
  const opts = resolveManuscriptOptions(undefined, AUTHOR, "Tom & Jerry <2>", 1234);

  it("escapes text and drops XML-forbidden characters", () => {
    expect(xmlText('a & b < c > "d"\u0001')).toBe("a &amp; b &lt; c &gt; &quot;d&quot;");
  });

  it("produces well-formed parts", () => {
    const { blocks } = parseManuscript("# One\n\nHi & bye <TK>.\n\n* * *\n\nMore.\n\n## Sub\n\nText.");
    assertWellFormed(documentXml(blocks, opts, new Map()));
    assertWellFormed(stylesXml(opts));
    assertWellFormed(headerXml(opts));
  });

  it("puts chapters on a new page except the first, and indents only non-first paragraphs", () => {
    const { blocks } = parseManuscript("## One\n\nA.\n\nB.\n\n## Two\n\nC.\n\n### Scene\n\nD.");
    expect(chapterLevel(blocks)).toBe(2);
    const xml = documentXml(blocks, { ...opts, titlePage: false, endMarker: false }, new Map());
    const paras = xml.match(/<w:p>.*?<\/w:p>/g) ?? [];
    const styles = paras.map((p) => /w:pStyle w:val="(\w+)"/.exec(p)?.[1]);
    expect(styles).toEqual([
      "Heading1", "FirstParagraph", "Normal", "Heading1", "FirstParagraph", "Heading2", "FirstParagraph",
    ]);
    expect(paras[0]).toContain('<w:pageBreakBefore w:val="0"/>');
    expect(paras[3]).not.toContain("pageBreakBefore");
  });

  it("header carries surname, upper-cased title and a PAGE field", () => {
    const h = headerXml(opts);
    expect(h).toContain("Writer / TOM &amp; JERRY &lt;2&gt; / ");
    expect(h).toContain(" PAGE ");
  });
});

describe("imageInfo", () => {
  it("reads PNG and GIF dimensions", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 640);
    new DataView(png.buffer).setUint32(20, 480);
    expect(imageInfo(png)).toEqual({ type: "png", w: 640, h: 480 });
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 10, 0, 20, 0]);
    expect(imageInfo(gif)).toEqual({ type: "gif", w: 10, h: 20 });
    expect(imageInfo(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("buildDocx", () => {
  it("writes a complete, marked docx with title page, header and embedded image", async () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 2000);
    new DataView(png.buffer).setUint32(20, 1000);
    const md = "# Chapter One\n\nIt was a *dark* night.\n\n![map](map.png)\n\n![gone](missing.webp)\n";
    const opts = resolveManuscriptOptions(undefined, AUTHOR, "My Book", 6);
    const result = await buildDocx(
      md,
      opts,
      6,
      (src) => Promise.resolve(src === "map.png" ? png : null),
      FIXED
    );
    expect(isOwnCompile(result.bytes)).toBe(true);
    expect(result.skippedImages).toEqual(["missing.webp"]);

    const files = unzip(result.bytes);
    expect([...files.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/_rels/document.xml.rels",
      "word/styles.xml",
      "word/settings.xml",
      "word/header1.xml",
      "docProps/core.xml",
      "docProps/app.xml",
      "word/media/image1.png",
    ]);
    for (const [name, data] of files) if (name.endsWith(".xml") || name.endsWith(".rels")) assertWellFormed(text(data));

    const doc = text(files.get("word/document.xml"));
    expect(doc).toContain("Jane Q. Writer</w:t></w:r><w:r><w:tab/>");
    expect(doc).toContain("about 100 words");
    expect(doc).toContain("by Jane Q. Writer");
    expect(doc).toContain('<w:i/><w:iCs/></w:rPr><w:t xml:space="preserve">dark</w:t>');
    expect(doc).toContain('r:embed="rIdImg1"');
    // Scaled to the 6.5-inch text width, aspect kept.
    expect(doc).toContain('<wp:extent cx="5943600" cy="2971800"/>');
    expect(doc).toContain(">END<");
    expect(text(files.get("[Content_Types].xml"))).toContain('Extension="png"');
    expect(text(files.get("word/_rels/document.xml.rels"))).toContain('Target="media/image1.png"');
  });
});

// Word validates child ORDER inside these containers (ECMA-376 sequences);
// an out-of-order child can make Word report "unreadable content".
const SEQUENCES: Record<string, string[]> = {
  "w:pPr": [
    "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr",
    "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap",
    "overflowPunct", "topLinePunct", "autoSpaceDE", "autoSpaceDN", "bidi", "adjustRightInd",
    "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc",
    "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr",
    "sectPr", "pPrChange",
  ],
  "w:rPr": [
    "rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline",
    "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing",
    "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText",
    "vertAlign", "rtl", "cs", "em", "lang",
  ],
  "w:sectPr": [
    "headerReference", "footerReference", "footnotePr", "endnotePr", "type", "pgSz", "pgMar",
    "paperSrc", "pgBorders", "lnNumType", "pgNumType", "cols", "formProt", "vAlign", "noEndnote",
    "titlePg", "textDirection", "bidi", "rtlGutter", "docGrid",
  ],
  "w:style": [
    "name", "aliases", "basedOn", "next", "link", "autoRedefine", "hidden", "uiPriority",
    "semiHidden", "unhideWhenUsed", "qFormat", "locked", "personal", "personalCompose",
    "personalReply", "rsid", "pPr", "rPr", "tblPr", "trPr", "tcPr", "tblStylePr",
  ],
};

/** Direct child element names of every `<tag>…</tag>` in `xml`, in order. */
function childSequences(xml: string, tag: string): string[][] {
  const out: string[][] = [];
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  for (let m = open.exec(xml); m; m = open.exec(xml)) {
    const kids: string[] = [];
    let depth = 0;
    const re = /<(\/?)w:(\w+)[^>]*?(\/?)>/g;
    re.lastIndex = m.index + m[0].length;
    for (let k = re.exec(xml); k; k = re.exec(xml)) {
      if (k[1]) {
        if (depth === 0) break; // our own closing tag
        depth--;
        continue;
      }
      if (depth === 0) kids.push(k[2]);
      if (!k[3]) depth++;
    }
    out.push(kids);
  }
  return out;
}

describe("ooxml schema child order", () => {
  it("every pPr / rPr / sectPr / style lists its children in schema order", async () => {
    const md = "# One\n\nA *b* **c** ~~d~~ <u>e</u> `f`.\n\n* * *\n\n> q\n\n- l\n\n<center>x</center>\n\n## Two\n\n### Three\n\nEnd.";
    for (const titlePage of [true, false]) {
      const opts = { ...resolveManuscriptOptions(undefined, AUTHOR, "T", 10), titlePage };
      const { blocks } = parseManuscript(md);
      const parts = [documentXml(blocks, opts, new Map()), stylesXml(opts), headerXml(opts)];
      for (const xml of parts) {
        for (const [tag, order] of Object.entries(SEQUENCES)) {
          for (const kids of childSequences(xml, tag)) {
            const idx = kids.map((k) => order.indexOf(k));
            expect(idx.every((i) => i >= 0), `${tag} has unknown child: ${kids.join(",")}`).toBe(true);
            expect([...idx].sort((a, b) => a - b), `${tag} out of order: ${kids.join(",")}`).toEqual(idx);
          }
        }
      }
    }
  });
});
