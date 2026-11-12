/**
 * The Codex and Plan panels in Write's side column: the shared reference bodies
 * (src/companions/codex-reference.ts, plan-digest.ts) hosted inside the main
 * view, so a writer can keep either beside the prose without opening an
 * Obsidian sidebar. The sidebar companions host the very same bodies.
 *
 * Read-only like the companions: "Open in Codex" / "Open note" edit. Clicking a
 * scene here switches Write to it (Ctrl/Cmd-click opens a regular tab).
 */

import { App, TFile } from "obsidian";
import type InkswellPlugin from "../../main";
import { CodexReference } from "../companions/codex-reference";
import { PlanDigest } from "../companions/plan-digest";
import { ReferenceHost } from "../companions/reference";
import { t } from "../i18n";
import { preserveFocus } from "../lib/focus-preserve";
import { resolveActive } from "../projects/active-project";
import { Project } from "../projects/types";
import { openFileInTab } from "../scenes/scene-actions";
import { RightPanel } from "./right-panel";

abstract class ReferencePanel implements RightPanel {
  abstract readonly id: string;
  abstract readonly label: string;

  /** Where this panel last drew, to redraw itself in place. */
  private host: HTMLElement | null = null;
  protected file: TFile | null = null;
  private lastScene: string | null = null;
  private queued = false;

  constructor(
    protected app: App,
    protected plugin: InkswellPlugin
  ) {}

  protected referenceHost(): ReferenceHost {
    return {
      app: this.app,
      plugin: this.plugin,
      requestRender: () => this.requestRender(),
      openScene: (file, newTab) => {
        if (newTab) openFileInTab(this.app, file);
        else this.plugin.openSceneInWrite(file.path);
      },
    };
  }

  render(host: HTMLElement, file: TFile | null): void {
    this.host = host;
    this.file = file;
    host.empty();
    host.addClass("inkswell-write__reference");

    const project = this.project();
    if (!project) return; // Write shows its own "no project" state and no side panel.
    const scene = file && project.scenes.some((s) => s.path === file.path) ? file : null;
    const path = scene?.path ?? null;
    if (path !== this.lastScene) {
      this.lastScene = path;
      this.sceneChanged();
    }
    this.renderBody(host, project, scene);
  }

  protected abstract renderBody(host: HTMLElement, project: Project, scene: TFile | null): void;

  protected sceneChanged(): void {}

  /** The book Write is on (the same resolution WritePanel.render uses). */
  protected project(): Project | null {
    const projects = this.plugin.store.getProjects().filter((p) => p.draft.format === "scenes");
    return resolveActive(projects, this.plugin.activeProject.get());
  }

  /**
   * Redraw in place, once per burst. A no-op once Write has moved on (another
   * panel in the slot, the column hidden, another destination): the element we
   * drew into is then gone from the page.
   */
  protected requestRender(): void {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      const host = this.host;
      if (!host || !host.isConnected) return;
      const top = host.scrollTop;
      preserveFocus(host, () => this.render(host, this.file));
      host.scrollTop = top;
    });
  }
}

export class CodexSidePanel extends ReferencePanel {
  readonly id = "codex";
  readonly label = t("companion.codex.name");
  private reference = new CodexReference(this.referenceHost());

  protected renderBody(host: HTMLElement, project: Project, scene: TFile | null): void {
    this.reference.render(host, project, scene);
  }

  protected sceneChanged(): void {
    this.reference.sceneChanged();
  }

  onVaultModify(file: TFile): void {
    if (this.file && file.path === this.file.path) this.reference.sceneSaved();
  }

  dispose(): void {
    this.reference.dispose();
  }
}

export class PlanSidePanel extends ReferencePanel {
  readonly id = "plan";
  readonly label = t("companion.plan.name");
  private digest = new PlanDigest(this.referenceHost());

  protected renderBody(host: HTMLElement, project: Project, scene: TFile | null): void {
    this.digest.render(host, project, scene);
  }

  onVaultModify(file: TFile): void {
    const project = this.project();
    if (project && this.digest.showsNote(project, file.path)) this.requestRender();
  }

  dispose(): void {
    this.digest.dispose();
  }
}
