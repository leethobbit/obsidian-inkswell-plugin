/**
 * Minimal compile dialog: pick a format, run, report the output path.
 *
 * Phase 1 uses the default workflow with the chosen output format; a full
 * step-editor UI comes later. Pandoc options default to docx and the format is
 * disabled when pandoc isn't available on this platform.
 */

import { App, Modal, Notice, Setting } from "obsidian";
import { Project } from "../projects/types";
import { InkswellSettings } from "../settings/settings";
import { runCompile, vaultHasFilesystem } from "./engine";
import { isPandocAvailable } from "./pandoc";
import {
  CompileConfig,
  DEFAULT_COMPILE_CONFIG,
  OutputFormat,
  PandocOutput,
} from "./types";

const DEFAULT_PANDOC: PandocOutput = { to: "docx", extension: "docx", extraArgs: [] };

export class CompileModal extends Modal {
  private project: Project;
  private settings: InkswellSettings;
  private format: OutputFormat;
  private pandocTarget = "docx";

  constructor(app: App, project: Project, settings: InkswellSettings) {
    super(app);
    this.project = project;
    this.settings = settings;
    this.format = settings.defaultCompileFormat;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Compile: ${this.project.draft.title}` });

    const pandocOk = vaultHasFilesystem(this.app) && (await isPandocAvailable());

    new Setting(contentEl)
      .setName("Format")
      .setDesc(
        pandocOk
          ? "Markdown and HTML are built in; other formats use pandoc."
          : "Pandoc not detected — only Markdown and HTML are available."
      )
      .addDropdown((d) => {
        d.addOption("md", "Markdown (.md)");
        d.addOption("html", "HTML (.html)");
        if (pandocOk) {
          d.addOption("pandoc:docx", "Word (.docx)");
          d.addOption("pandoc:pdf", "PDF (.pdf)");
          d.addOption("pandoc:epub", "EPUB (.epub)");
        }
        const initial =
          this.format === "pandoc" ? "pandoc:docx" : this.format;
        d.setValue(pandocOk ? initial : this.format === "pandoc" ? "md" : initial);
        d.onChange((v) => {
          if (v.startsWith("pandoc:")) {
            this.format = "pandoc";
            this.pandocTarget = v.split(":")[1];
          } else {
            this.format = v as OutputFormat;
          }
        });
      });

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Compile")
        .setCta()
        .onClick(() => this.doCompile())
    );
  }

  private buildConfig(): CompileConfig {
    const config: CompileConfig = {
      ...DEFAULT_COMPILE_CONFIG,
      sceneSteps: DEFAULT_COMPILE_CONFIG.sceneSteps.map((s) =>
        s.id === "prepend-title"
          ? { id: s.id, options: { level: this.settings.sceneHeadingLevel } }
          : s
      ),
      format: this.format,
    };
    if (this.format === "pandoc") {
      config.pandoc = {
        ...DEFAULT_PANDOC,
        to: this.pandocTarget,
        extension: this.pandocTarget === "pdf" ? "pdf" : this.pandocTarget,
      };
    }
    return config;
  }

  private async doCompile(): Promise<void> {
    try {
      const result = await runCompile(this.app, this.project, this.buildConfig());
      new Notice(`Compiled to ${result.outputPath}`);
      this.close();
    } catch (e) {
      new Notice(`Compile failed: ${(e as Error).message}`, 8000);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
