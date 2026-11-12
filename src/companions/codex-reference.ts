/**
 * The Codex as a reference beside the page: the entries in the scene you're
 * writing (linked ones first, then the ones its prose names), a search box for
 * everything else, and entries you chose to keep at the top. Clicking one shows
 * its full card in place (one level, with a back arrow). View only: "Open in
 * Codex" edits.
 *
 * One renderer, two homes (see reference.ts): the Codex sidebar companion and
 * the Codex panel in Write's side column. "Keep at the top" is per device and
 * per book (localStorage), shared by both homes, and is a different thing from
 * the Codex's "Pin in this book" (#70, vault data).
 */

import { Menu, TFile, setIcon } from "obsidian";
import { detectMentions } from "../codex/codex";
import { codexSearchMatch } from "../codex/codex-list";
import { renderEntityCard } from "../codex/entity-card";
import { entitiesForScene } from "../codex/peek";
import { CodexEntity, allCategories, categoryLabel } from "../codex/types";
import { t, tp } from "../i18n";
import { tagField } from "../lib/focus-preserve";
import { stripFrontmatter } from "../lib/frontmatter";
import { Project } from "../projects/types";
import { readSceneMeta } from "../scenes/scene-meta";
import { SceneEntity, entitiesInScene } from "./context";
import { ReferenceHost, Sections, renderReferenceEmpty } from "./reference";

const KEEP_PREFIX = "inkswell-companion-keep:";
const RESCAN_DELAY = 1000;

export class CodexReference {
  private search = "";
  /** Entries opened from the list, newest last (the back arrow pops one). */
  private stack: string[] = [];
  /** Paths named in the current scene's prose, for `mentionsFor`. */
  private mentions: { path: string; mtime: number; paths: string[] } | null = null;
  private scanning: string | null = null;
  private rescanTimer: number | null = null;
  private sections = new Sections();

  constructor(private host: ReferenceHost) {}

  /** The entry whose card is showing, if one is. */
  shownEntry(): string | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  /** A different scene is being written: back to the list. */
  sceneChanged(): void {
    this.stack = [];
  }

  /**
   * The current scene was saved, so who it names may have changed. Redraw once
   * the writer pauses (a scene is only written on autosave or blur, never per
   * keystroke); the redraw re-scans because the file's mtime moved.
   */
  sceneSaved(): void {
    if (this.rescanTimer !== null) window.clearTimeout(this.rescanTimer);
    this.rescanTimer = window.setTimeout(() => {
      this.rescanTimer = null;
      this.host.requestRender();
    }, RESCAN_DELAY);
  }

  dispose(): void {
    if (this.rescanTimer !== null) window.clearTimeout(this.rescanTimer);
    this.rescanTimer = null;
  }

  render(body: HTMLElement, project: Project, scene: TFile | null): void {
    const visible = entitiesForScene(this.host.plugin, scene?.path ?? null);
    const byPath = new Map(visible.map((e) => [e.path, e] as const));

    const top = this.shownEntry();
    const shown = top ? byPath.get(top) : undefined;
    if (shown) {
      this.renderDetail(body, shown, visible);
      return;
    }
    this.stack = [];

    const input = body.createEl("input", {
      type: "search",
      cls: "inkswell-companion__search",
      placeholder: t("companion.codex.search"),
    });
    tagField(input, "codex-reference:search");
    input.value = this.search;
    input.oninput = () => {
      this.search = input.value;
      this.host.requestRender();
    };

    const q = this.search.trim().toLowerCase();
    if (q) {
      const hits = visible.filter((e) => codexSearchMatch(e, q) !== null);
      if (hits.length === 0) renderReferenceEmpty(body, t("companion.codex.noMatch"));
      else this.renderGrouped(body, hits, project);
      return;
    }

    const kept = this.kept(project)
      .map((p) => byPath.get(p))
      .filter((e): e is CodexEntity => !!e);
    if (kept.length > 0) {
      this.sections.section(body, "kept", t("companion.codex.kept"), (host) => {
        for (const e of kept) this.renderRow(host, e, project);
      });
    }

    this.sections.section(body, "scene", t("companion.codex.inScene"), (host) => {
      if (!scene) {
        renderReferenceEmpty(host, t("companion.codex.noScene"));
        return;
      }
      const meta = readSceneMeta(this.host.app, scene);
      const links = [...(meta.characters ?? []), ...(meta.location ?? [])];
      const rows = entitiesInScene(links, this.mentionsFor(scene, visible), visible);
      if (rows.length === 0) {
        renderReferenceEmpty(host, t("companion.codex.nobodyHere"));
        return;
      }
      for (const row of rows) this.renderRow(host, row.entity, project, row);
    });

    this.sections.section(
      body,
      "all",
      tp("companion.codex.all", visible.length),
      (host) => this.renderGrouped(host, visible, project),
      false
    );
  }

