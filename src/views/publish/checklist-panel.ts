/**
 * Publish → Checklist: the Self-Publisher's master checklist plus the book
 * metadata worksheet (a collapsible section at the top). State persists under
 * `inkswell.publishing` via the read-merge-write `persistPublishing` helper.
 */

import { App, TFile } from "obsidian";
import { resolveActive } from "../../projects/active-project";
import { persistPublishing } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { Project } from "../../projects/types";
import { projectSeries } from "../../series/series";
import { PUBLISHING_CHECKLIST } from "../../publishing/checklist-def";
import {
  ChecklistTaskState,
  PublishingData,
  PublishingMetadata,
  categoriesOk,
  keywordsInBand,
  overallProgress,
  phaseProgress,
} from "../../publishing/publishing-data";
import type InkswellPlugin from "../../../main";

const FORMATS: { key: "ebook" | "paperback" | "hardcover"; label: string }[] = [
  { key: "ebook", label: "eBook" },
  { key: "paperback", label: "Paperback" },
  { key: "hardcover", label: "Hardcover" },
];

export class ChecklistPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private open = new Set<string>();

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-publishing");

    const project = resolveActive(this.store.getProjects(), this.plugin.activeProject.get());
    if (!project) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No project selected." });
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(file instanceof TFile)) return;
    const data = project.inkswell?.publishing;

    const overall = overallProgress(data);
    container.createDiv({
      cls: "inkswell-stats__muted",
      text: `Self-publishing checklist — ${overall.done}/${overall.total} tasks done`,
    });

    this.section(container, "pub-metadata", "Book metadata", (host) =>
      this.renderMetadata(host, project, file)
    );

    for (const phase of PUBLISHING_CHECKLIST) {
      const p = phaseProgress(data, phase.id);
      this.section(container, `pub-${phase.id}`, `${phase.label} (${p.done}/${p.total})`, (host) => {
        const state = data?.checklist?.[phase.id] ?? {};
        for (const task of phase.tasks) this.renderTask(host, file, phase.id, task, state[task.id]);
      });
    }
  }

  private section(
    parent: HTMLElement,
    id: string,
    title: string,
    build: (host: HTMLElement) => void
  ): void {
    const details = parent.createEl("details", { cls: "inkswell-audit__section" });
    details.open = this.open.has(id);
    details.createEl("summary", { text: title });
    details.addEventListener("toggle", () => {
      if (details.open) this.open.add(id);
      else this.open.delete(id);
    });
    build(details.createDiv({ cls: "inkswell-audit__body" }));
  }

  private renderTask(
    host: HTMLElement,
    file: TFile,
    phaseId: string,
    task: { id: string; label: string; optional?: boolean; deepLink?: "compile" },
    state: ChecklistTaskState | undefined
  ): void {
    const row = host.createDiv({ cls: "inkswell-publishing__task" });
    const label = row.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!state?.done;
    cb.onchange = () => this.saveTask(file, phaseId, task.id, { done: cb.checked });
    label.createSpan({ text: task.label + (task.optional ? " (optional)" : "") });

    if (task.deepLink === "compile") {
      const link = row.createEl("button", { cls: "inkswell-publishing__link", text: "Open Compile →" });
      link.onclick = () => void this.plugin.openInkswell("publish", undefined, "compile");
    }

    const date = row.createEl("input", { type: "date", cls: "inkswell-publishing__date" });
    date.value = state?.date ?? "";
    date.onchange = () => this.saveTask(file, phaseId, task.id, { date: date.value });

    const notes = row.createEl("input", { type: "text", cls: "inkswell-publishing__notes" });
    notes.value = state?.notes ?? "";
    notes.placeholder = "notes…";
    notes.onchange = () => this.saveTask(file, phaseId, task.id, { notes: notes.value });
  }

  private saveTask(
    file: TFile,
    phaseId: string,
    taskId: string,
    patch: Partial<ChecklistTaskState>
  ): void {
    void persistPublishing(this.app, file, (raw) => {
      const pub = raw as PublishingData;
      const checklist = pub.checklist ?? (pub.checklist = {});
      const phase = checklist[phaseId] ?? (checklist[phaseId] = {});
      const next: ChecklistTaskState = { ...(phase[taskId] ?? {}), ...patch };
      if (!next.done) delete next.done;
      if (!(next.notes ?? "").trim()) delete next.notes;
      if (!(next.date ?? "").trim()) delete next.date;
      if (Object.keys(next).length === 0) delete phase[taskId];
      else phase[taskId] = next;
      if (Object.keys(phase).length === 0) delete checklist[phaseId];
      if (Object.keys(checklist).length === 0) delete pub.checklist;
    });
  }

  // --- Metadata worksheet (C2) ---------------------------------------------

  private renderMetadata(host: HTMLElement, project: Project, file: TFile): void {
    const m = project.inkswell?.publishing?.metadata ?? {};
    const text = (label: string, value: string | undefined, save: (v: string) => void, ph = "") => {
      const f = host.createDiv({ cls: "inkswell-inspector__field" });
      f.createDiv({ cls: "inkswell-inspector__label", text: label });
      const input = f.createDiv({ cls: "inkswell-inspector__control" }).createEl("input", { type: "text" });
      input.value = value ?? "";
      if (ph) input.placeholder = ph;
      input.onchange = () => save(input.value);
      return input;
    };

    text("Title", m.title, (v) => this.saveMeta(file, { title: v }));
    text("Subtitle", m.subtitle, (v) => this.saveMeta(file, { subtitle: v }));
    const seriesName = projectSeries(project)?.name;
    text("Series title", m.seriesTitle ?? seriesName, (v) => this.saveMeta(file, { seriesTitle: v }), seriesName ?? "");
    text("Tagline", m.tagline, (v) => this.saveMeta(file, { tagline: v }), "One-line hook");

    const blurbF = host.createDiv({ cls: "inkswell-inspector__field" });
    blurbF.createDiv({ cls: "inkswell-inspector__label", text: "Back blurb" });
    const blurb = blurbF.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
      cls: "inkswell-inspector__textarea",
    });
    blurb.rows = 4;
    blurb.value = m.blurb ?? "";
    blurb.onchange = () => this.saveMeta(file, { blurb: blurb.value });

    text("Genre", m.genre, (v) => this.saveMeta(file, { genre: v }));
    text("Subgenres", (m.subgenres ?? []).join(", "), (v) =>
      this.saveMeta(file, { subgenres: splitList(v) }), "comma-separated"
    );
    text("Target reader", m.targetReader, (v) => this.saveMeta(file, { targetReader: v }));

    const kwInput = text("Keywords", (m.keywords ?? []).join(", "), (v) =>
      this.saveMeta(file, { keywords: splitList(v) }), "7–10 recommended, comma-separated"
    );
    const kwHint = host.createDiv({ cls: "inkswell-stats__muted" });
    const updateKwHint = () => {
      const n = splitList(kwInput.value).length;
      kwHint.setText(`${n} keyword${n === 1 ? "" : "s"} ${keywordsInBand(splitList(kwInput.value)) ? "✓" : "(aim for 7–10)"}`);
    };
    updateKwHint();
    kwInput.addEventListener("input", updateKwHint);

    text("Main category (BISAC)", m.categories?.main, (v) =>
      this.saveMeta(file, { categories: { ...m.categories, main: v } })
    );
    text("Sub-categories", (m.categories?.sub ?? []).join(", "), (v) =>
      this.saveMeta(file, { categories: { ...m.categories, sub: splitList(v) } }), "≤3, comma-separated"
    );
    if (m.categories && !categoriesOk(m.categories)) {
      host.createDiv({ cls: "inkswell-stats__muted", text: "Categories: set 1 main + up to 3 sub." });
    }

    // KU exclusivity.
    const kuF = host.createDiv({ cls: "inkswell-inspector__field" });
    const kuLabel = kuF.createEl("label", { cls: "inkswell-inspector__toggle" });
    const ku = kuLabel.createEl("input", { type: "checkbox" });
    ku.checked = !!m.kuExclusive;
    ku.onchange = () => this.saveMeta(file, { kuExclusive: ku.checked });
    kuLabel.createSpan({ text: "Kindle Unlimited exclusive (Amazon-only eBook)" });

    // Formats × price + ISBN.
    host.createDiv({ cls: "inkswell-audit__grouplabel", text: "Formats" });
    for (const f of FORMATS) {
      const info = m.formats?.[f.key] ?? {};
      const row = host.createDiv({ cls: "inkswell-publishing__format" });
      const en = row.createEl("label", { cls: "inkswell-audit__check" });
      const enabled = en.createEl("input", { type: "checkbox" });
      enabled.checked = !!info.enabled;
      en.createSpan({ text: f.label });
      const price = row.createEl("input", { type: "number", cls: "inkswell-publishing__price" });
      price.value = info.price != null ? String(info.price) : "";
      price.placeholder = "price";
      const isbn = row.createEl("input", { type: "text", cls: "inkswell-publishing__isbn" });
      isbn.value = info.isbn ?? "";
      isbn.placeholder = "ISBN";
      const saveFmt = () =>
        this.saveMeta(file, {
          formats: {
            ...m.formats,
            [f.key]: {
              enabled: enabled.checked,
              price: price.value ? Number(price.value) : undefined,
              isbn: isbn.value || undefined,
            },
          },
        });
      enabled.onchange = saveFmt;
      price.onchange = saveFmt;
      isbn.onchange = saveFmt;
    }
  }

  private saveMeta(file: TFile, patch: Partial<PublishingMetadata>): void {
    void persistPublishing(this.app, file, (raw) => {
      const pub = raw as PublishingData;
      pub.metadata = { ...(pub.metadata ?? {}), ...patch };
    });
  }
}

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
