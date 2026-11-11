/**
 * Publish panel: a per-project compile step editor. Pick a format, toggle which
 * built-in steps run (applied in registry order), set the output name, and
 * compile. Config persists under the project index's `inkswell.compile`.
 *
 * All UI text goes through `t()` (src/i18n) — this panel is the reference
 * migration for localizing the rest of the plugin.
 */

import { App, Notice, TFile } from "obsidian";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { tryFileOp } from "../lib/notify";
import { writeConflictBackup, writeConflictBackupBinary } from "../lib/conflict-backup";
import { CompileResult, OutputExistsError, runCompile, vaultHasFilesystem } from "../compile/engine";
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
import { parseManuscript } from "../compile/docx";
import { countWords } from "../lib/wordcount";
import { MarkerSet, markerSet } from "../lib/placeholders";
import { confirmDestructive, openScene } from "../scenes/scene-actions";
import { CompileConfig, DocxConfig, OutputFormat } from "../compile/types";
import { MessageKey, isMessageKey, t, tp } from "../i18n";
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

  /** Re-render in place after a notify caused by our own config writes (marked
   *  as self-writes), keeping scroll and the field being edited alive. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-publish");
    container.createEl("h3", { text: t("compile.heading") });

    const project = resolveActive(this.store.getProjects(), this.plugin.activeProject.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: t("compile.noProjects") });
      return;
    }

    // Compile ships the manuscript; planning material goes out as a story bible (#50).
    const bible = container.createDiv({ cls: "inkswell-stats__muted inkswell-compile__bible" });
    bible.appendText(`${t("compile.bible.prompt")} `);
    const link = bible.createEl("a", { text: t("compile.bible.link"), href: "#" });
    link.onclick = (e) => {
      e.preventDefault();
      this.plugin.openStoryBible(project);
    };

    const config = this.configFor(project);

    // Pandoc availability (cached probe; kick it off once and re-render on result).
    const hasFs = vaultHasFilesystem(this.app);
    const support = pandocAvailableCached();
    if (support === undefined && hasFs) void probePandocSupport().then(() => this.rerender());
    const pandocOk = !!support?.pandoc && hasFs;

    // Format
    const fmtField = container.createDiv({ cls: "inkswell-publish__field" });
    fmtField.createSpan({ cls: "inkswell-stats__muted", text: t("compile.format.label") });
    const fmt = fmtField.createEl("select", { cls: "dropdown" });
    tagField(fmt, "compile:format");
    const fmtValue =
      config.format === "pandoc" ? `pandoc:${config.pandoc?.to ?? "docx"}` : config.format;
    const formatOptions: [string, MessageKey, boolean][] = [
      ["md", "compile.format.md", true],
      ["html", "compile.format.html", true],
      ["docx", "compile.format.docx", true],
      ["pandoc:docx", "compile.format.pandocDocx", pandocOk],
      ["pandoc:pdf", "compile.format.pandocPdf", pandocOk],
      ["pandoc:epub", "compile.format.pandocEpub", pandocOk],
    ];
    for (const [val, key, enabled] of formatOptions) {
      const label = t(key);
      const o = fmt.createEl("option", {
        text: enabled ? label : t("compile.format.needsPandoc", { label }),
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
    this.stepGroup(container, t("compile.steps.scene"), SCENE_STEPS, config, "sceneSteps", project);
    this.stepGroup(container, t("compile.steps.manuscript"), MANUSCRIPT_STEPS, config, "manuscriptSteps", project);

    // Scene separator + the format's own options: manuscript layout for the
    // built-in Word writer, a reference doc for pandoc Word.
    this.renderSeparator(container, config, project);
    if (config.format === "docx") this.renderDocx(container, config, project);
    if (config.format === "pandoc" && config.pandoc?.to === "docx") {
      this.renderReferenceDoc(container, config, project);
    }

    // Output name
    const nameField = container.createDiv({ cls: "inkswell-publish__field" });
    nameField.createSpan({ cls: "inkswell-stats__muted", text: t("compile.output.label") });
    const name = nameField.createEl("input", { type: "text" });
    tagField(name, "compile:name");
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
    const run = container.createEl("button", { cls: "mod-cta", text: t("compile.run") });
    run.onclick = () => void this.compile(project);

    // Pre-export check.
    this.renderPreflight(container, project);
  }

  /**
   * A muted line under the format dropdown when the selected pandoc export
   * can't run here: no filesystem (mobile), pandoc missing, or (PDF) no LaTeX
   * engine. Silent for the built-in formats, which always work.
   */
  private renderFormatNote(
    parent: HTMLElement,
    config: CompileConfig,
    support: PandocSupport | undefined,
    hasFs: boolean
  ): void {
    if (config.format !== "pandoc") return;
    const note = (key: MessageKey) => parent.createDiv({ cls: "inkswell-stats__muted", text: t(key) });
    if (!hasFs) {
      note("compile.note.desktopOnly");
      return;
    }
    if (support === undefined) {
      note("compile.note.checking");
      return;
    }
    if (!support.pandoc) {
      note("compile.note.noPandoc");
      return;
    }
    if (config.pandoc?.to === "pdf" && !support.pdfEngine) note("compile.note.noPdfEngine");
  }

  private static readonly SEP_PRESETS: { label: MessageKey; value: string }[] = [
    { label: "compile.separator.blank", value: "\n\n" },
    { label: "compile.separator.asterisks", value: "\n\n* * *\n\n" },
    { label: "compile.separator.rule", value: "\n\n---\n\n" },
    { label: "compile.separator.hash", value: "\n\n#\n\n" },
  ];

  private renderSeparator(parent: HTMLElement, config: CompileConfig, project: Project): void {
    const field = parent.createDiv({ cls: "inkswell-publish__field" });
    field.createSpan({ cls: "inkswell-stats__muted", text: t("compile.separator.label") });
    const sel = field.createEl("select", { cls: "dropdown" });
    tagField(sel, "compile:separator");
    const presets = CompilePanel.SEP_PRESETS;
    const matched = presets.some((p) => p.value === config.separator);
    if (!matched) sel.createEl("option", { text: t("compile.separator.custom"), value: config.separator });
    for (const p of presets) {
      const o = sel.createEl("option", { text: t(p.label), value: p.value });
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

  /** Built-in Word: manuscript layout options (stored under `inkswell.compile.docx`). */
  private renderDocx(parent: HTMLElement, config: CompileConfig, project: Project): void {
    const docx = config.docx ?? {};
    const field = parent.createDiv({ cls: "inkswell-publish__field inkswell-publish__docx" });
    field.createSpan({ cls: "inkswell-stats__muted", text: t("compile.docx.heading") });
    field.createDiv({ cls: "inkswell-stats__muted", text: t("compile.docx.intro") });
    const authorName = this.plugin.settings.authorName.trim();
    if (!authorName) {
      field.createDiv({ cls: "inkswell-publish__finding", text: t("compile.docx.noAuthor") });
    }

    const select = (
      label: MessageKey,
      key: "font" | "paper",
      options: [string, MessageKey][],
      current: string
    ) => {
      const row = field.createDiv({ cls: "inkswell-publish__docx-row" });
      row.createSpan({ text: t(label) });
      const sel = row.createEl("select", { cls: "dropdown" });
      tagField(sel, `compile:docx:${key}`);
      for (const [value, text] of options) {
        const o = sel.createEl("option", { text: t(text), value });
        if (value === current) o.selected = true;
      }
      sel.onchange = () => {
        const value = sel.value;
        this.updateDocx(project, (d) => {
          if (key === "font") d.font = value === "courier" ? "courier" : "times";
          else d.paper = value === "a4" ? "a4" : "letter";
        });
      };
    };
    select(
      "compile.docx.font",
      "font",
      [
        ["times", "compile.docx.font.times"],
        ["courier", "compile.docx.font.courier"],
      ],
      docx.font ?? "times"
    );
    select(
      "compile.docx.paper",
      "paper",
      [
        ["letter", "compile.docx.paper.letter"],
        ["a4", "compile.docx.paper.a4"],
      ],
      docx.paper ?? "letter"
    );

    const check = (label: MessageKey, key: "titlePage" | "endMarker") => {
      const row = field.createDiv({ cls: "inkswell-publish__step" });
      const cb = row.createEl("input", { type: "checkbox" });
      tagField(cb, `compile:docx:${key}`);
      cb.checked = docx[key] !== false;
      row.createSpan({ text: t(label) });
      cb.onchange = () => {
        const on = cb.checked;
        this.updateDocx(project, (d) => {
          // Default is on: store only the exception, keep the frontmatter tidy.
          if (on) delete d[key];
          else d[key] = false;
        });
      };
    };
    check("compile.docx.titlePage", "titlePage");
    check("compile.docx.endMarker", "endMarker");

    const text = (label: MessageKey, hint: MessageKey, key: "byline" | "surname", placeholder: string) => {
      const row = field.createDiv({ cls: "inkswell-publish__docx-row" });
      row.createSpan({ text: t(label) });
      const input = row.createEl("input", { type: "text", placeholder });
      tagField(input, `compile:docx:${key}`);
      input.value = docx[key] ?? "";
      field.createDiv({ cls: "inkswell-stats__muted", text: t(hint) });
      input.onchange = () => {
        const value = input.value.trim();
        this.updateDocx(project, (d) => {
          if (value) d[key] = value;
          else delete d[key];
        });
      };
    };
    text("compile.docx.byline", "compile.docx.bylineHint", "byline", authorName);
    const bylineShown = (docx.byline ?? "").trim() || authorName;
    text("compile.docx.surname", "compile.docx.surnameHint", "surname", bylineShown.split(/\s+/).pop() ?? "");
  }

  private renderReferenceDoc(parent: HTMLElement, config: CompileConfig, project: Project): void {
    const field = parent.createDiv({ cls: "inkswell-publish__field" });
    field.createSpan({ cls: "inkswell-stats__muted", text: t("compile.refdoc.label") });

    const args = config.pandoc?.extraArgs ?? [];
    const current = args.find((a) => a.startsWith("--reference-doc="));
    if (current) {
      const row = field.createDiv({ cls: "inkswell-publish__refrow" });
      row.createSpan({ text: current.replace("--reference-doc=", "") });
      const clear = row.createEl("button", { text: t("compile.refdoc.clear") });
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
    if (config.sceneSteps.some((s) => s.id === "html-align")) {
      field.createDiv({ cls: "inkswell-stats__muted", text: t("compile.refdoc.alignNote") });
    }

    if (!vaultHasFilesystem(this.app)) {
      field.createDiv({ cls: "inkswell-stats__muted", text: t("compile.refdoc.desktopOnly") });
      return;
    }
    if (pandocAvailableCached()?.pandoc === false) {
      field.createDiv({ cls: "inkswell-stats__muted", text: t("compile.refdoc.installPandoc") });
      return;
    }
    const gen = field.createEl("button", {
      text: current ? t("compile.refdoc.regenerate") : t("compile.refdoc.generate"),
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
        new Notice(t("compile.refdoc.created", { path: rel }));
      } catch (e) {
        new Notice(t("compile.refdoc.failed", { error: (e as Error).message }), 8000);
      }
    };
  }

  private renderPreflight(parent: HTMLElement, project: Project): void {
    const sec = parent.createDiv({ cls: "inkswell-publish__preflight" });
    const btn = sec.createEl("button", { text: t("compile.preflight.button") });
    const results = sec.createDiv({ cls: "inkswell-publish__preflight-results" });
    btn.onclick = async () => {
      results.empty();
      results.createDiv({ cls: "inkswell-stats__muted", text: t("compile.preflight.checking") });
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

      const findings = preflight(scenes, this.markers());
      const docxNotes = this.docxPreflight(project, scenes);
      results.empty();
      if (findings.length === 0 && missing.length === 0 && docxNotes.length === 0) {
        results.createDiv({ cls: "inkswell-stats__muted", text: t("compile.preflight.clean") });
        return;
      }
      for (const text of docxNotes) results.createDiv({ cls: "inkswell-publish__finding", text });
      if (missing.length > 0) {
        results.createDiv({
          cls: "inkswell-publish__finding",
          text: t("compile.preflight.missing", { count: missing.length, titles: missing.join(", ") }),
        });
      }
      const byTitle = new Map(project.scenes.map((s) => [s.title, s.path] as const));
      for (const f of findings) {
        const row = results.createDiv({ cls: "inkswell-publish__finding" });
        row.createDiv({ text: t("compile.preflight.finding", { label: f.label, count: f.count }) });
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

  /** Word-only pre-export notes: missing author details, content Word will flatten. */
  private docxPreflight(project: Project, scenes: SceneText[]): string[] {
    if (this.configFor(project).format !== "docx") return [];
    const notes: string[] = [];
    if (!this.plugin.settings.authorName.trim()) notes.push(t("compile.docx.noAuthor"));
    const unsupported = scenes.reduce((n, s) => n + parseManuscript(s.text).unsupported, 0);
    if (unsupported > 0) notes.push(tp("compile.docx.unsupported", unsupported));
    return notes;
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
      tagField(cb, `compile:step:${key}:${step.id}`);
      cb.checked = included.has(step.id);
      const stepKey = `compile.step.${step.id}`;
      row.createSpan({ text: isMessageKey(stepKey) ? t(stepKey) : step.description });
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
      group.createDiv({ cls: "inkswell-stats__muted", text: t("compile.steps.headingExclusive") });
    }
  }

  /** The project's saved compile config, or a sensible default (shared resolver). */
  private configFor(project: Project): CompileConfig {
    return resolveCompileConfig(project, this.plugin.settings.defaultCompileFormat);
  }

  /** The vault's effective to-do markers — what compile strips and preflight counts. */
  private markers(): MarkerSet {
    return markerSet(this.plugin.settings.listOverrides.markers);
  }

  /** The writer's details from Settings → Manuscript (Word title page). */
  private author(): { name: string; contact: string } {
    return { name: this.plugin.settings.authorName, contact: this.plugin.settings.authorContact };
  }

  /**
   * Run the compile. When the output path holds a file Inkswell didn't produce
   * (no compile marker — e.g. a hand-written note sharing the configured name,
   * or a compiled .docx re-saved in Word), the engine refuses; we then ask, and
   * on confirmation back the displaced file up to "Inkswell conflicts" before
   * overwriting. Marker-bearing previous compiles are replaced silently.
   */
  private async compile(project: Project): Promise<void> {
    try {
      const result = await runCompile(this.app, project, this.configFor(project), {
        markers: this.markers(),
        author: this.author(),
      });
      this.reportCompiled(result);
    } catch (e) {
      if (e instanceof OutputExistsError) {
        await this.confirmOverwriteAndCompile(project, e.path);
        return;
      }
      new Notice(t("compile.failed", { error: (e as Error).message }), 8000);
    }
  }

  private async confirmOverwriteAndCompile(project: Project, path: string): Promise<void> {
    const ok = await confirmDestructive(
      this.app,
      t("compile.overwrite.confirm", { path }),
      t("compile.overwrite.button")
    );
    if (!ok) return;
    try {
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        if (existing.extension === "md" || existing.extension === "html") {
          await writeConflictBackup(
            this.app,
            existing.basename,
            "disk version",
            await this.app.vault.cachedRead(existing)
          );
        } else {
          await writeConflictBackupBinary(
            this.app,
            existing.basename,
            "disk version",
            existing.extension,
            await this.app.vault.readBinary(existing)
          );
        }
      }
      const result = await runCompile(this.app, project, this.configFor(project), {
        allowOverwrite: true,
        markers: this.markers(),
        author: this.author(),
      });
      this.reportCompiled(result);
    } catch (e) {
      new Notice(t("compile.failed", { error: (e as Error).message }), 8000);
    }
  }

  /** Success notice, plus a second one naming any images Word export left out. */
  private reportCompiled(result: CompileResult): void {
    const words = countWords(result.wordCountSource);
    new Notice(tp("compile.done", words, { path: result.outputPath }));
    const skipped = result.docx?.skippedImages ?? [];
    if (skipped.length) {
      new Notice(t("compile.docx.skippedImages", { list: skipped.join(", ") }), 10000);
    }
  }

  /** Mutate the compile config against its CURRENT stored value (delta write —
   *  never replaces the whole object with the panel's rendered copy). The index
   *  write triggers a store refresh, which re-renders this panel. */
  private update(project: Project, mutate: (cfg: CompileConfig) => void): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      this.plugin.selfWrites.mark(file.path);
      void tryFileOp(
        () =>
          updateCompile(this.app, file, this.plugin.settings.defaultCompileFormat, mutate),
        t("compile.saveFailed")
      );
    }
  }

  /** Delta-write the Word options, same current-state rule as {@link update}. */
  private updateDocx(project: Project, mutate: (docx: DocxConfig) => void): void {
    this.update(project, (cfg) => {
      const next: DocxConfig = { ...(cfg.docx ?? {}) };
      mutate(next);
      if (Object.keys(next).length) cfg.docx = next;
      else delete cfg.docx;
    });
  }
}
