/**
 * Analysis panel (Revise → Analysis): readability, most-used words, and echo
 * (repeated-phrase) detection for the selected project's manuscript. Reads scene
 * bodies on demand and runs the pure analyzers in analysis.ts.
 */

import { App, TFile } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { findEchoes, readability, wordFrequency } from "./analysis";
import { compositionProfile } from "./composition";

export class AnalysisPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;

  constructor(app: App, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-analysis");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    const results = container.createDiv({ cls: "inkswell-analysis__results" });
    results.createDiv({ cls: "inkswell-stats__muted", text: "Analyzing manuscript…" });
    void this.analyze(results, project);
  }

  private async analyze(results: HTMLElement, project: Project): Promise<void> {
    const scenes: { title: string; text: string }[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (file instanceof TFile) {
        scenes.push({ title: scene.title, text: await this.app.vault.cachedRead(file) });
      }
    }
    const text = scenes.map((s) => s.text).join("\n\n");
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

    // Composition — paragraph mix + per-scene balance flags. Honest about limits.
    const compSec = results.createDiv({ cls: "inkswell-stats__section" });
    compSec.createEl("h4", { text: "Scene composition" });
    compSec.createDiv({
      cls: "inkswell-stats__muted",
      text: "Heuristic: paragraphs classified as dialogue / interiority / narration (description + action are merged, not split).",
    });
    const overall = compositionProfile(text);
    const pct = (r: number) => `${Math.round(r * 100)}%`;
    compSec.createDiv({
      cls: "inkswell-stats__row",
      text: `Dialogue ${pct(overall.ratios.dialogue)} · Interiority ${pct(overall.ratios.interiority)} · Narration ${pct(overall.ratios.narration)}`,
    });
    const flagged = scenes
      .map((s) => ({ title: s.title, flags: compositionProfile(s.text).flags }))
      .filter((s) => s.flags.length > 0);
    if (flagged.length === 0) {
      compSec.createDiv({ cls: "inkswell-stats__muted", text: "No scene-level balance flags." });
    } else {
      for (const s of flagged) {
        compSec.createDiv({ cls: "inkswell-stats__row", text: `${s.title}: ${s.flags.join(" ")}` });
      }
    }
  }
}
