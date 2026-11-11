/**
 * Built-in .docx export: compiled manuscript markdown → a standard-manuscript
 * Word file, as bytes. PURE (no Obsidian, no Node): images are fetched through
 * an injected resolver, so this runs — and is tested — anywhere, mobile included.
 *
 * Text written INTO the document ("about N words", "by", "END") is manuscript
 * content, not UI chrome, so it is deliberately not localized (AGENTS.md:
 * never localize what lands in the vault).
 */
import type { DocxConfig } from "../types";
import { parseManuscript } from "./blocks";
import {
  EMU_PER_TWIP,
  EmbeddedImage,
  ManuscriptOptions,
  appPropsXml,
  contentTypesXml,
  corePropsXml,
  documentRelsXml,
  documentXml,
  headerXml,
  pageGeometry,
  rootRelsXml,
  settingsXml,
  stylesXml,
} from "./ooxml";
import { ZIP_MARKER, ZipEntry, zip } from "./zip";

export { parseManuscript } from "./blocks";
export { isOwnCompile, ZIP_MARKER } from "./zip";
export type { ManuscriptOptions } from "./ooxml";

/** The writer-level details (Settings → Manuscript). */
export interface AuthorDetails {
  name: string;
  contact: string;
}

/**
 * Conventional manuscript word count: nearest 100 below 10,000 words (never
 * "about 0"), nearest 1,000 above. Printed as "about N words".
 */
export function roundWordCount(words: number): number {
  if (words <= 0) return 0;
  if (words < 10_000) return Math.max(100, Math.round(words / 100) * 100);
  return Math.round(words / 1000) * 1000;
}

export function wordCountLabel(words: number): string {
  return `about ${roundWordCount(words).toLocaleString("en-US")} words`;
}

/** Last word of a name, for the running header ("Ursula K. Le Guin" → "Guin" — override when that's wrong). */
export function defaultSurname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/** Resolve stored config + author details into concrete document options. */
export function resolveManuscriptOptions(
  config: DocxConfig | undefined,
  author: AuthorDetails,
  title: string,
  words: number
): ManuscriptOptions {
  const name = author.name.trim();
  const byline = (config?.byline ?? "").trim() || name;
  return {
    title: title.trim() || "Untitled",
    authorName: name,
    contact: author.contact
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    byline,
    surname: (config?.surname ?? "").trim() || defaultSurname(byline),
    font: config?.font === "courier" ? "courier" : "times",
    paper: config?.paper === "a4" ? "a4" : "letter",
    titlePage: config?.titlePage !== false,
    endMarker: config?.endMarker !== false,
    wordCountLabel: wordCountLabel(words),
  };
}

export type ImageType = "png" | "jpeg" | "gif";

/** Pixel size + type from an image's header bytes; null for anything else. */
export function imageInfo(b: Uint8Array): { type: ImageType; w: number; h: number } | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length >= 24 && v.getUint32(0) === 0x89504e47 && v.getUint32(12) === 0x49484452) {
    return { type: "png", w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { type: "gif", w: v.getUint16(6, true), h: v.getUint16(8, true) };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    // Walk JPEG segments to the first start-of-frame marker.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = v.getUint16(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { type: "jpeg", h: v.getUint16(i + 5), w: v.getUint16(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

/** Returns an image's bytes for a manuscript `![](src)`, or null if it can't be found. */
export type ImageResolver = (src: string) => Promise<Uint8Array | null>;

export interface BuildDocxResult {
  bytes: Uint8Array;
  /** Tables, footnotes and code blocks flattened to paragraphs. */
  unsupported: number;
  /** Image sources that couldn't be found or aren't PNG/JPEG/GIF. */
  skippedImages: string[];
}

/** Build the .docx. `now` is injectable for reproducible tests. */
export async function buildDocx(
  markdown: string,
  opts: ManuscriptOptions,
  words: number,
  resolveImage: ImageResolver = () => Promise.resolve(null),
  now: Date = new Date(),
  compress = true
): Promise<BuildDocxResult> {
  const { blocks, unsupported } = parseManuscript(markdown);
  const enc = new TextEncoder();

  const images = new Map<string, EmbeddedImage>();
  const media: ZipEntry[] = [];
  const skippedImages: string[] = [];
  const maxCx = pageGeometry(opts.paper).textWidth * EMU_PER_TWIP;
  for (const b of blocks) {
    if (b.kind !== "image" || images.has(b.src) || skippedImages.includes(b.src)) continue;
    const bytes = await resolveImage(b.src);
    const info = bytes ? imageInfo(bytes) : null;
    if (!bytes || !info || info.w <= 0 || info.h <= 0) {
      skippedImages.push(b.src);
      continue;
    }
    const n = images.size + 1;
    // 96 dpi → 9525 EMU per pixel; scale down (never up) to the text width.
    let cx = info.w * 9525;
    let cy = info.h * 9525;
    if (cx > maxCx) {
      cy = Math.round((cy * maxCx) / cx);
      cx = maxCx;
    }
    const target = `media/image${n}.${info.type}`;
    images.set(b.src, { rid: `rIdImg${n}`, target, cx, cy, id: n });
    media.push({ name: `word/${target}`, data: bytes });
  }

  const xml = (name: string, s: string): ZipEntry => ({ name, data: enc.encode(s) });
  const entries: ZipEntry[] = [
    xml("[Content_Types].xml", contentTypesXml([...images.values()].map((i) => i.target.split(".").pop() ?? ""))),
    xml("_rels/.rels", rootRelsXml()),
    xml("word/document.xml", documentXml(blocks, opts, images)),
    xml("word/_rels/document.xml.rels", documentRelsXml(images.values())),
    xml("word/styles.xml", stylesXml(opts)),
    xml("word/settings.xml", settingsXml()),
    xml("word/header1.xml", headerXml(opts)),
    xml("docProps/core.xml", corePropsXml(opts, now)),
    xml("docProps/app.xml", appPropsXml(words)),
    ...media,
  ];

  const bytes = await zip(entries, { comment: ZIP_MARKER, date: now, compress });
  return { bytes, unsupported, skippedImages };
}
