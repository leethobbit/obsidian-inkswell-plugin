/**
 * Scene Inspector: a single focused panel for the selected scene's metadata.
 * Deliberately small — the picked fields only, no wall of sections (that's the
 * antidote to StoryLine's mega-forms). Tracks the active scene file; edits write
 * straight to that scene's frontmatter (never its body).
 */

import { attachChipPeek } from "../codex/peek";
import { App, TFile } from "obsidian";
import { featureEnabled } from "../features";
import { t } from "../i18n";
import { ProjectStore } from "../projects/project-store";
import { RightPanel } from "../views/right-panel";
import { openScene } from "./scene-actions";
import { renderSceneAuditFields, renderSceneMetaFields } from "./scene-meta-form";
import { inspectorFields, sceneStatuses } from "./scene-meta";
import { sceneFieldExtras } from "./scene-template-io";
import { sceneCheckpoints } from "../revisions/audit";
import type InkswellPlugin from "../../main";

export class SceneInspector implements RightPanel {
  readonly id = "scene";
  /** Resolved per read: the catalog is picked in `onload`, after construction may happen. */
  get label(): string {
    return t("scene.inspector.label");
  }
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  render(container: HTMLElement, file: TFile | null): void {
    container.empty();
    container.addClass("inkswell-inspector");

    const ctx = file ? this.store.findSceneByPath(file.path) : null;
    if (!file || !ctx) {
      container.createDiv({
        cls: "inkswell-inspector__empty",
        text: t("scene.inspector.empty"),
      });
      return;
    }

    container.createDiv({ cls: "inkswell-inspector__title", text: ctx.scene.title });
    container.createDiv({
      cls: "inkswell-inspector__project",
      text: ctx.project.draft.title,
    });

    // Opening the scene's note is now explicit (Home no longer auto-opens on
    // click), and Write surfaces it here too — one consistent place.
    const open = container.createEl("button", {
      cls: "inkswell-inspector__open",
      text: t("scene.openInTab"),
    });
    open.onclick = () => openScene(this.app, file);

    const disabled = this.plugin.settings.disabledFeatures;
    const markWrite = (path: string) => this.plugin.selfWrites.mark(path);
    renderSceneMetaFields(
      container,
      this.app,
      file,
      ctx.project,
      disabled,
      markWrite,
      this.plugin.store.getProjects(),
      sceneStatuses(this.plugin.settings.listOverrides["scene.status"]),
      inspectorFields(this.plugin.settings.listOverrides["scene.fields"]),
      {
        ...sceneFieldExtras(this.app, this.plugin.settings),
        peekChip: (chip, entity, visible) =>
          attachChipPeek(chip, this.plugin, () => ({ entity, entities: visible })),
      }
    );

    // Revision audit — collapsed by default so it doesn't crowd the drafting
    // metadata. The 14-point scene checklist (Revise → Audit) lives here too.
    // Hidden when the Audit feature is off (its saved data is kept).
    if (featureEnabled(disabled, "audit")) {
      const audit = container.createEl("details", { cls: "inkswell-inspector__audit" });
      audit.createEl("summary", { text: t("scene.inspector.audit") });
      renderSceneAuditFields(
        audit,
        this.app,
        file,
        undefined,
        markWrite,
        sceneCheckpoints(this.plugin.settings.listOverrides["audit.scene"])
      );
    }
  }
}
