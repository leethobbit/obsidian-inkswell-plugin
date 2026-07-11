/**
 * Shared row renderers for revision work — the ONE place a to-do marker row or
 * a decision row is built. Consumed by the merged Revise → To-dos panel and the
 * Write → Revision sidebar, so the two surfaces can't drift apart.
 *
 * Marker rows are jump-only (resolve one by editing the prose in Write).
 * Decision rows are interactive: checkbox = applied/reopen, click text = edit
 * in the modal, row menu = Edit…/Delete. Persistence is an injected callback —
 * the hosting surface decides how a write is followed up (e.g. the Revise
 * panel marks it as a self-write for the host's soft-refresh path).
 */

import { App, Menu } from "obsidian";
import { attachRowMenu } from "../lib/row-menu";
import { GapHit, PLACEHOLDER_LABEL } from "../lib/placeholders";
import { Project } from "../projects/types";
import { decisionType, decisionsOf, removeDecision, setDecisionStatus } from "./decisions";
import { RevisionModal } from "./revision-modal";
import { REVISION_TYPES, RevisionDecision } from "./types";
import { RevisionGroup } from "./revision-work";

/** Jump into the Write editor at a marker's body offsets. */
export type MarkerJump = (path: string, from: number, to: number) => void;

export interface DecisionRowContext {
  app: App;
  /** Persist an updated decision list (the surface adds any follow-up, e.g. selfWrites marking). */
  persist: (project: Project, list: RevisionDecision[]) => void;
  /** Threaded into the modal so its saves get the same follow-up. */
  markWrite?: (path: string) => void;
}

/** One inline to-do marker: kind badge + line + excerpt; click jumps to it. */
export function renderMarkerRow(
  parent: HTMLElement,
  path: string,
  t: GapHit,
  onJump: MarkerJump
): void {
  const row = parent.createDiv({ cls: "inkswell-todos__row" });
  row.createSpan({
    cls: `inkswell-todos__kind inkswell-todos__kind--${t.kind}`,
    text: PLACEHOLDER_LABEL[t.kind],
  });
  row.createSpan({ cls: "inkswell-todos__line", text: `L${t.line}` });
  row.createSpan({ cls: "inkswell-todos__text", text: t.excerpt });
  row.onclick = () => onJump(path, t.from, t.to);
}

/** One logged decision: applied checkbox, click-to-edit text, Edit…/Delete menu. */
export function renderDecisionRow(
  parent: HTMLElement,
  project: Project,
  d: RevisionDecision,
  ctx: DecisionRowContext
): void {
  const row = parent.createDiv({ cls: "inkswell-revision__row" });
  if (d.status === "applied") row.addClass("is-applied");

  const check = row.createEl("input", { type: "checkbox" });
  check.checked = d.status === "applied";
  check.setAttribute("aria-label", d.status === "applied" ? "Reopen" : "Mark applied");
  check.onchange = () =>
    ctx.persist(
      project,
      setDecisionStatus(decisionsOf(project), d.id, check.checked ? "applied" : "pending")
    );

  const openEdit = () =>
    new RevisionModal(ctx.app, project, d.scene, "", d, ctx.markWrite).open();

  // Uniform decision row: click the text to edit it, regardless of whether it's
  // scene-anchored or project-wide (navigation lives on the scene group header).
  const body = row.createDiv({ cls: "inkswell-revision__body" });
  const textEl = body.createDiv({ cls: "inkswell-revision__text", text: d.text });
  textEl.setAttribute("aria-label", "Edit decision");
  textEl.onclick = openEdit;
  const meta = body.createDiv({ cls: "inkswell-revision__meta" });
  const type = decisionType(d);
  const typeLabel = REVISION_TYPES.find((t) => t.id === type)?.label ?? type;
  meta.createSpan({ cls: `inkswell-revision__type inkswell-revision__type--${type}`, text: typeLabel });
  if (d.priority) {
    meta.createSpan({
      cls: `inkswell-revision__pri inkswell-revision__pri--${d.priority}`,
      text: d.priority,
    });
  }

  attachRowMenu(row, row, () => {
    const menu = new Menu();
    menu.addItem((i) => i.setTitle("Edit…").setIcon("pencil").onClick(openEdit));
    menu.addSeparator();
    menu.addItem((i) =>
      i
        .setTitle("Delete")
        .setIcon("trash")
        .onClick(() => ctx.persist(project, removeDecision(decisionsOf(project), d.id)))
    );
    return menu;
  });
}

/** A group's rows in canonical order: decisions first (scene-level directives
 *  you hold in mind, in the order they were logged), then markers in prose
 *  order (worked top to bottom). */
export function renderRevisionGroupItems(
  box: HTMLElement,
  project: Project,
  g: RevisionGroup,
  ctx: DecisionRowContext,
  onJump: MarkerJump
): void {
  for (const d of g.decisions) renderDecisionRow(box, project, d, ctx);
  if (g.path) for (const t of g.todos) renderMarkerRow(box, g.path, t, onJump);
}
