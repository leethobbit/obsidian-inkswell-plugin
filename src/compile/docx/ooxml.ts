/**
 * Block list + manuscript options → the XML parts of a .docx. PURE.
 *
 * Deliberately small: one styles part with the handful of paragraph styles a
 * standard manuscript needs, one header (surname / title / page), no numbering
 * part (list markers are literal text with a hanging indent, which every
 * reader renders identically). Style names for headings use Word's built-in
 * lower-case names ("heading 1") so Word's navigation pane and outline view
 * recognize them.
 */
import type { Block, Run } from "./blocks";

export interface ManuscriptOptions {
  title: string;
  /** Legal name, top-left of the title page. */
  authorName: string;
  /** Contact lines under the name on the title page. */
  contact: string[];
  /** Name readers see ("by …"). */
  byline: string;
  /** Running-header surname. Empty = header shows just title + page. */
  surname: string;
  font: "times" | "courier";
  paper: "letter" | "a4";
  titlePage: boolean;
  endMarker: boolean;
  /** Already rounded, ready to print ("about N words"). */
  wordCountLabel: string;
}

/** An image the document embeds, resolved by the caller. */
export interface EmbeddedImage {
  /** Relationship id, e.g. "rIdImg1". */
  rid: string;
  /** Part name under word/, e.g. "media/image1.png". */
  target: string;
  /** Extent in EMU. */
  cx: number;
  cy: number;
  /** Sequential id for docPr / cNvPr. */
  id: number;
}

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const FONT_NAME = { times: "Times New Roman", courier: "Courier New" } as const;

/** Page geometry in twips (1/1440 in). 1-inch margins all round. */
export function pageGeometry(paper: ManuscriptOptions["paper"]) {
  const [w, h] = paper === "a4" ? [11906, 16838] : [12240, 15840];
  const margin = 1440;
  return { w, h, margin, textWidth: w - 2 * margin, textHeight: h - 2 * margin };
}

/** EMU (English Metric Units) per twip. A text-width image is textWidth * this. */
export const EMU_PER_TWIP = 635;

/** XML-escape text, dropping characters XML 1.0 forbids (they'd make Word refuse the file). */
export function xmlText(s: string): string {
  return stripXmlInvalid(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Drop C0 controls other than tab/LF/CR, U+FFFE/U+FFFF, and unpaired surrogates. */
function stripXmlInvalid(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    if (c === 0xfffe || c === 0xffff) continue;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s[i] + s[i + 1];
        i++;
      }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    out += s[i];
  }
  return out;
}

function textRun(text: string, rPr = ""): string {
  // Tabs are elements, not characters, in WordprocessingML.
  return text
    .split("\t")
    .map((part, i) => (i ? "<w:tab/>" : "") + (part ? `<w:t xml:space="preserve">${xmlText(part)}</w:t>` : ""))
    .map((inner) => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}${inner}</w:r>`)
    .join("");
}

function runsXml(runs: Run[]): string {
  return runs
    .map((r) => {
      if ("br" in r) return "<w:r><w:br/></w:r>";
      let rPr = "";
      if (r.code) rPr += `<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>`;
      if (r.bold) rPr += "<w:b/><w:bCs/>";
      // Manuscript convention is italics (the old underline-for-italics rule is
      // long retired); a writer who wants underline uses <u>.
      if (r.italic) rPr += "<w:i/><w:iCs/>";
      if (r.strike) rPr += "<w:strike/>";
      if (r.underline) rPr += '<w:u w:val="single"/>';
      return textRun(r.text, rPr);
    })
    .join("");
}

function p(style: string, inner: string, extraPPr = ""): string {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extraPPr}</w:pPr>${inner}</w:p>`;
}

const JC: Record<string, string> = { left: "left", right: "right", center: "center", justify: "both" };

function sectPr(opts: ManuscriptOptions, withHeader: boolean, restartNumbering: boolean): string {
  const g = pageGeometry(opts.paper);
  return (
    "<w:sectPr>" +
    (withHeader ? '<w:headerReference w:type="default" r:id="rIdHeader1"/>' : "") +
    `<w:pgSz w:w="${g.w}" w:h="${g.h}"/>` +
    `<w:pgMar w:top="${g.margin}" w:right="${g.margin}" w:bottom="${g.margin}" w:left="${g.margin}" w:header="720" w:footer="720" w:gutter="0"/>` +
    (restartNumbering ? '<w:pgNumType w:start="1"/>' : "") +
    "</w:sectPr>"
  );
}

