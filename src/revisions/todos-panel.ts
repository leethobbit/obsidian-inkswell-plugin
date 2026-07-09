/**
 * Todos panel (Revise → Todos): a single sweep of every to-do marker left in the
 * prose — `[TODO: …]`, `[RESEARCH: …]`, `[NOTE: …]`, `[DIALOGUE: …]`, `[SCENE: …]`.
 * Grouped by scene, filterable by kind. Click a row to jump to that token in the
 * Write editor (it scrolls to and flashes the marker for fast revising).
 *
 * Read-only sweep — resolve a to-do by editing the prose in Write. Reuses the pure
 * `findGaps` scanner; frontmatter is stripped first so token offsets/line numbers
 * match the Write editor's document exactly (its doc is the body sans frontmatter).
 */

import { App } from "obsidian";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { ProjectStore } from "../projects/project-store";
import { PlaceholderKind } from "../lib/placeholders";
import { SceneTodos, scanProjectTodos } from "./todos-scan";

const KIND_LABEL: Record<PlaceholderKind, string> = {
  todo: "TODO",
  research: "Research",
  note: "Note",
  dialogue: "Dialogue",
  scene: "Scene",
};

const KIND_ORDER: PlaceholderKind[] = ["todo", "research", "note", "dialogue", "scene"];

/** Highlight target handed to the Write panel: a token's offsets in the body. */
export interface TodoHighlight {
  from: number;
  to: number;
}

export class TodosPanel {
  private app: App;
  private store: ProjectStore;
  private active: ActiveProject;
  private onOpenInWrite: (path: string, highlight?: TodoHighlight) => void;

  private filter: PlaceholderKind | null = null;
  private groups: SceneTodos[] = [];
  private chipBar: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;

  constructor(
    app: App,
    store: ProjectStore,
    active: ActiveProject,
    onOpenInWrite: (path: string, highlight?: TodoHighlight) => void
  ) {
    this.app = app;
    this.store = store;
    this.active = active;
    this.onOpenInWrite = onOpenInWrite;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-todos");

    const projects = this.store.getProjects().filter((p) => p.draft.format === "scenes");
    const project = resolveActive(projects, this.active.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No multi-scene projects." });
      return;
    }

    container.createDiv({
      cls: "inkswell-stats__muted",
      text: "Every to-do marker left in your prose — [TODO: …], [RESEARCH: …], [NOTE: …], [DIALOGUE: …], [SCENE: …]. Click one to jump to it in Write.",
    });
    this.chipBar = container.createDiv({ cls: "inkswell-todos__filters" });
    this.listEl = container.createDiv({ cls: "inkswell-todos__list" });
    this.listEl.createDiv({ cls: "inkswell-stats__muted", text: "Scanning scenes…" });
    void this.scan(project.scenes);
  }

  private async scan(scenes: { title: string; path: string | null }[]): Promise<void> {
    this.groups = await scanProjectTodos(this.app, scenes);
    this.renderChips();
    this.renderList();
  }

  private counts(): Record<PlaceholderKind, number> {
    const c: Record<PlaceholderKind, number> = {
      todo: 0,
      research: 0,
      note: 0,
      dialogue: 0,
      scene: 0,
    };
    for (const g of this.groups) for (const t of g.todos) c[t.kind]++;
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
        cls: "inkswell-todos__chip",
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

    const total = this.groups.reduce((n, g) => n + g.todos.length, 0);
    if (total === 0) {
      this.listEl.createDiv({
        cls: "inkswell-stats__muted",
        text: "No to-dos found. Drop a [TODO: …] or [RESEARCH: …] while drafting to come back to it.",
      });
      return;
    }

    for (const g of this.groups) {
      const todos = this.filter ? g.todos.filter((t) => t.kind === this.filter) : g.todos;
      if (!todos.length) continue;

      const header = this.listEl.createDiv({ cls: "inkswell-todos__scene" });
      header.setText(`${g.title} (${todos.length})`);
      header.onclick = () => this.onOpenInWrite(g.path);

      for (const t of todos) {
        const row = this.listEl.createDiv({ cls: "inkswell-todos__row" });
        row.createSpan({
          cls: `inkswell-todos__kind inkswell-todos__kind--${t.kind}`,
          text: KIND_LABEL[t.kind],
        });
        row.createSpan({ cls: "inkswell-todos__line", text: `L${t.line}` });
        row.createSpan({ cls: "inkswell-todos__text", text: t.excerpt });
        row.onclick = () => this.onOpenInWrite(g.path, { from: t.from, to: t.to });
      }
    }
  }
}
