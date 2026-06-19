/**
 * Analysis panel (Revise → Analysis): readability, most-used words, and echo
 * (repeated-phrase) detection for the selected project's manuscript. Reads scene
 * bodies on demand and runs the pure analyzers in analysis.ts.
 */

import { App, TFile } from "obsidian";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { findEchoes, readability, wordFrequency } from "./analysis";

export class AnalysisPanel {
  private app: App;
  private store: ProjectStore;
  private container: HTMLElement | null = null;
  private selectedPath: string | null = null;

  constructor(app: App, store: ProjectStore) {
    this.app = app;
    this.store = store;
  }

  private rerender(): void {
    if (this.container) this.render(this.container);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-analysis");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    if (projects.length === 0) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }
    const project =
      projects.find((p) => p.vaultPath === this.selectedPath) ?? projects[0];
    if (this.selectedPath === null) this.selectedPath = project.vaultPath;

    if (projects.length > 1) {
      const bar = container.createDiv({ cls: "inkswell-analysis__toolbar" });
      const sel = bar.createEl("select", { cls: "dropdown" });
      for (const p of projects) {
        const o = sel.createEl("option", { text: p.draft.title, value: p.vaultPath });
        if (p.vaultPath === project.vaultPath) o.selected = true;
      }
      sel.onchange = () => {
        this.selectedPath = sel.value;
        this.rerender();
      };
    }

    const results = container.createDiv({ cls: "inkswell-analysis__results" });
    results.createDiv({ cls: "inkswell-stats__muted", text: "Analyzing manuscript…" });
    void this.analyze(results, project);
  }

  private async analyze(results: HTMLElement, project: Project): Promise<void> {
    const parts: string[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) parts.push(await this.app.vault.cachedRead(file));
    }
    const text = parts.join("\n\n");
    results.empty();

    if (!text.trim()) {
      results.createDiv({ cls: "inkswell-stats__muted", text: "No scene text to analyze." });
      return;
    }

    const r = readability(text);
    const read = results.createDiv({ cls: "inkswell-stats__section" });
    read.createEl("h4", { text: "Readability" });
    read.createDiv({
      cls: "inkswell-stats__row",
      text: `Grade ${r.grade} · Reading ease ${r.ease}`,
    });
    read.createDiv({
      cls: "inkswell-stats__muted",
      text: `${r.words.toLocaleString()} words · ${r.sentences.toLocaleString()} sentences · ${(r.words / r.sentences).toFixed(1)} words/sentence`,
    });

    const freqSec = results.createDiv({ cls: "inkswell-stats__section" });
    freqSec.createEl("h4", { text: "Most-used words" });
    const chips = freqSec.createDiv({ cls: "inkswell-analysis__chips" });
    for (const f of wordFrequency(text, 20)) {
      chips.createSpan({ cls: "inkswell-chip", text: `${f.word} ${f.count}` });
    }

    const echoSec = results.createDiv({ cls: "inkswell-stats__section" });
    echoSec.createEl("h4", { text: "Echoes (repeated phrases)" });
    const echoes = findEchoes(text, 3, 2, 15);
    if (echoes.length === 0) {
      echoSec.createDiv({ cls: "inkswell-stats__muted", text: "No repeated 3-word phrases found." });
    } else {
      for (const e of echoes) {
        echoSec.createDiv({
          cls: "inkswell-stats__row",
          text: `“${e.phrase}” ×${e.count}`,
        });
      }
    }
  }
}