function drawing(img: EmbeddedImage, alt: string): string {
  const name = img.target.split("/").pop() ?? "image";
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${img.cx}" cy="${img.cy}"/>` +
    `<wp:docPr id="${img.id}" name="Picture ${img.id}" descr="${xmlText(alt)}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="${NS_PIC}"><pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="${img.id}" name="${xmlText(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${img.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

/** The shallowest heading level present: that level is "chapter". */
export function chapterLevel(blocks: Block[]): number {
  let min = 7;
  for (const b of blocks) if (b.kind === "heading" && b.level < min) min = b.level;
  return min === 7 ? 1 : min;
}

/** word/document.xml */
export function documentXml(
  blocks: Block[],
  opts: ManuscriptOptions,
  images: ReadonlyMap<string, EmbeddedImage>
): string {
  const out: string[] = [];

  if (opts.titlePage) {
    out.push(p("TitleContact", textRun(`${opts.authorName}\t${opts.wordCountLabel}`)));
    for (const line of opts.contact) out.push(p("TitleContact", textRun(line)));
    out.push(p("Title", textRun(opts.title)));
    // The title page is its own section: no running header, and the manuscript
    // proper restarts at page 1.
    out.push(
      p("Byline", opts.byline ? textRun(`by ${opts.byline}`) : "", sectPr(opts, false, false))
    );
  }

  const chapter = chapterLevel(blocks);
  let first = true; // first body block: never page-break before it
  let indentNext = false; // false right after a heading / scene break / start

  for (const b of blocks) {
    switch (b.kind) {
      case "heading": {
        const rank = Math.min(3, Math.max(1, b.level - chapter + 1));
        // Suppress the style's page break on the very first block: the section
        // break (or the top of the document) already starts a fresh page.
        const extra = rank === 1 && first ? '<w:pageBreakBefore w:val="0"/>' : "";
        out.push(p(`Heading${rank}`, runsXml(b.runs), extra));
        indentNext = false;
        break;
      }
      case "sceneBreak":
        out.push(p("SceneBreak", textRun("#")));
        indentNext = false;
        break;
      case "image": {
        const img = images.get(b.src);
        if (img) out.push(p("Plain", drawing(img, b.alt), '<w:jc w:val="center"/>'));
        break;
      }
      case "para": {
        if (b.list) {
          const left = 720 * (b.list.depth + 1);
          out.push(
            p(
              "ListParagraph",
              textRun(`${b.list.marker}\t`) + runsXml(b.runs),
              `<w:ind w:left="${left}" w:hanging="360"/>`
            )
          );
        } else if (b.quote) {
          out.push(p("BlockQuote", runsXml(b.runs)));
        } else if (b.align) {
          out.push(p("Plain", runsXml(b.runs), `<w:jc w:val="${JC[b.align]}"/>`));
        } else if (b.plain) {
          out.push(p("Plain", runsXml(b.runs)));
        } else {
          out.push(p(indentNext ? "Normal" : "FirstParagraph", runsXml(b.runs)));
          indentNext = true;
          break;
        }
        indentNext = false;
        break;
      }
    }
    first = false;
  }

  if (opts.endMarker) out.push(p("SceneBreak", textRun("END")));
  if (out.length === 0) out.push(p("Normal", ""));

  return (
    XML_HEAD +
    `<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}" xmlns:wp="${NS_WP}" xmlns:a="${NS_A}" xmlns:pic="${NS_PIC}">` +
    `<w:body>${out.join("")}${sectPr(opts, true, opts.titlePage)}</w:body></w:document>`
  );
}

