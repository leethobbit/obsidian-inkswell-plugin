/**
 * Plan → Overview: novel-level planning that isn't yet broken into beats/scenes.
 * Short structured fields (logline/theme/genre/audience) persist to the index
 * frontmatter under `inkswell.overview`; long-form prose (synopsis, plot
 * groundwork, 3-act sketch) lives in a dedicated planning note edited via
 * textareas here and openable in the real editor.
 *
 * Autosave fires on `change` (blur), never `input`, so the host's focus-guard
 * (inkswell-view renderActive) never rebuilds the body mid-keystroke.
 */

import { App, TFile } from "obsidian";
import { MessageKey, lowerInSentence, t } from "../i18n";
import { preserveFocus, tagField } from "../lib/focus-preserve";
import { tryFileOp } from "../lib/notify";
import { ActiveProject, resolveActive } from "../projects/active-project";
import { persistOverview } from "../projects/index-writer";
import { ProjectStore } from "../projects/project-store";
import { baseDraftFor } from "../projects/stories";
import { Project, ProjectOverview } from "../projects/types";
import { openScene } from "../scenes/scene-actions";
import { renderEmptyStateAction } from "../views/panel-kit";
import {
  PLAN_SECTIONS,
  PlanSection,
  ensurePlanningNote,
  findPlanningNote,
  readSection,
  writeSection,
} from "./planning-note";
import type InkswellPlugin from "../../main";

/**
 * `label` is English DATA: the story bible writes it into a vault note. The
 * panel shows `labelKey` / `placeholderKey` instead (resolved at render).
 */
export const OVERVIEW_FIELDS: {
  key: keyof ProjectOverview;
  label: string;
  labelKey: MessageKey;
  placeholderKey: MessageKey;
}[] = [
  // i18n-ignore: vault text (story bible field label)
  { key: "logline", label: "Logline", labelKey: "plan.overview.logline", placeholderKey: "plan.overview.logline.placeholder" },
  // i18n-ignore: vault text (story bible field label)
  { key: "theme", label: "Theme", labelKey: "plan.overview.theme", placeholderKey: "plan.overview.theme.placeholder" },
  // i18n-ignore: vault text (story bible field label)
  { key: "genre", label: "Genre", labelKey: "plan.overview.genre", placeholderKey: "plan.overview.genre.placeholder" },
  // i18n-ignore: vault text (story bible field label)
  { key: "audience", label: "Audience", labelKey: "plan.overview.audience", placeholderKey: "plan.overview.audience.placeholder" },
];

/** Display labels for the planning note's sections. The headings themselves
 *  (PLAN_SECTIONS) are written into the note and stay English. */
const SECTION_LABELS: Record<PlanSection, MessageKey> = {
  Synopsis: "plan.overview.section.synopsis",
  "Plot groundwork": "plan.overview.section.plotGroundwork",
  "Act I": "plan.overview.section.act1",
  "Act II": "plan.overview.section.act2",
  "Act III": "plan.overview.section.act3",
};

/**
 * Per-section get-started prompts shown as textarea placeholders. Kept
 * method-agnostic on purpose — a single open question, not a plot theory the
 * writer has to delete. Sections without an entry fall back to "<heading>…".
 */
const SECTION_PROMPTS: Partial<Record<PlanSection, MessageKey>> = {
  "Plot groundwork": "plan.overview.section.plotGroundwork.placeholder",
};

