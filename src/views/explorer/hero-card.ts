/**
 * Focused-view hero card for the Explorer panel: cover art + at-a-glance
 * logline / theme / target, plus the cover-image menu (upload / choose from
 * vault / remove). Extracted from explorer-view.ts — only rendered for the
 * single focused project (never in the multi-project list).
 */

import { App, TFile } from "obsidian";
import { tagField } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { resolveCoverSrc } from "../../projects/cover";
import { coverMenu } from "../../projects/cover-actions";
import { persistGoalsPatch, persistOverview } from "../../projects/index-writer";
import { TargetModal } from "../../goals/target-modal";
import { featureEnabled } from "../../features";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { Project } from "../../projects/types";
import { baseDraftFor } from "../../projects/stories";
import { projectSeries } from "../../series/series";
import { SeriesModal } from "../../series/series-modal";
import type InkswellPlugin from "../../../main";

export class HeroCard {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private stats: ProjectStats;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, stats: ProjectStats) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.stats = stats;
  }

  /**
   * Focused-view hero card: cover art + at-a-glance logline / theme / target.
   * Only rendered for the single focused project (never in the multi-project
   * list). Fields autosave on `change` (blur) — the host's focus-guard prevents a
   * mid-keystroke rebuild, matching the Plan → Overview convention.
   */
  render(parent: HTMLElement, focused: Project): void {
    // Story-level metadata (cover, overview, goals) lives on the story's base
    // draft, so every draft shares one cover/logline/theme/target. Word-count
    // progress, though, is the *focused* draft's own (each draft has its scenes).
    const base = baseDraftFor(this.store.getProjects(), focused);
    const hero = parent.createDiv({ cls: "inkswell-hero" });
    const overview = base.inkswell?.overview ?? {};
    const indexFile = this.indexFile(base);
    const saveOverview = (patch: Partial<typeof overview>) => {
      if (indexFile) {
        this.plugin.selfWrites.mark(indexFile.path);
        void tryFileOp(() => persistOverview(this.app, indexFile, patch), "Couldn't save the change.");
      }
    };

    // Cover: image when set, else a dashed placeholder. Both open the same menu.
    const cover = hero.createDiv({ cls: "inkswell-hero__cover" });
    const src = resolveCoverSrc(this.app, overview.cover);
    if (src) {
      const img = cover.createEl("img", { cls: "inkswell-hero__img" });
      img.src = src;
      img.alt = `${focused.draft.title} cover`;
    } else {
      cover.addClass("is-empty");
      cover.createSpan({ cls: "inkswell-hero__placeholder", text: "+ Add cover" });
    }
    cover.setAttribute("aria-label", "Set cover image");
    cover.onclick = (e) =>
      coverMenu(this.app, base, (p) => this.plugin.selfWrites.mark(p)).showAtMouseEvent(e);

    // Meta column: title, logline, theme, target/progress.
    const meta = hero.createDiv({ cls: "inkswell-hero__meta" });
    meta.createDiv({ cls: "inkswell-hero__title", text: focused.draft.title });

    // Series membership, always visible — the desktop door into the series
    // dialog (the row menu alone was right-click-only there).
    const info = projectSeries(base);
    const seriesLine = meta.createDiv({ cls: "inkswell-hero__series" });
    if (info) {
      seriesLine.setText(info.order != null ? `${info.name} · Book ${info.order}` : info.name);
    } else {
      seriesLine.addClass("is-empty");
      seriesLine.setText("Add to series…");
    }
    seriesLine.setAttribute("aria-label", "Edit series membership");
    seriesLine.onclick = () =>
      new SeriesModal(this.app, this.store.getProjects(), base, this.plugin.activeProject.get()).open();

    const field =(label: string, value: string | undefined, placeholder: string, save: (v: string) => void) => {
      const row = meta.createDiv({ cls: "inkswell-hero__field" });
      row.createDiv({ cls: "inkswell-hero__label", text: label });
      const input = row.createEl("input", { type: "text", cls: "inkswell-hero__input" });
      tagField(input, `hero:${label.toLowerCase()}`);
      input.value = value ?? "";
      input.placeholder = placeholder;
      input.onchange = () => save(input.value.trim());
    };
    field("Logline", overview.logline, "One sentence: who wants what, against what odds…", (v) =>
      saveOverview({ logline: v })
    );
    field("Theme", overview.theme, "The deeper meaning / life lesson…", (v) => saveOverview({ theme: v }));

    // The word target + progress bar is part of the optional "tracking" feature.
    if (featureEnabled(this.plugin.settings.disabledFeatures, "tracking")) {
      this.renderHeroTarget(meta, focused, base);
    }
  }

  /**
   * Inline word target + progress bar; `⋯` opens the full target modal
   * (deadline/pace). The target is story-level (read/written on `base`); the
   * progress words are the focused draft's own.
   */
  private renderHeroTarget(meta: HTMLElement, focused: Project, base: Project): void {
    const goals = base.inkswell?.goals;
    const target = typeof goals?.target === "number" && goals.target > 0 ? goals.target : 0;
    const indexFile = this.indexFile(base);

    const row = meta.createDiv({ cls: "inkswell-hero__field" });
    row.createDiv({ cls: "inkswell-hero__label", text: "Target" });
    const control = row.createDiv({ cls: "inkswell-hero__targetrow" });
    const input = control.createEl("input", { type: "number", cls: "inkswell-hero__input inkswell-hero__targetinput" });
    tagField(input, "hero:target");
    input.value = target ? String(target) : "";
    input.placeholder = "e.g. 80000";
    input.min = "0";
    input.onchange = () => {
      if (!indexFile) return;
      const n = Math.floor(Number(input.value));
      const val = Number.isFinite(n) && n > 0 ? n : undefined;
      // Field-level patch merged against the CURRENT stored goals — never
      // writes the render-time snapshot, so a deadline set in the TargetModal
      // meanwhile survives this inline edit.
      this.plugin.selfWrites.mark(indexFile.path);
      void tryFileOp(
        () => persistGoalsPatch(this.app, indexFile, { target: val }),
        "Couldn't save the word target."
      );
    };
    control.createSpan({ cls: "inkswell-hero__unit", text: "words" });
    const more = control.createEl("button", { cls: "inkswell-hero__more", text: "⋯" });
    more.setAttribute("aria-label", "Deadline & pace");
    more.onclick = () =>
      new TargetModal(this.app, base, (p) => this.plugin.selfWrites.mark(p)).open();

    if (!this.plugin.settings.showWordCounts) return;
    const bar = meta.createDiv({ cls: "inkswell-progress inkswell-hero__bar" });
    const fill = bar.createDiv({ cls: "inkswell-progress__fill" });
    const stat = meta.createDiv({ cls: "inkswell-hero__stat" });
    void this.stats.projectWords(focused).then((w) => {
      if (target > 0) {
        const pct = Math.min(100, Math.round((w / target) * 100));
        fill.style.width = `${pct}%`;
        stat.setText(`${w.toLocaleString()} / ${target.toLocaleString()} words · ${pct}%`);
      } else {
        bar.hide();
        stat.setText(`${w.toLocaleString()} words`);
      }
    });
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
