/**
 * Audit panel (Revise → Audit): the hub for the Reviser's Workbook three-tier
 * revision method.
 *
 *  - Story-level (18) and Page-level (32, grouped) checklists are project state
 *    under `inkswell.revisionChecklist`, edited here and persisted via
 *    `persistInkswellData`.
 *  - The per-scene 14-point checklist (scene frontmatter) is summarised as rows,
 *    each expandable to edit inline via the shared `renderSceneAuditFields`.
 *
 * Section open/closed state is held on the instance so the host's re-render (which
 * fires whenever a checklist write touches the index frontmatter) doesn't collapse
 * what the user opened.
 */

import { App, TFile } from "obsidian";
import { linkTarget } from "../codex/codex";
import { getCodexEntities } from "../codex/codex-store";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistInkswellData } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { renderSceneAuditFields } from "../scenes/scene-meta-form";
import { ArcSnapshot, buildArcTimeline, flatStretches, transformDelta } from "./arc";
import { RosterEntry, rosterGaps } from "./roster";
import {
  STYLE_KINDS,
  StyleEntry,
  StyleKind,
  newStyleId,
  scanDeviations,
} from "./stylesheet";
import {
  Checkpoint,
  PAGE_GROUPS,
  SCENE_CHECK_IDS,
  STORY_CHECKPOINTS,
  auditProgress,
  sceneAuditRollup,
} from "./audit";
import { readSceneAudit } from "./audit-meta";
import { OPENING_LABEL, OpeningType, classifyOpening, flagOpeningRuns } from "./openings";
import {
  ChecklistState,
  ChecklistTier,
  checklistProgress,
  setChecklistItem,
  tierState,
} from "./checklist";

