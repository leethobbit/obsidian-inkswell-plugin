/**
 * Focused-view hero card for the Explorer panel: cover art + at-a-glance
 * logline / theme / target, plus the cover-image menu (upload / choose from
 * vault / remove). Extracted from explorer-view.ts — only rendered for the
 * single focused project (never in the multi-project list).
 */

import { App, Menu, Notice, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import {
  cleanupOwnedCover,
  pickVaultImage,
  resolveCoverSrc,
  setCoverFromUpload,
} from "../../projects/cover";
import { persistInkswellData, persistOverview } from "../../projects/index-writer";
import { TargetModal } from "../../goals/target-modal";
import { ProjectStats } from "../../projects/project-stats";
import { ProjectStore } from "../../projects/project-store";
import { Project } from "../../projects/types";
import { baseDraftFor } from "../../projects/stories";
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
    cover.onclick = (e) => this.coverMenu(base, !!src).showAtMouseEvent(e);

    // Meta column: title, logline, theme, target/progress.
    const meta = hero.createDiv({ cls: "inkswell-hero__meta" });
    meta.createDiv({ cls: "inkswell-hero__title", text: focused.draft.title });

    const field = (label: string, value: string | undefined, placeholder: string, save: (v: string) => void) => {
      const row = meta.createDiv({ cls: "inkswell-hero__field" });
      row.createDiv({ cls: "inkswell-hero__label", text: label });
      const input = row.createEl("input", { type: "text", cls: "inkswell-hero__input" });
      input.value = value ?? "";
      input.placeholder = placeholder;
      input.onchange = () => save(input.value.trim());
    };
    field("Logline", overview.logline, "One sentence: who wants what, against what odds…", (v) =>
      saveOverview({ logline: v })
    );
    field("Theme", overview.theme, "The deeper meaning / life lesson…", (v) => saveOverview({ theme: v }));

    this.renderHeroTarget(meta, focused, base);
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
    input.value = target ? String(target) : "";
    input.placeholder = "e.g. 80000";
    input.min = "0";
    input.onchange = () => {
      if (!indexFile) return;
      const n = Math.floor(Number(input.value));
      const val = Number.isFinite(n) && n > 0 ? n : undefined;
      void tryFileOp(
        () => persistInkswellData(this.app, indexFile, { goals: { ...base.inkswell?.goals, target: val } }),
        "Couldn't save the word target."
      );
    };
    control.createSpan({ cls: "inkswell-hero__unit", text: "words" });
    const more = control.createEl("button", { cls: "inkswell-hero__more", text: "⋯" });
    more.setAttribute("aria-label", "Deadline & pace");
    more.onclick = () => new TargetModal(this.app, base).open();

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

  /** Cover action menu: upload, pick from vault, and (when set) remove. */
  private coverMenu(project: Project, hasCover: boolean): Menu {
    const menu = new Menu();
    menu.addItem((i) =>
      i.setTitle("Upload…").setIcon("upload").onClick(() => this.uploadCover(project))
    );
    menu.addItem((i) =>
      i.setTitle("Choose from vault…").setIcon("image").onClick(() => void this.chooseCover(project))
    );
    if (hasCover) {
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Remove cover").setIcon("trash").onClick(() => void this.removeCover(project))
      );
    }
    return menu;
  }

  /** Open an OS file picker, copy the chosen image into the project folder, persist its path. */
  private uploadCover(project: Project): void {
    const input = createEl("input", { type: "file" });
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const indexFile = this.indexFile(project);
      if (!indexFile) return;
      try {
        const path = await setCoverFromUpload(this.app, project, file);
        await persistOverview(this.app, indexFile, { cover: path });
      } catch (e) {
        console.error(e);
        new Notice("Couldn't set the cover image.");
      }
    };
    input.click();
  }

  private async chooseCover(project: Project): Promise<void> {
    const file = await pickVaultImage(this.app);
    if (!file) return;
    const indexFile = this.indexFile(project);
    if (indexFile) {
      await tryFileOp(() => persistOverview(this.app, indexFile, { cover: file.path }), "Couldn't set the cover image.");
    }
  }

  private async removeCover(project: Project): Promise<void> {
    await tryFileOp(async () => {
      await cleanupOwnedCover(this.app, project);
      const indexFile = this.indexFile(project);
      if (indexFile) await persistOverview(this.app, indexFile, { cover: "" });
    }, "Couldn't remove the cover image.");
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
