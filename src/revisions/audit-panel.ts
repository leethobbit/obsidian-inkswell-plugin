/**
 * Audit panel (Revise → Audit): the hub for the tiered
 * revision method.
 *
 *  - Story-level (18) and Prose-level (32, grouped) checklists are project state
 *    under `inkswell.revisionChecklist`, edited here and persisted via
 *    `persistChecklistItem` (per-item deltas against current state). (The prose
 *    tier's stored key is "page" for back-compat; only the display label changed.)
 *  - The per-chapter checklist (#75) is project state too, under
 *    `inkswell.revisionChecklist.chapter[<chapterId>]`, one expandable row per
 *    chapter run (`chapterRuns`), persisted via `persistChapterChecklistItem`.
 *  - The per-scene 14-point checklist (scene frontmatter) is summarised as rows,
 *    each expandable to edit inline via the shared `renderSceneAuditFields`.
 *
 * Section open/closed state is held on the instance so the host's re-render (which
 * fires whenever a checklist write touches the index frontmatter) doesn't collapse
 * what the user opened.
 */

import { App, TFile } from "obsidian";
import { MessageKey, t, tp } from "../i18n";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { stripFrontmatter } from "../lib/frontmatter";
import { tryFileOp } from "../lib/notify";
import type { SceneHighlight } from "../views/write-panel";
import { SectionState } from "../views/panel-kit";
import { linkTarget } from "../codex/codex";
import { getCodexEntities } from "../codex/codex-store";
import { filterToScope, scopeContextForProject } from "../codex/codex-scope";
import { ActiveProject, resolveActive } from "../projects/active-project";
import {
  persistChapterChecklistItem,
  persistChecklistItem,
  updateArcTracked,
  updateStyleEntries,
} from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { Project } from "../projects/types";
import { ChapterRun, chapterRuns } from "../outliner/outline";
import { openScene } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { renderSceneAuditFields } from "../scenes/scene-meta-form";
import {
  ArcSnapshot,
  buildArcTimeline,
  flatStretches,
  parseTracked,
  serializeTracked,
  transformDelta,
} from "./arc";
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
  auditProgress,
  chapterCheckpoints,
  pageCheckIds,
  pageGroups,
  sceneAuditRollup,
  sceneCheckIds,
  sceneCheckpoints,
  storyCheckpoints,
} from "./audit";
import type { ListOverrides } from "../settings/overridable-lists";
import { SceneVerdict, readSceneAudit } from "./audit-meta";
import { OPENING_LABEL, OpeningType, classifyOpening, flagOpeningRuns } from "./openings";
import {
  ChecklistItem,
  ChecklistState,
  ChecklistTier,
  chapterState,
  checklistProgress,
  stateProgress,
  tierState,
} from "./checklist";

/** Lift-out verdict (stored value) → its badge text (lowercase in English). */
const VERDICT_BADGE: Record<SceneVerdict, MessageKey> = {
  keep: "revise.verdict.keep",
  cut: "revise.verdict.cut",
  merge: "revise.verdict.merge",
};