  /** Prose mentions for `scene`, from a cached scan; starts a scan when stale. */
  private mentionsFor(scene: TFile, visible: readonly CodexEntity[]): string[] {
    const cached = this.mentions;
    if (cached && cached.path === scene.path && cached.mtime === scene.stat.mtime) return cached.paths;
    if (this.scanning !== scene.path) {
      this.scanning = scene.path;
      void this.host.app.vault.cachedRead(scene).then((text) => {
        this.scanning = null;
        const paths = detectMentions(stripFrontmatter(text), [...visible]).map((m) => m.path);
        this.mentions = { path: scene.path, mtime: scene.stat.mtime, paths };
        this.host.requestRender();
      });
    }
    return cached && cached.path === scene.path ? cached.paths : [];
  }

  private renderGrouped(host: HTMLElement, entities: readonly CodexEntity[], project: Project): void {
    const s = this.host.plugin.settings;
    for (const cat of allCategories(s.customCategories, s.categoryOverrides)) {
      const group = entities.filter((e) => e.category === cat.id);
      if (group.length === 0) continue;
      host.createDiv({ cls: "inkswell-companion__group", text: cat.plural || cat.label });
      for (const e of [...group].sort((a, b) => a.name.localeCompare(b.name))) this.renderRow(host, e, project);
    }
    const known = new Set(allCategories(s.customCategories, s.categoryOverrides).map((c) => c.id));
    const other = entities.filter((e) => !known.has(e.category));
    if (other.length > 0) {
      host.createDiv({ cls: "inkswell-companion__group", text: t("companion.codex.uncategorized") });
      for (const e of other) this.renderRow(host, e, project);
    }
  }

  private renderRow(host: HTMLElement, e: CodexEntity, project: Project, info?: SceneEntity): void {
    const s = this.host.plugin.settings;
    const row = host.createDiv({ cls: "inkswell-companion__row" });
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    const text = row.createDiv({ cls: "inkswell-companion__rowtext" });
    text.createDiv({ cls: "inkswell-companion__rowname", text: e.name });
    const sub = [categoryLabel(e.category, s.customCategories, s.categoryOverrides)];
    if (info && !info.linked) sub.push(t("companion.codex.mentioned"));
    text.createDiv({ cls: "inkswell-companion__rowsub", text: sub.join(" · ") });

    const kept = this.kept(project).includes(e.path);
    const keep = row.createEl("button", { cls: "clickable-icon inkswell-companion__keep" });
    setIcon(keep, kept ? "pin-off" : "pin");
    keep.setAttribute("aria-label", kept ? t("companion.codex.unkeep") : t("companion.codex.keep"));
    if (kept) keep.addClass("is-active");
    keep.onclick = (ev) => {
      ev.stopPropagation();
      this.toggleKeep(project, e.path);
    };

    const open = () => {
      this.stack.push(e.path);
      this.host.requestRender();
    };
    row.onclick = open;
    row.onkeydown = (ev) => {
      if (ev.key === "Enter") open();
    };
    row.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle(t("card.openInCodex"))
          .setIcon("book-marked")
          .onClick(() => this.host.plugin.openCodexEntry(e.path))
      );
      menu.addItem((i) =>
        i
          .setTitle(kept ? t("companion.codex.unkeep") : t("companion.codex.keep"))
          .setIcon(kept ? "pin-off" : "pin")
          .onClick(() => this.toggleKeep(project, e.path))
      );
      menu.showAtMouseEvent(ev);
    });
  }

  private renderDetail(body: HTMLElement, entity: CodexEntity, visible: readonly CodexEntity[]): void {
    const back = body.createEl("button", { cls: "inkswell-companion__back" });
    setIcon(back.createSpan(), "arrow-left");
    const prev = this.stack.length > 1 ? this.stack[this.stack.length - 2] : null;
    const prevName = prev ? visible.find((e) => e.path === prev)?.name : null;
    back.createSpan({ text: prevName ? t("peek.back", { name: prevName }) : t("companion.codex.backToList") });
    back.onclick = () => {
      this.stack.pop();
      this.host.requestRender();
    };
    renderEntityCard(body.createDiv(), {
      app: this.host.app,
      plugin: this.host.plugin,
      entity,
      entities: visible,
      size: "full",
      onNavigate: (next) => {
        this.stack.push(next.path);
        this.host.requestRender();
      },
    });
  }

  // --- Keep at the top (device-local, per book) ------------------------------

  private keepKey(project: Project): string {
    return KEEP_PREFIX + project.vaultPath;
  }

  private kept(project: Project): string[] {
    try {
      const raw = window.localStorage.getItem(this.keepKey(project));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  private toggleKeep(project: Project, path: string): void {
    const cur = this.kept(project);
    const next = cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path];
    try {
      window.localStorage.setItem(this.keepKey(project), JSON.stringify(next));
    } catch {
      /* storage blocked: keeping just doesn't stick */
    }
    this.host.requestRender();
  }
}