export class AuditPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;
  /** Open <details> ids, preserved across re-renders. */
  private open = new Set<string>(["audit-scenes"]);

  constructor(app: App, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-audit");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    const data = project.inkswell?.revisionChecklist;
    const story = checklistProgress(data, "story");
    const page = checklistProgress(data, "page");
    const rollup = sceneAuditRollup(
      project.scenes.map((s) => ({
        title: s.title,
        path: s.path,
        checks: s.path ? this.checksFor(s.path) : {},
      }))
    );

    const summary = container.createDiv({ cls: "inkswell-audit__summary" });
    summary.createSpan({
      cls: "inkswell-stats__muted",
      text: `Scenes audited ${rollup.complete}/${rollup.rows.length} · Story ${story.done}/${story.total} · Page ${page.done}/${page.total}`,
    });

    this.section(container, "audit-story", `Story-level (${story.done}/${story.total})`, (host) =>
      this.renderTier(host, project, "story", STORY_CHECKPOINTS)
    );
    this.section(container, "audit-page", `Page-level (${page.done}/${page.total})`, (host) =>
      this.renderPageTier(host, project)
    );
    this.section(
      container,
      "audit-scenes",
      `Scenes (${rollup.complete}/${rollup.rows.length} complete)`,
      (host) => this.renderScenes(host, project)
    );
    this.section(container, "audit-openings", "Scene openings", (host) =>
      this.renderOpenings(host, project)
    );
    this.section(container, "audit-arc", "Character arcs", (host) => this.renderArc(host, project));
    this.section(container, "audit-roster", "Side-character roster", (host) =>
      this.renderRoster(host, project)
    );
    this.section(container, "audit-style", "Style sheet", (host) =>
      this.renderStyleSheet(host, project)
    );
  }

  /** Synchronous read of a scene's ticked checks from the metadata cache. */
  private checksFor(path: string): Record<string, boolean> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return {};
    return readSceneAudit(this.app, file).checks;
  }

  private section(
    parent: HTMLElement,
    id: string,
    title: string,
    build: (host: HTMLElement) => void
  ): void {
    const details = parent.createEl("details", { cls: "inkswell-audit__section" });
    details.open = this.open.has(id);
    details.createEl("summary", { text: title });
    details.addEventListener("toggle", () => {
      if (details.open) this.open.add(id);
      else this.open.delete(id);
    });
    build(details.createDiv({ cls: "inkswell-audit__body" }));
  }

  private renderTier(
    host: HTMLElement,
    project: Project,
    tier: ChecklistTier,
    checkpoints: Checkpoint[]
  ): void {
    const state = tierState(project.inkswell?.revisionChecklist, tier);
    for (const cp of checkpoints) this.renderItem(host, project, tier, cp, state);
  }

  private renderPageTier(host: HTMLElement, project: Project): void {
    const state = tierState(project.inkswell?.revisionChecklist, "page");
    for (const group of PAGE_GROUPS) {
      host.createDiv({ cls: "inkswell-audit__grouplabel", text: group.label });
      for (const cp of group.items) this.renderItem(host, project, "page", cp, state);
    }
  }

  private renderItem(
    host: HTMLElement,
    project: Project,
    tier: ChecklistTier,
    cp: Checkpoint,
    state: ChecklistState
  ): void {
    const item = state[cp.id] ?? {};
    const row = host.createDiv({ cls: "inkswell-audit__item" });
    const label = row.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!item.done;
    cb.onchange = () => this.saveItem(project, tier, cp.id, { done: cb.checked });
    label.createSpan({ text: cp.label });

    // Reveal a note field once the item is engaged (checked or already noted).
    if (item.done || item.note) {
      const note = row.createEl("input", { type: "text", cls: "inkswell-audit__note" });
      note.value = item.note ?? "";
      note.placeholder = "note…";
      note.onchange = () => this.saveItem(project, tier, cp.id, { note: note.value });
    }
  }

  private saveItem(
    project: Project,
    tier: ChecklistTier,
    id: string,
    patch: { done?: boolean; note?: string }
  ): void {
    const next = setChecklistItem(project.inkswell?.revisionChecklist, tier, id, patch);
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    // Persist only — the index-frontmatter write triggers a store refresh, which
    // re-renders this panel (open sections are restored from `this.open`).
    if (file instanceof TFile) void persistInkswellData(this.app, file, { revisionChecklist: next });
  }

  private renderScenes(host: HTMLElement, project: Project): void {
    const scenes = project.scenes.filter((s) => s.path);
    if (scenes.length === 0) {
      host.createDiv({ cls: "inkswell-stats__muted", text: "No scenes yet." });
      return;
    }
    for (const scene of scenes) {
      const file = this.app.vault.getAbstractFileByPath(scene.path as string);
      if (!(file instanceof TFile)) continue;
      this.renderSceneRow(host, scene.title, file);
    }
  }

  private renderSceneRow(host: HTMLElement, title: string, file: TFile): void {
    const audit = readSceneAudit(this.app, file);
    const { done, total } = auditProgress(audit.checks, SCENE_CHECK_IDS);

    const row = host.createEl("details", { cls: "inkswell-audit__scene" });
    const id = `scene:${file.path}`;
    row.open = this.open.has(id);
    const summary = row.createEl("summary");
    const badge = summary.createSpan({
      cls: "inkswell-audit__badge",
      text: `${done}/${total}`,
    });
    if (done === total) badge.addClass("is-complete");
    summary.createSpan({ cls: "inkswell-audit__scenetitle", text: title });
    if (audit.verdict) {
      summary.createSpan({
        cls: `inkswell-audit__verdict inkswell-audit__verdict--${audit.verdict}`,
        text: audit.verdict,
      });
    }

    let built = false;
    const body = row.createDiv({ cls: "inkswell-audit__body" });
    const build = () => {
      if (built) return;
      built = true;
      renderSceneAuditFields(body, this.app, file, () => {
        const n = body.querySelectorAll<HTMLInputElement>(
          ".inkswell-audit__check input:checked"
        ).length;
        badge.setText(`${n}/${total}`);
        badge.toggleClass("is-complete", n === total);
      });
    };
    if (row.open) build();
    row.addEventListener("toggle", () => {
      if (row.open) {
        this.open.add(id);
        build();
      } else {
        this.open.delete(id);
      }
    });
  }

  /**
   * Scene-openings variety: classify how each scene opens (using the per-scene
   * override when set) and flag stretches of consecutive same-type openings.
   * Async because it reads scene bodies; honest about being a heuristic.
   */
  private async renderOpenings(host: HTMLElement, project: Project): Promise<void> {
    host.createDiv({
      cls: "inkswell-stats__muted",
      text: "Heuristic — classified from each scene's first line; override per scene in the Inspector.",
    });
    const strip = host.createDiv({ cls: "inkswell-stats__muted", text: "Analyzing openings…" });

    const scenes = project.scenes.filter((s) => s.path);
    const seq: OpeningType[] = [];
    const titles: string[] = [];
    for (const scene of scenes) {
      const file = this.app.vault.getAbstractFileByPath(scene.path as string);
      if (!(file instanceof TFile)) continue;
      const override = readSceneAudit(this.app, file).opening;
      const body = await this.app.vault.cachedRead(file);
      seq.push(override ?? classifyOpening(body));
      titles.push(scene.title);
    }

    strip.empty();
    strip.removeClass("inkswell-stats__muted");
    if (seq.length === 0) {
      strip.addClass("inkswell-stats__muted");
      strip.setText("No scenes to analyze.");
      return;
    }

    strip.addClass("inkswell-audit__openings");
    const runs = flagOpeningRuns(seq);
    const flagged = new Set<number>();
    for (const r of runs) for (let i = r.start; i < r.start + r.length; i++) flagged.add(i);

    seq.forEach((type, i) => {
      const chip = strip.createSpan({
        cls: `inkswell-audit__opening inkswell-audit__opening--${type}`,
        text: OPENING_LABEL[type],
      });
      chip.setAttribute("aria-label", titles[i]);
      chip.setAttribute("title", titles[i]);
      if (flagged.has(i)) chip.addClass("is-flagged");
    });

    const warn = host.createDiv({ cls: "inkswell-audit__runs" });
    if (runs.length === 0) {
      warn.addClass("inkswell-stats__muted");
      warn.setText("Good variety — no runs of repeated openings.");
    } else {
      for (const r of runs) {
        warn.createDiv({
          cls: "inkswell-stats__row",
          text: `${r.length} scenes in a row open with ${OPENING_LABEL[r.type]} (scenes ${r.start + 1}–${r.start + r.length}).`,
        });
      }
    }
  }

  /**
   * Character-arc tracker: pick which characters to track, then show each one's
   * internal/external state scene by scene, flagging flat stretches and showing a
   * first→last transform check. Per-scene snapshots are edited in the Inspector.
   */
  private renderArc(host: HTMLElement, project: Project): void {
    const sceneArc = project.scenes
      .filter((s) => s.path)
      .map((s) => {
        const file = this.app.vault.getAbstractFileByPath(s.path as string);
        const arc = file instanceof TFile ? readSceneAudit(this.app, file).arc : {};
        return { title: s.title, arc };
      });

    const tracked = project.inkswell?.arcTracked ?? [];
    const inData = new Set<string>();
    for (const s of sceneArc) for (const name of Object.keys(s.arc)) inData.add(name);
    const codexChars = getCodexEntities(this.app)
      .filter((e) => e.category === "character")
      .map((e) => e.name);
    const available = Array.from(new Set([...codexChars, ...inData])).sort();

    // Tracked-character picker.
    const picker = host.createDiv({ cls: "inkswell-audit__arcpicker" });
    for (const name of tracked) {
      const chip = picker.createSpan({ cls: "inkswell-chip", text: name });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => this.saveTracked(project, tracked.filter((t) => t !== name));
    }
    const untracked = available.filter((n) => !tracked.includes(n));
    if (untracked.length > 0) {
      const add = picker.createEl("select", { cls: "dropdown" });
      add.createEl("option", { text: "+ track character", value: "" });
      for (const n of untracked) add.createEl("option", { text: n, value: n });
      add.value = "";
      add.onchange = () => {
        if (add.value) this.saveTracked(project, [...tracked, add.value]);
      };
    }

    if (tracked.length === 0) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: "Track a character to chart their arc. Record per-scene internal/external state in the Scene Inspector (link the character to the scene first).",
      });
      return;
    }

    const rows = buildArcTimeline(sceneArc, tracked);
    for (const row of rows) {
      const delta = transformDelta(row);
      const flats = flatStretches(row);

      const block = host.createDiv({ cls: "inkswell-audit__arcblock" });
      const head = block.createDiv({ cls: "inkswell-audit__archead" });
      head.createSpan({ cls: "inkswell-audit__arcname", text: row.character });
      const badge = head.createSpan({ cls: "inkswell-audit__arcbadge" });
      if (delta.recorded === 0) {
        badge.addClass("inkswell-stats__muted");
        badge.setText("no data");
      } else if (delta.changed) {
        badge.addClass("is-transforms");
        badge.setText(`transforms · ${delta.recorded} scenes`);
      } else {
        badge.addClass("inkswell-stats__muted");
        badge.setText(`flat · ${delta.recorded} scenes`);
      }

      const flatScenes = new Set(flats.flatMap((f) => f.scenes));
      const strip = block.createDiv({ cls: "inkswell-audit__arcstrip" });
      for (const cell of row.cells) {
        const dot = strip.createSpan({ cls: "inkswell-audit__arccell" });
        if (cell.snapshot) {
          dot.addClass("has-data");
          dot.setAttribute("title", `${cell.title}\n${this.snapText(cell.snapshot)}`);
        } else {
          dot.setAttribute("title", `${cell.title} — no data`);
        }
        if (flatScenes.has(cell.title)) dot.addClass("is-flat");
      }

      for (const f of flats) {
        block.createDiv({
          cls: "inkswell-stats__muted",
          text: `Flat stretch (${f.scenes.length} scenes): ${f.scenes.join(", ")}`,
        });
      }
    }
  }

  private snapText(s: ArcSnapshot): string {
    const parts: string[] = [];
    if (s.internal) parts.push(`internal: ${s.internal}`);
    if (s.external) parts.push(`external: ${s.external}`);
    return parts.join(" · ");
  }

  private saveTracked(project: Project, next: string[]): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) void persistInkswellData(this.app, file, { arcTracked: next });
  }

  /**
   * Side-character roster: each codex character's narrative function, goal, flaw,
   * memorable trait, and scene-appearance count, flagging missing fields and
   * one-appearance walk-ons. Read-only — edit the fields in Plan → Codex.
   */
  private renderRoster(host: HTMLElement, project: Project): void {
    // Appearance counts from scene `characters` links.
    const appearances = new Map<string, number>();
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      for (const link of readSceneMeta(this.app, file).characters ?? []) {
        const name = linkTarget(link);
        appearances.set(name, (appearances.get(name) ?? 0) + 1);
      }
    }

    const chars = getCodexEntities(this.app).filter((e) => e.category === "character");
    if (chars.length === 0) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: "No codex characters yet. Add characters in Plan → Codex to build a roster.",
      });
      return;
    }

    host.createDiv({
      cls: "inkswell-stats__muted",
      text: "Each side character should serve a function, have a goal + flaw, and a memorable trait. Edit fields in Plan → Codex.",
    });

    for (const c of chars) {
      const file = this.app.vault.getAbstractFileByPath(c.path);
      const fm =
        file instanceof TFile
          ? (this.app.metadataCache.getFileCache(file)?.frontmatter ?? {})
          : {};
      const str = (v: unknown) => (typeof v === "string" ? v : undefined);
      const entry: RosterEntry = {
        name: c.name,
        func: str(fm["function"]),
        goal: str(fm["motivation"]),
        flaw: str(fm["flaw"]),
        trait: str(fm["memorableTrait"]),
        appearances: appearances.get(c.name) ?? 0,
      };
      const gaps = rosterGaps(entry);

      const row = host.createDiv({ cls: "inkswell-audit__rosterrow" });
      const head = row.createDiv({ cls: "inkswell-audit__rosterhead" });
      head.createSpan({ cls: "inkswell-audit__arcname", text: c.name });
      head.createSpan({
        cls: "inkswell-stats__muted",
        text: `${entry.appearances} scene${entry.appearances === 1 ? "" : "s"}`,
      });
      if (file instanceof TFile) head.onclick = () => openScene(this.app, file);

      const detail = row.createDiv({ cls: "inkswell-stats__muted inkswell-audit__rosterdetail" });
      detail.setText(
        [
          entry.func && `Function: ${entry.func}`,
          entry.goal && `Goal: ${entry.goal}`,
          entry.flaw && `Flaw: ${entry.flaw}`,
          entry.trait && `Trait: ${entry.trait}`,
        ]
          .filter(Boolean)
          .join(" · ") || "No roster fields set."
      );

      if (gaps.missing.length || gaps.spearCarrier) {
        const flags = row.createDiv({ cls: "inkswell-audit__rosterflags" });
        if (gaps.missing.length) {
          flags.createSpan({ cls: "inkswell-audit__flag", text: `missing: ${gaps.missing.join(", ")}` });
        }
        if (gaps.spearCarrier) {
          flags.createSpan({ cls: "inkswell-audit__flag", text: "appears once — cut or merge?" });
        }
      }
    }
  }

  /**
   * Style sheet: manage preferred spelling/name/term/number/format entries and
   * scan the manuscript for the variant forms to avoid.
   */
  private renderStyleSheet(host: HTMLElement, project: Project): void {
    const entries = project.inkswell?.styleSheet?.entries ?? [];

    // Existing entries.
    for (const e of entries) {
      const row = host.createDiv({ cls: "inkswell-audit__stylerow" });
      row.createSpan({ cls: "inkswell-audit__stylecanon", text: e.canonical });
      row.createSpan({ cls: "inkswell-stats__muted", text: `(${e.kind})` });
      if (e.variants.length) {
        row.createSpan({ cls: "inkswell-stats__muted", text: `not: ${e.variants.join(", ")}` });
      }
      const del = row.createSpan({ cls: "inkswell-chip__x", text: "×" });
      del.setAttribute("aria-label", `Remove ${e.canonical}`);
      del.onclick = () => this.saveStyle(project, entries.filter((x) => x.id !== e.id));
    }

    // Add form.
    const form = host.createDiv({ cls: "inkswell-audit__styleadd" });
    const canon = form.createEl("input", { type: "text" });
    canon.placeholder = "Preferred form";
    const variants = form.createEl("input", { type: "text" });
    variants.placeholder = "Avoid (comma-separated)";
    const kind = form.createEl("select", { cls: "dropdown" });
    for (const k of STYLE_KINDS) kind.createEl("option", { text: k.label, value: k.id });
    const add = form.createEl("button", { text: "Add" });
    add.onclick = () => {
      const canonical = canon.value.trim();
      if (!canonical) return;
      const next: StyleEntry = {
        id: newStyleId(),
        canonical,
        variants: variants.value.split(",").map((v) => v.trim()).filter(Boolean),
        kind: kind.value as StyleKind,
      };
      this.saveStyle(project, [...entries, next]);
    };

    // Scan.
    const scanBtn = host.createEl("button", { text: "Scan manuscript" });
    const results = host.createDiv({ cls: "inkswell-audit__styleresults" });
    scanBtn.onclick = () => {
      if (entries.length === 0) {
        results.setText("Add at least one style entry first.");
        results.addClass("inkswell-stats__muted");
        return;
      }
      void this.scanStyle(results, project, entries);
    };
  }

  private async scanStyle(
    results: HTMLElement,
    project: Project,
    entries: StyleEntry[]
  ): Promise<void> {
    results.empty();
    results.removeClass("inkswell-stats__muted");
    results.createDiv({ cls: "inkswell-stats__muted", text: "Scanning…" });

    let total = 0;
    const groups: { title: string; file: TFile; hits: ReturnType<typeof scanDeviations> }[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      const hits = scanDeviations(await this.app.vault.cachedRead(file), entries);
      if (hits.length) {
        groups.push({ title: scene.title, file, hits });
        total += hits.length;
      }
    }

    results.empty();
    if (total === 0) {
      results.addClass("inkswell-stats__muted");
      results.setText("No style deviations found.");
      return;
    }
    for (const g of groups) {
      const header = results.createDiv({ cls: "inkswell-gaps__scene" });
      header.setText(`${g.title} (${g.hits.length})`);
      header.onclick = () => openScene(this.app, g.file);
      for (const h of g.hits) {
        const r = results.createDiv({ cls: "inkswell-gaps__row" });
        r.createSpan({ cls: "inkswell-gaps__line", text: `L${h.line}` });
        r.createSpan({ cls: "inkswell-stats__muted", text: `“${h.variant}” → ${h.canonical}` });
        r.createSpan({ cls: "inkswell-gaps__excerpt", text: h.excerpt });
      }
    }
  }

  private saveStyle(project: Project, entries: StyleEntry[]): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (file instanceof TFile) {
      void persistInkswellData(this.app, file, { styleSheet: { entries } });
    }
  }
}
