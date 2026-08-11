/**
 * Publish panel: a per-project compile step editor. Pick a format, toggle which
 * built-in steps run (applied in registry order), set the output name, and
 * compile. Config persists under the project index's `inkswell.compile`.
 */

import { App, Notice, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { writeConflictBackup } from "../lib/conflict-backup";
import { OutputExistsError, runCompile, vaultHasFilesystem } from "../compile/engine";
import {
  PandocSupport,
  generateReferenceDoc,
  pandocAvailableCached,
  probePandocSupport,
} from "../compile/pandoc";
import { preflight, SceneText } from "../compile/preflight";
import { BUILTIN_STEPS } from "../compile/steps";
import {
  EXCLUSIVE_HEADING_STEPS,
  applyStepToggle,
  resolveCompileConfig,
} from "../compile/config";
import { countWords } from "../lib/wordcount";
import { confirmDestructive, openScene } from "../scenes/scene-actions";
import { CompileConfig, OutputFormat } from "../compile/types";
import { resolveActive } from "../projects/active-project";
import { updateCompile } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { sanitizeSegment } from "../settings/folders";
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

    // Pandoc availability (cached probe; kick it off once and re-render on result).
    const hasFs = vaultHasFilesystem(this.app);
    const support = pandocAvailableCached();
    if (support === undefined && hasFs) void probePandocSupport().then(() => this.rerender());
    const pandocOk = !!support?.pandoc && hasFs;

    // Format
    const fmtField = container.createDiv({ cls: "inkswell-publish__field" });
    fmtField.createSpan({ cls: "inkswell-stats__muted", text: "Format" });
    const fmt = fmtField.createEl("select", { cls: "dropdown" });
    const fmtValue =
      config.format === "pandoc" ? `pandoc:${config.pandoc?.to ?? "docx"}` : config.format;
    const formatOptions: [string, string, boolean][] = [
      ["md", "Markdown (.md)", true],
      ["html", "HTML (.html)", true],
      ["pandoc:docx", "Word (.docx)", pandocOk],
      ["pandoc:pdf", "PDF (.pdf)", pandocOk],
      ["pandoc:epub", "EPUB (.epub)", pandocOk],
    ];
    for (const [val, label, enabled] of formatOptions) {
      const o = fmt.createEl("option", {
        text: enabled ? label : `${label} — needs pandoc`,
        value: val,
      });
      o.disabled = !enabled;
      if (val === fmtValue) o.selected = true;
    }
    this.renderFormatNote(fmtField, config, support, hasFs);
    fmt.onchange = () => {
      const value = fmt.value;
      this.update(project, (cfg) => {
        if (value.startsWith("pandoc:")) {
          const to = value.split(":")[1];
          cfg.format = "pandoc";
          // Preserve extra args (e.g. --reference-doc) across pandoc subtype changes.
          cfg.pandoc = { to, extension: to, extraArgs: cfg.pandoc?.extraArgs ?? [] };
        } else {
          cfg.format = value as OutputFormat;
          delete cfg.pandoc;
        }
      });
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
      // Same sanitizer every other user-supplied filename goes through — a raw
      // value containing "/" would resolve the compile output to a SIBLING
      // path, where writeOutput could overwrite an unrelated note.
      const cleaned = sanitizeSegment(name.value) || "manuscript";
      name.value = cleaned;
      this.update(project, (cfg) => {
        cfg.targetBasename = cleaned;
      });
    };

    // Compile
    const run = container.createEl("button", { cls: "mod-cta", text: "Compile" });
    run.onclick = () => void this.compile(project);

    // Pre-export check.
    this.renderPreflight(container, project);
  }

  /**
   * A muted line under the format dropdown explaining any export the machine
   * can't do: pandoc missing (no Word/PDF/EPUB), or pandoc present but no PDF
   * engine (PDF specifically will fail). Silent when everything selected works.
   */
  private renderFormatNote(
    parent: HTMLElement,
    config: CompileConfig,
    support: PandocSupport | undefined,
    hasFs: boolean
  ): void {
    const note = (text: string) => parent.createDiv({ cls: "inkswell-stats__muted", text });
    if (!hasFs) {
      note("Word / PDF / EPUB export is desktop-only (needs pandoc).");
      return;
    }
    if (support === undefined) {
      note("Checking for pandoc…");
      return;
    }
    if (!support.pandoc) {
      note("Word / PDF / EPUB export needs pandoc — install it from pandoc.org, then restart Obsidian.");
      return;
    }
    if (config.format === "pandoc" && config.pandoc?.to === "pdf" && !support.pdfEngine) {
      note("PDF export also needs a LaTeX engine (e.g. MiKTeX or TeX Live) on your PATH.");
    }
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
      const value = sel.value;
      this.update(project, (cfg) => {
        cfg.separator = value;
      });
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
        this.update(project, (cfg) => {
          if (cfg.pandoc) {
            cfg.pandoc.extraArgs = cfg.pandoc.extraArgs.filter(
              (a) => !a.startsWith("--reference-doc=")
            );
          }
        });
      };
    }

    if (!vaultHasFilesystem(this.app)) {
      field.createDiv({ cls: "inkswell-stats__muted", text: "Desktop only (needs pandoc)." });
      return;
    }
    if (pandocAvailableCached()?.pandoc === false) {
      field.createDiv({ cls: "inkswell-stats__muted", text: "Install pandoc to generate a reference doc." });
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
        this.update(project, (cfg) => {
          if (cfg.pandoc) {
            cfg.pandoc.extraArgs = [
              ...cfg.pandoc.extraArgs.filter((a) => !a.startsWith("--reference-doc=")),
              `--reference-doc=${rel}`,
            ];
          }
        });
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
        // The toggle (heading exclusivity, registry-order rebuild, option
        // seeding) is applied to the CURRENT stored config inside the write —
        // ticking several steps in a row composes instead of clobbering.
        const enabled = cb.checked;
        this.update(project, (cfg) =>
          applyStepToggle(cfg, key, steps.map((s) => s.id), step.id, enabled, {
            sceneHeadingLevel: this.plugin.settings.sceneHeadingLevel,
          })
        );
      };
    }
    if (EXCLUSIVE_HEADING_STEPS.every((id) => steps.some((s) => s.id === id))) {
      group.createDiv({
        cls: "inkswell-stats__muted",
        text: "“Prepend the scene title” and “Group scenes into chapters” both add headings — pick one.",
      });
    }
  }

  /** The project's saved compile config, or a sensible default (shared resolver). */
  private configFor(project: Project): CompileConfig {
    return resolveCompileConfig(project, this.plugin.settings.defaultCompileFormat);
  }

  /**
   * Run the compile. When the output path holds a file Inkswell didn't produce
   * (no compile marker — e.g. a hand-written note sharing the configured name),
   * the engine refuses; we then ask, and on confirmation back the displaced
   * note up to "Inkswell conflicts" before overwriting. Marker-bearing previous
   * compiles are replaced silently, as always.
   */
  private async compile(project: Project): Promise<void> {
    try {
      const result = await runCompile(this.app, project, this.configFor(project));
      const words = countWords(result.wordCountSource);
      new Notice(`Compiled ${words.toLocaleString()} words to ${result.outputPath}`);
    } catch (e) {
      if (e instanceof OutputExistsError) {
        await this.confirmOverwriteAndCompile(project, e.path);
        return;
      }
      new Notice(`Compile failed: ${(e as Error).message}`, 8000);
    }
  }

  private async confirmOverwriteAndCompile(project: Project, path: string): Promise<void> {
    const ok = await confirmDestructive(
      this.app,
      `"${path}" already exists and doesn't look like a previous Inkswell compile. ` +
        `Overwrite it? A backup of the current file will be saved to "Inkswell conflicts" first.`,
      "Overwrite"
    );
    if (!ok) return;
    try {
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        await writeConflictBackup(
          this.app,
          existing.basename,
          "disk version",
          await this.app.vault.cachedRead(existing)
        );
      }
      const result = await runCompile(this.app, project, this.configFor(project), {
        allowOverwrite: true,
      });
      const words = countWords(result.wordCountSource);
      new Notice(`Compiled ${words.toLocaleString()} words to ${result.outputPath}`);
    } catch (e) {
      new Notice(`Compile failed: ${(e as Error).message}`, 8000);
    }
  }

  /** Mutate the compile config against its CURRENT stored value (delta write —
   *  never replaces the whole object with the panel's rendered copy). The index
   *  write triggers a store refresh, which re-renders this panel. */
  private update(project: Project, mutate: (cfg: CompileConfig) => void): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      void tryFileOp(
        () =>
          updateCompile(this.app, file, this.plugin.settings.defaultCompileFormat, mutate),
        "Couldn't save the compile settings."
      );
    }
  }
}
