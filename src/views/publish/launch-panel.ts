/**
 * Publish → Launch: the pre-order timeline planner (auto-computed milestone dates)
 * plus the launch trackers (budget, cover comps, marketing, ARCs). All state under
 * `inkswell.publishing` via `persistPublishing`.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../../lib/notify";
import { resolveActive } from "../../projects/active-project";
import { persistPublishing } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { baseDraftFor } from "../../projects/stories";
import {
  BudgetItem,
  PublishingData,
  budgetTotals,
  newPublishingId,
} from "../../publishing/publishing-data";
import {
  PreorderStrategy,
  STRATEGIES,
  computeMilestones,
  milestoneStatus,
} from "../../publishing/preorder";
import { TrackerRow, renderTrackerSection } from "./tracker-section";
import type InkswellPlugin from "../../../main";

export class LaunchPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private open = new Set<string>(["launch-preorder"]);

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-publishing");

    const active = resolveActive(this.store.getProjects(), this.plugin.activeProject.get());
    if (!active) {
      container.createDiv({ cls: "inkswell-stats__muted", text: "No project selected." });
      return;
    }
    // Launch plan describes the BOOK, not one draft — read/write the story's base
    // draft so every draft shares one copy (like overview and goals).
    const project = baseDraftFor(this.store.getProjects(), active);
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(file instanceof TFile)) return;
    const data = project.inkswell?.publishing;

    this.section(container, "launch-preorder", "Pre-order timeline", (host) =>
      this.renderPreorder(host, file, data)
    );
    this.section(container, "launch-budget", "Budget", (host) => this.renderBudget(host, file, data));
    this.section(container, "launch-cover", "Cover plan", (host) => this.renderCover(host, file, data));
    this.section(container, "launch-marketing", "Marketing plan", (host) =>
      this.renderMarketing(host, file, data)
    );
    this.section(container, "launch-arcs", "ARC readers", (host) => this.renderArcs(host, file, data));
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

  // --- Pre-order planner (C3) ----------------------------------------------

  private renderPreorder(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const launch = data?.launch ?? {};

    const ctl = host.createDiv({ cls: "inkswell-publishing__preorderctl" });
    const dateF = ctl.createDiv({ cls: "inkswell-inspector__field" });
    dateF.createDiv({ cls: "inkswell-inspector__label", text: "Release date" });
    const date = dateF.createEl("input", { type: "date" });
    date.value = launch.releaseDate ?? "";
    date.onchange = () => this.saveLaunch(file, { releaseDate: date.value || undefined });

    const stratF = ctl.createDiv({ cls: "inkswell-inspector__field" });
    stratF.createDiv({ cls: "inkswell-inspector__label", text: "Strategy" });
    const strat = stratF.createEl("select", { cls: "dropdown" });
    strat.createEl("option", { text: "— none —", value: "" });
    for (const s of Object.values(STRATEGIES)) strat.createEl("option", { text: s.label, value: s.id });
    strat.value = launch.strategy ?? "";
    strat.onchange = () =>
      this.saveLaunch(file, { strategy: (strat.value || undefined) as PreorderStrategy | undefined });

    if (!launch.releaseDate || !launch.strategy) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: "Set a release date and strategy to compute the milestone calendar.",
      });
      return;
    }

    const milestones = computeMilestones(launch.releaseDate, launch.strategy);
    const today = new Date();
    for (const ms of milestones) {
      const st = launch.milestones?.[ms.id] ?? {};
      const status = milestoneStatus(ms.date, !!st.done, today);
      const row = host.createDiv({ cls: "inkswell-publishing__milestone" });
      const cb = row.createEl("input", { type: "checkbox" });
      cb.checked = !!st.done;
      cb.onchange = () => this.saveMilestone(file, ms.id, { done: cb.checked });
      row.createSpan({ cls: `inkswell-publishing__mstatus is-${status}`, text: status });
      row.createSpan({ cls: "inkswell-publishing__mlabel", text: ms.label });
      row.createSpan({
        cls: "inkswell-stats__muted",
        text: ms.windowEnd ? `${ms.date} → ${ms.windowEnd}` : ms.date,
      });
    }
    host.createDiv({
      cls: "inkswell-stats__muted",
      text: "Dates are computed from your release date. Verification/approval/delivery are manual — Inkswell doesn't talk to platforms.",
    });
  }

  // --- Trackers (C4) -------------------------------------------------------

  private renderBudget(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const items = (data?.budget?.items ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "label", label: "Item", type: "text", placeholder: "Editor, cover…" },
        {
          key: "category",
          label: "Type",
          type: "select",
          options: [
            { value: "need", label: "Need" },
            { value: "want", label: "Want" },
          ],
        },
        { key: "estimate", label: "Estimate", type: "number" },
        { key: "actual", label: "Actual", type: "number" },
      ],
      rows: items,
      newRow: () => ({ id: newPublishingId(), label: "", category: "need" }),
      addLabel: "+ Budget line",
      emptyText: "Track what this book costs — needs vs. wants.",
      onChange: (rows) =>
        this.saveSub(file, (pub) => {
          pub.budget = { items: rows as unknown as BudgetItem[] };
          if (rows.length === 0) delete pub.budget;
        }),
    });
    const t = budgetTotals(data?.budget?.items);
    if ((data?.budget?.items ?? []).length > 0) {
      host.createDiv({
        cls: "inkswell-stats__row",
        text: `Needs ${t.needs} · Wants ${t.wants} · Estimate ${t.estimate} · Actual ${t.actual}`,
      });
    }
  }

  private renderCover(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const cover = data?.cover ?? {};
    const planF = host.createDiv({ cls: "inkswell-inspector__field" });
    planF.createDiv({ cls: "inkswell-inspector__label", text: "Design direction" });
    const plan = planF.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
      cls: "inkswell-inspector__textarea",
    });
    plan.rows = 2;
    plan.value = cover.plan ?? "";
    plan.placeholder = "Mood, designer, package…";
    plan.onchange = () =>
      this.saveSub(file, (pub) => {
        pub.cover = { ...pub.cover, plan: plan.value || undefined };
        if (!pub.cover.plan && !(pub.cover.comps?.length)) delete pub.cover;
      });

    host.createDiv({ cls: "inkswell-audit__grouplabel", text: "Comparison covers" });
    const comps = (cover.comps ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "title", label: "Comp cover", type: "text", placeholder: "Title / author" },
        { key: "note", label: "Note", type: "text" },
        { key: "done", label: "Got it", type: "checkbox" },
      ],
      rows: comps,
      newRow: () => ({ id: newPublishingId(), title: "" }),
      addLabel: "+ Comp cover",
      onChange: (rows) =>
        this.saveSub(file, (pub) => {
          pub.cover = { ...pub.cover, comps: rows as never };
          if (!pub.cover.plan && rows.length === 0) delete pub.cover;
        }),
    });
  }

  private renderMarketing(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const items = (data?.marketing?.items ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "strategy", label: "Strategy", type: "text", placeholder: "ARC blast, BookBub…" },
        { key: "date", label: "Date", type: "date" },
        { key: "budget", label: "Budget", type: "number" },
        { key: "result", label: "Result", type: "text" },
        { key: "done", label: "Done", type: "checkbox" },
      ],
      rows: items,
      newRow: () => ({ id: newPublishingId(), strategy: "" }),
      addLabel: "+ Marketing action",
      emptyText: "Plan launch actions; record results to learn for the next book.",
      onChange: (rows) =>
        this.saveSub(file, (pub) => {
          pub.marketing = { items: rows as never };
          if (rows.length === 0) delete pub.marketing;
        }),
    });
  }

  private renderArcs(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const readers = (data?.arcs?.readers ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "name", label: "Reader", type: "text" },
        { key: "contact", label: "Contact", type: "text" },
        { key: "sent", label: "Sent", type: "checkbox" },
        { key: "reviewed", label: "Reviewed", type: "checkbox" },
        { key: "note", label: "Note", type: "text" },
      ],
      rows: readers,
      newRow: () => ({ id: newPublishingId(), name: "" }),
      addLabel: "+ ARC reader",
      emptyText: "Track who got an advance copy and who has reviewed.",
      onChange: (rows) =>
        this.saveSub(file, (pub) => {
          pub.arcs = { readers: rows as never };
          if (rows.length === 0) delete pub.arcs;
        }),
    });
  }

  // --- Persistence ---------------------------------------------------------

  private saveLaunch(file: TFile, patch: Partial<PublishingData["launch"]>): void {
    this.saveSub(file, (pub) => {
      pub.launch = { ...pub.launch, ...patch };
      if (!pub.launch.releaseDate && !pub.launch.strategy && !pub.launch.preorder && !pub.launch.milestones) {
        delete pub.launch;
      }
    });
  }

  private saveMilestone(file: TFile, id: string, patch: { done?: boolean; date?: string }): void {
    this.saveSub(file, (pub) => {
      const launch = pub.launch ?? (pub.launch = {});
      const milestones = launch.milestones ?? (launch.milestones = {});
      const next = { ...(milestones[id] ?? {}), ...patch };
      if (!next.done && !next.date) delete milestones[id];
      else milestones[id] = next;
      if (Object.keys(milestones).length === 0) delete launch.milestones;
    });
  }

  private saveSub(file: TFile, mutator: (pub: PublishingData) => void): void {
    void tryFileOp(
      () => persistPublishing(this.app, file, (raw) => mutator(raw)),
      "Couldn't save the launch plan."
    );
  }
}
