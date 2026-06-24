/**
 * Gaps panel (Revise → Gaps): the "find them all later" half of the fast-drafting
 * placeholder workflow. Lists every `[TK]`/`[DIALOGUE:…]`/`[SCENE:…]`/`[NOTE:…]`/
 * `[???]` token left across the active project's scenes, grouped by scene and
 * filterable by kind, with a click to open the scene and fill the gap.
 *
 * Read-only sweep — a companion to the decision log and Comments panel. Scanning
 * reuses the pure `findGaps` scanner; frontmatter is stripped first so line numbers
 * match the prose body shown in the Write editor.
 */

import { App, TFile } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { openScene } from "../scenes/scene-actions";
import { ProjectStore } from "../projects/project-store";
import { GapHit, PlaceholderKind, findGaps } from "../lib/placeholders";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

const KIND_LABEL: Record<PlaceholderKind, string> = {
  tk: "TK",
  dialogue: "Dialogue",
  scene: "Scene",
  note: "Note",
  unknown: "???",
};

const KIND_ORDER: PlaceholderKind[] = ["tk", "dialogue", "scene", "note", "unknown"];

interface SceneGaps {
  title: string;
  file: TFile;
  gaps: GapHit[];
}

export class GapsPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;

  private filter: PlaceholderKind | null = null;
  private groups: SceneGaps[] = [];
  private chipBar: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;

  constructor(app: App, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-gaps");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    container.createDiv({
      cls: "inkswell-stats__muted",
      text: "Drafting placeholders left in your scenes — fill them in during revision. Insert them from the Write toolbar.",
    });
    this.chipBar = container.createDiv({ cls: "inkswell-gaps__filters" });
    this.listEl = container.createDiv({ cls: "inkswell-gaps__list" });
    this.listEl.createDiv({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });
    void this.scan(project.scenes);
  }

  private async scan(scenes: { title: string; path: string | null }[]): Promise<void> {
    const groups: SceneGaps[] = [];
    for (const scene of scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const body = (await this.app.vault.cachedRead(file)).replace(FRONTMATTER_RE, "");
      const gaps = findGaps(body);
      if (gaps.length) groups.push({ title: scene.title, file, gaps });
    }
    this.groups = groups;
    this.renderChips();
    this.renderList();
  }

  private counts(): Record<PlaceholderKind, number> {
    const c: Record<PlaceholderKind, number> = { tk: 0, dialogue: 0, scene: 0, note: 0, unknown: 0 };
    for (const g of this.groups) for (const h of g.gaps) c[h.kind]++;
    return c;
  }

  private renderChips(): void {
    if (!this.chipBar) return;
    this.chipBar.empty();
    const counts = this.counts();
    const total = KIND_ORDER.reduce((n, k) => n + counts[k], 0);
    if (total === 0) return;

    const chip = (label: string, kind: PlaceholderKind | null, n: number) => {
      const b = this.chipBar!.createEl("button", {
        cls: "inkswell-gaps__chip",
        text: `${label} (${n})`,
      });
      b.toggleClass("is-active", this.filter === kind);
      b.onclick = () => {
        this.filter = kind;
        this.renderChips();
        this.renderList();
      };
    };

    chip("All", null, total);
    for (const k of KIND_ORDER) if (counts[k]) chip(KIND_LABEL[k], k, counts[k]);
  }

  private renderList(): void {
    if (!this.listEl) return;
    this.listEl.empty();

    const total = this.groups.reduce((n, g) => n + g.gaps.length, 0);
    if (total === 0) {
      this.listEl.createDiv({
        cls: "inkswell-stats__muted",
        text: "No placeholders found. Drop a [TK] or [SCENE: …] in the Write editor to defer a gap and keep drafting.",
      });
      return;
    }

    for (const g of this.groups) {
      const gaps = this.filter ? g.gaps.filter((h) => h.kind === this.filter) : g.gaps;
      if (!gaps.length) continue;

      const header = this.listEl.createDiv({ cls: "inkswell-gaps__scene" });
      header.setText(`${g.title} (${gaps.length})`);
      header.onclick = () => openScene(this.app, g.file);

      for (const h of gaps) {
        const row = this.listEl.createDiv({ cls: "inkswell-gaps__row" });
        row.createSpan({ cls: `inkswell-gaps__kind inkswell-gaps__kind--${h.kind}`, text: KIND_LABEL[h.kind] });
        row.createSpan({ cls: "inkswell-gaps__line", text: `L${h.line}` });
        row.createSpan({ cls: "inkswell-gaps__excerpt", text: h.excerpt });
        row.onclick = () => openScene(this.app, g.file);
      }
    }
  }
}