/** word/styles.xml */
export function stylesXml(opts: ManuscriptOptions): string {
  const font = FONT_NAME[opts.font];
  const g = pageGeometry(opts.paper);
  // Chapters open about a third of the way down the page; the title sits below
  // the contact block plus the same gap, i.e. roughly mid-page.
  const chapterBefore = Math.round(g.textHeight / 3);
  const titleBefore = Math.round(g.textHeight / 3);
  const style = (id: string, name: string, pPr: string, rPr = "", extra = "") =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>` +
    `<w:basedOn w:val="Normal"/>${extra}<w:qFormat/>` +
    `<w:pPr>${pPr}</w:pPr>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}</w:style>`;
  const noIndent = '<w:ind w:firstLine="0"/>';
  const single = '<w:spacing w:line="240" w:lineRule="auto"/>';

  return (
    XML_HEAD +
    `<w:styles xmlns:w="${NS_W}">` +
    "<w:docDefaults><w:rPrDefault><w:rPr>" +
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>` +
    '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/>' +
    "</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>" +
    '<w:widowControl/><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/>' +
    "</w:pPr></w:pPrDefault></w:docDefaults>" +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>' +
    '<w:pPr><w:ind w:firstLine="720"/></w:pPr></w:style>' +
    style("FirstParagraph", "First Paragraph", noIndent, "", '<w:next w:val="Normal"/>') +
    style(
      "Heading1",
      "heading 1",
      `<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="${chapterBefore}" w:after="480"/>${noIndent}<w:jc w:val="center"/><w:outlineLvl w:val="0"/>`,
      "",
      '<w:next w:val="FirstParagraph"/>'
    ) +
    style(
      "Heading2",
      "heading 2",
      `<w:keepNext/>${noIndent}<w:jc w:val="center"/><w:outlineLvl w:val="1"/>`,
      "",
      '<w:next w:val="FirstParagraph"/>'
    ) +
    style(
      "Heading3",
      "heading 3",
      `<w:keepNext/>${noIndent}<w:outlineLvl w:val="2"/>`,
      "<w:i/><w:iCs/>",
      '<w:next w:val="FirstParagraph"/>'
    ) +
    style("SceneBreak", "Scene Break", `${noIndent}<w:jc w:val="center"/>`, "", '<w:next w:val="FirstParagraph"/>') +
    style("BlockQuote", "Block Text", '<w:ind w:left="720" w:right="720" w:firstLine="0"/>') +
    style("ListParagraph", "List Paragraph", noIndent) +
    style("Plain", "Plain Paragraph", noIndent) +
    style("TitleContact", "Title Page Contact", `<w:tabs><w:tab w:val="right" w:pos="${g.textWidth}"/></w:tabs>${single}${noIndent}`) +
    style("Title", "Title", `<w:spacing w:before="${titleBefore}"/>${noIndent}<w:jc w:val="center"/>`) +
    style("Byline", "Byline", `${noIndent}<w:jc w:val="center"/>`) +
    style("Header", "header", `${single}${noIndent}<w:jc w:val="right"/>`) +
    "</w:styles>"
  );
}

/** word/header1.xml: "Surname / TITLE / page". */
export function headerXml(opts: ManuscriptOptions): string {
  const lead = [opts.surname, opts.title.toUpperCase()].filter((s) => s.trim()).join(" / ");
  const field =
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
    "<w:r><w:t>1</w:t></w:r>" +
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
  return (
    XML_HEAD +
    `<w:hdr xmlns:w="${NS_W}" xmlns:r="${NS_R}">` +
    p("Header", textRun(lead ? `${lead} / ` : "") + field) +
    "</w:hdr>"
  );
}

export function settingsXml(): string {
  return (
    XML_HEAD +
    `<w:settings xmlns:w="${NS_W}"><w:defaultTabStop w:val="720"/>` +
    '<w:characterSpacingControl w:val="doNotCompress"/>' +
    '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
    "</w:settings>"
  );
}

export function contentTypesXml(imageExts: Iterable<string>): string {
  const mime: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", gif: "image/gif" };
  const defaults = [...new Set(imageExts)]
    .filter((e) => mime[e])
    .map((e) => `<Default Extension="${e}" ContentType="${mime[e]}"/>`)
    .join("");
  const wml = "application/vnd.openxmlformats-officedocument.wordprocessingml";
  return (
    XML_HEAD +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    defaults +
    `<Override PartName="/word/document.xml" ContentType="${wml}.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="${wml}.styles+xml"/>` +
    `<Override PartName="/word/settings.xml" ContentType="${wml}.settings+xml"/>` +
    `<Override PartName="/word/header1.xml" ContentType="${wml}.header+xml"/>` +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>"
  );
}

export function rootRelsXml(): string {
  return (
    XML_HEAD +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>` +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>` +
    "</Relationships>"
  );
}

export function documentRelsXml(images: Iterable<EmbeddedImage>): string {
  const imgs = [...images]
    .map((i) => `<Relationship Id="${i.rid}" Type="${REL}/image" Target="${i.target}"/>`)
    .join("");
  return (
    XML_HEAD +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    `<Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rIdSettings" Type="${REL}/settings" Target="settings.xml"/>` +
    `<Relationship Id="rIdHeader1" Type="${REL}/header" Target="header1.xml"/>` +
    imgs +
    "</Relationships>"
  );
}

export function corePropsXml(opts: ManuscriptOptions, now: Date): string {
  const when = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    XML_HEAD +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${xmlText(opts.title)}</dc:title>` +
    `<dc:creator>${xmlText(opts.byline || opts.authorName)}</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${when}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${when}</dcterms:modified>` +
    "</cp:coreProperties>"
  );
}

export function appPropsXml(words: number): string {
  return (
    XML_HEAD +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    `<Application>Inkswell</Application><Words>${Math.max(0, Math.round(words))}</Words>` +
    "</Properties>"
  );
}
