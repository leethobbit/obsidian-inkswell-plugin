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

function nodeRequire(id: string): any {
  // Guarded indirect require: present on desktop (Electron), absent on mobile.
  const req = (window as any).require;
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
  try {
    const { execFile } = nodeRequire("child_process") as { execFile: ExecFile };
    return await new Promise<boolean>((resolve) => {
      execFile("pandoc", ["--version"], {}, (err) => resolve(!err));
    });
  } catch {
    return false;
  }
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

  const root = basePath(app);
  const absBase = path.join(root, vaultRelativeBase);
  const inputPath = `${absBase}.inkswell-input.md`;
  const outputPath = `${absBase}.${pandoc.extension}`;

  fs.writeFileSync(inputPath, manuscript, "utf8");
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "pandoc",
        [inputPath, "-f", "markdown", "-t", pandoc.to, "-o", outputPath, ...pandoc.extraArgs],
        // Run from the vault root so relative args (e.g. --reference-doc) resolve.
        { cwd: root },
        (err, _stdout, stderr) => {
          if (err) {
            reject(new Error(`pandoc failed: ${stderr || err.message}`));
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
        if (err) reject(new Error(`pandoc failed: ${err.message}`));
        else resolve(stdout as Buffer);
      }
    );
  });
  fs.writeFileSync(outPath, buf);
  return outPath;
}