export class OverviewPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private active: ActiveProject;
  private container: HTMLElement | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore, active: ActiveProject) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
    this.active = active;
  }

  /** Re-render in place after a notify caused by our own field writes (marked
   *  as self-writes), so the host's `.inkswell-content` scroller — and the
   *  field being edited — survive instead of a full body teardown. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-overview");

    const active = resolveActive(this.store.getProjects(), this.active.get());
    if (!active) {
      renderEmptyStateAction(container, t("plan.overview.noProjects"), [
        { label: t("plan.overview.createProject"), cta: true, onClick: () => this.plugin.newProject() },
      ]);
      return;
    }
    // Overview + planning note are story-level — always read/write the base draft
    // so all drafts of a story share them (matches the Home hero card).
    const project = baseDraftFor(this.store.getProjects(), active);

    this.renderFields(container, project);
    this.renderProse(container, project);
  }

  /** Short, single-line fields → inkswell.overview frontmatter. */
  private renderFields(root: HTMLElement, project: Project): void {
    const overview = project.inkswell?.overview ?? {};
    const indexFile = this.indexFile(project);
    const grid = root.createDiv({ cls: "inkswell-overview__fields" });
    for (const f of OVERVIEW_FIELDS) {
      const row = grid.createDiv({ cls: "inkswell-overview__field" });
      row.createDiv({ cls: "inkswell-overview__label", text: t(f.labelKey) });
      const input = row.createEl("input", { type: "text", cls: "inkswell-overview__input" });
      tagField(input, `overview:${f.key}`);
      input.placeholder = t(f.placeholderKey);
      input.value = (overview[f.key] as string) ?? "";
      input.onchange = () => {
        if (indexFile) {
          this.plugin.selfWrites.mark(indexFile.path);
          void tryFileOp(
            () => persistOverview(this.app, indexFile, { [f.key]: input.value.trim() }),
            t("plan.overview.saveFieldFailed", { field: lowerInSentence(t(f.labelKey)) })
          );
        }
      };
    }
  }

  /** Long-form prose → the project's planning note, one textarea per H2 section. */
  private renderProse(root: HTMLElement, project: Project): void {
    const sec = root.createDiv({ cls: "inkswell-overview__prose" });
    const head = sec.createDiv({ cls: "inkswell-overview__prosehead" });
    head.createSpan({ cls: "inkswell-overview__prosetitle", text: t("plan.overview.planningNote") });
    const open = head.createEl("button", { text: t("plan.overview.openPlanningNote") });
    open.setAttribute("aria-label", t("plan.overview.openPlanningNote.aria"));
    open.onclick = async () => {
      const file = await tryFileOp(async () => {
        const f = await ensurePlanningNote(this.app, project);
        await this.rememberNote(project, f);
        return f;
      }, t("plan.overview.openFailed"));
      if (file) openScene(this.app, file);
    };

    const editors = new Map<PlanSection, HTMLTextAreaElement>();
    for (const heading of PLAN_SECTIONS) {
      const block = sec.createDiv({ cls: "inkswell-overview__section" });
      const label = t(SECTION_LABELS[heading]);
      block.createDiv({ cls: "inkswell-overview__label", text: label });
      const ta = block.createEl("textarea", { cls: "inkswell-overview__textarea" });
      tagField(ta, `overview:section:${heading}`);
      ta.rows = heading === "Synopsis" || heading === "Plot groundwork" ? 5 : 3;
      const prompt = SECTION_PROMPTS[heading];
      ta.placeholder = prompt ? t(prompt) : t("plan.overview.section.placeholder", { heading: label });
      ta.onchange = () => void this.saveSection(project, heading, ta.value);
      editors.set(heading, ta);
    }

    // Seed textareas from the existing planning note (if any) without blocking render.
    void this.loadProse(project, editors);
  }

  private async loadProse(
    project: Project,
    editors: Map<PlanSection, HTMLTextAreaElement>
  ): Promise<void> {
    const file = findPlanningNote(this.app, project);
    if (!file) return; // note not created yet — textareas stay empty
    // Found via fallback (stale pointer after a rename)? Heal the pointer now so
    // later saves and the tracker's classifier agree on which note this is.
    await this.rememberNote(project, file);
    const source = await this.app.vault.read(file);
    for (const [heading, ta] of editors) {
      // Don't clobber a field the user is actively editing.
      if (activeDocument.activeElement === ta) continue;
      ta.value = readSection(source, heading);
    }
  }

  private async saveSection(project: Project, heading: PlanSection, text: string): Promise<void> {
    await tryFileOp(async () => {
      const file = await ensurePlanningNote(this.app, project);
      await this.rememberNote(project, file);
      await writeSection(this.app, file, heading, text);
    }, t("plan.overview.saveFailed"));
  }

  /** Persist the planning-note path the first time we create/use it. */
  private async rememberNote(project: Project, file: TFile): Promise<void> {
    if (project.inkswell?.overview?.planningNote === file.path) return;
    const indexFile = this.indexFile(project);
    if (indexFile) {
      // Mark only the index write — the planning note itself carries no
      // `longform` key, so the store never fingerprints it into a notify.
      this.plugin.selfWrites.mark(indexFile.path);
      await persistOverview(this.app, indexFile, { planningNote: file.path });
    }
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
