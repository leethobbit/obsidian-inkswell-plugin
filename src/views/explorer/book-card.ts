/**
 * Home's book card (the All-projects shelves) and the small cover thumb the
 * focused view's series strip reuses. A card is navigation — click / Enter
 * focuses the book; its ⋯ menu carries the actions (rename, series, cover).
 * Sibling of hero-card.ts; rendered by explorer-view.ts.
 */

import { App, Menu, TFile } from "obsidian";
import { t, tp } from "../../i18n";
import { hueFor } from "../../lib/hue";
import { relativeTime } from "../../lib/relative-time";
import { attachRowMenu } from "../../lib/row-menu";
import { resolveCoverSrc } from "../../projects/cover";
import { ProjectStats } from "../../projects/project-stats";
import { baseDraftFor } from "../../projects/stories";
import { Project, isMultiScene } from "../../projects/types";
import { projectSeries } from "../../series/series";

export interface BookCardContext {
  app: App;
  stats: ProjectStats;
  /** Every project (all drafts) — story-level data (cover, target, series) reads off the base draft. */
  projects: Project[];
  showWordCounts: boolean;
  /** Story is archived → dimmed card + "Archived" badge (it still opens normally). */
  isArchived(project: Project): boolean;
  /** Drafts per story title (>1 → badge). */
  draftCount(title: string): number;
  menu(project: Project): Menu;
  onOpen(project: Project): void;
}

/**
 * The cover image, or a generated stand-in: the title on a tint derived from
 * it, so a book without art still reads as a book and keeps its colour.
 */
export function renderCoverArt(parent: HTMLElement, app: App, project: Project, base: Project): void {
  const src = resolveCoverSrc(app, base.inkswell?.overview?.cover);
  if (src) {
    const img = parent.createEl("img", { cls: "inkswell-card__img" });
    img.src = src;
    img.alt = t("home.card.coverAlt", { title: project.draft.title });
    img.loading = "lazy";
    return;
  }
  const ph = parent.createDiv({ cls: "inkswell-card__placeholder" });
  ph.createSpan({ cls: "inkswell-card__placeholder-title", text: project.draft.title });
  ph.style.setProperty("--inkswell-card-hue", String(hueFor(project.draft.title)));
}

/** Newest mtime across the project's scene files (or its single note); null if none exist. */
export function lastEdited(app: App, project: Project): number | null {
  const paths = isMultiScene(project.draft) ? project.scenes.map((s) => s.path) : [project.vaultPath];
  let max = 0;
  for (const p of paths) {
    if (!p) continue;
    const f = app.vault.getAbstractFileByPath(p);
    if (f instanceof TFile && f.stat.mtime > max) max = f.stat.mtime;
  }
  return max || null;
}

/** Enter / Space on a role=button element runs `fn` (only when the element itself is the target). */
function onActivate(el: HTMLElement, fn: () => void): void {
  el.onkeydown = (e) => {
    if (e.target !== el) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

export function renderBookCard(grid: HTMLElement, project: Project, ctx: BookCardContext): HTMLElement {
  const base = baseDraftFor(ctx.projects, project);
  const card = grid.createDiv({ cls: "inkswell-card" });
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  card.dataset.projectPath = project.vaultPath;
  card.setAttribute("aria-label", t("home.card.open", { title: project.draft.title }));
  const open = () => ctx.onOpen(project);
  card.onclick = open;
  onActivate(card, open);

  const cover = card.createDiv({ cls: "inkswell-card__cover" });
  renderCoverArt(cover, ctx.app, project, base);
  const info = projectSeries(base);
  if (info?.order != null) cover.createSpan({ cls: "inkswell-card__badge", text: t("home.card.bookNumber", { number: info.order }) });
  if (ctx.isArchived(project)) {
    card.addClass("is-archived");
    cover.createSpan({ cls: "inkswell-card__badge inkswell-card__badge--archived", text: t("home.card.archived") });
  }

  const body = card.createDiv({ cls: "inkswell-card__body" });
  body.createDiv({ cls: "inkswell-card__title", text: project.draft.title });

  const meta = body.createDiv({ cls: "inkswell-card__meta" });
  const drafts = ctx.draftCount(project.draft.title);
  if (drafts > 1) {
    const badge = meta.createSpan({ cls: "inkswell-project__drafts", text: tp("home.project.drafts", drafts) });
    badge.setAttribute("aria-label", t("home.project.draftsHint"));
  }
  const stat = meta.createSpan({ cls: "inkswell-card__stat" });
  const scenes = isMultiScene(project.draft) ? project.scenes.length : null;
  const scenesText = scenes != null ? tp("common.scenes", scenes) : "";
  stat.setText(scenesText);

  if (ctx.showWordCounts) {
    // Target is story-level (base draft); the words are this draft's own.
    const rawTarget = base.inkswell?.goals?.target;
    const target = typeof rawTarget === "number" && rawTarget > 0 ? rawTarget : 0;
    const bar = target ? body.createDiv({ cls: "inkswell-progress inkswell-card__bar" }) : null;
    const fill = bar?.createDiv({ cls: "inkswell-progress__fill" });
    void ctx.stats.projectWords(project).then((w) => {
      const words = tp("common.words", w);
      stat.setText(scenesText ? `${scenesText} · ${words}` : words);
      if (bar && fill && target) {
        const pct = Math.min(100, Math.round((w / target) * 100));
        fill.style.width = `${pct}%`;
        bar.toggleClass("is-done", pct >= 100);
        bar.setAttribute("aria-label", tp("home.card.progress", target, { percent: pct }));
      }
    });
  }

  const edited = lastEdited(ctx.app, project);
  if (edited) body.createDiv({ cls: "inkswell-card__edited", text: t("home.card.edited", { time: relativeTime(edited) }) });

  // Right-click anywhere / the ⋯ button (hover-revealed on desktop, always on touch).
  attachRowMenu(card, card, () => ctx.menu(project));
  return card;
}

/** A small cover for the focused view's series strip; click switches focus to that book. */
export function renderCoverThumb(
  parent: HTMLElement,
  app: App,
  projects: Project[],
  book: Project,
  active: boolean,
  onOpen: (book: Project) => void
): HTMLElement {
  const base = baseDraftFor(projects, book);
  const thumb = parent.createDiv({ cls: "inkswell-seriesstrip__thumb" });
  thumb.toggleClass("is-active", active);
  thumb.setAttribute("role", "button");
  thumb.tabIndex = 0;
  const info = projectSeries(base);
  thumb.setAttribute(
    "aria-label",
    info?.order != null ? t("home.card.thumb", { number: info.order, title: book.draft.title }) : book.draft.title
  );
  renderCoverArt(thumb, app, book, base);
  const open = () => onOpen(book);
  thumb.onclick = open;
  onActivate(thumb, open);
  return thumb;
}
