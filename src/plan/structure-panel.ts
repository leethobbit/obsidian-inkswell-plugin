/**
 * Plan → Structure: manage a draft's chapters and acts as config objects.
 *
 * Scenes keep their free-text `act`/`chapter` strings (frozen, StoryLine-safe);
 * this panel adds a config layer on top (`inkswell.chapters` / `inkswell.acts`):
 * per-group word targets + progress, rename-in-one-place, and *planned* (empty)
 * groups you can create before writing their scenes.
 *
 * Scope note: unlike overview/goals (book-level, on the story's base draft),
 * chapters are read/written on the **focused draft** — scene membership and word
 * counts are per-draft, so each draft owns its own structure.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistStructure } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { confirmDelete, promptText } from "../scenes/scene-actions";
import { readSceneMeta, writeSceneMeta } from "../scenes/scene-meta";
import {
  StructureGroup,
  StructureKind,
  distinctInOrder,
  mergeGroups,
  removeGroup,
  renameGroupConfig,
  upsertGroup,
} from "../outliner/structure";
import type InkswellPlugin from "../../main";

interface KindDef {
  kind: StructureKind;
  label: string;
  plural: string;
  cfgKey: "acts" | "chapters";
}

const KINDS: KindDef[] = [
  { kind: "chapter", label: "Chapter", plural: "Chapters", cfgKey: "chapters" },
  { kind: "act", label: "Act", plural: "Acts", cfgKey: "acts" },
];

export class StructurePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-structure");

    const project = resolveActive(this.store.getProjects(), this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No projects found." });
      return;
    }
    if (!isMultiScene(project.draft)) {
      container.createDiv({
        cls: "inkswell-stats__muted",
        text: "Chapters & acts apply to multi-scene projects.",
      });
      return;
    }

    for (const def of KINDS) this.renderKind(container, project, def);
  }

  /** Read a kind's scene labels in manuscript (scene-array) order. */
  private sceneLabels(project: Project, kind: StructureKind): (string | undefined)[] {
    return project.scenes.map((s) => {
      if (!s.path) return undefined;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile ? readSceneMeta(this.app, f)[kind] : undefined;
    });
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }

  private config(project: Project, def: KindDef): StructureGroup[] | undefined {
    return project.inkswell?.[def.cfgKey];
  }

  private renderKind(container: HTMLElement, project: Project, def: KindDef): void {
    const { active, planned } = mergeGroups(
      distinctInOrder(this.sceneLabels(project, def.kind)),
      this.config(project, def)
    );
    // Hide a kind entirely until it's used (keeps acts opt-in).
    if (active.length === 0 && planned.length === 0) return;

    const section = container.createDiv({ cls: "inkswell-structure__section" });
    const head = section.createDiv({ cls: "inkswell-structure__head" });
    head.createSpan({ cls: "inkswell-structure__title", text: def.plural });
    const add = head.createEl("button", { cls: "inkswell-structure__add", text: `＋ Add ${def.label.toLowerCase()}` });
    add.onclick = () => void this.addPlanned(project, def, active, planned);

    // Per-group word/scene counts (async; filled after the rows exist).
    const fills: Array<(m: { words: number; scenes: number } | undefined) => void> = [];

    for (const g of active) {
      fills.push(this.renderRow(section, project, def, g, false));
    }

    if (planned.length > 0) {
      section.createDiv({ cls: "inkswell-structure__subhead", text: "Planned (no scenes yet)" });
      for (const g of planned) this.renderRow(section, project, def, g, true);
    }

    void this.fillCounts(project, def, active, fills);
  }

  /**
   * One group row. Returns a fill callback for async word/scene counts (active
   * rows only; planned rows are always 0 scenes).
   */
  private renderRow(
    section: HTMLElement,
    project: Project,
    def: KindDef,
    group: StructureGroup,
    planned: boolean
  ): (m: { words: number; scenes: number } | undefined) => void {
    const row = section.createDiv({ cls: "inkswell-structure__row" });

    const title = row.createDiv({ cls: "inkswell-structure__name" });
    title.createSpan({ text: group.title });
    const meta = title.createSpan({ cls: "inkswell-structure__meta" });
    meta.setText(planned ? "planned" : "…");

    const bar = row.createDiv({ cls: "inkswell-progress inkswell-structure__bar" });
    const fill = bar.createDiv({ cls: "inkswell-progress__fill" });
    if (!group.targetWords) bar.addClass("is-empty");

    const targetInput = row.createEl("input", {
      type: "number",
      cls: "inkswell-structure__target",
    });
    targetInput.min = "0";
    targetInput.placeholder = "Target";
    targetInput.value = group.targetWords ? String(group.targetWords) : "";
    targetInput.onchange = () => {
      const n = Math.floor(Number(targetInput.value));
      const val = Number.isFinite(n) && n > 0 ? n : 0;
      void this.setTarget(project, def, group, val, planned);
    };

    const rename = row.createEl("button", { cls: "inkswell-structure__act", text: "Rename" });
    rename.onclick = () => void this.renameGroup(project, def, group);

    if (planned) {
      const del = row.createEl("button", { cls: "inkswell-structure__act", text: "Delete" });
      del.onclick = () => void this.deletePlanned(project, def, group);
    }

    // Fill the progress bar now for a known target; words arrive async.
    return (m) => {
      const words = m?.words ?? 0;
      const scenes = m?.scenes ?? 0;
      if (!planned) {
        meta.setText(
          `${scenes} scene${scenes === 1 ? "" : "s"} · ${words.toLocaleString()}` +
            (group.targetWords ? ` / ${group.targetWords.toLocaleString()}` : " words")
        );
      }
      if (group.targetWords) {
        const pct = Math.max(0, Math.min(100, (words / group.targetWords) * 100));
        fill.style.width = `${pct}%`;
        bar.toggleClass("is-done", words >= group.targetWords);
      }
    };
  }

  private async fillCounts(
    project: Project,
    def: KindDef,
    active: StructureGroup[],
    fills: Array<(m: { words: number; scenes: number } | undefined) => void>
  ): Promise<void> {
    const map = await this.plugin.stats.groupWords(project, def.kind);
    active.forEach((g, i) => fills[i]?.(map.get(g.title)));
  }

  // --- Writes (all guarded) ------------------------------------------------

  private async setTarget(
    project: Project,
    def: KindDef,
    group: StructureGroup,
    value: number,
    planned: boolean
  ): Promise<void> {
    const file = this.indexFile(project);
    if (!file) return;
    const cfg = this.config(project, def);
    let next: StructureGroup[];
    if (value > 0) {
      next = upsertGroup(cfg, { id: group.id.startsWith("derived-") ? undefined : group.id, title: group.title, targetWords: value });
    } else if (planned) {
      // Keep a planned group when its target is cleared — it's the only record it exists.
      next = upsertGroup(cfg, { id: group.id, title: group.title });
    } else {
      // Active group with a cleared target: drop the now-redundant config entry.
      next = removeGroup(cfg, group.id);
    }
    await tryFileOp(
      () => persistStructure(this.app, file, def.kind, next),
      `Couldn't save the ${def.label.toLowerCase()} target.`
    );
  }

  private async addPlanned(
    project: Project,
    def: KindDef,
    active: StructureGroup[],
    planned: StructureGroup[]
  ): Promise<void> {
    const name = await promptText(this.app, {
      title: `New ${def.label.toLowerCase()}`,
      value: "",
      multiline: false,
      cta: "Add",
    });
    if (name === null) return;
    const title = name.trim();
    if (!title) return;
    if ([...active, ...planned].some((g) => g.title === title)) {
      // Already exists (active or planned) — nothing to add.
      return;
    }
    const file = this.indexFile(project);
    if (!file) return;
    const next = upsertGroup(this.config(project, def), { title });
    await tryFileOp(
      () => persistStructure(this.app, file, def.kind, next),
      `Couldn't add the ${def.label.toLowerCase()}.`
    );
  }

  private async renameGroup(project: Project, def: KindDef, group: StructureGroup): Promise<void> {
    const input = await promptText(this.app, {
      title: `Rename ${def.label.toLowerCase()}`,
      value: group.title,
      multiline: false,
      cta: "Rename",
    });
    if (input === null) return;
    const newTitle = input.trim();
    if (!newTitle || newTitle === group.title) return;

    const file = this.indexFile(project);
    if (!file) return;

    // Rewrite the string on every member scene (none for a planned group), then
    // update the config entry's title. Scene frontmatter only — never the body.
    const members = project.scenes.filter((s) => {
      if (!s.path) return false;
      const f = this.app.vault.getAbstractFileByPath(s.path);
      return f instanceof TFile && readSceneMeta(this.app, f)[def.kind] === group.title;
    });

    await tryFileOp(async () => {
      for (const s of members) {
        const f = this.app.vault.getAbstractFileByPath(s.path!);
        if (f instanceof TFile) await writeSceneMeta(this.app, f, { [def.kind]: newTitle });
      }
      const renamed = renameGroupConfig(this.config(project, def), group.title, newTitle);
      if (renamed) await persistStructure(this.app, file, def.kind, renamed);
    }, `Couldn't rename the ${def.label.toLowerCase()}.`);
  }

  private async deletePlanned(project: Project, def: KindDef, group: StructureGroup): Promise<void> {
    const ok = await confirmDelete(
      this.app,
      `Remove the planned ${def.label.toLowerCase()} "${group.title}"? (No scenes are affected.)`
    );
    if (!ok) return;
    const file = this.indexFile(project);
    if (!file) return;
    const next = removeGroup(this.config(project, def), group.id);
    await tryFileOp(
      () => persistStructure(this.app, file, def.kind, next),
      `Couldn't remove the ${def.label.toLowerCase()}.`
    );
  }
}
