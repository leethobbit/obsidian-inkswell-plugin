/**
 * Minimal ZIP writer for the built-in .docx export. PURE (no Obsidian, no Node).
 *
 * A .docx is a ZIP of XML parts; Word, LibreOffice, Google Docs and Pages all
 * accept STORED (uncompressed) entries. When the platform has
 * `CompressionStream("deflate-raw")` (Chromium 103+, iOS 16.4+, Node 18+) we
 * DEFLATE instead, purely for file size; a platform without it still gets a
 * valid file. No ZIP64: a manuscript is nowhere near 4 GB.
 *
 * The archive COMMENT carries {@link ZIP_MARKER}. It's how a later compile
 * recognizes its own previous output (replace silently) vs. a file the writer
 * made or re-saved in Word, which drops the comment (ask first, back it up).
 */

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  name: string;
  data: Uint8Array;
}

export interface ZipOptions {
  /** Try DEFLATE (when the platform supports it). Default true. */
  compress?: boolean;
  /** Archive comment (ASCII). */
  comment?: string;
  /** Entry timestamp. Default: now. Pass a fixed date for reproducible output. */
  date?: Date;
}

export const ZIP_MARKER = "inkswell:compile";

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE 802.3), as ZIP requires. */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** True when this platform can DEFLATE via the web Compression Streams API. */
export function canDeflate(): boolean {
  if (typeof CompressionStream !== "function") return false;
  try {
    new CompressionStream("deflate-raw");
    return true;
  } catch {
    return false;
  }
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const utf8 = new TextEncoder();

/** Build a ZIP archive from `entries`, in order. */
export async function zip(entries: ZipEntry[], opts: ZipOptions = {}): Promise<Uint8Array> {
  const deflate = (opts.compress ?? true) && canDeflate();
  const { time, date } = dosDateTime(opts.date ?? new Date());
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = utf8.encode(entry.name);
    const crc = crc32(entry.data);
    let body = entry.data;
    let method = 0;
    if (deflate && entry.data.length > 64) {
      const packed = await deflateRaw(entry.data);
      if (packed.length < entry.data.length) {
        body = packed;
        method = 8;
      }
    }

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    lv.setUint16(6, 0x0800, true); // flags: UTF-8 names
    lv.setUint16(8, method, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, body.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, name.length, true);
    // extra (30), comment (32), disk (34), internal attrs (36), external attrs (38) = 0
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, body);
    centrals.push(central);
    offset += local.length + body.length;
  }

  const comment = utf8.encode(opts.comment ?? "");
  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22 + comment.length);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory signature
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, comment.length, true);
  end.set(comment, 22);

  const out = new Uint8Array(offset + centralSize + end.length);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * The archive comment of a ZIP, or null when `data` isn't a ZIP we can read.
 * Scans backwards for the end-of-central-directory record (it's within the last
 * 64 KiB + 22 bytes).
 */
export function zipComment(data: Uint8Array): string | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const floor = Math.max(0, data.length - 22 - 0xffff);
  for (let i = data.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) !== 0x06054b50) continue;
    const len = view.getUint16(i + 20, true);
    if (i + 22 + len !== data.length) continue;
    return new TextDecoder().decode(data.subarray(i + 22, i + 22 + len));
  }
  return null;
}

/** True when `data` is a file a previous Inkswell compile wrote, unmodified. */
export function isOwnCompile(data: Uint8Array): boolean {
  return zipComment(data) === ZIP_MARKER;
}
