/**
 * Publish panel: a per-project compile step editor. Pick a format, toggle which
 * built-in steps run (applied in registry order), set the output name, and
 * compile. Config persists under the project index's `inkswell.compile`.
 */

import { App, Notice, TFile } from "obsidian";
import { runCompile } from "../compile/engine";
import { BUILTIN_STEPS } from "../compile/steps";
import {
  CompileConfig,
  ConfiguredStep,
  DEFAULT_COMPILE_CONFIG,
  OutputFormat,
} from "../compile/types";
import { persistInkswellData } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import type InkswellPlugin from "../../main";

const SCENE_STEPS = BUILTIN_STEPS.filter((s) => s.kind === "scene");
const MANUSCRIPT_STEPS = BUILTIN_STEPS.filter((s) => s.kind === "manuscript");

export class CompilePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private container: HTMLElement | null = null;
  private selectedPath: string | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-publish");
    container.createEl("h3", { text: "Compile" });

    const projects = this.store.getProjects();
    if (projects.length === 0) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }
    const project =
      projects.find((p) => p.vaultPath === this.selectedPath) ?? projects[0];
    if (this.selectedPath === null) this.selectedPath = project.vaultPath;

    if (projects.length > 1) {
      const sel = container.createEl("select", { cls: "dropdown" });
      for (const p of projects) {
        const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
        if (p.vaultPath === project.vaultPath) o.selected = true;
      }
      sel.onchange = () => {
        this.selectedPath = sel.value;
        this.rerender();
      };
    }

    const config = this.configFor(project);

    // Format
    const fmtField = container.createDiv({ cls: "inkswell-publish__field" });
    fmtField.createSpan({ cls: "inkswell-stats__muted", text: "Format" });
    const fmt = fmtField.createEl("select", { cls: "dropdown" });
    const fmtValue =
      config.format === "pandoc" ? `pandoc:${config.pandoc?.to ?? "docx"}` : config.format;
    for (const [val, label] of [
      ["md", "Markdown (.md)"],
      ["html", "HTML (.html)"],
      ["pandoc:docx", "Word (.docx)"],
      ["pandoc:pdf", "PDF (.pdf)"],
      ["pandoc:epub", "EPUB (.epub)"],
    ]) {
      const o = fmt.createEl("option", { text: label, value: val });
      if (val === fmtValue) o.selected = true;
    }
    fmt.onchange = () => {
      if (fmt.value.startsWith("pandoc:")) {
        const to = fmt.value.split(":")[1];
        config.format = "pandoc";
        config.pandoc = { to, extension: to, extraArgs: [] };
      } else {
        config.format = fmt.value as OutputFormat;
        config.pandoc = undefined;
      }
      this.save(project, config);
    };

    // Steps
    this.stepGroup(container, "Scene steps", SCENE_STEPS, config, "sceneSteps", project);
    this.stepGroup(container, "Manuscript steps", MANUSCRIPT_STEPS, config, "manuscriptSteps", project);

    // Output name
    const nameField = container.createDiv({ cls: "inkswell-publish__field" });
    nameField.createSpan({ cls: "inkswell-stats__muted", text: "Output file name" });
    const name = nameField.createEl("input", { type: "text" });
    name.value = config.targetBasename;
    name.onchange = () => {
      config.targetBasename = name.value.trim() || "manuscript";
      this.save(project, config);
    };

    // Compile
    const run = container.createEl("button", { cls: "mod-cta", text: "Compile" });
    run.onclick = async () => {
      try {
        const result = await runCompile(this.app, project, this.configFor(project));
        new Notice(`Compiled to ${result.outputPath}`);
      } catch (e) {
        new Notice(`Compile failed: ${(e as Error).message}`, 8000);
      }
    };
  }

  private stepGroup(
    parent: HTMLElement,
    label: string,
    steps: typeof BUILTIN_STEPS,
    config: CompileConfig,
    key: "sceneSteps" | "manuscriptSteps",
    project: Project
  ): void {
    const group = parent.createDiv({ cls: "inkswell-publish__steps" });
    group.createDiv({ cls: "inkswell-stats__muted", text: label });
    const included = new Set(config[key].map((s) => s.id));
    for (const step of steps) {
      const row = group.createDiv({ cls: "inkswell-publish__step" });
      const cb = row.createEl("input", { type: "checkbox" });
      cb.checked = included.has(step.id);
      row.createSpan({ text: step.description });
      cb.onchange = () => {
        if (cb.checked) included.add(step.id);
        else included.delete(step.id);
        // Rebuild in registry order, preserving any options.
        config[key] = steps
          .filter((s) => included.has(s.id))
          .map<ConfiguredStep>((s) => {
            const prev = config[key].find((c) => c.id === s.id);
            if (s.id === "prepend-title") {
              return { id: s.id, options: { level: this.plugin.settings.sceneHeadingLevel } };
            }
            return { id: s.id, options: prev?.options ?? {} };
          });
        this.save(project, config);
      };
    }
  }

  /** The project's saved compile config, or a sensible default. */
  private configFor(project: Project): CompileConfig {
    const saved = project.inkswell?.compile;
    if (saved && Array.isArray(saved.sceneSteps)) return saved;
    return JSON.parse(JSON.stringify(DEFAULT_COMPILE_CONFIG));
  }

  private save(project: Project, config: CompileConfig): void {
    // Persisting rewrites the index frontmatter → store refresh re-renders this
    // panel from the saved config (no immediate rerender — avoids stale flicker).
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) void persistInkswellData(this.app, file, { compile: config });
  }
}
