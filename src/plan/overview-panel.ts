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
  readSection,
  writeSection,
} from "./planning-note";
import type InkswellPlugin from "../../main";

const FIELDS: { key: keyof ProjectOverview; label: string; placeholder: string }[] = [
  { key: "logline", label: "Logline", placeholder: "One sentence: who wants what, against what odds…" },
  { key: "theme", label: "Theme", placeholder: "The deeper meaning / life lesson…" },
  { key: "genre", label: "Genre", placeholder: "e.g. Epic fantasy" },
  { key: "audience", label: "Audience", placeholder: "e.g. Adult, YA…" },
];

/**
 * Per-section get-started prompts shown as textarea placeholders. Kept
 * method-agnostic on purpose — a single open question, not a plot theory the
 * writer has to delete. Sections without an entry fall back to "<heading>…".
 */
const SECTION_PROMPTS: Partial<Record<PlanSection, string>> = {
  "Plot groundwork":
    "e.g. What are 5 key moments, scenes, or events you know will happen? (They don't need to be in order or connected yet.)",
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

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-overview");

    const active = resolveActive(this.store.getProjects(), this.active.get());
    if (!active) {
      renderEmptyStateAction(container, "No projects yet — a project holds your scenes, plan, and goals.", [
        { label: "Create a project", cta: true, onClick: () => this.plugin.newProject() },
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
    for (const f of FIELDS) {
      const row = grid.createDiv({ cls: "inkswell-overview__field" });
      row.createDiv({ cls: "inkswell-overview__label", text: f.label });
      const input = row.createEl("input", { type: "text", cls: "inkswell-overview__input" });
      input.placeholder = f.placeholder;
      input.value = (overview[f.key] as string) ?? "";
      input.onchange = () => {
        if (indexFile) {
          void tryFileOp(
            () => persistOverview(this.app, indexFile, { [f.key]: input.value.trim() }),
            `Couldn't save the ${f.label.toLowerCase()}.`
          );
        }
      };
    }
  }

  /** Long-form prose → the project's planning note, one textarea per H2 section. */
  private renderProse(root: HTMLElement, project: Project): void {
    const sec = root.createDiv({ cls: "inkswell-overview__prose" });
    const head = sec.createDiv({ cls: "inkswell-overview__prosehead" });
    head.createSpan({ cls: "inkswell-overview__prosetitle", text: "Planning note" });
    const open = head.createEl("button", { text: "Open planning note" });
    open.setAttribute("aria-label", "Open the planning note in an editor tab");
    open.onclick = async () => {
      const file = await tryFileOp(async () => {
        const f = await ensurePlanningNote(this.app, project);
        await this.rememberNote(project, f);
        return f;
      }, "Couldn't open the planning note.");
      if (file) openScene(this.app, file);
    };

    const editors = new Map<PlanSection, HTMLTextAreaElement>();
    for (const heading of PLAN_SECTIONS) {
      const block = sec.createDiv({ cls: "inkswell-overview__section" });
      block.createDiv({ cls: "inkswell-overview__label", text: heading });
      const ta = block.createEl("textarea", { cls: "inkswell-overview__textarea" });
      ta.rows = heading === "Synopsis" || heading === "Plot groundwork" ? 5 : 3;
      ta.placeholder = SECTION_PROMPTS[heading] ?? `${heading}…`;
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
    const path = project.inkswell?.overview?.planningNote;
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    if (!(file instanceof TFile)) return; // note not created yet — textareas stay empty
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
    }, "Couldn't save the planning note.");
  }

  /** Persist the planning-note path the first time we create/use it. */
  private async rememberNote(project: Project, file: TFile): Promise<void> {
    if (project.inkswell?.overview?.planningNote === file.path) return;
    const indexFile = this.indexFile(project);
    if (indexFile) await persistOverview(this.app, indexFile, { planningNote: file.path });
  }

  private indexFile(project: Project): TFile | null {
    const f = this.app.vault.getAbstractFileByPath(project.vaultPath);
    return f instanceof TFile ? f : null;
  }
}
