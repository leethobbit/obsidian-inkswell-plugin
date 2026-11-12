/**
 * Publish → Launch: the pre-order timeline planner (auto-computed milestone dates)
 * plus the launch trackers (budget, cover comps, marketing, ARCs). All state under
 * `inkswell.publishing` via `persistPublishing`.
 */

import { App, TFile } from "obsidian";
import { MessageKey, t } from "../../i18n";
import { preserveFocus, tagField } from "../../lib/focus-preserve";
import { tryFileOp } from "../../lib/notify";
import { resolveActive } from "../../projects/active-project";
import { persistPublishing } from "../../projects/index-writer";
import { ProjectStore } from "../../projects/project-store";
import { baseDraftFor } from "../../projects/stories";
import {
  BudgetItem,
  CoverComp,
  PublishingData,
  addRow,
  budgetTotals,
  newPublishingId,
  patchRow,
  removeRow,
} from "../../publishing/publishing-data";
import {
  MilestoneStatus,
  PreorderStrategy,
  STRATEGIES,
  computeMilestones,
  milestoneStatus,
} from "../../publishing/preorder";
import { TrackerConfig, TrackerRow, renderTrackerSection } from "./tracker-section";
import type InkswellPlugin from "../../../main";

/** Milestone status chip: the computed status → its display label. */
const STATUS_LABEL: Record<MilestoneStatus, MessageKey> = {
  done: "launch.status.done",
  overdue: "launch.status.overdue",
  upcoming: "launch.status.upcoming",
  future: "launch.status.future",
};

