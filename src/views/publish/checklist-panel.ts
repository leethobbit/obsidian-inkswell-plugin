/**
 * Publish → Checklist: the self-publishing master checklist plus the book
 * metadata worksheet (a collapsible section at the top). State persists under
 * `inkswell.publishing` via the read-merge-write `persistPublishing` helper.
 */

import { App, TFile } from "obsidian";
import { MessageKey, t, tp } from "../../i18n";
import { preserveFocus, tagField } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { resolveActive } from "../../projects/active-project";
import { persistPublishing } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { baseDraftFor } from "../../projects/stories";
import { Project } from "../../projects/types";
import { projectSeries } from "../../series/series";
import { publishingChecklist } from "../../publishing/checklist-def";
import {
  ChecklistTaskState,
  FormatInfo,
  PublishingData,
  PublishingMetadata,
  categoriesOk,
  keywordsInBand,
  overallProgress,
  phaseProgress,
} from "../../publishing/publishing-data";
import type InkswellPlugin from "../../../main";

const FORMATS: { key: "ebook" | "paperback" | "hardcover"; labelKey: MessageKey }[] = [
  { key: "ebook", labelKey: "checklist.meta.format.ebook" },
  { key: "paperback", labelKey: "checklist.meta.format.paperback" },
  { key: "hardcover", labelKey: "checklist.meta.format.hardcover" },
];

