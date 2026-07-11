/**
 * Shared renderer for a scene's metadata fields, written straight to the scene's
 * frontmatter via `writeSceneMeta` (never the prose body). Used by both the Scene
 * Inspector (side column) and the "Edit scene" modal, so the two stay in sync.
 */

import { App, TFile } from "obsidian";
import { tryFileOp } from "../lib/notify";
import { tagField } from "../lib/focus-preserve";
import { autosizeTextarea } from "../lib/form-fields";
import { linkTarget, toLink } from "../codex/codex";
import { featureEnabled } from "../features";
import { getCodexEntities } from "../codex/codex-store";
import { filterToScope, scopeContextForProject } from "../codex/codex-scope";
import { Project } from "../projects/types";
import { SCENE_CHECKPOINTS } from "../revisions/audit";
import { readSceneAudit, writeSceneAudit } from "../revisions/audit-meta";
import { OPENING_LABEL, OPENING_TYPES, OpeningType } from "../revisions/openings";
import { distinctInOrder } from "../outliner/structure";
import {
  SCENE_STATUSES,
  SceneMeta,
  readSceneMeta,
  statusLabel,
  writeSceneMeta,
} from "./scene-meta";

/** Shared scene/plotline color swatches (also used by the Plot Grid column menu). */
export const COLORS = ["#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd"];

// Unique <datalist> id per field instance (Inspector + Edit modal can coexist).
let povListSeq = 0;
let structureListSeq = 0;

/** One labelled field row (label optional). */
function field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
  const f = parent.createDiv({ cls: "inkswell-inspector__field" });
  if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
  build(f.createDiv({ cls: "inkswell-inspector__control" }));
}

/** Existing act/chapter labels across the book's scenes + any planned groups. */
function structureLabels(app: App, project: Project | null, kind: "act" | "chapter"): string[] {
  if (!project || project.draft.format !== "scenes") return [];
  const sceneLabels = project.scenes.map((s) => {
    if (!s.path) return undefined;
    const f = app.vault.getAbstractFileByPath(s.path);
    return f instanceof TFile ? readSceneMeta(app, f)[kind] : undefined;
  });
  const configured = (kind === "act" ? project.inkswell?.acts : project.inkswell?.chapters) ?? [];
  return distinctInOrder([...sceneLabels, ...configured.map((g) => g.title)]);
}

/**
 * Render all editable scene-metadata field rows into `container`. When `project`
 * (the scene's owning book) is given, the codex pickers are scoped to that book +
 * its series + global entries; without it, all entities are offered.
 */