export class AuditPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;
  /** Open <details> ids, preserved across re-renders. */
  private sections = new SectionState(["audit-scenes"]);

  constructor(
    app: App,
    store: ProjectStore,
    active: ActiveProject,
    private markWrite?: (path: string) => void,
    /** Open a scene in the Write editor (optionally flashing a range). Falls
     *  back to a plain markdown tab when the host doesn't wire it. */
    private onOpenInWrite?: (path: string, highlight?: SceneHighlight) => void,
    /** The writer's Customize overrides (read at render time, never cached);
     *  a thunk so the panel stays plugin-free for tests. */
    private getListOverrides: () => ListOverrides = () => ({})
  ) {
    this.app = app;
    this.store = store;
    this.active = active;
  }

  private jump(path: string, highlight?: SceneHighlight): void {
    if (this.onOpenInWrite) {
      this.onOpenInWrite(path, highlight);
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) openScene(this.app, file);
  }

  /** Re-render in place after a notify caused by our own writes (checklist
   *  ticks, style entries, tracked arcs — all marked via markWrite), so the
   *  progress counters update without a full body teardown. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-audit");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: t("audit.noProjects") });
      return;
    }

    const data = project.inkswell?.revisionChecklist;
    const o = this.getListOverrides();
    const storyItems = storyCheckpoints(o["audit.story"]);
    const story = checklistProgress(data, "story", storyItems.map((c) => c.id));
    const page = checklistProgress(data, "page", pageCheckIds(o["audit.page"]));
    const rollup = sceneAuditRollup(
      project.scenes.map((s) => ({
        title: s.title,
        path: s.path,
        checks: s.path ? this.checksFor(s.path) : {},
      })),
      sceneCheckIds(o["audit.scene"])
    );
    const chapterItems = chapterCheckpoints(o["audit.chapter"]);
    const chapterIds = chapterItems.map((c) => c.id);
    const runs = this.chapterRunsFor(project);
    const chaptersDone = runs.filter((r) => {
      const p = stateProgress(chapterState(data, r.id), chapterIds);
      return p.total > 0 && p.done === p.total;
    }).length;

    const summary = container.createDiv({ cls: "inkswell-audit__summary" });
    const parts = [t("audit.summary.story", { done: story.done, total: story.total })];
    if (runs.length > 0) {
      parts.push(t("audit.summary.chapters", { done: chaptersDone, total: runs.length }));
    }
    parts.push(
      t("audit.summary.scenes", { done: rollup.complete, total: rollup.rows.length }),
      t("audit.summary.prose", { done: page.done, total: page.total })
    );
    summary.createSpan({ cls: "inkswell-stats__muted", text: parts.join(" · ") });

    this.section(
      container,
      "audit-story",
      t("audit.section.story", { done: story.done, total: story.total }),
      (host) => this.renderTier(host, project, "story", storyItems)
    );
    // Writers who don't use chapters never see an empty chapter section.
    if (runs.length > 0) {
      this.section(
        container,
        "audit-chapters",
        t("audit.section.chapters", { done: chaptersDone, total: runs.length }),
        (host) => this.renderChapters(host, project, runs, chapterItems)
      );
    }
    this.section(
      container,
      "audit-page",
      t("audit.section.prose", { done: page.done, total: page.total }),
      (host) => this.renderPageTier(host, project)
    );
    this.section(
      container,
      "audit-scenes",
      t("audit.section.scenes", { done: rollup.complete, total: rollup.rows.length }),
      (host) => this.renderScenes(host, project)
    );
    this.section(container, "audit-openings", t("audit.section.openings"), (host) =>
      void this.renderOpenings(host, project)
    );
    this.section(container, "audit-arc", t("audit.section.arc"), (host) => this.renderArc(host, project));
    this.section(container, "audit-roster", t("audit.section.roster"), (host) =>
      this.renderRoster(host, project)
    );
    this.section(container, "audit-style", t("audit.section.style"), (host) =>
      this.renderStyleSheet(host, project)
    );
  }

  /** Thin wrapper over `SectionState.section()` fixing this panel's section classes. */
  private section(
    parent: HTMLElement,
    id: string,
    title: string,
    build: (host: HTMLElement) => void
  ): void {
    this.sections.section(parent, id, title, build, {
      detailsCls: "inkswell-audit__section",
      bodyCls: "inkswell-audit__body",
    });
  }

  /** Synchronous read of a scene's ticked checks from the metadata cache. */
  private checksFor(path: string): Partial<Record<string, boolean>> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return {};
    return readSceneAudit(this.app, file).checks;
  }

  /** The manuscript's chapters (THE chapter model, #58 — never group by string). */
  private chapterRunsFor(project: Project): ChapterRun[] {
    const scenes = project.scenes.map((s) => {
      const file = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      return {
        title: s.title,
        chapter: file instanceof TFile ? readSceneMeta(this.app, file).chapter : undefined,
      };
    });
    return chapterRuns(scenes, project.inkswell?.chapters).runs;
  }

  private renderChapters(
    host: HTMLElement,
    project: Project,
    runs: ChapterRun[],
    checkpoints: Checkpoint[]
  ): void {
    host.createDiv({ cls: "inkswell-stats__muted", text: t("audit.chapters.intro") });
    const ids = checkpoints.map((c) => c.id);
    for (const run of runs) {
      const state = chapterState(project.inkswell?.revisionChecklist, run.id);
      const { done, total } = stateProgress(state, ids);

      const row = host.createEl("details", { cls: "inkswell-audit__scene" });
      const key = `chapter:${run.id}`;
      row.open = this.sections.isOpen(key);
      const summary = row.createEl("summary");
      const badge = summary.createSpan({ cls: "inkswell-audit__badge", text: `${done}/${total}` });
      if (total > 0 && done === total) badge.addClass("is-complete");
      summary.createSpan({ cls: "inkswell-audit__scenetitle", text: run.title });
      summary.createSpan({
        cls: "inkswell-stats__muted",
        text: tp("audit.chapters.scenes", run.indices.length),
      });

      const body = row.createDiv({ cls: "inkswell-audit__body" });
      const chapter = {
        id: run.id,
        title: run.title,
        firstScene: project.scenes[run.indices[0]]?.title,
      };
      let built = false;
      const build = () => {
        if (built) return;
        built = true;
        for (const cp of checkpoints) {
          this.renderCheck(body, key, cp, state, (patch) =>
            this.saveChapterItem(project, chapter, cp.id, patch)
          );
        }
      };
      if (row.open) build();
      row.addEventListener("toggle", () => {
        this.sections.setOpen(key, row.open);
        if (row.open) build();
      });
    }
  }

  private saveChapterItem(
    project: Project,
    chapter: { id: string; title: string; firstScene?: string },
    id: string,
    patch: Partial<ChecklistItem>
  ): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    // Same contract as saveItem: a delta against the CURRENT stored checklist;
    // the self-marked write soft-refreshes this panel with sections restored.
    if (file instanceof TFile) {
      this.markWrite?.(file.path);
      void tryFileOp(
        () => persistChapterChecklistItem(this.app, file, chapter, id, patch),
        t("audit.saveFailed")
      );
    }
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
    for (const group of pageGroups(this.getListOverrides()["audit.page"])) {
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
    this.renderCheck(host, tier, cp, state, (patch) => this.saveItem(project, tier, cp.id, patch));
  }

  /** One checkpoint row: checkbox + label, and a note field once engaged.
   *  `scope` keys the focus tags (`story`, `page`, `chapter:<id>`). */
  private renderCheck(
    host: HTMLElement,
    scope: string,
    cp: Checkpoint,
    state: ChecklistState,
    save: (patch: Partial<ChecklistItem>) => void
  ): void {
    const item = state[cp.id] ?? {};
    const row = host.createDiv({ cls: "inkswell-audit__item" });
    const label = row.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    tagField(cb, `audit:check:${scope}:${cp.id}`);
    cb.checked = !!item.done;
    cb.onchange = () => save({ done: cb.checked });
    label.createSpan({ text: cp.label });

    // Reveal a note field once the item is engaged (checked or already noted).
    if (item.done || item.note) {
      const note = row.createEl("input", { type: "text", cls: "inkswell-audit__note" });
      tagField(note, `audit:note:${scope}:${cp.id}`);
      note.value = item.note ?? "";
      note.placeholder = t("audit.notePlaceholder");
      note.onchange = () => save({ note: note.value });
    }
  }

  private saveItem(
    project: Project,
    tier: ChecklistTier,
    id: string,
    patch: { done?: boolean; note?: string }
  ): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    // Persist only — the index-frontmatter write triggers a store refresh, which
    // soft-refreshes this panel (self-write mark; open sections are restored
    // from `this.sections`). The patch is applied against the CURRENT stored
    // checklist inside the write, so ticking several boxes in a row never
    // loses earlier ticks.
    if (file instanceof TFile) {
      this.markWrite?.(file.path);
      void tryFileOp(
        () => persistChecklistItem(this.app, file, tier, id, patch),
        t("audit.saveFailed")
      );
    }
  }

  private renderScenes(host: HTMLElement, project: Project): void {
    const scenes = project.scenes.filter((s) => s.path);
    if (scenes.length === 0) {
      host.createDiv({ cls: "inkswell-stats__muted", text: t("audit.noScenes") });
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
    const checkpoints = sceneCheckpoints(this.getListOverrides()["audit.scene"]);
    const { done, total } = auditProgress(audit.checks, checkpoints.map((c) => c.id));

    const row = host.createEl("details", { cls: "inkswell-audit__scene" });
    const id = `scene:${file.path}`;
    row.open = this.sections.isOpen(id);
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
        text: t(VERDICT_BADGE[audit.verdict]),
      });
    }

    let built = false;
    const body = row.createDiv({ cls: "inkswell-audit__body" });
    const build = () => {
      if (built) return;
      built = true;
      renderSceneAuditFields(
        body,
        this.app,
        file,
        () => {
          const n = body.querySelectorAll<HTMLInputElement>(
            ".inkswell-audit__check input:checked"
          ).length;
          badge.setText(`${n}/${total}`);
          badge.toggleClass("is-complete", n === total);
        },
        this.markWrite,
        checkpoints
      );
    };
    if (row.open) build();
    row.addEventListener("toggle", () => {
      this.sections.setOpen(id, row.open);
      if (row.open) build();
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
      text: t("audit.openings.heuristic"),
    });
    const strip = host.createDiv({ cls: "inkswell-stats__muted", text: t("audit.openings.analyzing") });

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
      strip.setText(t("audit.openings.none"));
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
      warn.setText(t("audit.openings.variety"));
    } else {
      for (const r of runs) {
        warn.createDiv({
          cls: "inkswell-stats__row",
          text: t("audit.openings.run", {
            count: r.length,
            type: OPENING_LABEL[r.type],
            from: r.start + 1,
            to: r.start + r.length,
          }),
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

    const tracked = parseTracked(project.inkswell?.arcTracked);
    const inData = new Set<string>();
    for (const s of sceneArc) for (const name of Object.keys(s.arc)) inData.add(name);
    const codexChars = filterToScope(
      getCodexEntities(this.app),
      scopeContextForProject(project, this.store.getProjects())
    )
      .filter((e) => e.category === "character")
      .map((e) => e.name);
    const available = Array.from(new Set([...codexChars, ...inData])).sort();

    // Tracked-character picker.
    const picker = host.createDiv({ cls: "inkswell-audit__arcpicker" });
    for (const name of tracked) {
      const chip = picker.createSpan({ cls: "inkswell-chip", text: name });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => this.saveTracked(project, (names) => names.filter((n) => n !== name));
    }
    const untracked = available.filter((n) => !tracked.includes(n));
    if (untracked.length > 0) {
      const add = picker.createEl("select", { cls: "dropdown" });
      add.createEl("option", { text: t("audit.arc.track"), value: "" });
      for (const n of untracked) add.createEl("option", { text: n, value: n });
      add.value = "";
      add.onchange = () => {
        const name = add.value;
        if (name) {
          this.saveTracked(project, (names) =>
            names.includes(name) ? names : [...names, name]
          );
        }
      };
    }

    if (tracked.length === 0) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: t("audit.arc.empty"),
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
        badge.setText(t("audit.arc.noData"));
      } else if (delta.changed) {
        badge.addClass("is-transforms");
        badge.setText(tp("audit.arc.transforms", delta.recorded));
      } else {
        badge.addClass("inkswell-stats__muted");
        badge.setText(tp("audit.arc.flat", delta.recorded));
      }

      const flatScenes = new Set(flats.flatMap((f) => f.scenes));
      const strip = block.createDiv({ cls: "inkswell-audit__arcstrip" });
      for (const cell of row.cells) {
        const dot = strip.createSpan({ cls: "inkswell-audit__arccell" });
        if (cell.snapshot) {
          dot.addClass("has-data");
          dot.setAttribute("title", `${cell.title}\n${this.snapText(cell.snapshot)}`);
        } else {
          dot.setAttribute("title", t("audit.arc.cellNoData", { title: cell.title }));
        }
        if (flatScenes.has(cell.title)) dot.addClass("is-flat");
      }

      for (const f of flats) {
        block.createDiv({
          cls: "inkswell-stats__muted",
          text: t("audit.arc.flatStretch", { count: f.scenes.length, list: f.scenes.join(", ") }),
        });
      }
    }
  }

  private snapText(s: ArcSnapshot): string {
    const parts: string[] = [];
    if (s.internal) parts.push(t("audit.arc.internal", { text: s.internal }));
    if (s.external) parts.push(t("audit.arc.external", { text: s.external }));
    return parts.join(" · ");
  }

  private saveTracked(project: Project, op: (currentNames: string[]) => string[]): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    // Stored as wikilinks so renames follow; the op works in plain names against
    // the CURRENT stored list, so add/remove compose instead of clobbering.
    if (file instanceof TFile) {
      this.markWrite?.(file.path);
      void tryFileOp(
        () =>
          updateArcTracked(this.app, file, op, {
            parse: parseTracked,
            serialize: serializeTracked,
          }),
        t("audit.arc.saveFailed")
      );
    }
  }

  /**
   * Side-character roster: each codex character's narrative function, goal, flaw,
   * memorable trait, and scene-appearance count, flagging missing fields and
   * one-appearance walk-ons. Read-only — edit the fields in the Codex.
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

    const chars = filterToScope(
      getCodexEntities(this.app),
      scopeContextForProject(project, this.store.getProjects())
    ).filter((e) => e.category === "character");
    if (chars.length === 0) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: t("audit.roster.empty"),
      });
      return;
    }

    host.createDiv({
      cls: "inkswell-stats__muted",
      text: t("audit.roster.intro"),
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
        text: tp("audit.roster.scenes", entry.appearances),
      });
      if (file instanceof TFile) head.onclick = () => openScene(this.app, file);

      const detail = row.createDiv({ cls: "inkswell-stats__muted inkswell-audit__rosterdetail" });
      detail.setText(
        [
          entry.func && t("audit.roster.function", { text: entry.func }),
          entry.goal && t("audit.roster.goal", { text: entry.goal }),
          entry.flaw && t("audit.roster.flaw", { text: entry.flaw }),
          entry.trait && t("audit.roster.trait", { text: entry.trait }),
        ]
          .filter(Boolean)
          .join(" · ") || t("audit.roster.noFields")
      );

      if (gaps.missing.length || gaps.spearCarrier) {
        const flags = row.createDiv({ cls: "inkswell-audit__rosterflags" });
        if (gaps.missing.length) {
          flags.createSpan({ cls: "inkswell-audit__flag", text: t("audit.roster.missing", { list: gaps.missing.join(", ") }) });
        }
        if (gaps.spearCarrier) {
          flags.createSpan({ cls: "inkswell-audit__flag", text: t("audit.roster.walkOn") });
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
        row.createSpan({ cls: "inkswell-stats__muted", text: t("audit.style.not", { list: e.variants.join(", ") }) });
      }
      const del = row.createSpan({ cls: "inkswell-chip__x", text: "×" });
      del.setAttribute("aria-label", t("audit.style.remove", { name: e.canonical }));
      del.onclick = () => this.saveStyle(project, (cur) => cur.filter((x) => x.id !== e.id));
    }

    // Add form.
    const form = host.createDiv({ cls: "inkswell-audit__styleadd" });
    const canon = form.createEl("input", { type: "text" });
    tagField(canon, "audit:style-canon");
    canon.placeholder = t("audit.style.preferred");
    const variants = form.createEl("input", { type: "text" });
    tagField(variants, "audit:style-variants");
    variants.placeholder = t("audit.style.avoid");
    const kind = form.createEl("select", { cls: "dropdown" });
    tagField(kind, "audit:style-kind");
    for (const k of STYLE_KINDS) kind.createEl("option", { text: t(k.labelKey), value: k.id });
    const add = form.createEl("button", { text: t("audit.style.add") });
    add.onclick = () => {
      const canonical = canon.value.trim();
      if (!canonical) return;
      const next: StyleEntry = {
        id: newStyleId(),
        canonical,
        variants: variants.value.split(",").map((v) => v.trim()).filter(Boolean),
        kind: kind.value as StyleKind,
      };
      this.saveStyle(project, (cur) => [...cur, next]);
    };

    // Scan.
    const scanBtn = host.createEl("button", { text: t("audit.style.scan") });
    const results = host.createDiv({ cls: "inkswell-audit__styleresults" });
    scanBtn.onclick = () => {
      if (entries.length === 0) {
        results.setText(t("audit.style.needEntry"));
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
    results.createDiv({ cls: "inkswell-stats__muted", text: t("audit.style.scanning") });

    let total = 0;
    const groups: { title: string; file: TFile; hits: ReturnType<typeof scanDeviations> }[] = [];
    for (const scene of project.scenes) {
      if (!scene.path) continue;
      const file = this.app.vault.getAbstractFileByPath(scene.path);
      if (!(file instanceof TFile)) continue;
      // Body offsets (frontmatter stripped) so hits address the Write editor's doc.
      const hits = scanDeviations(stripFrontmatter(await this.app.vault.cachedRead(file)), entries);
      if (hits.length) {
        groups.push({ title: scene.title, file, hits });
        total += hits.length;
      }
    }

    results.empty();
    if (total === 0) {
      results.addClass("inkswell-stats__muted");
      results.setText(t("audit.style.none"));
      return;
    }
    for (const g of groups) {
      const header = results.createDiv({ cls: "inkswell-todos__scene" });
      header.setText(t("audit.style.group", { title: g.title, count: g.hits.length }));
      header.setAttribute("aria-label", t("audit.style.open", { title: g.title }));
      header.onclick = () => this.jump(g.file.path);
      for (const h of g.hits) {
        const r = results.createDiv({ cls: "inkswell-todos__row" });
        r.setAttribute("aria-label", t("audit.style.goLine", { line: h.line }));
        // `verify` lets the Write panel re-locate the word if the body shifted
        // since the scan (same contract as Search hits).
        r.onclick = () =>
          this.jump(g.file.path, { from: h.from, to: h.to, verify: h.variant });
        r.createSpan({ cls: "inkswell-todos__line", text: `L${h.line}` });
        r.createSpan({ cls: "inkswell-stats__muted", text: `“${h.variant}” → ${h.canonical}` });
        r.createSpan({ cls: "inkswell-todos__text", text: h.excerpt });
      }
    }
  }

  private saveStyle(project: Project, op: (current: StyleEntry[]) => StyleEntry[]): void {
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    // List op against the CURRENT stored entries (by stable id), so an add and
    // a remove issued from the same rendered list both land.
    if (file instanceof TFile) {
      this.markWrite?.(file.path);
      void tryFileOp(
        () => updateStyleEntries(this.app, file, op),
        t("audit.style.saveFailed")
      );
    }
  }
}