export class ChecklistPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private open = new Set<string>();
  private container: HTMLElement | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  /** Re-render in place after a notify caused by our own writes (marked as
   *  self-writes), so a checkbox/notes autosave doesn't tear down the body and
   *  reset the checklist's scroll position. Open sections restore from `open`. */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveFocus(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-publishing");

    const active = resolveActive(this.store.getProjects(), this.plugin.activeProject.get());
    if (!active) {
      container.createDiv({ cls: "inkswell-stats__muted", text: t("publish.noProject") });
      return;
    }
    // Publishing metadata/checklist describe the BOOK, not one draft — read and
    // write the story's base draft so every draft shares one copy (like overview
    // and goals), instead of drifting per draft.
    const project = baseDraftFor(this.store.getProjects(), active);
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(file instanceof TFile)) return;
    const data = project.inkswell?.publishing;

    // The EFFECTIVE checklist (Customize → Publishing checklist), read per render.
    const phases = publishingChecklist(this.plugin.settings.listOverrides.publishing);
    const overall = overallProgress(data, phases);
    container.createDiv({
      cls: "inkswell-stats__muted",
      text: t("checklist.progress", { done: overall.done, total: overall.total }),
    });

    this.section(container, "pub-metadata", t("checklist.section.metadata"), (host) =>
      this.renderMetadata(host, project, file)
    );

    for (const phase of phases) {
      const p = phaseProgress(data, phase.id, phases);
      const title = t("checklist.phaseTitle", { label: phase.label, done: p.done, total: p.total });
      this.section(container, `pub-${phase.id}`, title, (host) => {
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
    tagField(cb, `pub:task:${phaseId}:${task.id}:done`);
    cb.checked = !!state?.done;
    cb.onchange = () => this.saveTask(file, phaseId, task.id, { done: cb.checked });
    label.createSpan({ text: task.optional ? t("checklist.optional", { label: task.label }) : task.label });

    if (task.deepLink === "compile") {
      const link = row.createEl("button", { cls: "inkswell-publishing__link", text: t("checklist.openCompile") });
      link.onclick = () => void this.plugin.openInkswell("publish", undefined, "compile");
    }

    const date = row.createEl("input", { type: "date", cls: "inkswell-publishing__date" });
    tagField(date, `pub:task:${phaseId}:${task.id}:date`);
    date.value = state?.date ?? "";
    date.onchange = () => this.saveTask(file, phaseId, task.id, { date: date.value });

    const notes = row.createEl("input", { type: "text", cls: "inkswell-publishing__notes" });
    tagField(notes, `pub:task:${phaseId}:${task.id}:notes`);
    notes.value = state?.notes ?? "";
    notes.placeholder = t("checklist.notesPlaceholder");
    notes.onchange = () => this.saveTask(file, phaseId, task.id, { notes: notes.value });
  }

  private saveTask(
    file: TFile,
    phaseId: string,
    taskId: string,
    patch: Partial<ChecklistTaskState>
  ): void {
    this.plugin.selfWrites.mark(file.path);
    void tryFileOp(
      () =>
        persistPublishing(this.app, file, (raw) => {
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
        }),
      t("checklist.saveTaskFailed")
    );
  }

  // --- Metadata worksheet (C2) ---------------------------------------------

  private renderMetadata(host: HTMLElement, project: Project, file: TFile): void {
    const m = project.inkswell?.publishing?.metadata ?? {};
    // `field` is a stable id for the focus-preserve tag; the visible label is translated.
    const text = (field: string, label: string, value: string | undefined, save: (v: string) => void, ph = "") => {
      const f = host.createDiv({ cls: "inkswell-inspector__field" });
      f.createDiv({ cls: "inkswell-inspector__label", text: label });
      const input = f.createDiv({ cls: "inkswell-inspector__control" }).createEl("input", { type: "text" });
      tagField(input, `pub:meta:${field}`);
      input.value = value ?? "";
      if (ph) input.placeholder = ph;
      input.onchange = () => save(input.value);
      return input;
    };

    text("title", t("checklist.meta.title"), m.title, (v) => this.saveMeta(file, { title: v }));
    text("subtitle", t("checklist.meta.subtitle"), m.subtitle, (v) => this.saveMeta(file, { subtitle: v }));
    const seriesName = projectSeries(project)?.name;
    text("seriesTitle", t("checklist.meta.seriesTitle"), m.seriesTitle ?? seriesName, (v) =>
      this.saveMeta(file, { seriesTitle: v }), seriesName ?? ""
    );
    text("tagline", t("checklist.meta.tagline"), m.tagline, (v) =>
      this.saveMeta(file, { tagline: v }), t("checklist.meta.taglinePlaceholder")
    );

    const blurbF = host.createDiv({ cls: "inkswell-inspector__field" });
    blurbF.createDiv({ cls: "inkswell-inspector__label", text: t("checklist.meta.blurb") });
    const blurb = blurbF.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
      cls: "inkswell-inspector__textarea",
    });
    tagField(blurb, "pub:meta:blurb");
    blurb.rows = 4;
    blurb.value = m.blurb ?? "";
    blurb.onchange = () => this.saveMeta(file, { blurb: blurb.value });

    text("genre", t("checklist.meta.genre"), m.genre, (v) => this.saveMeta(file, { genre: v }));
    text("subgenres", t("checklist.meta.subgenres"), (m.subgenres ?? []).join(", "), (v) =>
      this.saveMeta(file, { subgenres: splitList(v) }), t("checklist.meta.commaSeparated")
    );
    text("targetReader", t("checklist.meta.targetReader"), m.targetReader, (v) =>
      this.saveMeta(file, { targetReader: v })
    );

    const kwInput = text("keywords", t("checklist.meta.keywords"), (m.keywords ?? []).join(", "), (v) =>
      this.saveMeta(file, { keywords: splitList(v) }), t("checklist.meta.keywordsPlaceholder")
    );
    const kwHint = host.createDiv({ cls: "inkswell-stats__muted" });
    const updateKwHint = () => {
      const n = splitList(kwInput.value).length;
      kwHint.setText(
        keywordsInBand(splitList(kwInput.value))
          ? tp("checklist.meta.keywordsInBand", n)
          : tp("checklist.meta.keywordsOutOfBand", n)
      );
    };
    updateKwHint();
    kwInput.addEventListener("input", updateKwHint);

    text("mainCategory", t("checklist.meta.mainCategory"), m.categories?.main, (v) =>
      this.saveCategories(file, { main: v })
    );
    text("subCategories", t("checklist.meta.subCategories"), (m.categories?.sub ?? []).join(", "), (v) =>
      this.saveCategories(file, { sub: splitList(v) }), t("checklist.meta.subCategoriesPlaceholder")
    );
    if (m.categories && !categoriesOk(m.categories)) {
      host.createDiv({ cls: "inkswell-stats__muted", text: t("checklist.meta.categoriesHint") });
    }

    // KU exclusivity.
    const kuF = host.createDiv({ cls: "inkswell-inspector__field" });
    const kuLabel = kuF.createEl("label", { cls: "inkswell-inspector__toggle" });
    const ku = kuLabel.createEl("input", { type: "checkbox" });
    tagField(ku, "pub:meta:ku");
    ku.checked = !!m.kuExclusive;
    ku.onchange = () => this.saveMeta(file, { kuExclusive: ku.checked });
    kuLabel.createSpan({ text: t("checklist.meta.ku") });

    // Formats × price + ISBN.
    host.createDiv({ cls: "inkswell-audit__grouplabel", text: t("checklist.meta.formats") });
    for (const f of FORMATS) {
      const info = m.formats?.[f.key] ?? {};
      const row = host.createDiv({ cls: "inkswell-publishing__format" });
      const en = row.createEl("label", { cls: "inkswell-audit__check" });
      const enabled = en.createEl("input", { type: "checkbox" });
      tagField(enabled, `pub:fmt:${f.key}:enabled`);
      enabled.checked = !!info.enabled;
      en.createSpan({ text: t(f.labelKey) });
      const price = row.createEl("input", { type: "number", cls: "inkswell-publishing__price" });
      tagField(price, `pub:fmt:${f.key}:price`);
      price.value = info.price != null ? String(info.price) : "";
      price.placeholder = t("checklist.meta.price");
      const isbn = row.createEl("input", { type: "text", cls: "inkswell-publishing__isbn" });
      tagField(isbn, `pub:fmt:${f.key}:isbn`);
      isbn.value = info.isbn ?? "";
      isbn.placeholder = t("checklist.meta.isbn");
      // All three cells are read live from the DOM at commit time; only THIS
      // format's entry is replaced — sibling formats merge against current
      // metadata inside the write (saveFormat), never the render-time `m`.
      const saveFmt = () =>
        this.saveFormat(file, f.key, {
          enabled: enabled.checked,
          price: price.value ? Number(price.value) : undefined,
          isbn: isbn.value || undefined,
        });
      enabled.onchange = saveFmt;
      price.onchange = saveFmt;
      isbn.onchange = saveFmt;
    }
  }

  private saveMeta(file: TFile, patch: Partial<PublishingMetadata>): void {
    this.plugin.selfWrites.mark(file.path);
    void tryFileOp(
      () =>
        persistPublishing(this.app, file, (raw) => {
          const pub = raw as PublishingData;
          pub.metadata = { ...(pub.metadata ?? {}), ...patch };
        }),
      t("checklist.meta.saveFailed")
    );
  }

  /** Merge a categories patch against CURRENT metadata (never the render-time
   *  snapshot) so editing main and sub from the same rendered form composes. */
  private saveCategories(
    file: TFile,
    patch: Partial<NonNullable<PublishingMetadata["categories"]>>
  ): void {
    this.plugin.selfWrites.mark(file.path);
    void tryFileOp(
      () =>
        persistPublishing(this.app, file, (raw) => {
          const pub = raw as PublishingData;
          const meta = pub.metadata ?? (pub.metadata = {});
          meta.categories = { ...meta.categories, ...patch };
        }),
      t("checklist.meta.saveFailed")
    );
  }

  /** Replace ONE format's entry, merging sibling formats against current state. */
  private saveFormat(
    file: TFile,
    key: "ebook" | "paperback" | "hardcover",
    info: FormatInfo
  ): void {
    this.plugin.selfWrites.mark(file.path);
    void tryFileOp(
      () =>
        persistPublishing(this.app, file, (raw) => {
          const pub = raw as PublishingData;
          const meta = pub.metadata ?? (pub.metadata = {});
          meta.formats = { ...meta.formats, [key]: info };
        }),
      t("checklist.meta.saveFailed")
    );
  }
}

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
