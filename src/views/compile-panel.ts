/**
 * Publish panel: a per-project compile step editor. Pick a format, toggle which
 * built-in steps run (applied in registry order), set the output name, and
 * compile. Config persists under the project index's `inkswell.compile`.
 */

import { App, Notice, TFile } from "obsidian";
import { runCompile, vaultHasFilesystem } from "../compile/engine";
import { generateReferenceDoc } from "../compile/pandoc";
import { preflight, SceneText } from "../compile/preflight";
import { BUILTIN_STEPS } from "../compile/steps";
import { openScene } from "../scenes/scene-actions";
import {
  CompileConfig,
  ConfiguredStep,
  DEFAULT_COMPILE_CONFIG,
  OutputFormat,
} from "../compile/types";
import { resolveActive } from "../projects/active-project";
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

    const project = resolveActive(this.store.getProjects(), this.plugin.activeProject.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
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
        // Preserve extra args (e.g. --reference-doc) across pandoc subtype changes.
        config.pandoc = { to, extension: to, extraArgs: config.pandoc?.extraArgs ?? [] };
      } else {
        config.format = fmt.value as OutputFormat;
        config.pandoc = undefined;
      }
      this.save(project, config);
    };

    // Steps
    this.stepGroup(container, "Scene steps", SCENE_STEPS, config, "sceneSteps", project);
    this.stepGroup(container, "Manuscript steps", MANUSCRIPT_STEPS, config, "manuscriptSteps", project);

    // Scene separator + (for pandoc) a Word reference doc.
    this.renderSeparator(container, config, project);
    if (config.format === "pandoc") this.renderReferenceDoc(container, config, project);

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

    // Pre-export check.
    this.renderPreflight(container, project);
  }

  private static readonly SEP_PRESETS: { label: string; value: string }[] = [
    { label: "Blank line", value: "\n\n" },
    { label: "* * * (scene break)", value: "\n\n* * *\n\n" },
    { label: "--- (horizontal rule)", value: "\n\n---\n\n" },
    { label: "# (centered break)", value: "\n\n#\n\n" },
  ];

  private renderSeparator(parent: HTMLElement, config: CompileConfig, project: Project): void {
    const field = parent.createDiv({ cls: "inkswell-publish__field" });
    field.createSpan({ cls: "inkswell-stats__muted", text: "Scene separator" });
    const sel = field.createEl("select", { cls: "dropdown" });
    const presets = CompilePanel.SEP_PRESETS;
    const matched = presets.some((p) => p.value === config.separator);
    if (!matched) sel.createEl("option", { text: "Custom (frontmatter)", value: config.separator });
    for (const p of presets) {
      const o = sel.createEl("option", { text: p.label, value: p.value });
      if (p.value === config.separator) o.selected = true;
    }
    sel.value = config.separator;
    sel.onchange = () => {
      config.separator = sel.value;
      this.save(project, config);
    };
  }

  private renderReferenceDoc(parent: HTMLElement, config: CompileConfig, project: Project): void {
    const field = parent.createDiv({ cls: "inkswell-publish__field" });
    field.createSpan({ cls: "inkswell-stats__muted", text: "Word reference doc (styles)" });

    const args = config.pandoc?.extraArgs ?? [];
    const current = args.find((a) => a.startsWith("--reference-doc="));
    if (current) {
      const row = field.createDiv({ cls: "inkswell-publish__refrow" });
      row.createSpan({ text: current.replace("--reference-doc=", "") });
      const clear = row.createEl("button", { text: "Clear" });
      clear.onclick = () => {
        if (config.pandoc) {
          config.pandoc.extraArgs = args.filter((a) => !a.startsWith("--reference-doc="));
        }
        this.save(project, config);
      };
    }

    if (!vaultHasFilesystem(this.app)) {
      field.createDiv({ cls: "inkswell-stats__muted", text: "Desktop only (needs pandoc)." });
      return;
    }
    const gen = field.createEl("button", {
      text: current ? "Regenerate reference doc" : "Generate reference doc",
    });
    gen.onclick = async () => {
      try {
        const folder = project.vaultPath.includes("/")
          ? project.vaultPath.slice(0, project.vaultPath.lastIndexOf("/"))
          : "";
        const rel = folder ? `${folder}/reference.docx` : "reference.docx";
        await generateReferenceDoc(this.app, rel);
        if (config.pandoc) {
          config.pandoc.extraArgs = [
            ...args.filter((a) => !a.startsWith("--reference-doc=")),
            `--reference-doc=${rel}`,
          ];
        }
        this.save(project, config);
        new Notice(`Reference doc created: ${rel}. Edit its styles in Word.`);
      } catch (e) {
        new Notice(`Couldn't generate reference doc: ${(e as Error).message}`, 8000);
      }
    };
  }

  private renderPreflight(parent: HTMLElement, project: Project): void {
    const sec = parent.createDiv({ cls: "inkswell-publish__preflight" });
    const btn = sec.createEl("button", { text: "Check manuscript before export" });
    const results = sec.createDiv({ cls: "inkswell-publish__preflight-results" });
    btn.onclick = async () => {
      results.empty();
      results.createDiv({ cls: "inkswell-stats__muted", text: "Checking…" });
      const scenes: SceneText[] = [];
      const missing: string[] = [];
      const sources = project.scenes.length
        ? project.scenes
        : [{ title: project.draft.title, path: project.vaultPath }];
      for (const s of sources) {
        if (!s.path) {
          missing.push(s.title);
          continue;
        }
        const f = this.app.vault.getAbstractFileByPath(s.path);
        if (f instanceof TFile) scenes.push({ title: s.title, text: await this.app.vault.cachedRead(f) });
        else missing.push(s.title);
      }

      const findings = preflight(scenes);
      results.empty();
      if (findings.length === 0 && missing.length === 0) {
        results.createDiv({ cls: "inkswell-stats__muted", text: "No issues found. Ready to export." });
        return;
      }
      if (missing.length > 0) {
        results.createDiv({
          cls: "inkswell-publish__finding",
          text: `Missing scene files (${missing.length}): ${missing.join(", ")}`,
        });
      }
      const byTitle = new Map(project.scenes.map((s) => [s.title, s.path] as const));
      for (const f of findings) {
        const row = results.createDiv({ cls: "inkswell-publish__finding" });
        row.createDiv({ text: `${f.label} — ${f.count}` });
        if (f.detail) row.createDiv({ cls: "inkswell-stats__muted", text: f.detail });
        if (f.scenes.length) {
          const list = row.createDiv({ cls: "inkswell-publish__finding-scenes" });
          for (const title of f.scenes) {
            const chip = list.createSpan({ cls: "inkswell-chip", text: title });
            const path = byTitle.get(title);
            if (path) {
              chip.addClass("inkswell-chip--link");
              chip.onclick = () => {
                const file = this.app.vault.getAbstractFileByPath(path);
                if (file instanceof TFile) openScene(this.app, file);
              };
            }
          }
        }
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
            if (s.id === "prepend-title" && !prev) {
              return { id: s.id, options: { level: this.plugin.settings.sceneHeadingLevel } };
            }
            if (s.id === "group-by-chapter" && !prev) {
              return {
                id: s.id,
                options: { level: this.plugin.settings.sceneHeadingLevel, sceneBreak: "* * *" },
              };
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
