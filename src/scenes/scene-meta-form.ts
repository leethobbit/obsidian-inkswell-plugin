/**
 * Shared renderer for a scene's metadata fields, written straight to the scene's
 * frontmatter via `writeSceneMeta` (never the prose body). Used by both the Scene
 * Inspector (side column) and the "Edit scene" modal, so the two stay in sync.
 */

import { App, TFile } from "obsidian";
import { detectMentions, linkTarget, toLink } from "../codex/codex";
import { getCodexEntities } from "../codex/codex-store";
import { SCENE_CHECKPOINTS } from "../revisions/audit";
import { readSceneAudit, writeSceneAudit } from "../revisions/audit-meta";
import { OPENING_LABEL, OPENING_TYPES, OpeningType } from "../revisions/openings";
import {
  SCENE_STATUSES,
  SceneMeta,
  readSceneMeta,
  statusLabel,
  writeSceneMeta,
} from "./scene-meta";

const COLORS = ["#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd"];

// Unique <datalist> id per POV field instance (Inspector + Edit modal can coexist).
let povListSeq = 0;

/** One labelled field row (label optional). */
function field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
  const f = parent.createDiv({ cls: "inkswell-inspector__field" });
  if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
  build(f.createDiv({ cls: "inkswell-inspector__control" }));
}

/** Render all editable scene-metadata field rows into `container`. */
export function renderSceneMetaFields(container: HTMLElement, app: App, file: TFile): void {
  const meta = readSceneMeta(app, file);
  const save = (patch: Partial<SceneMeta>) => void writeSceneMeta(app, file, patch);
  const entities = getCodexEntities(app);

  // Status
  field(container, "Status", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
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
    t.value = meta.subtitle ?? "";
    t.placeholder = "e.g. Three years later";
    t.onchange = () => save({ subtitle: t.value });
  });

  // Synopsis
  field(container, "Synopsis", (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    ta.rows = 3;
    ta.value = meta.synopsis ?? "";
    ta.placeholder = "What happens in this scene…";
    ta.onchange = () => save({ synopsis: ta.value });
  });

  // POV — suggests codex characters (typo-free, discoverable) but stays free
  // text, since POV can also be a narrative mode ("Omniscient", "First person").
  field(container, "POV", (host) => {
    const t = host.createEl("input", { type: "text" });
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
    sel.createEl("option", { text: "— none —", value: "" });
    for (const l of locs) {
      const o = sel.createEl("option", { text: l.name, value: l.name });
      if (l.name === cur) o.selected = true;
    }
    sel.value = locs.some((l) => l.name === cur) ? cur : "";
    sel.onchange = () => save({ location: sel.value ? toLink(sel.value) : "" });
  });

  // Auto-detect codex mentions in the scene body.
  field(container, "", (host) => {
    const btn = host.createEl("button", { text: "Detect mentions" });
    btn.setAttribute("aria-label", "Scan the scene text for codex characters/locations");
    btn.onclick = async () => {
      const text = await app.vault.cachedRead(file);
      const mentions = detectMentions(text, entities);
      const fresh = readSceneMeta(app, file);
      const chars = Array.from(
        new Set([
          ...(fresh.characters ?? []),
          ...mentions.filter((m) => m.category === "character").map((m) => toLink(m.name)),
        ])
      );
      const patch: Partial<SceneMeta> = { characters: chars };
      const loc = mentions.find((m) => m.category === "location");
      if (loc && !fresh.location) patch.location = toLink(loc.name);
      await writeSceneMeta(app, file, patch);
    };
  });

  // Act + Chapter
  field(container, "Act / Chapter", (host) => {
    const row = host.createDiv({ cls: "inkswell-inspector__pair" });
    const act = row.createEl("input", { type: "text" });
    act.value = meta.act ?? "";
    act.placeholder = "Act";
    act.onchange = () => save({ act: act.value });
    const ch = row.createEl("input", { type: "text" });
    ch.value = meta.chapter ?? "";
    ch.placeholder = "Chapter";
    ch.onchange = () => save({ chapter: ch.value });
  });

  // Target words
  field(container, "Target words", (host) => {
    const t = host.createEl("input", { type: "number" });
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
 * Render the 14 scene-level revision-audit checkpoints (Reviser's Workbook
 * scene pass) plus a freeform note, writing to scene frontmatter via
 * `writeSceneAudit`. Shared by the Scene Inspector and the Revise → Audit
 * dashboard. `onChange` fires after each toggle so a caller can refresh a badge.
 */
export function renderSceneAuditFields(
  container: HTMLElement,
  app: App,
  file: TFile,
  onChange?: () => void
): void {
  const audit = readSceneAudit(app, file);
  const list = container.createDiv({ cls: "inkswell-audit__checks" });
  for (const cp of SCENE_CHECKPOINTS) {
    const label = list.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!audit.checks[cp.id];
    cb.onchange = () => {
      void writeSceneAudit(app, file, { checks: { [cp.id]: cb.checked } });
      onChange?.();
    };
    label.createSpan({ text: cp.label });
  }

  // Lift-out test: verdict + "if removed, what breaks?" cascade note.
  field(container, "Lift-out test", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    sel.createEl("option", { text: "— undecided —", value: "" });
    for (const v of ["keep", "cut", "merge"] as const) {
      const o = sel.createEl("option", { text: v[0].toUpperCase() + v.slice(1), value: v });
      if (audit.verdict === v) o.selected = true;
    }
    sel.value = audit.verdict ?? "";
    sel.onchange = () => void writeSceneAudit(app, file, { verdict: sel.value as "" | "keep" });
  });
  field(container, "If removed…", (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    ta.rows = 2;
    ta.value = audit.purpose ?? "";
    ta.placeholder = "What later scenes break if this one is cut?";
    ta.onchange = () => void writeSceneAudit(app, file, { purpose: ta.value });
  });

  // Opening type — override the heuristic when it's wrong.
  field(container, "Opening", (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    sel.createEl("option", { text: "— auto —", value: "" });
    for (const t of OPENING_TYPES) {
      if (t === "unknown") continue;
      const o = sel.createEl("option", { text: OPENING_LABEL[t], value: t });
      if (audit.opening === t) o.selected = true;
    }
    sel.value = audit.opening ?? "";
    sel.onchange = () => void writeSceneAudit(app, file, { opening: sel.value as "" | OpeningType });
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
        internal.value = snap.internal ?? "";
        internal.placeholder = "internal / flaw";
        const external = row.createEl("input", { type: "text", cls: "inkswell-audit__arcfield" });
        external.value = snap.external ?? "";
        external.placeholder = "external / problem";
        const save = () =>
          void writeSceneAudit(app, file, {
            arc: { [name]: { internal: internal.value, external: external.value } },
          });
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
  ta.rows = 2;
  ta.value = audit.note ?? "";
  ta.placeholder = "What this scene needs in revision…";
  ta.onchange = () => void writeSceneAudit(app, file, { note: ta.value });
}