export function renderSceneMetaFields(
  container: HTMLElement,
  app: App,
  file: TFile,
  project: Project | null = null,
  disabledFeatures: readonly string[] = [],
  markWrite?: (path: string) => void
): void {
  const meta = readSceneMeta(app, file);
  const save = (patch: Partial<SceneMeta>) => {
    markWrite?.(file.path);
    void tryFileOp(() => writeSceneMeta(app, file, patch), "Couldn't save the scene change.");
  };
  const entities = filterToScope(getCodexEntities(app), scopeContextForProject(project));

  // Status
  field(container, "Status", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "scene:status");
    sel.createEl("option", { text: "— none —", value: "" });
    for (const s of SCENE_STATUSES) {
      const o = sel.createEl("option", { text: statusLabel(s), value: s });
      if (meta.status === s) o.selected = true;
    }
    sel.value = meta.status ?? "";
    sel.onchange = () => save({ status: (sel.value || undefined) as SceneMeta["status"] });
  });

  // Subtitle
  field(container, "Subtitle", (host) => {
    const t = host.createEl("input", { type: "text" });
    tagField(t, "scene:subtitle");
    t.value = meta.subtitle ?? "";
    t.placeholder = "e.g. Three years later";
    t.onchange = () => save({ subtitle: t.value });
  });

  // Synopsis
  field(container, "Synopsis", (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, "scene:synopsis");
    ta.rows = 3;
    ta.value = meta.synopsis ?? "";
    ta.placeholder = "What happens in this scene…";
    ta.onchange = () => save({ synopsis: ta.value });
    autosizeTextarea(ta);
  });

  // POV — suggests codex characters (typo-free, discoverable) but stays free
  // text, since POV can also be a narrative mode ("Omniscient", "First person").
  field(container, "POV", (host) => {
    const t = host.createEl("input", { type: "text" });
    tagField(t, "scene:pov");
    t.value = meta.pov ?? "";
    t.placeholder = "Character or narrative mode";
    const chars = entities.filter((e) => e.category === "character");
    if (chars.length > 0) {
      const listId = `inkswell-pov-${povListSeq++}`;
      const list = host.createEl("datalist");
      list.id = listId;
      for (const c of chars) list.createEl("option", { value: c.name });
      t.setAttribute("list", listId);
    }
    t.onchange = () => save({ pov: t.value });
  });

  // Characters (linked codex entities)
  field(container, "Characters", (host) => {
    const current = meta.characters ?? [];
    const chips = host.createDiv({ cls: "inkswell-inspector__chips" });
    for (const link of current) {
      const chip = chips.createSpan({ cls: "inkswell-chip", text: linkTarget(link) });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => save({ characters: current.filter((c) => c !== link) });
    }
    const chars = entities.filter((e) => e.category === "character");
    const remaining = chars.filter(
      (c) => !current.some((link) => linkTarget(link) === c.name)
    );
    if (remaining.length > 0) {
      const add = host.createEl("select", { cls: "dropdown" });
      tagField(add, "scene:characters-add");
      add.createEl("option", { text: "+ add character", value: "" });
      for (const c of remaining) add.createEl("option", { text: c.name, value: c.name });
      add.value = "";
      add.onchange = () => {
        if (add.value) save({ characters: [...current, toLink(add.value)] });
      };
    } else if (chars.length === 0) {
      host.createSpan({ cls: "inkswell-stats__muted", text: "No characters in codex." });
    }
  });

  // Location (single linked codex entity)
  field(container, "Location", (host) => {
    const locs = entities.filter((e) => e.category === "location");
    const cur = meta.location ? linkTarget(meta.location) : "";
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "scene:location");
    sel.createEl("option", { text: "— none —", value: "" });
    for (const l of locs) {
      const o = sel.createEl("option", { text: l.name, value: l.name });
      if (l.name === cur) o.selected = true;
    }
    sel.value = locs.some((l) => l.name === cur) ? cur : "";
    sel.onchange = () => save({ location: sel.value ? toLink(sel.value) : "" });
  });

  // Codex mentions are surfaced automatically on each entry's "Appears in" list
  // (scenesForEntity scans scene text) — no manual "detect" step here. The
  // Characters/Location fields above remain explicit metadata for the Search
  // character filter and the Revise → Audit character-arc roster.

  // Act + Chapter — free text, but suggest existing labels (and planned groups)
  // so users reuse chapters/acts instead of creating typo'd phantom ones.
  field(container, "Act / Chapter", (host) => {
    const row = host.createDiv({ cls: "inkswell-inspector__pair" });
    const suggest = (input: HTMLInputElement, kind: "act" | "chapter") => {
      const labels = structureLabels(app, project, kind);
      if (labels.length === 0) return;
      const listId = `inkswell-${kind}-${structureListSeq++}`;
      const list = host.createEl("datalist");
      list.id = listId;
      for (const l of labels) list.createEl("option", { value: l });
      input.setAttribute("list", listId);
    };
    const act = row.createEl("input", { type: "text" });
    tagField(act, "scene:act");
    act.value = meta.act ?? "";
    act.placeholder = "Act";
    suggest(act, "act");
    act.onchange = () => save({ act: act.value });
    const ch = row.createEl("input", { type: "text" });
    tagField(ch, "scene:chapter");
    ch.value = meta.chapter ?? "";
    ch.placeholder = "Chapter";
    suggest(ch, "chapter");
    ch.onchange = () => save({ chapter: ch.value });
  });

  // Plotlines — plain titles from the project's plotline list (Plan → Grid).
  // Same chips pattern as Characters, but titles are strings, not wikilinks.
  // Hidden when the Plot grid feature is off (its data is kept, just not shown).
  if (featureEnabled(disabledFeatures, "plot-grid"))
    field(container, "Plotlines", (host) => {
    const current = meta.plotlines ?? [];
    const chips = host.createDiv({ cls: "inkswell-inspector__chips" });
    for (const title of current) {
      const chip = chips.createSpan({ cls: "inkswell-chip", text: title });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => save({ plotlines: current.filter((t) => t !== title) });
    }
    const configured = (project?.inkswell?.plotlines ?? []).map((p) => p.title);
    const remaining = configured.filter((t) => !current.includes(t));
    if (remaining.length > 0) {
      const add = host.createEl("select", { cls: "dropdown" });
      tagField(add, "scene:plotlines-add");
      add.createEl("option", { text: "+ add plotline", value: "" });
      for (const t of remaining) add.createEl("option", { text: t, value: t });
      add.value = "";
      add.onchange = () => {
        if (add.value) save({ plotlines: [...current, add.value] });
      };
    } else if (configured.length === 0 && current.length === 0) {
      host.createSpan({
        cls: "inkswell-stats__muted",
        text: "No plotlines yet — create them in Plan → Grid.",
      });
    }
  });

  // Target words
  field(container, "Target words", (host) => {
    const t = host.createEl("input", { type: "number" });
    tagField(t, "scene:target-words");
    t.value = meta.targetWords ? String(meta.targetWords) : "";
    t.placeholder = "0";
    t.onchange = () => {
      const n = Math.floor(Number(t.value));
      save({ targetWords: Number.isFinite(n) && n > 0 ? n : undefined });
    };
  });

  // Color
  field(container, "Color", (host) => {
    const row = host.createDiv({ cls: "inkswell-inspector__swatches" });
    for (const c of COLORS) {
      const sw = row.createDiv({ cls: "inkswell-swatch" });
      sw.style.backgroundColor = c;
      if (meta.color === c) sw.addClass("is-selected");
      sw.onclick = () => save({ color: c });
    }
    const clear = row.createDiv({ cls: "inkswell-swatch inkswell-swatch--clear" });
    clear.setText("×");
    clear.onclick = () => save({ color: undefined });
  });

  // Inactive
  field(container, "", (host) => {
    const label = host.createEl("label", { cls: "inkswell-inspector__toggle" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!meta.inactive;
    cb.onchange = () => save({ inactive: cb.checked });
    label.createSpan({ text: "Archived / inactive (excluded from compile & stats)" });
  });
}

/**
 * Render the 14 scene-level revision-audit checkpoints (the scene-level
 * revision pass) plus a freeform note, writing to scene frontmatter via
 * `writeSceneAudit`. Shared by the Scene Inspector and the Revise → Audit
 * dashboard. `onChange` fires after each toggle so a caller can refresh a badge.
 */
export function renderSceneAuditFields(
  container: HTMLElement,
  app: App,
  file: TFile,
  onChange?: () => void,
  markWrite?: (path: string) => void
): void {
  const audit = readSceneAudit(app, file);
  const saveAudit = (patch: Parameters<typeof writeSceneAudit>[2]) => {
    markWrite?.(file.path);
    void tryFileOp(() => writeSceneAudit(app, file, patch), "Couldn't save the audit change.");
  };
  const list = container.createDiv({ cls: "inkswell-audit__checks" });
  for (const cp of SCENE_CHECKPOINTS) {
    const label = list.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!audit.checks[cp.id];
    cb.onchange = () => {
      saveAudit({ checks: { [cp.id]: cb.checked } });
      onChange?.();
    };
    label.createSpan({ text: cp.label });
  }

  // Lift-out test: verdict + "if removed, what breaks?" cascade note.
  field(container, "Lift-out test", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "audit:verdict");
    sel.createEl("option", { text: "— undecided —", value: "" });
    for (const v of ["keep", "cut", "merge"] as const) {
      const o = sel.createEl("option", { text: v[0].toUpperCase() + v.slice(1), value: v });
      if (audit.verdict === v) o.selected = true;
    }
    sel.value = audit.verdict ?? "";
    sel.onchange = () => saveAudit({ verdict: sel.value as "" | "keep" });
  });
  field(container, "If removed…", (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, "audit:purpose");
    ta.rows = 2;
    ta.value = audit.purpose ?? "";
    ta.placeholder = "What later scenes break if this one is cut?";
    ta.onchange = () => saveAudit({ purpose: ta.value });
    autosizeTextarea(ta);
  });

  // Opening type — override the heuristic when it's wrong.
  field(container, "Opening", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "audit:opening");
    sel.createEl("option", { text: "— auto —", value: "" });
    for (const t of OPENING_TYPES) {
      if (t === "unknown") continue;
      const o = sel.createEl("option", { text: OPENING_LABEL[t], value: t });
      if (audit.opening === t) o.selected = true;
    }
    sel.value = audit.opening ?? "";
    sel.onchange = () => saveAudit({ opening: sel.value as "" | OpeningType });
  });

  // Character arc snapshots — internal (flaw) + external (problem) state for each
  // character linked to this scene. Drives the Audit dashboard's arc grid.
  const linkedChars = (readSceneMeta(app, file).characters ?? []).map(linkTarget);
  if (linkedChars.length > 0) {
    field(container, "Character arc", (host) => {
      for (const name of linkedChars) {
        const snap = audit.arc[name] ?? {};
        const row = host.createDiv({ cls: "inkswell-audit__arcrow" });
        row.createSpan({ cls: "inkswell-audit__arcname", text: name });
        const internal = row.createEl("input", { type: "text", cls: "inkswell-audit__arcfield" });
        tagField(internal, `audit:arc-${name}-internal`);
        internal.value = snap.internal ?? "";
        internal.placeholder = "internal / flaw";
        const external = row.createEl("input", { type: "text", cls: "inkswell-audit__arcfield" });
        tagField(external, `audit:arc-${name}-external`);
        external.value = snap.external ?? "";
        external.placeholder = "external / problem";
        const save = () =>
          saveAudit({ arc: { [name]: { internal: internal.value, external: external.value } } });
        internal.onchange = save;
        external.onchange = save;
      }
    });
  }

  const noteWrap = container.createDiv({ cls: "inkswell-inspector__field" });
  noteWrap.createDiv({ cls: "inkswell-inspector__label", text: "Revision note" });
  const ta = noteWrap.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
    cls: "inkswell-inspector__textarea",
  });
  tagField(ta, "audit:note");
  ta.rows = 2;
  ta.value = audit.note ?? "";
  ta.placeholder = "What this scene needs in revision…";
  ta.onchange = () => saveAudit({ note: ta.value });
  autosizeTextarea(ta);
}
