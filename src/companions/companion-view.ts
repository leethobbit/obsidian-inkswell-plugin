/**
 * Base for the sidebar companions (see registry.ts). A companion follows the
 * scene you're writing (plugin.currentScene) and that scene's book, falling
 * back to the active project. It re-renders on store notifications and scene
 * changes only — never per keystroke — coalesced to one render per burst, and
 * keeps scroll and a focused field across re-renders.
 *
 * Deferred-view safe: nothing outside holds a reference to an instance; the
 * plugin finds companions with getLeavesOfType + instanceof.
 */

import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { featureEnabled } from "../features";
import { t } from "../i18n";
import { preserveFocus } from "../lib/focus-preserve";
import { resolveActive } from "../projects/active-project";
import { Project } from "../projects/types";
import { openFileInTab } from "../scenes/scene-actions";
import { CompanionDef, CompanionId, companionById } from "./registry";

export abstract class CompanionView extends ItemView {
  protected body: HTMLElement | null = null;
  private queued = false;
  private closed = false;

  constructor(
    leaf: WorkspaceLeaf,
    protected plugin: InkswellPlugin
  ) {
    super(leaf);
  }

  /** Which companion this is. A method, not a field: ItemView's constructor
   *  calls getViewType() before subclass fields exist. */
  protected abstract companionId(): CompanionId;

  protected get def(): CompanionDef {
    return companionById(this.companionId());
  }

  getViewType(): string {
    return this.def.viewType;
  }

  getDisplayText(): string {
    return t(this.def.labelKey);
  }

  getIcon(): string {
    return this.def.icon;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("inkswell-companion", `inkswell-companion--${this.def.id}`);
    const head = this.contentEl.createDiv({ cls: "inkswell-companion__head" });
    head.createSpan({ cls: "inkswell-companion__title", text: t(this.def.labelKey) });
    const open = head.createEl("button", { cls: "clickable-icon inkswell-companion__open" });
    setIcon(open, "arrow-up-right");
    open.setAttribute("aria-label", t("companion.openInInkswell"));
    open.onclick = () => this.openInInkswell();
    this.body = this.contentEl.createDiv({ cls: "inkswell-companion__body" });

    this.register(this.plugin.store.subscribe(() => this.requestRender()));
    this.register(this.plugin.activeProject.subscribe(() => this.requestRender()));
    this.register(this.plugin.currentScene.subscribe(() => this.onSceneChanged()));
    this.requestRender();
  }

  async onClose(): Promise<void> {
    this.closed = true;
  }

  /** Coalesce a burst (store notify + scene change in one task) into one
   *  render. A microtask, not a paint frame: frames don't run while the
   *  window is hidden, and a companion should be current when it reappears. */
  requestRender(): void {
    if (this.queued || this.closed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.closed) this.renderNow();
    });
  }

  /** The current scene changed. Subclasses may reset state first. */
  protected onSceneChanged(): void {
    this.requestRender();
  }

  private renderNow(): void {
    const body = this.body;
    if (!body) return;
    const scrollTop = body.scrollTop;
    preserveFocus(body, () => {
      body.empty();
      if (this.def.feature && !featureEnabled(this.plugin.settings.disabledFeatures, this.def.feature)) {
        this.empty(body, t("companion.featureOff"));
        return;
      }
      const project = this.project();
      if (!project) {
        this.empty(body, t("companion.noProject"));
        return;
      }
      this.renderBody(body, project);
    });
    body.scrollTop = scrollTop;
  }

  protected abstract renderBody(body: HTMLElement, project: Project): void;

  /** "Open in Inkswell": the companion's own destination in the main view. */
  protected abstract openInInkswell(): void;

  /** The current scene's book, else the active project (multi-scene only). */
  protected project(): Project | null {
    const scene = this.plugin.currentScene.get();
    const found = scene ? this.plugin.store.findSceneByPath(scene) : null;
    if (found) return found.project;
    const projects = this.plugin.store.getProjects().filter((p) => p.draft.format === "scenes");
    return projects.length ? resolveActive(projects, this.plugin.activeProject.get()) : null;
  }

  /** The current scene file when it belongs to `project`. */
  protected sceneFile(project: Project): TFile | null {
    const path = this.plugin.currentScene.get();
    if (!path || !project.scenes.some((s) => s.path === path)) return null;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  /** Open a scene where the writer asked (Settings), Ctrl/Cmd = always a new tab.
   *  A companion never edits a scene itself. */
  protected openScene(file: TFile, newTab: boolean): void {
    if (newTab || this.plugin.settings.companionSceneTarget === "tab") openFileInTab(this.app, file);
    else this.plugin.openSceneInWrite(file.path);
  }

  protected empty(body: HTMLElement, text: string): void {
    body.createDiv({ cls: "inkswell-companion__empty", text });
  }

  /** A collapsible section whose open state survives re-renders. */
  protected section(
    parent: HTMLElement,
    key: string,
    title: string,
    build: (host: HTMLElement) => void,
    defaultOpen = true
  ): void {
    const details = parent.createEl("details", { cls: "inkswell-companion__section" });
    details.open = this.openState.get(key) ?? defaultOpen;
    details.createEl("summary", { text: title });
    details.addEventListener("toggle", () => this.openState.set(key, details.open));
    build(details.createDiv({ cls: "inkswell-companion__sectionbody" }));
  }

  private openState = new Map<string, boolean>();
}
