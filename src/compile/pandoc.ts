/**
 * Optional pandoc-backed export (docx / pdf / epub …).
 *
 * Desktop-only and best-effort: everything here feature-detects the filesystem
 * adapter and the pandoc binary, and throws a clear, user-facing error when
 * either is missing. Nothing in this module runs on mobile.
 */

import { App, FileSystemAdapter } from "obsidian";
import { PandocOutput } from "./types";

type ExecFile = (
  file: string,
  args: string[],
  options: Record<string, unknown>,
  cb: (err: Error | null, stdout: string | Buffer, stderr: string) => void
) => void;

function nodeRequire(id: string): unknown {
  // Guarded indirect require: present on desktop (Electron), absent on mobile.
  const req = (window as unknown as { require?: (id: string) => unknown }).require;
  if (typeof req !== "function") {
    throw new Error("Node APIs unavailable (mobile?) — pandoc export needs desktop.");
  }
  return req(id);
}

/** Resolve the vault's absolute base path, or throw if not on a real FS. */
function basePath(app: App): string {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) {
    throw new Error("Pandoc export requires a local (desktop) vault.");
  }
  return adapter.getBasePath();
}

/** Probe for a working pandoc binary. Resolves false rather than throwing. */
export async function isPandocAvailable(): Promise<boolean> {
  return probeBinary("pandoc");
}

/** PDF engines pandoc can drive, in rough order of prevalence. */
const PDF_ENGINES = [
  "pdflatex",
  "xelatex",
  "lualatex",
  "tectonic",
  "wkhtmltopdf",
  "weasyprint",
  "context",
];

/**
 * Probe for a PDF engine pandoc can use. `pandoc -t pdf` shells out to one of
 * these (LaTeX by default), so pandoc alone is NOT enough for PDF export.
 * Resolves false rather than throwing.
 */
export async function isPdfEngineAvailable(): Promise<boolean> {
  for (const engine of PDF_ENGINES) {
    if (await probeBinary(engine)) return true;
  }
  return false;
}

/** True if `bin --version` runs without error. Never throws. */
async function probeBinary(bin: string): Promise<boolean> {
  try {
    const { execFile } = nodeRequire("child_process") as { execFile: ExecFile };
    return await new Promise<boolean>((resolve) => {
      execFile(bin, ["--version"], {}, (err) => resolve(!err));
    });
  } catch {
    return false;
  }
}

/** What this machine can actually export via pandoc. */
export interface PandocSupport {
  /** A pandoc binary is on PATH. */
  pandoc: boolean;
  /** A PDF engine is available (only meaningful when `pandoc` is true). */
  pdfEngine: boolean;
}

let cachedSupport: PandocSupport | undefined;
let probePromise: Promise<PandocSupport> | null = null;

/**
 * Synchronous read of the cached probe result, or `undefined` if never probed.
 * Sync UI (the compile panel renders synchronously) reads this; a first render
 * with `undefined` should kick {@link probePandocSupport} and re-render on resolve.
 */
export function pandocAvailableCached(): PandocSupport | undefined {
  return cachedSupport;
}

/** Probe pandoc + PDF-engine availability once and cache it for the session. */
export function probePandocSupport(): Promise<PandocSupport> {
  if (!probePromise) {
    probePromise = (async () => {
      const pandoc = await isPandocAvailable();
      const pdfEngine = pandoc ? await isPdfEngineAvailable() : false;
      cachedSupport = { pandoc, pdfEngine };
      return cachedSupport;
    })();
  }
  return probePromise;
}

/** A user-facing message for a pandoc spawn/run failure. */
function pandocErrorMessage(err: Error, stderr: string): string {
  if ((err as Error & { code?: string }).code === "ENOENT") {
    return "pandoc isn't installed or isn't on your PATH. Install it from https://pandoc.org, then restart Obsidian.";
  }
  return `pandoc failed: ${stderr || err.message}`;
}

/**
 * Convert a manuscript string to the configured pandoc target.
 * `vaultRelativeBase` is the output basename (no extension) relative to the
 * vault root. Returns the absolute path of the produced file.
 */
export async function runPandoc(
  app: App,
  manuscript: string,
  vaultRelativeBase: string,
  pandoc: PandocOutput
): Promise<string> {
  const { execFile } = nodeRequire("child_process") as { execFile: ExecFile };
  const fs = nodeRequire("fs") as typeof import("fs");
  const path = nodeRequire("path") as typeof import("path");
  const os = nodeRequire("os") as typeof import("os");

  const root = basePath(app);
  const absBase = path.join(root, vaultRelativeBase);
  // Temp input lives OUTSIDE the vault (so Obsidian never indexes a stray note)
  // with a unique name (so two compiles running at once can't clobber each other).
  const inputPath = path.join(
    os.tmpdir(),
    `inkswell-pandoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.md`
  );
  const outputPath = `${absBase}.${pandoc.extension}`;

  fs.writeFileSync(inputPath, manuscript, "utf8");
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "pandoc",
        [inputPath, "-f", "markdown", "-t", pandoc.to, "-o", outputPath, ...pandoc.extraArgs],
        // Run from the vault root so relative args (e.g. --reference-doc) resolve.
        { cwd: root, maxBuffer: 16 * 1024 * 1024 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(new Error(pandocErrorMessage(err, stderr)));
          } else {
            resolve();
          }
        }
      );
    });
  } finally {
    try {
      fs.unlinkSync(inputPath);
    } catch {
      /* best-effort cleanup */
    }
  }
  return outputPath;
}

/**
 * Write pandoc's default reference.docx to `vaultRelativePath` (a starting point
 * the user then styles in Word). Returns the absolute path written.
 */
export async function generateReferenceDoc(
  app: App,
  vaultRelativePath: string
): Promise<string> {
  const { execFile } = nodeRequire("child_process") as { execFile: ExecFile };
  const fs = nodeRequire("fs") as typeof import("fs");
  const path = nodeRequire("path") as typeof import("path");

  const outPath = path.join(basePath(app), vaultRelativePath);
  const buf = await new Promise<Buffer>((resolve, reject) => {
    execFile(
      "pandoc",
      ["--print-default-data-file", "reference.docx"],
      { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
      (err, stdout) => {
        if (err) reject(new Error(pandocErrorMessage(err, "")));
        else resolve(stdout as Buffer);
      }
    );
  });
  fs.writeFileSync(outPath, buf);
  return outPath;
}
