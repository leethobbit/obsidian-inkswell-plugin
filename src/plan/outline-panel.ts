/**
 * Plan → Structure → Tree: the Act › Chapter › Scene outliner (the "Tree" view of
 * the Structure sub-tab, alongside Board and Grid).
 *
 * This tree is the authoritative structure. Dragging a scene into a chapter (or a
 * chapter into an act) writes the derived outputs via {@link applyOutline}: the
 * scene's `chapter`/`act` strings AND the manuscript order (`longform.scenes`),
 * so the book reads in outline order and chapters stay contiguous. Nesting is
 * optional — a chapter can be act-less and a scene chapter-less (shown in the
 * "Chapters with no act" / "Unassigned scenes" buckets).
 *
 * Scope note: read/written on the **focused draft** (each draft owns its own
 * structure — scenes and their order are per-draft), unlike book-level overview/goals.
 */

import { App, Menu, TFile, setIcon } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { Project, isMultiScene } from "../projects/types";
import { confirmDelete, openScene, promptText } from "../scenes/scene-actions";
import { readSceneMeta } from "../scenes/scene-meta";
import { renderEmptyState, renderEmptyStateAction } from "../views/panel-kit";
import { applyOutline } from "../outliner/apply-outline";
import {
  ActNode,
  ChapterNode,
  OutlineTree,
  SceneRef,
  buildOutline,
  moveAct,
  moveChapter,
  moveScene,
  newActNode,
  newChapterNode,
} from "../outliner/outline";
import type InkswellPlugin from "../../main";

type DragKind = "scene" | "chapter" | "act";