export class LaunchPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private store: ProjectStore;
  private open = new Set<string>(["launch-preorder"]);
  private container: HTMLElement | null = null;

  constructor(app: App, plugin: InkswellPlugin, store: ProjectStore) {
    this.app = app;
    this.plugin = plugin;
    this.store = store;
  }

  /** Re-render in place after a notify caused by our own writes (marked as
   *  self-writes), so a tracker-cell autosave doesn't tear down the body and
   *  reset the scroll position. Open sections restore from `open`. */
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
    // Launch plan describes the BOOK, not one draft — read/write the story's base
    // draft so every draft shares one copy (like overview and goals).
    const project = baseDraftFor(this.store.getProjects(), active);
    const file = this.app.vault.getAbstractFileByPath(project.vaultPath);
    if (!(file instanceof TFile)) return;
    const data = project.inkswell?.publishing;

    this.section(container, "launch-preorder", t("launch.section.preorder"), (host) =>
      this.renderPreorder(host, file, data)
    );
    this.section(container, "launch-budget", t("launch.section.budget"), (host) =>
      this.renderBudget(host, file, data)
    );
    this.section(container, "launch-cover", t("launch.section.cover"), (host) =>
      this.renderCover(host, file, data)
    );
    this.section(container, "launch-marketing", t("launch.section.marketing"), (host) =>
      this.renderMarketing(host, file, data)
    );
    this.section(container, "launch-arcs", t("launch.section.arcs"), (host) =>
      this.renderArcs(host, file, data)
    );
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
    dateF.createDiv({ cls: "inkswell-inspector__label", text: t("launch.preorder.releaseDate") });
    const date = dateF.createEl("input", { type: "date" });
    tagField(date, "pub:launch:date");
    date.value = launch.releaseDate ?? "";
    date.onchange = () => this.saveLaunch(file, { releaseDate: date.value || undefined });

    const stratF = ctl.createDiv({ cls: "inkswell-inspector__field" });
    stratF.createDiv({ cls: "inkswell-inspector__label", text: t("launch.preorder.strategy") });
    const strat = stratF.createEl("select", { cls: "dropdown" });
    tagField(strat, "pub:launch:strategy");
    strat.createEl("option", { text: t("launch.preorder.none"), value: "" });
    for (const s of Object.values(STRATEGIES)) strat.createEl("option", { text: t(s.labelKey), value: s.id });
    strat.value = launch.strategy ?? "";
    strat.onchange = () =>
      this.saveLaunch(file, { strategy: (strat.value || undefined) as PreorderStrategy | undefined });

    if (!launch.releaseDate || !launch.strategy) {
      host.createDiv({
        cls: "inkswell-stats__muted",
        text: t("launch.preorder.hint"),
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
      tagField(cb, `pub:ms:${ms.id}`);
      cb.checked = !!st.done;
      cb.onchange = () => this.saveMilestone(file, ms.id, { done: cb.checked });
      row.createSpan({ cls: `inkswell-publishing__mstatus is-${status}`, text: t(STATUS_LABEL[status]) });
      row.createSpan({ cls: "inkswell-publishing__mlabel", text: t(ms.labelKey) });
      row.createSpan({
        cls: "inkswell-stats__muted",
        text: ms.windowEnd ? `${ms.date} → ${ms.windowEnd}` : ms.date,
      });
    }
    host.createDiv({
      cls: "inkswell-stats__muted",
      text: t("launch.preorder.footnote"),
    });
  }

  // --- Trackers (C4) -------------------------------------------------------

  private renderBudget(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const items = (data?.budget?.items ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "label", label: t("launch.budget.item"), type: "text", placeholder: t("launch.budget.itemPlaceholder") },
        {
          key: "category",
          label: t("launch.budget.type"),
          type: "select",
          options: [
            { value: "need", label: t("launch.budget.need") },
            { value: "want", label: t("launch.budget.want") },
          ],
        },
        { key: "estimate", label: t("launch.budget.estimate"), type: "number" },
        { key: "actual", label: t("launch.budget.actual"), type: "number" },
      ],
      rows: items,
      newRow: () => ({ id: newPublishingId(), label: "", category: "need" }),
      keyPrefix: "pub:budget",
      addLabel: t("launch.budget.add"),
      emptyText: t("launch.budget.empty"),
      ...this.trackerOps(file, {
        get: (pub) => (pub.budget?.items ?? []) as unknown as TrackerRow[],
        set: (pub, rows) => {
          if (rows.length === 0) delete pub.budget;
          else pub.budget = { items: rows as unknown as BudgetItem[] };
        },
      }),
    });
    const totals = budgetTotals(data?.budget?.items);
    if ((data?.budget?.items ?? []).length > 0) {
      host.createDiv({
        cls: "inkswell-stats__row",
        text: t("launch.budget.totals", {
          needs: totals.needs,
          wants: totals.wants,
          estimate: totals.estimate,
          actual: totals.actual,
        }),
      });
    }
  }

  private renderCover(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const cover = data?.cover ?? {};
    const planF = host.createDiv({ cls: "inkswell-inspector__field" });
    planF.createDiv({ cls: "inkswell-inspector__label", text: t("launch.cover.direction") });
    const plan = planF.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
      cls: "inkswell-inspector__textarea",
    });
    tagField(plan, "pub:cover:plan");
    plan.rows = 2;
    plan.value = cover.plan ?? "";
    plan.placeholder = t("launch.cover.directionPlaceholder");
    plan.onchange = () =>
      this.saveSub(file, (pub) => {
        pub.cover = { ...pub.cover, plan: plan.value || undefined };
        if (!pub.cover.plan && !(pub.cover.comps?.length)) delete pub.cover;
      });

    host.createDiv({ cls: "inkswell-audit__grouplabel", text: t("launch.cover.comps") });
    const comps = (cover.comps ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "title", label: t("launch.cover.compCover"), type: "text", placeholder: t("launch.cover.compPlaceholder") },
        { key: "note", label: t("launch.cover.note"), type: "text" },
        { key: "done", label: t("launch.cover.gotIt"), type: "checkbox" },
      ],
      rows: comps,
      newRow: () => ({ id: newPublishingId(), title: "" }),
      keyPrefix: "pub:comps",
      addLabel: t("launch.cover.add"),
      ...this.trackerOps(file, {
        get: (pub) => (pub.cover?.comps ?? []) as unknown as TrackerRow[],
        set: (pub, rows) => {
          const cover = { ...pub.cover };
          if (rows.length === 0) delete cover.comps;
          else cover.comps = rows as unknown as CoverComp[];
          if (!cover.plan && !cover.comps?.length) delete pub.cover;
          else pub.cover = cover;
        },
      }),
    });
  }

  private renderMarketing(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const items = (data?.marketing?.items ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        {
          key: "strategy",
          label: t("launch.marketing.strategy"),
          type: "text",
          placeholder: t("launch.marketing.strategyPlaceholder"),
        },
        { key: "date", label: t("launch.marketing.date"), type: "date" },
        { key: "budget", label: t("launch.marketing.budget"), type: "number" },
        { key: "result", label: t("launch.marketing.result"), type: "text" },
        { key: "done", label: t("launch.marketing.done"), type: "checkbox" },
      ],
      rows: items,
      newRow: () => ({ id: newPublishingId(), strategy: "" }),
      keyPrefix: "pub:marketing",
      addLabel: t("launch.marketing.add"),
      emptyText: t("launch.marketing.empty"),
      ...this.trackerOps(file, {
        get: (pub) => (pub.marketing?.items ?? []) as unknown as TrackerRow[],
        set: (pub, rows) => {
          if (rows.length === 0) delete pub.marketing;
          else pub.marketing = { items: rows as never };
        },
      }),
    });
  }

  private renderArcs(host: HTMLElement, file: TFile, data: PublishingData | undefined): void {
    const readers = (data?.arcs?.readers ?? []) as unknown as TrackerRow[];
    renderTrackerSection(host, {
      columns: [
        { key: "name", label: t("launch.arcs.reader"), type: "text" },
        { key: "contact", label: t("launch.arcs.contact"), type: "text" },
        { key: "sent", label: t("launch.arcs.sent"), type: "checkbox" },
        { key: "reviewed", label: t("launch.arcs.reviewed"), type: "checkbox" },
        { key: "note", label: t("launch.arcs.note"), type: "text" },
      ],
      rows: readers,
      newRow: () => ({ id: newPublishingId(), name: "" }),
      keyPrefix: "pub:arcs",
      addLabel: t("launch.arcs.add"),
      emptyText: t("launch.arcs.empty"),
      ...this.trackerOps(file, {
        get: (pub) => (pub.arcs?.readers ?? []) as unknown as TrackerRow[],
        set: (pub, rows) => {
          if (rows.length === 0) delete pub.arcs;
          else pub.arcs = { readers: rows as never };
        },
      }),
    });
  }

  // --- Persistence ---------------------------------------------------------

  /**
   * Op-based persistence for one tracker grid: each op reads the CURRENT rows
   * via `lens.get` inside the `persistPublishing` mutator, applies the by-id
   * patch/add/remove, and writes back via `lens.set`. Cells edited from the
   * same rendered grid therefore compose — a stale render can no longer
   * overwrite sibling cells or rows (the stale-snapshot data-loss class).
   */
  private trackerOps(
    file: TFile,
    lens: {
      get: (pub: PublishingData) => TrackerRow[];
      set: (pub: PublishingData, rows: TrackerRow[]) => void;
    }
  ): Pick<TrackerConfig, "onEdit" | "onAdd" | "onRemove"> {
    const apply = (op: (rows: TrackerRow[]) => TrackerRow[]) =>
      this.saveSub(file, (pub) => lens.set(pub, op(lens.get(pub))));
    return {
      onEdit: (rowId, key, value) => apply((rows) => patchRow(rows, rowId, key, value)),
      onAdd: (row) => apply((rows) => addRow(rows, row)),
      onRemove: (rowId) => apply((rows) => removeRow(rows, rowId)),
    };
  }

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
    // Single choke point for every launch-plan write — mark it as our own so
    // the host soft-refreshes this panel in place.
    this.plugin.selfWrites.mark(file.path);
    void tryFileOp(
      () => persistPublishing(this.app, file, (raw) => mutator(raw)),
      t("launch.saveFailed")
    );
  }
}
