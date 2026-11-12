/**
 * Scenes companion (left sidebar by default; #53): the book's Act › Chapter ›
 * Scene outline for jumping around while you write, Longform-style. A click
 * opens the scene in Write or a normal tab (Settings → "Open scenes from the
 * sidebar in"), Ctrl/Cmd-click always a new tab, right-click the shared scene
 * menu. Reordering stays in Plan → Structure.
 */

import { Menu, TFile, WorkspaceLeaf } from "obsidian";
import type InkswellPlugin from "../../main";
import { t, tp } from "../i18n";
import { ChapterNode, SceneRef, buildOutline } from "../outliner/outline";
import { Project } from "../projects/types";
import { addSceneMenuItems } from "../scenes/scene-actions";
import { readSceneMeta, statusLabel } from "../scenes/scene-meta";
import { CompanionView } from "./companion-view";
import { CompanionId } from "./registry";

export class ScenesCompanionView extends CompanionView {
  constructor(leaf: WorkspaceLeaf, plugin: InkswellPlugin) {
    super(leaf, plugin);
  }

  protected companionId(): CompanionId {
    return "scenes";
  }

  protected openInInkswell(): void {
    void this.plugin.openProjects();
  }

  protected renderBody(body: HTMLElement, project: Project): void {
    body.createDiv({ cls: "inkswell-companion__book", text: project.draft.title });
    const scenes = project.scenes.map((s) => {
      const f = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
      const meta = f instanceof TFile ? readSceneMeta(this.app, f) : null;
      return { title: s.title, path: s.path ?? null, indent: s.indent ?? 0, chapter: meta?.chapter, act: meta?.act };
    });
    if (scenes.length === 0) {
      this.empty(body, t("companion.scenes.none"));
      return;
    }
    const tree = buildOutline(project.inkswell?.acts, project.inkswell?.chapters, scenes);
    const current = this.plugin.currentScene.get();

    for (const act of tree.acts) {
      if (act.chapters.length === 0) continue;
      this.section(body, `act:${act.id}`, act.title, (host) => {
        for (const ch of act.chapters) this.renderChapter(host, project, ch, current);
      });
    }
    for (const ch of tree.looseChapters) this.renderChapter(body, project, ch, current);
    if (tree.unassignedScenes.length > 0) {
      if (tree.acts.length > 0 || tree.looseChapters.length > 0) {
        body.createDiv({ cls: "inkswell-companion__group", text: t("companion.scenes.unassigned") });
      }
      for (const s of tree.unassignedScenes) this.renderScene(body, project, s, current);
    }
  }

  private renderChapter(host: HTMLElement, project: Project, ch: ChapterNode, current: string | null): void {
    if (ch.scenes.length === 0) return;
    const holdsCurrent = ch.scenes.some((s) => s.path === current);
    this.section(
      host,
      `chapter:${ch.id}`,
      `${ch.title} · ${tp("companion.scenes.count", ch.scenes.length)}`,
      (inner) => {
        for (const s of ch.scenes) this.renderScene(inner, project, s, current);
      },
      holdsCurrent || ch.scenes.length <= 12
    );
  }

  private renderScene(host: HTMLElement, project: Project, s: SceneRef, current: string | null): void {
    const file = s.path ? this.app.vault.getAbstractFileByPath(s.path) : null;
    const row = host.createDiv({ cls: "inkswell-companion__scenerow" });
    if (s.indent > 0) row.addClass(`is-indent-${Math.min(s.indent, 3)}`);
    if (s.path && s.path === current) row.addClass("is-current");
    row.createSpan({ cls: "inkswell-companion__scenetitle", text: s.title });
    if (!(file instanceof TFile)) {
      row.addClass("is-missing");
      return;
    }
    const meta = readSceneMeta(this.app, file);
    if (meta.status) {
      row.createSpan({
        cls: `inkswell-status inkswell-status--${meta.status}`,
        text: statusLabel(meta.status, this.plugin.settings.listOverrides["scene.status"]),
      });
    }
    row.setAttribute("role", "link");
    row.tabIndex = 0;
    row.onclick = (e) => this.openScene(file, e.ctrlKey || e.metaKey);
    row.onauxclick = (e) => {
      if (e.button === 1) this.openScene(file, true);
    };
    row.onkeydown = (e) => {
      if (e.key === "Enter") this.openScene(file, e.ctrlKey || e.metaKey);
    };
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      addSceneMenuItems(menu, this.app, project, s.title, file, { includeOpen: true, plugin: this.plugin });
      menu.showAtMouseEvent(e);
    });
  }
}