export class OutlinePanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private tree: OutlineTree = { acts: [], looseChapters: [], unassignedScenes: [] };
  private project: Project | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = active;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-outline");

    const project = resolveActive(this.store.getProjects(), this.active.get());
    if (!project || !isMultiScene(project.draft)) {
      renderEmptyState(
        container,
        project ? "The outline applies to multi-scene projects." : "No projects found."
      );
      return;
    }
    this.project = project;
    this.tree = this.build(project);

    // Toolbar
    const bar = container.createDiv({ cls: "inkswell-outline__bar" });
    const addAct = bar.createEl("button", { text: "Add act" });
    addAct.onclick = () => void this.addAct();
    const addChapter = bar.createEl("button", { text: "Add chapter" });
    addChapter.onclick = () => void this.addChapter(null);

    // Nothing to arrange yet: point at the natural upstream step rather than an
    // empty tree with two lonely buttons.
    if (
      project.scenes.length === 0 &&
      this.tree.acts.length === 0 &&
      this.tree.looseChapters.length === 0
    ) {
      renderEmptyStateAction(
        container,
        "Nothing to structure yet. The usual flow: sketch your Beats, scaffold scenes " +
          "from them, then come back to group scenes into acts and chapters.",
        [{ label: "Go to Beats", cta: true, onClick: () => void this.plugin.openBeats() }]
      );
      return;
    }

    // Word/scene counts per chapter (async fill).
    const fills = new Map<string, (m: { words: number; scenes: number } | undefined) => void>();

    for (const act of this.tree.acts) this.renderAct(container, act, fills);

    if (this.tree.looseChapters.length > 0) {
      const box = this.bucket(container, "Chapters with no act", "chapter", null);
      for (const c of this.tree.looseChapters) this.renderChapter(box, c, null, fills);
    }
    if (this.tree.unassignedScenes.length > 0) {
      const box = this.bucket(container, "Unassigned scenes", "scene", null);
      for (const s of this.tree.unassignedScenes) this.renderScene(box, s, null);
    }

    void this.fillCounts(project, fills);
  }

  // --- Build / counts ------------------------------------------------------

  private build(project: Project): OutlineTree {
    const scenes = project.scenes.map((s) => {
      const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      const meta = f instanceof TFile ? readSceneMeta(this.app, f) : {};
      return { title: s.title, path: s.path, indent: s.indent, chapter: meta.chapter, act: meta.act };
    });
    return buildOutline(project.inkswell?.acts, project.inkswell?.chapters, scenes);
  }

  private async fillCounts(
    project: Project,
    fills: Map<string, (m: { words: number; scenes: number } | undefined) => void>
  ): Promise<void> {
    const map = await this.plugin.stats.groupWords(project, "chapter");
    for (const [title, fill] of fills) fill(map.get(title));
  }

  private indexFile(): TFile | null {
    if (!this.project) return null;
    const f = this.app.vault.getAbstractFileByPath(this.project.vaultPath);
    return f instanceof TFile ? f : null;
  }

  // --- Rendering -----------------------------------------------------------

  private renderAct(
    container: HTMLElement,
    act: ActNode,
    fills: Map<string, (m: { words: number; scenes: number } | undefined) => void>
  ): void {
    const box = container.createDiv({ cls: "inkswell-outline__act" });
    const row = box.createDiv({ cls: "inkswell-outline__row is-act" });
    this.grip(row);
    row.createSpan({ cls: "inkswell-outline__name", text: `Act — ${act.title}` });
    const addCh = row.createEl("button", { cls: "inkswell-outline__mini", text: "Add chapter" });
    addCh.onclick = () => void this.addChapter(act.id);

    this.draggable(row, "act", act.id);
    // Act row accepts act-reorder (above/below this one) and chapter drops (appended into this act).
    this.dropZone(
      row,
      (kind, id, after) => {
        if (kind === "act") this.commit(moveAct(this.tree, id, act.id, after));
        else if (kind === "chapter") this.commit(moveChapter(this.tree, id, act.id, null));
      },
      true
    );
    attachRowMenu(row, row, () => this.actMenu(act));

    const body = box.createDiv({ cls: "inkswell-outline__children" });
    // Empty act still accepts chapter drops.
    this.dropZone(body, (kind, id) => {
      if (kind === "chapter") this.commit(moveChapter(this.tree, id, act.id, null));
    });
    if (act.chapters.length === 0) {
      body.createDiv({ cls: "inkswell-outline__empty", text: "Drop chapters here" });
    }
    for (const c of act.chapters) this.renderChapter(body, c, act.id, fills);
  }

  private renderChapter(
    parent: HTMLElement,
    chapter: ChapterNode,
    actId: string | null,
    fills: Map<string, (m: { words: number; scenes: number } | undefined) => void>
  ): void {
    const box = parent.createDiv({ cls: "inkswell-outline__chapter" });
    const row = box.createDiv({ cls: "inkswell-outline__row is-chapter" });
    this.grip(row);
    const name = row.createDiv({ cls: "inkswell-outline__name" });
    name.createSpan({ text: chapter.title });
    const meta = name.createSpan({ cls: "inkswell-outline__meta", text: "…" });

    const bar = row.createDiv({ cls: "inkswell-progress inkswell-outline__progress" });
    const fill = bar.createDiv({ cls: "inkswell-progress__fill" });
    if (!chapter.targetWords) bar.addClass("is-empty");

    const target = row.createEl("input", { type: "number", cls: "inkswell-outline__target" });
    target.min = "0";
    target.placeholder = "Target";
    target.value = chapter.targetWords ? String(chapter.targetWords) : "";
    target.onchange = () => {
      const n = Math.floor(Number(target.value));
      void this.setTarget(chapter.id, Number.isFinite(n) && n > 0 ? n : 0);
    };

    this.draggable(row, "chapter", chapter.id);
    // Chapter row accepts chapter-reorder (above/below this one, same act) and
    // scene drops (appended into this chapter).
    this.dropZone(
      row,
      (kind, id, after) => {
        if (kind === "chapter") this.commit(moveChapter(this.tree, id, actId, chapter.id, after));
        else if (kind === "scene") this.commit(moveScene(this.tree, id, chapter.id, null));
      },
      true
    );
    attachRowMenu(row, row, () => this.chapterMenu(chapter, actId));

    const body = box.createDiv({ cls: "inkswell-outline__children" });
    this.dropZone(body, (kind, id) => {
      if (kind === "scene") this.commit(moveScene(this.tree, id, chapter.id, null));
    });
    if (chapter.scenes.length === 0) {
      body.createDiv({ cls: "inkswell-outline__empty", text: "Drop scenes here" });
    }
    for (const s of chapter.scenes) this.renderScene(body, s, chapter.id);

    // Fill counts + progress once groupWords resolves (keyed by chapter title).
    fills.set(chapter.title, (m) => {
      const words = m?.words ?? 0;
      const scenes = m?.scenes ?? 0;
      meta.setText(
        `${scenes} scene${scenes === 1 ? "" : "s"} · ${words.toLocaleString()}` +
          (chapter.targetWords ? ` / ${chapter.targetWords.toLocaleString()}` : " words")
      );
      if (chapter.targetWords) {
        fill.style.width = `${Math.max(0, Math.min(100, (words / chapter.targetWords) * 100))}%`;
        bar.toggleClass("is-done", words >= chapter.targetWords);
      }
    });
  }

  private renderScene(parent: HTMLElement, scene: SceneRef, chapterId: string | null): void {
    const row = parent.createDiv({ cls: "inkswell-outline__row is-scene" });
    this.grip(row);
    const name = row.createSpan({ cls: "inkswell-outline__name inkswell-outline__scene", text: scene.title });
    if (scene.path) {
      name.addClass("is-link");
      // Open the scene in the Write editor (not a plain note tab).
      name.onclick = () => this.plugin.openSceneInWrite(scene.path!);
    }
    this.draggable(row, "scene", scene.title);
    // Scene row accepts scene-reorder — placed above or below this one (by drop
    // position), into the same chapter.
    this.dropZone(
      row,
      (kind, id, after) => {
        if (kind === "scene") this.commit(moveScene(this.tree, id, chapterId, scene.title, after));
      },
      true
    );
    attachRowMenu(row, row, () => this.sceneMenu(scene));
  }

  /** A labelled bucket container that is itself a drop target. */
  private bucket(container: HTMLElement, label: string, accept: DragKind, target: null): HTMLElement {
    const box = container.createDiv({ cls: "inkswell-outline__bucket" });
    box.createDiv({ cls: "inkswell-outline__subhead", text: label });
    const body = box.createDiv({ cls: "inkswell-outline__children" });
    this.dropZone(body, (kind, id) => {
      if (kind !== accept) return;
      if (accept === "scene") this.commit(moveScene(this.tree, id, target, null));
      else this.commit(moveChapter(this.tree, id, target, null));
    });
    return body;
  }

  private grip(row: HTMLElement): void {
    setIcon(row.createSpan({ cls: "inkswell-outline__grip" }), "grip-vertical");
  }

  // --- Drag-and-drop primitives -------------------------------------------

  private draggable(el: HTMLElement, kind: DragKind, id: string): void {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      el.addClass("is-dragging");
      e.dataTransfer?.setData(`inkswell/outline-${kind}`, id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => el.removeClass("is-dragging"));
  }

  private dropZone(
    el: HTMLElement,
    onDrop: (kind: DragKind, id: string, after: boolean) => void,
    positional = false
  ): void {
    // On a positional row, the pointer's vertical position within the row picks
    // above (top half) vs below (bottom half). Non-positional zones just append.
    const isAfter = (e: DragEvent): boolean => {
      if (!positional) return false;
      const r = el.getBoundingClientRect();
      return e.clientY > r.top + r.height / 2;
    };
    const clearHints = () =>
      el.removeClasses(["is-drop-target", "is-drop-above", "is-drop-below"]);
    el.addEventListener("dragover", (e) => {
      const kind = this.draggedKind(e);
      if (!kind || !e.dataTransfer) return;
      e.preventDefault();
      e.stopPropagation();
      clearHints();
      if (positional) el.addClass(isAfter(e) ? "is-drop-below" : "is-drop-above");
      else el.addClass("is-drop-target");
    });
    el.addEventListener("dragleave", clearHints);
    el.addEventListener("drop", (e) => {
      clearHints();
      const kind = this.draggedKind(e);
      if (!kind || !e.dataTransfer) return;
      const id = e.dataTransfer.getData(`inkswell/outline-${kind}`);
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      onDrop(kind, id, isAfter(e));
    });
  }

  private draggedKind(e: DragEvent): DragKind | null {
    const t = e.dataTransfer?.types ?? [];
    if (t.includes("inkswell/outline-scene")) return "scene";
    if (t.includes("inkswell/outline-chapter")) return "chapter";
    if (t.includes("inkswell/outline-act")) return "act";
    return null;
  }

  /** Persist a new tree (no-op if the transform returned the same reference). */
  private commit(next: OutlineTree): void {
    const file = this.indexFile();
    if (!file || !this.project || next === this.tree) return;
    this.tree = next;
    void applyOutline(this.app, file, this.project, next);
  }

  // --- Touch fallback menus ------------------------------------------------

  private sceneMenu(scene: SceneRef): Menu {
    const menu = new Menu();
    if (scene.path) {
      // The row click already opens the scene in Write; offer the plain note here.
      menu.addItem((i) =>
        i.setTitle("Open note").setIcon("file-text").onClick(() => {
          const f = this.app.vault.getAbstractFileByPath(scene.path!);
          if (f instanceof TFile) openScene(this.app, f);
        })
      );
    }
    menu.addSeparator();
    for (const c of this.allChapters()) {
      menu.addItem((i) =>
        i.setTitle(`Move to: ${c.title}`).onClick(() => this.commit(moveScene(this.tree, scene.title, c.id, null)))
      );
    }
    menu.addItem((i) =>
      i.setTitle("Move to: (unassigned)").onClick(() => this.commit(moveScene(this.tree, scene.title, null, null)))
    );
    return menu;
  }

  private chapterMenu(chapter: ChapterNode, actId: string | null): Menu {
    const menu = new Menu();
    menu.addItem((i) => i.setTitle("Rename…").setIcon("pencil").onClick(() => void this.renameChapter(chapter)));
    menu.addItem((i) => i.setTitle("Delete").setIcon("trash").onClick(() => void this.deleteChapter(chapter)));
    menu.addSeparator();
    for (const a of this.tree.acts) {
      if (a.id === actId) continue;
      menu.addItem((i) =>
        i.setTitle(`Move to: ${a.title}`).onClick(() => this.commit(moveChapter(this.tree, chapter.id, a.id, null)))
      );
    }
    if (actId !== null) {
      menu.addItem((i) =>
        i.setTitle("Move to: (no act)").onClick(() => this.commit(moveChapter(this.tree, chapter.id, null, null)))
      );
    }
    return menu;
  }

  private actMenu(act: ActNode): Menu {
    const menu = new Menu();
    menu.addItem((i) => i.setTitle("Rename…").setIcon("pencil").onClick(() => void this.renameAct(act)));
    menu.addItem((i) => i.setTitle("Delete").setIcon("trash").onClick(() => void this.deleteAct(act)));
    const idx = this.tree.acts.findIndex((a) => a.id === act.id);
    if (idx > 0) {
      const before = this.tree.acts[idx - 1];
      menu.addItem((i) => i.setTitle("Move up").setIcon("arrow-up").onClick(() => this.commit(moveAct(this.tree, act.id, before.id))));
    }
    if (idx < this.tree.acts.length - 1) {
      const after = this.tree.acts[idx + 2]?.id ?? null; // insert before the act two down = after the next
      menu.addItem((i) => i.setTitle("Move down").setIcon("arrow-down").onClick(() => this.commit(moveAct(this.tree, act.id, after))));
    }
    return menu;
  }

  private allChapters(): ChapterNode[] {
    return [...this.tree.acts.flatMap((a) => a.chapters), ...this.tree.looseChapters];
  }

  // --- Create / rename / delete / target -----------------------------------

  private async addAct(): Promise<void> {
    const name = await promptText(this.app, { title: "New act", value: "", multiline: false, cta: "Add" });
    if (!name?.trim()) return;
    const next = { ...this.tree, acts: [...this.tree.acts, newActNode(name.trim())] };
    this.commit(next);
  }

  private async addChapter(actId: string | null): Promise<void> {
    const name = await promptText(this.app, { title: "New chapter", value: "", multiline: false, cta: "Add" });
    if (!name?.trim()) return;
    const node = newChapterNode(name.trim());
    let next: OutlineTree;
    if (actId === null) {
      next = { ...this.tree, looseChapters: [...this.tree.looseChapters, node] };
    } else {
      next = {
        ...this.tree,
        acts: this.tree.acts.map((a) => (a.id === actId ? { ...a, chapters: [...a.chapters, node] } : a)),
      };
    }
    this.commit(next);
  }

  private async renameChapter(chapter: ChapterNode): Promise<void> {
    const input = await promptText(this.app, { title: "Rename chapter", value: chapter.title, multiline: false, cta: "Rename" });
    const t = input?.trim();
    if (!t || t === chapter.title) return;
    this.commit(this.mapChapter(chapter.id, (c) => ({ ...c, title: t })));
  }

  private async renameAct(act: ActNode): Promise<void> {
    const input = await promptText(this.app, { title: "Rename act", value: act.title, multiline: false, cta: "Rename" });
    const t = input?.trim();
    if (!t || t === act.title) return;
    this.commit({ ...this.tree, acts: this.tree.acts.map((a) => (a.id === act.id ? { ...a, title: t } : a)) });
  }

  private async deleteChapter(chapter: ChapterNode): Promise<void> {
    const ok = await confirmDelete(
      this.app,
      chapter.scenes.length > 0
        ? `Delete chapter "${chapter.title}"? Its ${chapter.scenes.length} scene(s) become unassigned (files are kept).`
        : `Delete chapter "${chapter.title}"?`
    );
    if (!ok) return;
    // Move its scenes to unassigned, then drop the chapter node.
    const orphans = chapter.scenes;
    const stripAct = (a: ActNode): ActNode => ({ ...a, chapters: a.chapters.filter((c) => c.id !== chapter.id) });
    this.commit({
      acts: this.tree.acts.map(stripAct),
      looseChapters: this.tree.looseChapters.filter((c) => c.id !== chapter.id),
      unassignedScenes: [...this.tree.unassignedScenes, ...orphans],
    });
  }

  private async deleteAct(act: ActNode): Promise<void> {
    const ok = await confirmDelete(
      this.app,
      act.chapters.length > 0
        ? `Delete act "${act.title}"? Its ${act.chapters.length} chapter(s) become act-less.`
        : `Delete act "${act.title}"?`
    );
    if (!ok) return;
    this.commit({
      ...this.tree,
      acts: this.tree.acts.filter((a) => a.id !== act.id),
      looseChapters: [...this.tree.looseChapters, ...act.chapters],
    });
  }

  private async setTarget(chapterId: string, value: number): Promise<void> {
    // Target lives on the chapter config; route through the tree so the write
    // path stays single. value 0 clears it.
    this.commit(this.mapChapter(chapterId, (c) => {
      const next = { ...c };
      if (value > 0) next.targetWords = value;
      else delete next.targetWords;
      return next;
    }));
  }

  /** Return a new tree with `fn` applied to the chapter node with `id`. */
  private mapChapter(id: string, fn: (c: ChapterNode) => ChapterNode): OutlineTree {
    const mapCh = (c: ChapterNode) => (c.id === id ? fn(c) : c);
    return {
      acts: this.tree.acts.map((a) => ({ ...a, chapters: a.chapters.map(mapCh) })),
      looseChapters: this.tree.looseChapters.map(mapCh),
      unassignedScenes: this.tree.unassignedScenes,
    };
  }
}
